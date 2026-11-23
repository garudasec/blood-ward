import { seedVerifiedEmailOtp } from './testDb.js';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import http from 'http';

import User from '../models/user.model.js';
import BloodRequest from '../models/bloodRequest.js';
import healthRouter from '../routes/health.routes.js';
import authRouter from '../routes/auth.routes.js';
import donorRouter from '../routes/donor.routes.js';
import bloodRequestRouter from '../routes/bloodRequest.routes.js';
import adminRouter from '../routes/admin.routes.js';
import notFoundHandler from '../middleware/notFoundMiddleware.js';
import errorHandler from '../middleware/errorMiddleware.js';
import sanitizeMiddleware from '../middleware/sanitizeMiddleware.js';
import { calculateAgeFromDOB, validateDonorDOB } from '../utils/validators.js';

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

const PORT = 41725;
let server;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path,
        method: options.method || 'GET',
        headers: options.headers || {},
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(body);
          } catch {
            parsed = body;
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsed,
          });
        });
      }
    );
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

function getCookie(res) {
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) return '';
  return Array.isArray(setCookie) ? setCookie[0].split(';')[0] : setCookie.split(';')[0];
}

async function runTests() {
  console.log('--- STARTING DONOR DOB & GENDER SPECIFICATION TESTS ---');

  await mongoose.connect(process.env.MONGODB_URI);
  server = app.listen(PORT);

  // Clean up any previous test users
  await User.deleteMany({ email: /.*_dobtest@bloodward\.test$/ });
  await BloodRequest.deleteMany({ hospitalName: 'Apollo City Hospital' });

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

  // 1. Validator unit checks
  const adultDOB = '1998-06-15';
  const minorDOB = new Date(Date.now() - 15 * 365.25 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const futureDOB = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const adultVal = validateDonorDOB(adultDOB);
  assert('1. calculateAgeFromDOB accurately calculates adult age', adultVal.isValid && adultVal.age >= 18);

  const minorVal = validateDonorDOB(minorDOB);
  assert('2. validateDonorDOB rejects minor (<18)', !minorVal.isValid && minorVal.message.includes('18'));

  const futureVal = validateDonorDOB(futureDOB);
  assert('3. validateDonorDOB rejects future date', !futureVal.isValid && futureVal.message.includes('future'));

  const invalidVal = validateDonorDOB('invalid-date-string');
  assert('4. validateDonorDOB rejects malformed date string', !invalidVal.isValid);

  // 2. Registration API: Missing DOB returns 400
  const noDobRes = await request('/api/auth/register/donor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      fullName: 'No DOB Donor',
      email: 'nodob_dobtest@bloodward.test',
      phone: '9876543201',
      password: 'password123',
      bloodGroup: 'O+',
    },
  });
  assert('5. Donor registration rejects missing dateOfBirth (400)', noDobRes.status === 400 && noDobRes.data.message.includes('Date of birth is required'), JSON.stringify(noDobRes.data));

  // 3. Registration API: Minor DOB (<18) returns 400
  const minorRes = await request('/api/auth/register/donor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      fullName: 'Minor Donor',
      email: 'minor_dobtest@bloodward.test',
      phone: '9876543202',
      password: 'password123',
      bloodGroup: 'O+',
      dateOfBirth: minorDOB,
    },
  });
  assert('6. Donor registration rejects underage donor < 18 (400)', minorRes.status === 400 && minorRes.data.message.includes('18'), JSON.stringify(minorRes.data));

  // 4. Registration API: Future DOB returns 400
  const futureRes = await request('/api/auth/register/donor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      fullName: 'Future Donor',
      email: 'future_dobtest@bloodward.test',
      phone: '9876543203',
      password: 'password123',
      bloodGroup: 'O+',
      dateOfBirth: futureDOB,
    },
  });
  assert('7. Donor registration rejects future DOB (400)', futureRes.status === 400 && futureRes.data.message.includes('future'), JSON.stringify(futureRes.data));

  // 5. Registration API: Valid DOB (>= 18) succeeds (201)
  await seedVerifiedEmailOtp('adult_dobtest@bloodward.test');
  const validAdultRes = await request('/api/auth/register/donor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      fullName: 'Valid Adult Donor',
      email: 'adult_dobtest@bloodward.test',
      phone: '9876543204',
      password: 'password123',
      bloodGroup: 'O+',
      dateOfBirth: adultDOB,
      gender: 'Non-binary',
      state: 'Delhi',
      city: 'New Delhi',
    },
  });
  assert('8. Donor registration succeeds with valid DOB >= 18 and Non-binary gender (201)', validAdultRes.status === 201 && validAdultRes.data.user.dateOfBirth === adultDOB, JSON.stringify(validAdultRes.data));

  // 6. Registration API: Gender is optional
  await seedVerifiedEmailOtp('nogender_dobtest@bloodward.test');
  const noGenderRes = await request('/api/auth/register/donor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      fullName: 'No Gender Donor',
      email: 'nogender_dobtest@bloodward.test',
      phone: '9876543205',
      password: 'password123',
      bloodGroup: 'A+',
      dateOfBirth: '1992-01-20',
    },
  });
  assert('9. Donor registration succeeds when gender is omitted (201)', noGenderRes.status === 201 && noGenderRes.data.user.gender === '', JSON.stringify(noGenderRes.data));

  // 7. Privacy: DOB and Gender NOT exposed in public donor search
  // Create a recipient to perform search
  await seedVerifiedEmailOtp('search_rec_dobtest@bloodward.test');
  const recRes = await request('/api/auth/register/recipient', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      fullName: 'Search Recipient',
      email: 'search_rec_dobtest@bloodward.test',
      phone: '9876543206',
      password: 'password123',
      state: 'Delhi',
      city: 'New Delhi',
    },
  });
  const recCookie = getCookie(recRes);

  const searchRes = await request('/api/donors/search?bloodGroup=O%2B', {
    headers: { Cookie: recCookie },
  });
  const searchDonors = searchRes.data.donors || [];
  const dobExposed = searchDonors.some((d) => 'dateOfBirth' in d);
  const genderExposed = searchDonors.some((d) => 'gender' in d);
  assert('10. Public donor search does NOT expose dateOfBirth', searchRes.status === 200 && !dobExposed, JSON.stringify(searchRes.data));
  assert('11. Public donor search does NOT expose gender', searchRes.status === 200 && !genderExposed, JSON.stringify(searchRes.data));

  // 8. Legacy Donor Profile handling (No DOB)
  const legacyDonor = await User.create({
    fullName: 'Legacy Unverified Donor',
    email: 'legacy_donor_dobtest@bloodward.test',
    phone: '9876543207',
    password: 'password123',
    role: 'donor',
    bloodGroup: 'O+',
    state: 'Delhi',
    city: 'New Delhi',
    location: { type: 'Point', coordinates: [77.2090, 28.6139] },
    availability: 'available',
    dateOfBirth: '', // legacy empty DOB
  });

  const legacyLoginRes = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      email: 'legacy_donor_dobtest@bloodward.test',
      password: 'password123',
    },
  });
  const legacyCookie = getCookie(legacyLoginRes);

  // 9. Legacy donor without DOB requesting available requests -> requiresProfileCompletion: true
  const availRes = await request('/api/requests/available', {
    headers: { Cookie: legacyCookie },
  });
  assert(
    '12. Legacy donor without DOB receives requiresProfileCompletion: true on getAvailableRequests',
    availRes.status === 200 && availRes.data.requiresProfileCompletion === true && availRes.data.requests.length === 0,
    JSON.stringify(availRes.data)
  );

  // 10. Create a sample blood request
  const testRequest = await BloodRequest.create({
    recipient: recRes.data.user.id,
    recipientName: recRes.data.user.fullName || 'Search Recipient',
    hospitalName: 'Apollo City Hospital',
    bloodGroup: 'O+',
    unitsNeeded: 1,
    urgency: 'Normal',
    status: 'Active',
    requiredDate: '2026-12-01',
    state: 'Delhi',
    city: 'New Delhi',
    location: { type: 'Point', coordinates: [77.2090, 28.6139] },
  });

  // 11. Legacy donor attempting to accept request without DOB -> 400
  const acceptRes = await request(`/api/requests/${testRequest._id}/accept`, {
    method: 'PATCH',
    headers: { Cookie: legacyCookie },
  });
  assert(
    '13. Legacy donor cannot accept blood request without completed DOB (400)',
    acceptRes.status === 400 && acceptRes.data.message.includes('date of birth'),
    JSON.stringify(acceptRes.data)
  );

  // 12. Donor updates profile with underage DOB -> 400
  const updateMinorRes = await request('/api/donors/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: legacyCookie },
    body: {
      dateOfBirth: minorDOB,
    },
  });
  assert(
    '14. Donor profile update rejects underage DOB < 18 (400)',
    updateMinorRes.status === 400 && updateMinorRes.data.message.includes('18'),
    JSON.stringify(updateMinorRes.data)
  );

  // 13. Donor updates profile with valid DOB -> 200
  const updateValidRes = await request('/api/donors/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: legacyCookie },
    body: {
      dateOfBirth: adultDOB,
      gender: 'Prefer not to say',
    },
  });
  assert(
    '15. Donor profile update succeeds with valid DOB >= 18 (200)',
    updateValidRes.status === 200 && updateValidRes.data.donor.dateOfBirth === adultDOB && updateValidRes.data.donor.gender === 'Prefer not to say',
    JSON.stringify(updateValidRes.data)
  );

  // 14. Now that DOB is verified, accepting the request succeeds -> 200
  const acceptAfterDobRes = await request(`/api/requests/${testRequest._id}/accept`, {
    method: 'PATCH',
    headers: { Cookie: legacyCookie },
  });
  assert(
    '16. Donor can successfully accept blood request once DOB is verified (200)',
    acceptAfterDobRes.status === 200 && acceptAfterDobRes.data.request.status === 'Donor Accepted',
    JSON.stringify(acceptAfterDobRes.data)
  );

  // Cleanup
  await User.deleteMany({ email: /.*_dobtest@bloodward\.test$/ });
  await BloodRequest.deleteMany({ hospitalName: 'Apollo City Hospital' });
  server.close();
  await mongoose.disconnect();

  console.log('===================================');
  console.log(`FINAL RESULTS: ${passed}/${total} PASSED.`);
  process.exit(passed === total ? 0 : 1);
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  if (server) server.close();
  mongoose.disconnect();
  process.exit(1);
});
