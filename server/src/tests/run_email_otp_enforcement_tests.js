import './testDb.js';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import connectDB from '../config/db.js';
import User from '../models/user.model.js';
import authRouter from '../routes/auth.routes.js';
import notificationManager from '../services/notification/notificationManager.js';
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
  console.log('DIRECT REGISTRATION & PASSWORD RESET ENFORCEMENT');
  console.log('==================================================\n');

  const sentResetEmails = [];
  const origSendEmail = notificationManager.sendEmail;
  notificationManager.sendEmail = async (params) => {
    sentResetEmails.push(params);
    return { success: true, messageId: `mock-reset-${Date.now()}` };
  };

  try {
    await connectDB();

    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;

    await User.deleteMany({ email: /@test-auth-enforce\.com$/i });

    console.log('\n--- 1. Direct Registration & Role Spoofing Prevention ---');
    const donorRes = await request('/api/auth/register/donor', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Enforce Donor',
        email: 'donor@test-auth-enforce.com',
        phone: '9876543201',
        password: 'Password123!',
        bloodGroup: 'O+',
        dateOfBirth: '1995-05-15',
        state: 'Maharashtra',
        city: 'Mumbai',
        role: 'admin',
      }),
    });
    assert(donorRes.status === 201, 'Direct donor registration succeeds with HTTP 201');
    assert(donorRes.data.user?.role === 'donor', 'Client-supplied role: admin is ignored and forced to donor');

    const recRes = await request('/api/auth/register/recipient', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Enforce Recipient',
        email: 'recipient@test-auth-enforce.com',
        phone: '9876543202',
        password: 'Password123!',
        state: 'Maharashtra',
        city: 'Mumbai',
        role: 'admin',
      }),
    });
    assert(recRes.status === 201, 'Direct recipient registration succeeds with HTTP 201');
    assert(recRes.data.user?.role === 'recipient', 'Client-supplied role: admin is ignored and forced to recipient');

    const dupRes = await request('/api/auth/register/donor', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Duplicate Donor',
        email: 'donor@test-auth-enforce.com',
        phone: '9876543203',
        password: 'Password123!',
        bloodGroup: 'O+',
        dateOfBirth: '1995-05-15',
        state: 'Maharashtra',
        city: 'Mumbai',
      }),
    });
    assert(dupRes.status === 400 || dupRes.status === 409, 'Duplicate email registration is rejected');

    console.log('\n--- 2. Legacy OTP Routes Disabled ---');
    const legacyOtpRes = await request('/api/otp/verify-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email: 'donor@test-auth-enforce.com', otp: '123456' }),
    });
    assert(legacyOtpRes.status === 404, 'Legacy /api/otp/verify-email-otp returns 404');

    console.log('\n--- 3. Password Reset Token Enforcement & Session Invalidation ---');
    const loginBefore = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'donor@test-auth-enforce.com',
        password: 'Password123!',
        loginRole: 'donor',
      }),
    });
    assert(loginBefore.status === 200, 'Donor login before password reset succeeds');
    const oldCookie = loginBefore.headers.get('set-cookie')?.split(';')[0];

    const fpRes = await request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'donor@test-auth-enforce.com' }),
    });
    assert(fpRes.status === 200, 'Forgot password returns HTTP 200');
    assert(!fpRes.data.resetUrl, 'Reset URL is never exposed in API JSON response');
    assert(sentResetEmails.length === 1 && sentResetEmails[0].to === 'donor@test-auth-enforce.com', 'Stubbed email provider received password reset email');

    const resetTokenMatch = sentResetEmails[0].text?.match(/reset-password\/([a-f0-9]+)/i) || sentResetEmails[0].html?.match(/reset-password\/([a-f0-9]+)/i);
    const rawToken = resetTokenMatch ? resetTokenMatch[1] : null;
    assert(Boolean(rawToken), 'Password reset email contains reset token');

    const badReset = await request('/api/auth/reset-password/invalidtoken12345', {
      method: 'POST',
      body: JSON.stringify({ password: 'NewPassword123!' }),
    });
    assert(badReset.status === 400, 'Invalid reset token is rejected with HTTP 400');

    const goodReset = await request(`/api/auth/reset-password/${rawToken}`, {
      method: 'POST',
      body: JSON.stringify({ password: 'NewPassword123!' }),
    });
    assert(goodReset.status === 200, 'Valid reset token updates password with HTTP 200');

    const reuseReset = await request(`/api/auth/reset-password/${rawToken}`, {
      method: 'POST',
      body: JSON.stringify({ password: 'AnotherPassword123!' }),
    });
    assert(reuseReset.status === 400, 'Reused reset token is rejected (single-use)');

    if (oldCookie) {
      const meAfter = await request('/api/auth/me', {
        headers: { Cookie: oldCookie },
      });
      assert(!meAfter.data?.isAuthenticated, 'Previous session cookie is invalidated after password reset');
    }
  } catch (err) {
    console.error('Suite error:', err);
    failed++;
  } finally {
    notificationManager.sendEmail = origSendEmail;
    await User.deleteMany({ email: /@test-auth-enforce\.com$/i });
    if (server) server.close();
    if (mongoose.connection.readyState === 1) await mongoose.disconnect();
    console.log(`\nFINAL RESULTS: ${passed}/${passed + failed}`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
