import mongoose from 'mongoose';
import { connectTestDB } from './testDb.js';
import {
  encrypt,
  decrypt,
  hashOtp,
  verifyOtpHash,
  maskPhoneNumber,
  maskEmail,
  getEncryptionKey,
  getOtpHmacKey,
} from '../utils/encryptionUtils.js';
import NotificationProvider from '../models/notificationProvider.model.js';
import Otp from '../models/otp.model.js';
import NotificationLog, { sanitizeAndRedact } from '../models/notificationLog.model.js';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    passed++;
    console.log(`  [✅ PASS] ${message}`);
  } else {
    console.error(`  [❌ FAIL] ${message}`);
  }
}

async function runTests() {
  console.log('==================================================');
  console.log('RUNNING NOTIFICATION PHASE 1 TESTS (REMEDIATED)');
  console.log('Testing: Database Models, HMAC OTP & Safe Logging');
  console.log('==================================================\n');

  await connectTestDB();

  // Clean test collections before running
  await NotificationProvider.deleteMany({});
  await Otp.deleteMany({});
  await NotificationLog.deleteMany({});

  // ----------------------------------------------------
  // SECTION 1: AES-256-GCM Encryption & Security Utils
  // ----------------------------------------------------
  console.log('\n--- Section 1: AES-256-GCM Encryption & Security Utils ---');

  // Test 1.1: Round-trip text encryption and decryption
  const secretText = 'SuperSecretApiKey_12345';
  const encryptedText = encrypt(secretText);
  assert(
    typeof encryptedText === 'string' && encryptedText.split(':').length === 3,
    'encrypt() generates valid iv:authTag:ciphertext format'
  );

  const decryptedText = decrypt(encryptedText);
  assert(decryptedText === secretText, 'decrypt() restores original plaintext string');

  // Test 1.2: Round-trip JSON object encryption and decryption
  const credentialsObj = {
    apiKey: 'tb_live_secret_key_99999',
    deviceId: 'dev_pixel_7_01',
    endpoint: 'https://api.textbee.dev',
  };
  const encryptedObj = encrypt(credentialsObj);
  const decryptedObj = decrypt(encryptedObj, true);
  assert(
    decryptedObj.apiKey === credentialsObj.apiKey &&
    decryptedObj.deviceId === credentialsObj.deviceId,
    'decrypt(payload, true) correctly restores JSON credentials object'
  );

  // Test 1.3: Tampering detection (integrity protection)
  const parts = encryptedText.split(':');
  const tamperedCiphertext = parts[0] + ':' + parts[1] + ':' + (parts[2].slice(0, -2) + 'aa');
  let tamperCaught = false;
  try {
    decrypt(tamperedCiphertext);
  } catch (err) {
    tamperCaught = true;
  }
  assert(tamperCaught, 'decrypt() detects ciphertext tampering and throws error');

  const tamperedAuthTag = parts[0] + ':' + (parts[1].slice(0, -2) + '00') + ':' + parts[2];
  let authTagTamperCaught = false;
  try {
    decrypt(tamperedAuthTag);
  } catch (err) {
    authTagTamperCaught = true;
  }
  assert(authTagTamperCaught, 'decrypt() detects auth tag tampering and throws error');

  // Test 1.4: Refusal of insecure key fallback for ENCRYPTION_SECRET
  const originalSecret = process.env.ENCRYPTION_SECRET;
  try {
    delete process.env.ENCRYPTION_SECRET;
    let missingKeyError = false;
    try {
      getEncryptionKey();
    } catch (err) {
      missingKeyError = err.message.includes('missing or shorter than 32 characters');
    }
    assert(missingKeyError, 'getEncryptionKey() rejects missing ENCRYPTION_SECRET without hardcoded fallback');

    process.env.ENCRYPTION_SECRET = 'short_key_123';
    let shortKeyError = false;
    try {
      getEncryptionKey();
    } catch (err) {
      shortKeyError = err.message.includes('missing or shorter than 32 characters');
    }
    assert(shortKeyError, 'getEncryptionKey() rejects weak (<32 char) ENCRYPTION_SECRET');
  } finally {
    process.env.ENCRYPTION_SECRET = originalSecret;
  }

  // ----------------------------------------------------
  // SECTION 1B: HMAC-SHA256 OTP Hashing & Validation
  // ----------------------------------------------------
  console.log('\n--- Section 1B: HMAC-SHA256 OTP Hashing & Validation ---');

  const testPhone = '+919876543210';
  const testEmail = 'donor@bloodward.com';
  const rawOtp = '482910';

  // Test 1.5: HMAC-SHA256 generation bound to target & purpose
  const hmacHash = hashOtp({ target: testPhone, purpose: 'verification', rawOtp });
  assert(
    hmacHash && hmacHash.length === 64 && hmacHash !== rawOtp,
    'hashOtp() returns valid 64-character HMAC-SHA256 hex string'
  );

  // Test 1.6: Target binding (same OTP for different targets produces different hashes)
  const hmacHashOtherPhone = hashOtp({ target: '+919876543211', purpose: 'verification', rawOtp });
  assert(
    hmacHash !== hmacHashOtherPhone,
    'hashOtp() binds target: different targets with identical OTP produce different hashes'
  );

  // Test 1.7: Purpose binding (same OTP for different purposes produces different hashes)
  const hmacHashReset = hashOtp({ target: testPhone, purpose: 'password_reset', rawOtp });
  assert(
    hmacHash !== hmacHashReset,
    'hashOtp() binds purpose: verification vs password_reset produce different hashes'
  );

  // Test 1.8: Timing-safe OTP verification
  assert(
    verifyOtpHash({ target: testPhone, purpose: 'verification', candidateOtp: '482910', storedHash: hmacHash }) === true,
    'verifyOtpHash() returns true for matching candidate'
  );
  assert(
    verifyOtpHash({ target: testPhone, purpose: 'verification', candidateOtp: '482911', storedHash: hmacHash }) === false,
    'verifyOtpHash() returns false for incorrect candidate OTP'
  );
  assert(
    verifyOtpHash({ target: testPhone, purpose: 'verification', candidateOtp: '', storedHash: hmacHash }) === false,
    'verifyOtpHash() safely rejects empty candidate'
  );

  // Test 1.9: Secret validation for OTP_HMAC_SECRET
  const originalHmacSecret = process.env.OTP_HMAC_SECRET;
  try {
    delete process.env.OTP_HMAC_SECRET;
    let missingHmacError = false;
    try {
      getOtpHmacKey();
    } catch (err) {
      missingHmacError = err.message.includes('missing or shorter than 32 characters');
    }
    assert(missingHmacError, 'getOtpHmacKey() rejects missing OTP_HMAC_SECRET without fallback');

    process.env.OTP_HMAC_SECRET = 'short_hmac_secret';
    let weakHmacError = false;
    try {
      getOtpHmacKey();
    } catch (err) {
      weakHmacError = err.message.includes('missing or shorter than 32 characters');
    }
    assert(weakHmacError, 'getOtpHmacKey() rejects weak (<32 char) OTP_HMAC_SECRET');
  } finally {
    process.env.OTP_HMAC_SECRET = originalHmacSecret;
  }

  // Test 1.10: Secret rotation considerations
  // If the server HMAC secret rotates, old OTP hash safely fails verification instead of throwing
  try {
    process.env.OTP_HMAC_SECRET = 'rotated_secret_key_abcdef1234567890abcdef1234567890';
    const verifyAfterRotation = verifyOtpHash({
      target: testPhone,
      purpose: 'verification',
      candidateOtp: '482910',
      storedHash: hmacHash,
    });
    assert(verifyAfterRotation === false, 'verifyOtpHash() safely returns false if HMAC secret was rotated');
  } finally {
    process.env.OTP_HMAC_SECRET = originalHmacSecret;
  }

  // Test 1.11: Masking utilities
  assert(maskPhoneNumber('+919876543210') === '+9198*** ***10', 'maskPhoneNumber() masks Indian phone correctly');
  assert(maskEmail('support@bloodward.com') === 's***t@bloodward.com', 'maskEmail() masks standard email correctly');

  // ----------------------------------------------------
  // SECTION 2: NotificationProvider Model Tests
  // ----------------------------------------------------
  console.log('\n--- Section 2: NotificationProvider Model Tests ---');

  const textBeeProvider = new NotificationProvider({
    providerType: 'sms',
    driver: 'textbee',
    name: 'Primary TextBee Gateway',
    priority: 1,
    dailyLimit: 300,
  });

  textBeeProvider.setCredentials({
    apiKey: 'textbee_test_secret_key_888',
    deviceId: '64fa1b2c3d4e5f6a7b8c9d0e',
  });

  await textBeeProvider.save();

  assert(Boolean(textBeeProvider._id), 'NotificationProvider (TextBee) successfully created and saved');
  assert(
    textBeeProvider.configSummary.hasApiKey === true &&
    textBeeProvider.configSummary.deviceId.includes('...'),
    'Provider stores safe masked configSummary'
  );

  const fetchedProvider = await NotificationProvider.findById(textBeeProvider._id);
  assert(fetchedProvider.encryptedCredentials === undefined, 'encryptedCredentials is excluded from default queries');

  const jsonSerialized = JSON.parse(JSON.stringify(fetchedProvider));
  assert(jsonSerialized.encryptedCredentials === undefined, 'toJSON() strips encryptedCredentials');
  assert(jsonSerialized.credentials === undefined, 'toJSON() strips raw credentials');

  const providerWithSecret = await NotificationProvider.findById(textBeeProvider._id).select('+encryptedCredentials');
  const decryptedCredentials = providerWithSecret.getDecryptedCredentials();
  assert(
    decryptedCredentials.apiKey === 'textbee_test_secret_key_888' &&
    decryptedCredentials.deviceId === '64fa1b2c3d4e5f6a7b8c9d0e',
    'getDecryptedCredentials() successfully decrypts stored credentials'
  );

  const smtpProvider = new NotificationProvider({
    providerType: 'email',
    driver: 'smtp',
    name: 'Primary Gmail SMTP',
    priority: 1,
    dailyLimit: 1000,
  });

  smtpProvider.setCredentials({
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUser: 'noreply@bloodward.com',
    smtpPass: 'app_password_secret_123',
    senderAddress: 'BloodWard <noreply@bloodward.com>',
  });

  await smtpProvider.save();
  assert(Boolean(smtpProvider._id), 'NotificationProvider (SMTP) successfully created');
  assert(
    smtpProvider.configSummary.hasPassword === true &&
    smtpProvider.configSummary.smtpHost === 'smtp.gmail.com',
    'SMTP provider generates safe configSummary without exposing smtpPass'
  );

  let invalidDriverCaught = false;
  try {
    const invalidProvider = new NotificationProvider({
      providerType: 'sms',
      driver: 'smtp',
      name: 'Invalid Combo',
    });
    await invalidProvider.validate();
  } catch (err) {
    invalidDriverCaught = true;
  }
  assert(invalidDriverCaught, 'Pre-validate hook rejects mismatched providerType and driver');

  assert(textBeeProvider.hasQuotaAvailable() === true, 'hasQuotaAvailable() returns true when sentToday < dailyLimit');
  textBeeProvider.sentToday = 300;
  assert(textBeeProvider.hasQuotaAvailable() === false, 'hasQuotaAvailable() returns false when quota exhausted');

  // ----------------------------------------------------
  // SECTION 3: Otp Model Tests
  // ----------------------------------------------------
  console.log('\n--- Section 3: Otp Model Tests ---');

  const plainOtp = '654321';
  const hashedOtp = hashOtp({ target: testPhone, purpose: 'verification', rawOtp: plainOtp });
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 mins
  const resendAvailableAt = new Date(now.getTime() + 60 * 1000); // 60s cooldown

  const otpDoc = new Otp({
    target: testPhone,
    targetType: 'phone',
    purpose: 'verification',
    otpHash: hashedOtp,
    expiresAt,
    resendAvailableAt,
  });

  await otpDoc.save();
  assert(Boolean(otpDoc._id), 'Otp document created and saved successfully with HMAC hash');

  const fetchedOtp = await Otp.findById(otpDoc._id);
  assert(fetchedOtp.otpHash === undefined, 'otpHash is excluded from default queries');
  const otpJson = JSON.parse(JSON.stringify(fetchedOtp));
  assert(otpJson.otpHash === undefined, 'toJSON() strips otpHash');
  assert(otpJson.otp === undefined, 'Plaintext otp does not exist on document');

  const otpWithHash = await Otp.findById(otpDoc._id).select('+otpHash');
  assert(otpWithHash.verify(plainOtp) === true, 'Otp.verify() returns true for matching OTP via HMAC');
  assert(otpWithHash.verify('000000') === false, 'Otp.verify() returns false for incorrect OTP');

  assert(otpDoc.isExpired() === false, 'isExpired() returns false for active OTP');
  assert(otpDoc.isCooldownActive() === true, 'isCooldownActive() returns true within 60s cooldown');
  assert(otpDoc.hasExceededMaxAttempts() === false, 'hasExceededMaxAttempts() returns false initially');

  otpDoc.attempts = 3;
  assert(otpDoc.hasExceededMaxAttempts() === true, 'hasExceededMaxAttempts() returns true when attempts >= 3');

  otpDoc.isUsed = true;
  otpDoc.usedAt = new Date();
  await otpDoc.save();
  const reloadedOtp = await Otp.findById(otpDoc._id);
  assert(reloadedOtp.isUsed === true && Boolean(reloadedOtp.usedAt), 'Otp records single-use status');

  const otpIndexes = await Otp.collection.indexes();
  const ttlIndex = otpIndexes.find((idx) => idx.expireAfterSeconds === 0 && idx.key && idx.key.expiresAt === 1);
  assert(Boolean(ttlIndex), 'Otp collection has valid TTL index on { expiresAt: 1 }');

  // ----------------------------------------------------
  // SECTION 4: NotificationLog Model & False-Positive Regression Tests
  // ----------------------------------------------------
  console.log('\n--- Section 4: NotificationLog Model & False-Positive Regression Tests ---');

  // Test 4.1: Legitimate BloodWard IDs preserved without rejection
  const logWithEntityIds = new NotificationLog({
    channel: 'sms',
    purpose: 'request_dispatch',
    recipientMasked: maskPhoneNumber(testPhone),
    status: 'delivered',
    errorDetails: 'Dispatched for request BW-REQ-000456 by donor BW-DON-000123 at hospital BW-HSP-000021',
    metadata: {
      requestId: 'BW-REQ-000456',
      donorId: 'BW-DON-000123',
      hospitalId: 'BW-HSP-000021',
    },
  });
  await logWithEntityIds.save();
  assert(Boolean(logWithEntityIds._id), 'Preserves legitimate BloodWard IDs (BW-DON-000123, BW-REQ-000456, BW-HSP-000021)');

  // Test 4.2: Ordinary Indian PIN codes and timestamps preserved without rejection
  const logWithPinAndTimestamps = new NotificationLog({
    channel: 'email',
    purpose: 'donor_alert',
    recipientMasked: maskEmail(testEmail),
    status: 'delivered',
    errorDetails: 'Delivered to recipient address near PIN code 560001 (central Bangalore 110001 area)',
    metadata: {
      postalCode: '560001',
      dispatchTimestamp: 1700000000000,
      latencyMs: 150000,
    },
  });
  await logWithPinAndTimestamps.save();
  assert(Boolean(logWithPinAndTimestamps._id), 'Preserves ordinary Indian PIN codes (560001, 110001) and numeric timestamps/latencies');

  // Test 4.3: Pre-save hook detects and blocks explicit OTP leakage in errorDetails
  let rawOtpLeakCaught = false;
  try {
    const rawOtpLog = new NotificationLog({
      channel: 'sms',
      purpose: 'verification',
      recipientMasked: '+9198*** ***10',
      status: 'failed',
      errorDetails: 'Delivery failed for OTP 982145 via gateway',
    });
    await rawOtpLog.save();
  } catch (err) {
    rawOtpLeakCaught = err.message.includes('explicit OTP disclosure detected');
  }
  assert(rawOtpLeakCaught, 'Pre-save hook detects and blocks explicit OTP disclosure ("OTP 982145")');

  // Test 4.4: Pre-save hook blocks sensitive credential keys
  let credentialLeakCaught = false;
  try {
    const leakedKeyLog = new NotificationLog({
      channel: 'email',
      purpose: 'test',
      recipientMasked: 'u***r@example.com',
      status: 'failed',
      metadata: {
        smtpPass: 'leaked_password_value',
      },
    });
    await leakedKeyLog.save();
  } catch (err) {
    credentialLeakCaught = err.message.includes('sensitive credential key');
  }
  assert(credentialLeakCaught, 'Pre-save hook blocks sensitive credentials in log metadata');

  // Test 4.5: Safe logger NotificationLog.recordLog() never crashes caller on sensitive/invalid inputs
  const recordedLog = await NotificationLog.recordLog({
    channel: 'sms',
    purpose: 'verification',
    recipientMasked: '+9198*** ***10',
    status: 'delivered',
    errorDetails: 'Gateway returned error with leaked OTP: 654321',
    metadata: {
      apiKey: 'secret_key_123',
      requestId: 'BW-REQ-000456',
    },
  });
  assert(
    recordedLog !== null &&
    recordedLog.errorDetails.includes('[REDACTED_OTP]') &&
    recordedLog.metadata.apiKey === '[REDACTED]',
    'recordLog() safely redacts explicit OTPs and sensitive keys without throwing or crashing delivery flow'
  );

  // Test 4.6: TTL index verification on NotificationLog collection
  const logIndexes = await NotificationLog.collection.indexes();
  const logTtlIndex = logIndexes.find((idx) => idx.expireAfterSeconds > 0 && idx.key && idx.key.createdAt === 1);
  assert(Boolean(logTtlIndex), 'NotificationLog collection has valid 30-day TTL index on { createdAt: 1 }');

  console.log('\n==================================================');
  console.log(`FINAL RESULTS: ${passed}/${total}`);
  console.log('==================================================');

  await mongoose.disconnect();
  process.exit(passed === total ? 0 : 1);
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
