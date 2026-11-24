import './testDb.js';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import connectDB from '../config/db.js';
import User from '../models/user.model.js';
import Otp from '../models/otp.model.js';
import OtpThrottle from '../models/otpThrottle.model.js';
import NotificationProvider from '../models/notificationProvider.model.js';
import authRouter from '../routes/auth.routes.js';
import otpRouter from '../routes/otp.routes.js';

import { generateAndSendOtp, verifyOtp, isRegistrationOtpVerified } from '../services/otpService.js';
import notFoundHandler from '../middleware/notFoundMiddleware.js';
import errorHandler from '../middleware/errorMiddleware.js';
import sanitizeMiddleware from '../middleware/sanitizeMiddleware.js';

dotenv.config();

const app = express();
app.use(helmet());
app.use(sanitizeMiddleware);
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

app.use('/api/auth', authRouter);
app.use('/api/otp', otpRouter);
app.use(notFoundHandler);
app.use(errorHandler);

let server;
let baseUrl;
let passed = 0;
let failed = 0;

function assert(condition, message, extra = '') {
  if (condition) {
    console.log(`[✅ PASS] ${message}`);
    passed++;
  } else {
    console.error(`[❌ FAIL] ${message} ${extra}`);
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
  console.log('EMAIL OTP MANDATORY ENFORCEMENT & REGISTRATION SUITE');
  console.log('==================================================\n');

  try {
    await connectDB();

    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;

    // Clean up test data
    await User.deleteMany({ email: /@test-otp-enforce\.com$/i });
    await Otp.deleteMany({ target: /@test-otp-enforce\.com$/i });
    await OtpThrottle.deleteMany({ target: /@test-otp-enforce\.com$/i });
    await NotificationProvider.deleteMany({});

    // ----------------------------------------------------
    // TEST SECTION 1: Direct Registration Bypass Prevention
    // ----------------------------------------------------
    console.log('\n--- 1. Direct Registration Bypass Prevention ---');

    // 1.1 Donor registration without prior email OTP verification must fail with 400
    const donorUnverifiedEmail = 'donor_unverified@test-otp-enforce.com';
    const donorRes1 = await request('/api/auth/register/donor', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Unverified Donor',
        email: donorUnverifiedEmail,
        phone: '9876543201',
        password: 'Password123!',
        bloodGroup: 'O+',
        dateOfBirth: '1995-05-15',
        state: 'Maharashtra',
        city: 'Mumbai',
      }),
    });
    assert(donorRes1.status === 400, 'Direct donor registration without email OTP returns HTTP 400');
    assert(
      donorRes1.data.message && donorRes1.data.message.includes('Email verification is mandatory'),
      'Direct donor registration returns descriptive error message'
    );

    // 1.2 Donor registration with client-supplied emailVerified: true must NOT bypass verification
    const donorSpoofRes = await request('/api/auth/register/donor', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Spoofed Donor',
        email: 'donor_spoof@test-otp-enforce.com',
        phone: '9876543202',
        password: 'Password123!',
        bloodGroup: 'A+',
        dateOfBirth: '1995-05-15',
        state: 'Maharashtra',
        city: 'Mumbai',
        emailVerified: true,
        isEmailVerified: true,
      }),
    });
    assert(donorSpoofRes.status === 400, 'Client-supplied emailVerified: true cannot bypass donor verification');

    // 1.3 Recipient registration without prior email OTP verification must fail with 400
    const recUnverifiedEmail = 'recipient_unverified@test-otp-enforce.com';
    const recRes1 = await request('/api/auth/register/recipient', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Unverified Recipient',
        email: recUnverifiedEmail,
        phone: '9876543203',
        password: 'Password123!',
        state: 'Karnataka',
        location: 'Bengaluru',
      }),
    });
    assert(recRes1.status === 400, 'Direct recipient registration without email OTP returns HTTP 400');
    assert(
      recRes1.data.message && recRes1.data.message.includes('Email verification is mandatory'),
      'Direct recipient registration returns descriptive error message'
    );

    // 1.4 Recipient registration with client-supplied isEmailVerified: true must NOT bypass verification
    const recSpoofRes = await request('/api/auth/register/recipient', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Spoofed Recipient',
        email: 'recipient_spoof@test-otp-enforce.com',
        phone: '9876543204',
        password: 'Password123!',
        state: 'Karnataka',
        location: 'Bengaluru',
        isEmailVerified: true,
      }),
    });
    assert(recSpoofRes.status === 400, 'Client-supplied isEmailVerified: true cannot bypass recipient verification');

    // ----------------------------------------------------
    // TEST SECTION 2: OTP Dispatch, Validation & Security
    // ----------------------------------------------------
    console.log('\n--- 2. OTP Dispatch, Validation & Security ---');

    const validDonorEmail = 'donor_valid@test-otp-enforce.com';

    // 2.1 Send OTP to email
    const sendOtpRes = await request('/api/otp/send-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email: validDonorEmail, purpose: 'verification' }),
    });
    assert(sendOtpRes.status === 200, 'POST /api/otp/send-email-otp returns HTTP 200');
    assert(sendOtpRes.data.success === true, 'send-email-otp reports success: true');
    assert(typeof sendOtpRes.data.testOtp === 'string', 'Test OTP delivered in test environment');
    const validOtp = sendOtpRes.data.testOtp;

    // 2.2 Resend cooldown enforcement (subsequent request within 60s returns 429)
    const cooldownRes = await request('/api/otp/send-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email: validDonorEmail, purpose: 'verification' }),
    });
    assert(cooldownRes.status === 429, 'Immediate resend within cooldown returns HTTP 429');
    assert(cooldownRes.data.inCooldown === true, 'Response identifies inCooldown: true');

    // 2.3 Incorrect OTP is rejected with remaining attempts count
    const wrongOtpRes = await request('/api/otp/verify-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email: validDonorEmail, otp: '111111', purpose: 'verification' }),
    });
    assert(wrongOtpRes.status === 400, 'Incorrect OTP rejected with HTTP 400');
    assert(wrongOtpRes.data.errorCode === 'INCORRECT_OTP', 'errorCode is INCORRECT_OTP');
    assert(wrongOtpRes.data.attemptsRemaining === 2, 'attemptsRemaining decremented to 2');

    // 2.4 Verify with correct OTP succeeds
    const correctOtpRes = await request('/api/otp/verify-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email: validDonorEmail, otp: validOtp, purpose: 'verification' }),
    });
    assert(correctOtpRes.status === 200, 'Correct OTP verified successfully (HTTP 200)');
    assert(correctOtpRes.data.success === true, 'Verification reports success: true');

    // 2.5 Replay attack prevention: Cannot verify the same OTP a second time
    const replayVerifyRes = await request('/api/otp/verify-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email: validDonorEmail, otp: validOtp, purpose: 'verification' }),
    });
    assert(replayVerifyRes.status === 400, 'Replayed OTP verification is rejected with HTTP 400');

    // ----------------------------------------------------
    // TEST SECTION 3: Changing Email Invalidates Verification
    // ----------------------------------------------------
    console.log('\n--- 3. Changing Email Invalidates Verification ---');

    // 3.1 validDonorEmail was verified above. Registering with a DIFFERENT email must fail
    const mismatchedEmailRes = await request('/api/auth/register/donor', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Mismatched Donor',
        email: 'different_email@test-otp-enforce.com', // Not verified!
        phone: '9876543205',
        password: 'Password123!',
        bloodGroup: 'B+',
        dateOfBirth: '1995-05-15',
        state: 'Delhi',
        city: 'New Delhi',
      }),
    });
    assert(mismatchedEmailRes.status === 400, 'Registration with unverified email fails even if another email was verified');

    // ----------------------------------------------------
    // TEST SECTION 4: Legitimate Registration with Verified Email
    // ----------------------------------------------------
    console.log('\n--- 4. Legitimate Registration with Verified Email ---');

    // 4.1 Register Donor with verified validDonorEmail succeeds
    const donorSuccessRes = await request('/api/auth/register/donor', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Verified Donor User',
        email: validDonorEmail,
        phone: '9876543206',
        password: 'Password123!',
        bloodGroup: 'O+',
        dateOfBirth: '1995-05-15',
        state: 'Maharashtra',
        city: 'Mumbai',
      }),
    });
    assert(donorSuccessRes.status === 201, 'Donor with verified email registers successfully (HTTP 201)');
    assert(donorSuccessRes.data.user.isEmailVerified === true, 'Registered donor has isEmailVerified: true');
    assert(donorSuccessRes.data.user.phone === '9876543206', 'Ordinary contact phone number preserved');

    // 4.2 Single-use enforcement: The verified OTP was consumed upon user creation
    // Attempting to register another account with the same email or reusing the consumed OTP fails
    const isStillVerified = await isRegistrationOtpVerified({
      target: validDonorEmail,
      targetType: 'email',
      purpose: 'verification',
    });
    assert(isStillVerified === false, 'Consumed registration OTP is no longer marked verified');

    // 4.3 Recipient verification and registration workflow
    const validRecEmail = 'recipient_valid@test-otp-enforce.com';
    const recOtpSend = await request('/api/otp/send-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email: validRecEmail, purpose: 'verification' }),
    });
    assert(recOtpSend.status === 200, 'Recipient send-email-otp succeeds');
    const recOtp = recOtpSend.data.testOtp;

    const recOtpVerify = await request('/api/otp/verify-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email: validRecEmail, otp: recOtp, purpose: 'verification' }),
    });
    assert(recOtpVerify.status === 200, 'Recipient verify-email-otp succeeds');

    const recSuccessRes = await request('/api/auth/register/recipient', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Verified Recipient User',
        email: validRecEmail,
        phone: '9876543207',
        password: 'Password123!',
        state: 'Karnataka',
        location: 'Bengaluru',
      }),
    });
    assert(recSuccessRes.status === 201, 'Recipient with verified email registers successfully (HTTP 201)');
    assert(recSuccessRes.data.user.isEmailVerified === true, 'Registered recipient has isEmailVerified: true');

    // ----------------------------------------------------
    // TEST SECTION 5: Brute Force & Deactivation Lockout
    // ----------------------------------------------------
    console.log('\n--- 5. Brute Force & Deactivation Lockout ---');

    const bruteEmail = 'brute_force@test-otp-enforce.com';
    const bruteSendRes = await request('/api/otp/send-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email: bruteEmail, purpose: 'verification' }),
    });
    assert(bruteSendRes.status === 200, 'OTP sent for brute force lockout test');

    // Fail attempt 1
    await request('/api/otp/verify-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email: bruteEmail, otp: '000001', purpose: 'verification' }),
    });
    // Fail attempt 2
    await request('/api/otp/verify-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email: bruteEmail, otp: '000002', purpose: 'verification' }),
    });
    // Fail attempt 3 (should lock out / deactivate)
    const lockoutRes = await request('/api/otp/verify-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email: bruteEmail, otp: '000003', purpose: 'verification' }),
    });
    assert(lockoutRes.status === 400, '3rd failed attempt returns HTTP 400');
    assert(lockoutRes.data.errorCode === 'MAX_ATTEMPTS_EXCEEDED', 'Deactivation errorCode is MAX_ATTEMPTS_EXCEEDED');

    // Ensure deactivated OTP is NOT marked as verified in isRegistrationOtpVerified
    const isBruteVerified = await isRegistrationOtpVerified({
      target: bruteEmail,
      targetType: 'email',
      purpose: 'verification',
    });
    assert(isBruteVerified === false, 'Deactivated OTP cannot satisfy isRegistrationOtpVerified');

    // Registration with bruteEmail must still fail
    const bruteRegRes = await request('/api/auth/register/donor', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Brute Donor',
        email: bruteEmail,
        phone: '9876543208',
        password: 'Password123!',
        bloodGroup: 'AB+',
        dateOfBirth: '1995-05-15',
        state: 'Punjab',
        city: 'Amritsar',
      }),
    });
    assert(bruteRegRes.status === 400, 'Registration after OTP deactivation is rejected with HTTP 400');

    // ----------------------------------------------------
    // TEST SECTION 6: Forgot-Password Email OTP Flow
    // ----------------------------------------------------
    console.log('\n--- 6. Forgot-Password Email OTP Flow ---');

    // validDonorEmail has an existing registered account
    const forgotOtpRes = await request('/api/auth/forgot-password-otp', {
      method: 'POST',
      body: JSON.stringify({ email: validDonorEmail }),
    });
    assert(forgotOtpRes.status === 200, 'POST /api/auth/forgot-password-otp succeeds (HTTP 200)');
    assert(typeof forgotOtpRes.data.testOtp === 'string', 'Test recovery OTP delivered');
    const recoveryOtp = forgotOtpRes.data.testOtp;

    // Reset password with wrong OTP fails
    const badResetRes = await request('/api/auth/reset-password-otp', {
      method: 'POST',
      body: JSON.stringify({
        email: validDonorEmail,
        otp: '999999',
        password: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      }),
    });
    assert(badResetRes.status === 400, 'Reset password with incorrect OTP fails with HTTP 400');

    // Reset password with valid OTP succeeds
    const goodResetRes = await request('/api/auth/reset-password-otp', {
      method: 'POST',
      body: JSON.stringify({
        email: validDonorEmail,
        otp: recoveryOtp,
        password: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      }),
    });
    assert(goodResetRes.status === 200, 'Reset password with valid OTP succeeds (HTTP 200)');

    // Log in with new password succeeds
    const loginRes = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: validDonorEmail,
        password: 'NewPassword123!',
      }),
    });
    assert(loginRes.status === 200, 'Login succeeds with updated password after OTP reset');

    // ----------------------------------------------------
    // TEST SECTION 7: Prevent Sending Verification OTP to Existing Accounts
    // ----------------------------------------------------
    console.log('\n--- 7. Existing Account Verification OTP Protection ---');

    const duplicateOtpRes = await request('/api/otp/send-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email: validDonorEmail, purpose: 'verification' }),
    });
    assert(duplicateOtpRes.status === 400, 'Attempting to send registration verification OTP for existing account is rejected (400)');
    assert(
      duplicateOtpRes.data.message && duplicateOtpRes.data.message.includes('already exists'),
      'Clear message informing user to log in instead'
    );

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
