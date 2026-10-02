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
import bloodRequestRouter from '../routes/bloodRequest.routes.js';
import adminRouter from '../routes/admin.routes.js';
import notFoundHandler from '../middleware/notFoundMiddleware.js';
import errorHandler from '../middleware/errorMiddleware.js';
import sanitizeMiddleware from '../middleware/sanitizeMiddleware.js';

dotenv.config();

const app = express();
app.use(helmet());
app.use(sanitizeMiddleware);

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/donors', donorRouter);
app.use('/api/requests', bloodRequestRouter);
app.use('/api/admin', adminRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = 41699;
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
  console.log('=== BLOODWARD GENDER DROPDOWN & PRIVACY TEST SUITE ===');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected successfully');

  server = app.listen(PORT);

  // Clean test users
  await User.deleteMany({ email: /.*_gendertest@bloodward\.test$/ });

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

  // 1. Donor registration with Male
  const donorMaleRes = await request('/api/auth/register/donor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      fullName: 'Male Donor Test',
      email: 'donor_male_gendertest@bloodward.test',
      phone: '9876543210',
      gender: 'Male',
      password: 'password123',
      bloodGroup: 'O+',
    },
  });
  assert('1. Donor registration with Male', donorMaleRes.status === 201 && donorMaleRes.data.user.gender === 'Male', JSON.stringify(donorMaleRes.data));

  // 2. Donor registration with Female
  const donorFemaleRes = await request('/api/auth/register/donor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      fullName: 'Female Donor Test',
      email: 'donor_female_gendertest@bloodward.test',
      phone: '9876543211',
      gender: 'Female',
      password: 'password123',
      bloodGroup: 'A+',
    },
  });
  assert('2. Donor registration with Female', donorFemaleRes.status === 201 && donorFemaleRes.data.user.gender === 'Female', JSON.stringify(donorFemaleRes.data));

  // 3. Recipient registration with Other
  const recOtherRes = await request('/api/auth/register/recipient', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      fullName: 'Other Recipient Test',
      email: 'rec_other_gendertest@bloodward.test',
      phone: '9876543212',
      gender: 'Other',
      password: 'password123',
    },
  });
  assert('3. Recipient registration with Other', recOtherRes.status === 201 && recOtherRes.data.user.gender === 'Other', JSON.stringify(recOtherRes.data));

  // 4. Registration with Prefer not to say
  const donorPreferRes = await request('/api/auth/register/donor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      fullName: 'Prefer Donor Test',
      email: 'donor_prefer_gendertest@bloodward.test',
      phone: '9876543213',
      gender: 'Prefer not to say',
      password: 'password123',
      bloodGroup: 'B+',
    },
  });
  assert('4. Registration with Prefer not to say', donorPreferRes.status === 201 && donorPreferRes.data.user.gender === 'Prefer not to say', JSON.stringify(donorPreferRes.data));

  // 5. Existing user with no gender (profile loads, gender unselected/empty string)
  const legacyUser = await User.create({
    fullName: 'Legacy User Test',
    email: 'legacy_gendertest@bloodward.test',
    phone: '9876543214',
    password: 'password123',
    role: 'donor',
    bloodGroup: 'O-',
  });

  const legacyLogin = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      email: 'legacy_gendertest@bloodward.test',
      password: 'password123',
    },
  });
  const legacyCookie = getCookie(legacyLogin);

  const meRes = await request('/api/auth/me', {
    headers: { Cookie: legacyCookie },
  });

  assert(
    '5. Existing user with no gender loads correctly without auto-assigning',
    meRes.status === 200 && meRes.data.user.gender === '',
    JSON.stringify(meRes.data)
  );

  // 6. Profile update: select gender, save, refresh, verify selected gender persists
  const updateRes = await request('/api/donors/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: legacyCookie },
    body: {
      gender: 'Female',
    },
  });
  assert('6a. Profile update saves gender Female', updateRes.status === 200 && updateRes.data.donor.gender === 'Female', JSON.stringify(updateRes.data));

  const meResAfterUpdate = await request('/api/auth/me', {
    headers: { Cookie: legacyCookie },
  });
  assert('6b. Refreshed session verifies persisted gender', meResAfterUpdate.status === 200 && meResAfterUpdate.data.user.gender === 'Female', JSON.stringify(meResAfterUpdate.data));

  // 7. Invalid backend gender value is rejected ("random" -> 400)
  const invalidGenderRes = await request('/api/donors/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: legacyCookie },
    body: {
      gender: 'random',
    },
  });
  assert('7a. Profile update rejects invalid gender "random"', invalidGenderRes.status === 400, JSON.stringify(invalidGenderRes.data));

  const invalidRegRes = await request('/api/auth/register/donor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      fullName: 'Invalid Gender Test',
      email: 'invalid_gendertest@bloodward.test',
      phone: '9876543215',
      gender: 'random',
      password: 'password123',
      bloodGroup: 'AB+',
    },
  });
  assert('7b. Donor registration rejects invalid gender "random"', invalidRegRes.status === 400, JSON.stringify(invalidRegRes.data));

  // 8. Verify donor search privacy is unchanged (GET /api/donors/search does NOT include gender)
  const recipientLogin = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      email: 'rec_other_gendertest@bloodward.test',
      password: 'password123',
    },
  });
  const recCookie = getCookie(recipientLogin);

  const searchRes = await request('/api/donors/search', {
    headers: { Cookie: recCookie },
  });
  const searchDonors = searchRes.data.donors || [];
  const genderExposed = searchDonors.some((d) => 'gender' in d);
  assert('8. Donor search response does NOT expose gender field', searchRes.status === 200 && !genderExposed, JSON.stringify(searchRes.data));

  // Cleanup
  await User.deleteMany({ email: /.*_gendertest@bloodward\.test$/ });
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
