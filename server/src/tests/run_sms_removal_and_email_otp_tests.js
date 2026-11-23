import './testDb.js';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import connectDB from '../config/db.js';
import User from '../models/user.model.js';
import Otp from '../models/otp.model.js';
import NotificationProvider from '../models/notificationProvider.model.js';
import authRouter from '../routes/auth.routes.js';
import otpRouter from '../routes/otp.routes.js';
import adminRouter from '../routes/admin.routes.js';

import { generateAndSendOtp, verifyOtp } from '../services/otpService.js';

import notFoundHandler from '../middleware/notFoundMiddleware.js';
import errorHandler from '../middleware/errorMiddleware.js';
import sanitizeMiddleware from '../middleware/sanitizeMiddleware.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(helmet());
app.use(sanitizeMiddleware);
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

app.use('/api/auth', authRouter);
app.use('/api/otp', otpRouter);
app.use('/api/admin', adminRouter);
app.use(notFoundHandler);
app.use(errorHandler);

let server;
let baseUrl;
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[✅ PASS] ${message}`);
    passed++;
  } else {
    console.error(`[❌ FAIL] ${message}`);
    failed++;
  }
}

async function request(endpoint, options = {}) {
  const url = `${baseUrl}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data, headers: response.headers };
}

async function runTests() {
  console.log('==================================================');
  console.log('SMS REMOVAL & EMAIL-ONLY VERIFICATION TEST SUITE');
  console.log('==================================================\n');

  try {
    await connectDB();

    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;

    // Clean up test data
    await User.deleteMany({ email: /@test-sms-removal\.com$/i });
    await Otp.deleteMany({ target: /@test-sms-removal\.com$/i });
    await NotificationProvider.deleteMany({ name: /Test Provider SMS Removal/i });

    console.log('\n--- 1. Verification of Removed SMS Endpoints ---');
    const sendPhoneRes = await request('/api/otp/send-phone-otp', {
      method: 'POST',
      body: JSON.stringify({ phone: '9876543210' }),
    });
    assert(sendPhoneRes.status === 404, 'POST /api/otp/send-phone-otp returns 404 Not Found (endpoint removed)');

    const verifyPhoneRes = await request('/api/otp/verify-phone-otp', {
      method: 'POST',
      body: JSON.stringify({ phone: '9876543210', otp: '123456' }),
    });
    assert(verifyPhoneRes.status === 404, 'POST /api/otp/verify-phone-otp returns 404 Not Found (endpoint removed)');

    console.log('\n--- 2. File System Deletion Verification ---');
    const notificationServicesDir = path.join(__dirname, '../services/notification');
    const removedFiles = [
      'capcom6SmsProvider.js',
      'capcom6Encryption.js',
      'textBeeSmsProvider.js',
      'smsService.js',
    ];

    for (const file of removedFiles) {
      const fullPath = path.join(notificationServicesDir, file);
      const exists = fs.existsSync(fullPath);
      assert(!exists, `SMS driver file "${file}" is confirmed deleted`);
    }

    console.log('\n--- 3. otpService Rejection of Phone Requests ---');
    const phoneDispatchResult = await generateAndSendOtp({
      target: '9876543210',
      targetType: 'phone',
      purpose: 'verification',
    });
    assert(phoneDispatchResult.success === false, 'otpService rejects phone OTP dispatch');
    assert(phoneDispatchResult.errorCode === 'PHONE_OTP_DISCONTINUED', 'Rejection code is PHONE_OTP_DISCONTINUED');

    const phoneVerifyResult = await verifyOtp({
      target: '9876543210',
      targetType: 'phone',
      purpose: 'verification',
      otp: '123456',
    });
    assert(phoneVerifyResult.success === false, 'otpService rejects phone OTP verification');
    assert(phoneVerifyResult.errorCode === 'PHONE_OTP_DISCONTINUED', 'Rejection code is PHONE_OTP_DISCONTINUED');

    console.log('\n--- 4. Email-Only OTP Verification Workflow ---');
    const testEmail = 'recipient@test-sms-removal.com';

    // Send email OTP
    const emailDispatchRes = await request('/api/otp/send-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email: testEmail, purpose: 'verification' }),
    });

    assert(emailDispatchRes.status === 200, 'POST /api/otp/send-email-otp succeeds (HTTP 200)');
    assert(emailDispatchRes.data.success === true, 'Response reports success: true');
    assert(typeof emailDispatchRes.data.testOtp === 'string', 'Test OTP delivered for verification');
    const rawOtp = emailDispatchRes.data.testOtp;

    // Verify incorrect OTP
    const badVerifyRes = await request('/api/otp/verify-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email: testEmail, otp: '000000', purpose: 'verification' }),
    });
    assert(badVerifyRes.status === 400, 'Incorrect OTP rejected with HTTP 400');
    assert(badVerifyRes.data.errorCode === 'INCORRECT_OTP', 'errorCode is INCORRECT_OTP');
    assert(badVerifyRes.data.attemptsRemaining === 2, 'Attempts remaining decremented to 2');

    // Verify correct OTP
    const goodVerifyRes = await request('/api/otp/verify-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email: testEmail, otp: rawOtp, purpose: 'verification' }),
    });
    assert(goodVerifyRes.status === 200, 'Correct OTP verified successfully (HTTP 200)');
    assert(goodVerifyRes.data.success === true, 'Response indicates success: true');

    // Replay attack prevention
    const replayVerifyRes = await request('/api/otp/verify-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email: testEmail, otp: rawOtp, purpose: 'verification' }),
    });
    assert(replayVerifyRes.status === 400, 'Replayed OTP rejected with HTTP 400');

    console.log('\n--- 5. Preservation of Contact Phone Numbers in Registrations ---');
    // Verify donor email OTP before registration
    const donorOtpSend = await request('/api/otp/send-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email: 'donor@test-sms-removal.com', purpose: 'verification' }),
    });
    await request('/api/otp/verify-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email: 'donor@test-sms-removal.com', otp: donorOtpSend.data.testOtp, purpose: 'verification' }),
    });

    // Register Donor: phone number provided without SMS verification
    const donorRes = await request('/api/auth/register/donor', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Arun Kumar',
        email: 'donor@test-sms-removal.com',
        password: 'Password123!',
        phone: '9876543210',
        bloodGroup: 'O+',
        dateOfBirth: '1995-05-15',
        state: 'Maharashtra',
        city: 'Mumbai',
      }),
    });

    assert(donorRes.status === 201, 'Donor registered successfully without phone OTP gate');
    assert(donorRes.data.user.phone === '9876543210', 'Donor contact phone number preserved accurately in database');

    // Verify recipient email OTP before registration
    const recOtpSend = await request('/api/otp/send-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email: 'recipient2@test-sms-removal.com', purpose: 'verification' }),
    });
    await request('/api/otp/verify-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email: 'recipient2@test-sms-removal.com', otp: recOtpSend.data.testOtp, purpose: 'verification' }),
    });

    // Register Recipient: phone number provided without SMS verification
    const recipientRes = await request('/api/auth/register/recipient', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Sunita Patil',
        email: 'recipient2@test-sms-removal.com',
        password: 'Password123!',
        phone: '9123456780',
        state: 'Karnataka',
        location: 'Bengaluru',
      }),
    });

    assert(recipientRes.status === 201, 'Recipient registered successfully without phone OTP gate');
    assert(recipientRes.data.user.phone === '9123456780', 'Recipient contact phone number preserved accurately in database');

    console.log('\n--- 6. Notification Provider Rejection of SMS Configuration ---');
    // Admin login
    const adminUser = await User.create({
      fullName: 'Provider Admin',
      email: 'admin@test-sms-removal.com',
      password: 'AdminPassword123!',
      role: 'admin',
      phone: '9876500099',
    });

    const adminLoginRes = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@test-sms-removal.com',
        password: 'AdminPassword123!',
      }),
    });
    const adminCookie = adminLoginRes.headers.get('set-cookie');

    const smsProviderAttempt = await request('/api/admin/notification-providers', {
      method: 'POST',
      headers: { Cookie: adminCookie },
      body: JSON.stringify({
        name: 'Test Provider SMS Removal',
        providerType: 'sms',
        driver: 'capcom6',
        credentials: {
          login: 'testuser',
          password: 'testpassword',
        },
      }),
    });

    assert(smsProviderAttempt.status === 400, 'Attempting to configure SMS provider is rejected with HTTP 400');
    assert(smsProviderAttempt.data.message.includes('SMS notification infrastructure has been discontinued'), 'Error message confirms SMS infrastructure is discontinued');

    console.log('\n==================================================');
    console.log(`FINAL RESULTS: ${passed}/${passed + failed}`);
    console.log(`TOTAL PASS: ${passed}`);
    console.log(`TOTAL FAIL: ${failed}`);
    console.log('==================================================');

  } catch (err) {
    console.error('Unhandled test suite error:', err);
    failed++;
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
