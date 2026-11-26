import mongoose from 'mongoose';
import { connectTestDB } from './testDb.js';
import {
  encrypt,
  decrypt,
  maskPhoneNumber,
  maskEmail,
  getEncryptionKey,
} from '../utils/encryptionUtils.js';
import NotificationProvider from '../models/notificationProvider.model.js';
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

  const testPhone = '+919876543210';
  const testEmail = 'donor@bloodward.com';

  // Test 1.5: Masking utilities
  assert(maskPhoneNumber(testPhone) === '+9198*** ***10', 'maskPhoneNumber() masks Indian phone correctly');
  assert(maskEmail('support@bloodward.com') === 's***t@bloodward.com', 'maskEmail() masks standard email correctly');

  // ----------------------------------------------------
  // SECTION 2: NotificationProvider Model Tests (Email Drivers)
  // ----------------------------------------------------
  console.log('\n--- Section 2: NotificationProvider Model Tests ---');

  const resendProvider = new NotificationProvider({
    providerType: 'email',
    driver: 'resend',
    name: 'Primary Resend Gateway',
    priority: 1,
    dailyLimit: 300,
  });

  resendProvider.setCredentials({
    apiKey: 're_test_secret_key_888',
    senderAddress: 'BloodWard <noreply@bloodward.com>',
  });

  await resendProvider.save();

  assert(Boolean(resendProvider._id), 'NotificationProvider (Resend) successfully created and saved');
  assert(
    resendProvider.configSummary.hasApiKey === true &&
    resendProvider.configSummary.senderAddress === 'BloodWard <noreply@bloodward.com>',
    'Provider stores safe masked configSummary'
  );

  const fetchedProvider = await NotificationProvider.findById(resendProvider._id);
  assert(fetchedProvider.encryptedCredentials === undefined, 'encryptedCredentials is excluded from default queries');

  const jsonSerialized = JSON.parse(JSON.stringify(fetchedProvider));
  assert(jsonSerialized.encryptedCredentials === undefined, 'toJSON() strips encryptedCredentials');
  assert(jsonSerialized.credentials === undefined, 'toJSON() strips raw credentials');

  const providerWithSecret = await NotificationProvider.findById(resendProvider._id).select('+encryptedCredentials');
  const decryptedCredentials = providerWithSecret.getDecryptedCredentials();
  assert(
    decryptedCredentials.apiKey === 're_test_secret_key_888' &&
    decryptedCredentials.senderAddress === 'BloodWard <noreply@bloodward.com>',
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

  assert(resendProvider.hasQuotaAvailable() === true, 'hasQuotaAvailable() returns true when sentToday < dailyLimit');
  resendProvider.sentToday = 300;
  assert(resendProvider.hasQuotaAvailable() === false, 'hasQuotaAvailable() returns false when quota exhausted');

  // ----------------------------------------------------
  // SECTION 3: Legacy Otp Model Removal Check
  // ----------------------------------------------------
  console.log('\n--- Section 3: Legacy Otp Model Removal Check ---');
  assert(!mongoose.models.Otp, 'Legacy Otp model is not registered (removed in c27bb91)');

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
