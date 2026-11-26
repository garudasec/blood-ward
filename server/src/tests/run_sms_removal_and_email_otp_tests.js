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
import NotificationProvider from '../models/notificationProvider.model.js';
import authRouter from '../routes/auth.routes.js';
import adminRouter from '../routes/admin.routes.js';

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
  console.log('SMS REMOVAL & EMAIL-ONLY INFRASTRUCTURE TEST SUITE');
  console.log('==================================================\n');

  try {
    await connectDB();

    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;

    await User.deleteMany({ email: /@test-sms-removal\.com$/i });
    await NotificationProvider.deleteMany({});

    console.log('\n--- 1. Verification of Removed SMS & Legacy OTP Endpoints ---');
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

    const sendEmailOtpRes = await request('/api/otp/send-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@test-sms-removal.com' }),
    });
    assert(sendEmailOtpRes.status === 404, 'POST /api/otp/send-email-otp returns 404 Not Found (OTP routes removed)');

    console.log('\n--- 2. File System Deletion Verification ---');
    const notificationServicesDir = path.join(__dirname, '../services/notification');
    const removedFiles = [
      'capcom6SmsProvider.js',
      'capcom6Encryption.js',
      'textBeeSmsProvider.js',
      'smsService.js',
    ];
    for (const file of removedFiles) {
      const exists = fs.existsSync(path.join(notificationServicesDir, file));
      assert(!exists, `SMS driver file "${file}" is confirmed deleted`);
    }

    assert(!fs.existsSync(path.join(__dirname, '../models/otp.model.js')), 'Legacy otp.model.js is confirmed deleted');
    assert(!fs.existsSync(path.join(__dirname, '../routes/otp.routes.js')), 'Legacy otp.routes.js is confirmed deleted');

    console.log('\n--- 3. Email-Only NotificationProvider & Direct Registration ---');
    const smsProv = new NotificationProvider({
      name: 'Invalid SMS Provider',
      providerType: 'sms',
      driver: 'smtp',
      priority: 1,
    });
    let smsRejected = false;
    try {
      await smsProv.validate();
    } catch (e) {
      smsRejected = true;
    }
    assert(smsRejected, 'NotificationProvider schema rejects sms providerType');

    const donorReg = await request('/api/auth/register/donor', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'SMS Removal Donor',
        email: 'donor@test-sms-removal.com',
        phone: '9876543210',
        password: 'Password123!',
        bloodGroup: 'O+',
        dateOfBirth: '1995-05-15',
        state: 'Maharashtra',
        city: 'Mumbai',
      }),
    });
    assert(donorReg.status === 201, 'Direct donor registration succeeds without SMS/OTP (HTTP 201)');
  } catch (err) {
    console.error('Suite error:', err);
    failed++;
  } finally {
    await User.deleteMany({ email: /@test-sms-removal\.com$/i });
    await NotificationProvider.deleteMany({});
    if (server) server.close();
    if (mongoose.connection.readyState === 1) await mongoose.disconnect();
    console.log(`\nFINAL RESULTS: ${passed}/${passed + failed}`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
