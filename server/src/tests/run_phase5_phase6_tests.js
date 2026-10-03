import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import connectDB from '../config/db.js';
import User from '../models/user.model.js';
import healthRouter from '../routes/health.routes.js';
import authRouter from '../routes/auth.routes.js';
import donorRouter from '../routes/donor.routes.js';
import rbacTestRouter from '../routes/rbacTest.routes.js';
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

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/donors', donorRouter);
app.use('/api/test/rbac', rbacTestRouter);
app.use(notFoundHandler);
app.use(errorHandler);

const runSuite = async () => {
  console.log('=== BLOODWARD PHASE 5 + PHASE 6 SUITE ===');
  await connectDB();

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = 'http://127.0.0.1:' + port;
  console.log('Test server running at ' + baseUrl);

  // Clean up any existing test users
  await User.deleteMany({ email: { $regex: 'test_p5p6@bloodward.test', $options: 'i' } });

  const password = 'Password123!';

  // Coordinates: Delhi Center ~ (lng: 77.2090, lat: 28.6139)
  // Donor 1: Delhi Center (0 km) - Available, O+
  const donor1 = await User.create({
    fullName: 'Delhi Center Donor',
    email: 'donor1_test_p5p6@bloodward.test',
    phone: '9876543210',
    password,
    role: 'donor',
    bloodGroup: 'O+',
    availability: 'available',
    city: 'Delhi',
    location: { type: 'Point', coordinates: [77.2090, 28.6139] },
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 10), // 10 mins ago
  });

  // Donor 2: ~3.5 km from Delhi Center - Available, A+
  const donor2 = await User.create({
    fullName: 'Near Donor',
    email: 'donor2_test_p5p6@bloodward.test',
    phone: '9876543211',
    password,
    role: 'donor',
    bloodGroup: 'A+',
    availability: 'available',
    city: 'Delhi',
    location: { type: 'Point', coordinates: [77.2300, 28.6300] },
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 2), // 2 mins ago (most recently active)
  });

  // Donor 3: ~15 km from Delhi Center - Available, O+
  const donor3 = await User.create({
    fullName: 'Far Donor',
    email: 'donor3_test_p5p6@bloodward.test',
    phone: '9876543212',
    password,
    role: 'donor',
    bloodGroup: 'O+',
    availability: 'available',
    city: 'Noida',
    location: { type: 'Point', coordinates: [77.3500, 28.5700] },
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
  });

  // Donor 4: Unavailable Donor - not_available, O+
  const donor4 = await User.create({
    fullName: 'Unavailable Donor',
    email: 'donor4_test_p5p6@bloodward.test',
    phone: '9876543213',
    password,
    role: 'donor',
    bloodGroup: 'O+',
    availability: 'not_available',
    city: 'Delhi',
    location: { type: 'Point', coordinates: [77.2090, 28.6139] },
  });

  // Donor 5: Blocked Donor - available, O+, isBlocked: true (will be blocked after logging in)
  const donor5 = await User.create({
    fullName: 'Blocked Donor',
    email: 'donor5_test_p5p6@bloodward.test',
    phone: '9876543214',
    password,
    role: 'donor',
    bloodGroup: 'O+',
    availability: 'available',
    isBlocked: false,
    city: 'Delhi',
    location: { type: 'Point', coordinates: [77.2090, 28.6139] },
  });

  // Recipient User
  const recipient = await User.create({
    fullName: 'Test Recipient User',
    email: 'recipient_test_p5p6@bloodward.test',
    phone: '9876543215',
    password,
    role: 'recipient',
    city: 'Delhi',
  });

  // Admin User
  const admin = await User.create({
    fullName: 'Test Admin User',
    email: 'admin_test_p5p6@bloodward.test',
    phone: '9876543216',
    password,
    role: 'admin',
  });

  const loginUser = async (email) => {
    const res = await fetch(baseUrl + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const setCookie = res.headers.get('set-cookie');
    const data = await res.json().catch(() => ({}));
    return { status: res.status, setCookie, data };
  };

  const donor1Login = await loginUser(donor1.email);
  const recipientLogin = await loginUser(recipient.email);
  const adminLogin = await loginUser(admin.email);
  const blockedLogin = await loginUser(donor5.email);

  // Set donor5 to isBlocked: true in DB to test post-login access rejection
  donor5.isBlocked = true;
  await donor5.save({ validateBeforeSave: false });

  const getCookieHeader = (loginRes) => {
    if (!loginRes.setCookie) return '';
    return loginRes.setCookie.split(';')[0];
  };

  const donorCookie = getCookieHeader(donor1Login);
  const recipientCookie = getCookieHeader(recipientLogin);
  const adminCookie = getCookieHeader(adminLogin);
  const blockedCookie = getCookieHeader(blockedLogin);

  const request = async (path, options = {}) => {
    const res = await fetch(baseUrl + path, options);
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  };

  const results = [];
  const record = (id, desc, expectedStatus, actualStatus, customCheck = true) => {
    const passed = actualStatus === expectedStatus && customCheck;
    results.push({ id, desc, expectedStatus, actualStatus, passed });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${id}: ${desc} -> Exp: ${expectedStatus}, Got: ${actualStatus} [${mark}]`);
  };

  // --- PHASE 5 TESTS ---

  // 1. Donor GET own profile
  const t1 = await request('/api/donors/me', { headers: { Cookie: donorCookie } });
  record('TEST 1', 'Donor GET own profile', 200, t1.status, t1.data.success && t1.data.donor.email === donor1.email);

  // 2. Donor update profile
  const t2 = await request('/api/donors/me', {
    method: 'PUT',
    headers: { Cookie: donorCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName: 'Updated Delhi Donor', city: 'New Delhi' }),
  });
  record('TEST 2', 'Donor update profile', 200, t2.status, t2.data.donor.fullName === 'Updated Delhi Donor' && t2.data.donor.city === 'New Delhi');

  // 3. Donor update availability -> available
  const t3 = await request('/api/donors/me/availability', {
    method: 'PATCH',
    headers: { Cookie: donorCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ availability: 'available' }),
  });
  record('TEST 3', 'Donor availability -> available', 200, t3.status, t3.data.availability === 'available');

  // 4. Donor update availability -> not_available
  const t4 = await request('/api/donors/me/availability', {
    method: 'PATCH',
    headers: { Cookie: donorCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ availability: 'not_available' }),
  });
  record('TEST 4', 'Donor availability -> not_available', 200, t4.status, t4.data.availability === 'not_available');

  // Restore availability to available for subsequent search tests
  await request('/api/donors/me/availability', {
    method: 'PATCH',
    headers: { Cookie: donorCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ availability: 'available' }),
  });

  // 5. Invalid availability
  const t5 = await request('/api/donors/me/availability', {
    method: 'PATCH',
    headers: { Cookie: donorCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ availability: 'invalid_status' }),
  });
  record('TEST 5', 'Invalid availability rejection', 400, t5.status);

  // 6. Invalid blood group update
  const t6 = await request('/api/donors/me', {
    method: 'PUT',
    headers: { Cookie: donorCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ bloodGroup: 'Z+' }),
  });
  record('TEST 6', 'Invalid blood group update rejection', 400, t6.status);

  // 7. Invalid coordinates update
  const t7 = await request('/api/donors/me', {
    method: 'PUT',
    headers: { Cookie: donorCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ location: { type: 'Point', coordinates: [999, 999] } }),
  });
  record('TEST 7', 'Invalid location coordinates rejection', 400, t7.status);

  // 8. Recipient -> donor profile endpoint
  const t8 = await request('/api/donors/me', { headers: { Cookie: recipientCookie } });
  record('TEST 8', 'Recipient accessing donor me endpoint', 403, t8.status);

  // 9. Admin -> donor profile endpoint
  const t9 = await request('/api/donors/me', { headers: { Cookie: adminCookie } });
  record('TEST 9', 'Admin accessing donor me endpoint', 403, t9.status);

  // 10. No authentication
  const t10 = await request('/api/donors/me');
  record('TEST 10', 'Unauthenticated donor me request', 401, t10.status);

  // 11. Blocked donor request attempt with valid token cookie
  const t11 = await request('/api/donors/me', { headers: { Cookie: blockedCookie } });
  record('TEST 11', 'Blocked donor request attempt', 403, t11.status);

  // 12. Password / Hash privacy verification
  const profileData = t1.data.donor;
  const noPasswordExposed = profileData && !('password' in profileData) && !('passwordHash' in profileData);
  record('TEST 12', 'Verify password/hash NOT returned in profile', 200, t1.status, noPasswordExposed);

  // --- PHASE 6 TESTS ---

  // 13. Recipient donor search
  const t13 = await request('/api/donors/search', { headers: { Cookie: recipientCookie } });
  record('TEST 13', 'Recipient donor search', 200, t13.status, t13.data.success && Array.isArray(t13.data.donors));

  // 14. Donor attempting donor search
  const t14 = await request('/api/donors/search', { headers: { Cookie: donorCookie } });
  record('TEST 14', 'Donor attempting donor search', 403, t14.status);

  // 15. Admin attempting donor search
  const t15 = await request('/api/donors/search', { headers: { Cookie: adminCookie } });
  record('TEST 15', 'Admin attempting donor search', 403, t15.status);

  // 16. No authentication for search
  const t16 = await request('/api/donors/search');
  record('TEST 16', 'Unauthenticated donor search', 401, t16.status);

  // 17. Blood group filter
  const t17 = await request('/api/donors/search?bloodGroup=A%2B', { headers: { Cookie: recipientCookie } });
  const onlyAPlus = t17.data.donors && t17.data.donors.every((d) => d.bloodGroup === 'A+');
  record('TEST 17', 'Blood group filter (A+)', 200, t17.status, onlyAPlus);

  // 18. Availability filter (unavailable donors excluded)
  const t18 = await request('/api/donors/search', { headers: { Cookie: recipientCookie } });
  const noUnavailable = t18.data.donors && t18.data.donors.every((d) => d.availability === 'available');
  const unavailableNotPresent = t18.data.donors && !t18.data.donors.some((d) => d.id === donor4._id.toString());
  record('TEST 18', 'Availability filter excludes unavailable donors', 200, t18.status, noUnavailable && unavailableNotPresent);

  // 19. Blocked donor exclusion
  const blockedNotPresent = t18.data.donors && !t18.data.donors.some((d) => d.id === donor5._id.toString());
  record('TEST 19', 'Blocked donor exclusion from search', 200, t18.status, blockedNotPresent);

  // 20. Role filter (only donor-role users appear)
  const recipientNotPresent = t18.data.donors && !t18.data.donors.some((d) => d.id === recipient._id.toString());
  record('TEST 20', 'Role filter excludes recipient users', 200, t18.status, recipientNotPresent);

  // 21. Radius filter (Delhi center 5 km radius)
  const t21 = await request('/api/donors/search?latitude=28.6139&longitude=77.2090&radius=5', {
    headers: { Cookie: recipientCookie },
  });
  // Far donor (~15 km) should be excluded in 5 km radius
  const farExcluded = t21.data.donors && !t21.data.donors.some((d) => d.id === donor3._id.toString());
  record('TEST 21', 'Radius filter (5 km) excludes far donors', 200, t21.status, farExcluded);

  // 22. Distance calculation
  const hasDistanceKm = t21.data.donors && t21.data.donors.every((d) => typeof d.distanceKm === 'number');
  record('TEST 22', 'Distance calculation (distanceKm present)', 200, t21.status, hasDistanceKm);

  // 23. Nearest sorting
  const t23 = await request('/api/donors/search?latitude=28.6139&longitude=77.2090&radius=20&sort=nearest', {
    headers: { Cookie: recipientCookie },
  });
  const isNearestSorted =
    t23.data.donors &&
    t23.data.donors.every((d, i, arr) => i === 0 || arr[i - 1].distanceKm <= d.distanceKm);
  record('TEST 23', 'Nearest distance sorting', 200, t23.status, isNearestSorted);

  // 24. Farthest sorting
  const t24 = await request('/api/donors/search?latitude=28.6139&longitude=77.2090&radius=20&sort=farthest', {
    headers: { Cookie: recipientCookie },
  });
  const isFarthestSorted =
    t24.data.donors &&
    t24.data.donors.every((d, i, arr) => i === 0 || arr[i - 1].distanceKm >= d.distanceKm);
  record('TEST 24', 'Farthest distance sorting', 200, t24.status, isFarthestSorted);

  // 25. Recently active sorting
  const t25 = await request('/api/donors/search?latitude=28.6139&longitude=77.2090&radius=20&sort=recently_active', {
    headers: { Cookie: recipientCookie },
  });
  const isRecentlyActiveSorted =
    t25.data.donors &&
    t25.data.donors.every((d, i, arr) => i === 0 || new Date(arr[i - 1].lastActiveAt) >= new Date(d.lastActiveAt));
  record('TEST 25', 'Recently active sorting', 200, t25.status, isRecentlyActiveSorted);

  // 26. Pagination
  const t26 = await request('/api/donors/search?page=1&limit=2', { headers: { Cookie: recipientCookie } });
  const paginationOk = t26.data.count <= 2 && t26.data.page === 1;
  record('TEST 26', 'Pagination page & limit', 200, t26.status, paginationOk);

  // 27. Invalid radius
  const t27 = await request('/api/donors/search?latitude=28.6139&longitude=77.2090&radius=-5', {
    headers: { Cookie: recipientCookie },
  });
  record('TEST 27', 'Invalid negative radius rejection', 400, t27.status);

  // 28. Invalid coordinates
  const t28 = await request('/api/donors/search?latitude=999&longitude=999', {
    headers: { Cookie: recipientCookie },
  });
  record('TEST 28', 'Invalid coordinates rejection', 400, t28.status);

  // 29. Invalid sort parameter
  const t29 = await request('/api/donors/search?sort=invalid_sort', { headers: { Cookie: recipientCookie } });
  record('TEST 29', 'Invalid sort parameter rejection', 400, t29.status);

  // 30. Invalid blood group search filter
  const t30 = await request('/api/donors/search?bloodGroup=INVALID', { headers: { Cookie: recipientCookie } });
  record('TEST 30', 'Invalid blood group search filter rejection', 400, t30.status);

  // 31. Privacy verification on search response
  const sampleSearchItem = t13.data.donors && t13.data.donors[0];
  const isPrivacyProtected =
    sampleSearchItem &&
    !('password' in sampleSearchItem) &&
    !('email' in sampleSearchItem) &&
    !('phone' in sampleSearchItem) &&
    !('coordinates' in sampleSearchItem) &&
    !('location' in sampleSearchItem) &&
    !('isBlocked' in sampleSearchItem);
  record('TEST 31', 'Search response privacy (no email/phone/password/exact coordinates)', 200, t13.status, isPrivacyProtected);

  // 32. Self/role filtering verification
  const recipientInResults = t13.data.donors && t13.data.donors.some((d) => d.id === recipient._id.toString());
  record('TEST 32', 'Recipient users cannot appear in donor search', 200, t13.status, !recipientInResults);

  // 33. Large limit protection
  const t33 = await request('/api/donors/search?limit=1000', { headers: { Cookie: recipientCookie } });
  const limitCapped = t33.data.donors && t33.data.donors.length <= 50;
  record('TEST 33', 'Excessive pagination limit capped at 50', 200, t33.status, limitCapped);

  // 34. Query operator injection protection
  const t34 = await request('/api/donors/search?bloodGroup[$gt]=', { headers: { Cookie: recipientCookie } });
  record('TEST 34', 'Query operator injection protection', 400, t34.status);

  // Database cleanup
  await User.deleteMany({ email: { $regex: 'test_p5p6@bloodward.test', $options: 'i' } });
  console.log('Database clean up finished.');

  server.close();
  await mongoose.disconnect();

  const totalPassed = results.filter((r) => r.passed).length;
  console.log('===================================');
  console.log(`FINAL RESULTS: ${totalPassed}/${results.length} PASSED.`);
  if (totalPassed !== results.length) {
    process.exit(1);
  }
};

runSuite().catch((err) => {
  console.error('Phase 5+6 test suite error:', err);
  process.exit(1);
});
