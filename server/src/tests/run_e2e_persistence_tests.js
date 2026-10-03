import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import http from 'http';

import User from '../models/user.model.js';
import healthRouter from '../routes/health.routes.js';
import authRouter from '../routes/auth.routes.js';
import donorRouter from '../routes/donor.routes.js';
import notFoundHandler from '../middleware/notFoundMiddleware.js';
import errorHandler from '../middleware/errorMiddleware.js';
import sanitizeMiddleware from '../middleware/sanitizeMiddleware.js';

dotenv.config();

const app = express();
app.use(helmet());
app.use(sanitizeMiddleware);
app.use(express.json());
app.use(cookieParser());

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/donors', donorRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = 41799;
let server;
let baseUrl = `http://127.0.0.1:${PORT}`;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, data: parsed });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(typeof options.body === 'object' ? JSON.stringify(options.body) : options.body);
    }
    req.end();
  });
}

function getCookie(res) {
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) return '';
  return setCookie.map((c) => c.split(';')[0]).join('; ');
}

async function runTests() {
  console.log('=== BLOODWARD AVAILABILITY & BLOOD GROUP E2E PERSISTENCE TEST ===');

  await mongoose.connect(process.env.MONGODB_URI);
  server = app.listen(PORT);

  await User.deleteMany({ email: 'donor_e2e_test@bloodward.test' });

  let passed = 0;
  let total = 0;

  function assert(title, condition, extraInfo = '') {
    total++;
    if (condition) {
      passed++;
      console.log(`TEST ${total}: ${title} [✅ PASS]`);
    } else {
      console.error(`TEST ${total}: ${title} [❌ FAIL] ${extraInfo}`);
    }
  }

  // 1. Register Donor with O+ and default Not Available
  const regRes = await request('/api/auth/register/donor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      fullName: 'E2E Donor Test',
      email: 'donor_e2e_test@bloodward.test',
      phone: '9876543210',
      password: 'password123',
      bloodGroup: 'O+',
      isAvailable: false,
    },
  });
  const cookie = getCookie(regRes);
  assert('1. Donor registration (O+, Not Available)', regRes.status === 201 && regRes.data.user.bloodGroup === 'O+' && regRes.data.user.availability === 'not_available');

  // 2. Refresh session via GET /api/auth/me -> verify initial state
  const me1 = await request('/api/auth/me', { headers: { Cookie: cookie } });
  assert('2. GET /api/auth/me initial fetch', me1.status === 200 && me1.data.user.availability === 'not_available' && me1.data.user.bloodGroup === 'O+');

  // 3. Update profile to Available -> PUT /api/donors/me
  const putAvail = await request('/api/donors/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: {
      fullName: 'E2E Donor Test',
      phone: '9876543210',
      bloodGroup: 'O+',
      availability: 'available',
    },
  });
  assert('3. Profile PUT save Availability = available', putAvail.status === 200 && putAvail.data.donor.availability === 'available');

  // 4. Refresh session GET /api/auth/me -> verify Availability = available persists
  const me2 = await request('/api/auth/me', { headers: { Cookie: cookie } });
  assert('4. GET /api/auth/me after refresh -> Availability remains available', me2.status === 200 && me2.data.user.availability === 'available');

  // 5. Update profile to Not Available -> PUT /api/donors/me
  const putNotAvail = await request('/api/donors/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: {
      fullName: 'E2E Donor Test',
      phone: '9876543210',
      bloodGroup: 'O+',
      availability: 'not_available',
    },
  });
  assert('5. Profile PUT save Availability = not_available', putNotAvail.status === 200 && putNotAvail.data.donor.availability === 'not_available');

  // 6. Refresh session GET /api/auth/me -> verify Availability = not_available persists
  const me3 = await request('/api/auth/me', { headers: { Cookie: cookie } });
  assert('6. GET /api/auth/me after refresh -> Availability remains not_available', me3.status === 200 && me3.data.user.availability === 'not_available');

  // 7. Update Blood Group to A+ -> PUT /api/donors/me
  const putBg = await request('/api/donors/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: {
      fullName: 'E2E Donor Test',
      phone: '9876543210',
      bloodGroup: 'A+',
      availability: 'available',
    },
  });
  assert('7. Profile PUT save Blood Group = A+', putBg.status === 200 && putBg.data.donor.bloodGroup === 'A+');

  // 8. Refresh session GET /api/auth/me -> verify Blood Group = A+ persists
  const me4 = await request('/api/auth/me', { headers: { Cookie: cookie } });
  assert('8. GET /api/auth/me after refresh -> Blood Group remains A+', me4.status === 200 && me4.data.user.bloodGroup === 'A+');

  // 9. Update Blood Group to invalid value -> PUT /api/donors/me -> expect 400 rejection
  const putBgInvalid = await request('/api/donors/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: {
      fullName: 'E2E Donor Test',
      phone: '9876543210',
      bloodGroup: 'X_INVALID',
    },
  });
  assert('9. Profile PUT reject invalid Blood Group (400)', putBgInvalid.status === 400);

  // 10. Refresh session GET /api/auth/me -> verify Blood Group is still A+
  const me5 = await request('/api/auth/me', { headers: { Cookie: cookie } });
  assert('10. GET /api/auth/me -> Blood Group remains unchanged as A+', me5.status === 200 && me5.data.user.bloodGroup === 'A+');

  await User.deleteMany({ email: 'donor_e2e_test@bloodward.test' });
  server.close();
  await mongoose.disconnect();

  console.log(`===================================`);
  console.log(`FINAL RESULTS: ${passed}/${total} PASSED.`);
  process.exit(passed === total ? 0 : 1);
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  if (server) server.close();
  mongoose.disconnect();
  process.exit(1);
});
