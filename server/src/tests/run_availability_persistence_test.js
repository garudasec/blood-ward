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

const PORT = 41788;
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
  console.log('=== BLOODWARD DONOR AVAILABILITY PERSISTENCE TEST ===');

  await mongoose.connect(process.env.MONGODB_URI);
  server = app.listen(PORT);

  await User.deleteMany({ email: 'donor_avail_persist@bloodward.test' });

  // 1. Register Donor
  const regRes = await request('/api/auth/register/donor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      fullName: 'Availability Persist Test',
      email: 'donor_avail_persist@bloodward.test',
      phone: '9876543210',
      password: 'password123',
      bloodGroup: 'O+',
      isAvailable: false,
    },
  });

  const cookie = getCookie(regRes);

  // 2. Fetch /api/auth/me initially
  const meInitial = await request('/api/auth/me', { headers: { Cookie: cookie } });
  console.log('1. Initial availability:', meInitial.data.user.availability);
  if (meInitial.data.user.availability !== 'not_available') {
    throw new Error('Expected initial availability to be not_available');
  }

  // 3. Update Donor Profile PUT /api/donors/me with availability: 'available'
  const updateRes = await request('/api/donors/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: {
      fullName: 'Availability Persist Test',
      phone: '9876543210',
      bloodGroup: 'O+',
      availability: 'available',
    },
  });
  console.log('2. Profile update status:', updateRes.status, updateRes.data.donor.availability);

  // 4. Simulate browser refresh (re-fetch GET /api/auth/me)
  const meRefreshed = await request('/api/auth/me', { headers: { Cookie: cookie } });
  console.log('3. Refreshed GET /api/auth/me availability:', meRefreshed.data.user.availability);
  if (meRefreshed.data.user.availability !== 'available') {
    throw new Error('FAIL: Availability did not persist after profile save!');
  }

  // 5. Toggle availability PATCH /api/donors/me/availability to 'not_available'
  const patchRes = await request('/api/donors/me/availability', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: { availability: 'not_available' },
  });
  console.log('4. Availability PATCH status:', patchRes.status, patchRes.data.availability);

  // 6. Re-fetch GET /api/auth/me after PATCH
  const meAfterPatch = await request('/api/auth/me', { headers: { Cookie: cookie } });
  console.log('5. Availability after PATCH:', meAfterPatch.data.user.availability);
  if (meAfterPatch.data.user.availability !== 'not_available') {
    throw new Error('FAIL: Availability PATCH did not persist!');
  }

  console.log('FINAL RESULTS: 5/5 PASSED.');
  console.log('SUCCESS: All Availability persistence checks PASSED! ✅');

  await User.deleteMany({ email: 'donor_avail_persist@bloodward.test' });
  server.close();
  await mongoose.disconnect();
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  if (server) server.close();
  mongoose.disconnect();
  process.exit(1);
});
