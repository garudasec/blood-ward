import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import connectDB from '../config/db.js';
import User from '../models/user.model.js';
import BloodRequest from '../models/bloodRequest.js';
import AuditLog from '../models/auditLog.js';

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
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
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

const runSuite = async () => {
  console.log('=== BLOODWARD PHASE 8 (ADMIN MANAGEMENT & AUDIT) SUITE ===');
  await connectDB();

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = 'http://127.0.0.1:' + port;
  console.log('Test server running at ' + baseUrl);

  // Cleanup test users & requests
  await User.deleteMany({ email: { $regex: 'test_p8@bloodward.test', $options: 'i' } });
  await BloodRequest.deleteMany({ hospitalName: { $regex: 'Test Hospital P8', $options: 'i' } });

  const password = 'Password123!';

  // Create Users
  const admin = await User.create({
    fullName: 'Admin User P8',
    email: 'admin_test_p8@bloodward.test',
    phone: '9876500010',
    password,
    role: 'admin',
  });

  const donor = await User.create({
    fullName: 'Donor User P8',
    email: 'donor_test_p8@bloodward.test',
    phone: '9876500011',
    password,
    role: 'donor',
    bloodGroup: 'B+',
    availability: 'available',
    city: 'Delhi',
  });

  const recipient = await User.create({
    fullName: 'Recipient User P8',
    email: 'recipient_test_p8@bloodward.test',
    phone: '9876500012',
    password,
    role: 'recipient',
    city: 'Delhi',
  });

  const requestObj = await BloodRequest.create({
    recipient: recipient._id,
    recipientName: recipient.fullName,
    bloodGroup: 'B+',
    unitsNeeded: 2,
    hospitalName: 'Test Hospital P8 Admin',
    city: 'Delhi',
    urgency: 'Normal',
    status: 'Active',
    requiredDate: '2026-12-31',
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

  const adminLogin = await loginUser(admin.email);
  const donorLogin = await loginUser(donor.email);
  const recipientLogin = await loginUser(recipient.email);

  const getCookie = (res) => (res.setCookie ? res.setCookie.split(';')[0] : '');

  const adminCookie = getCookie(adminLogin);
  const donorCookie = getCookie(donorLogin);
  const recipientCookie = getCookie(recipientLogin);

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

  // 1. Admin dashboard access
  const t1 = await request('/api/admin/dashboard', { headers: { Cookie: adminCookie } });
  record('TEST 1', 'Admin dashboard access', 200, t1.status, t1.data.success && typeof t1.data.stats.totalUsers === 'number');

  // 2. Donor dashboard access
  const t2 = await request('/api/admin/dashboard', { headers: { Cookie: donorCookie } });
  record('TEST 2', 'Donor dashboard access denied', 403, t2.status);

  // 3. Recipient dashboard access
  const t3 = await request('/api/admin/dashboard', { headers: { Cookie: recipientCookie } });
  record('TEST 3', 'Recipient dashboard access denied', 403, t3.status);

  // 4. Unauthenticated admin endpoint
  const t4 = await request('/api/admin/dashboard');
  record('TEST 4', 'Unauthenticated admin endpoint denied', 401, t4.status);

  // 5. Blocked admin access attempt
  admin.isBlocked = true;
  await admin.save({ validateBeforeSave: false });
  const t5 = await request('/api/admin/dashboard', { headers: { Cookie: adminCookie } });
  record('TEST 5', 'Blocked admin access denied', 403, t5.status);
  admin.isBlocked = false;
  await admin.save({ validateBeforeSave: false });

  // 6. Admin user list
  const t6 = await request('/api/admin/users', { headers: { Cookie: adminCookie } });
  record('TEST 6', 'Admin user list', 200, t6.status, t6.data.success && Array.isArray(t6.data.users));

  // 7. Admin user details
  const t7 = await request(`/api/admin/users/${donor._id}`, { headers: { Cookie: adminCookie } });
  record('TEST 7', 'Admin user details', 200, t7.status, t7.data.user.email === donor.email);

  // 8. Admin block user
  const t8 = await request(`/api/admin/users/${donor._id}/block`, {
    method: 'PATCH',
    headers: { Cookie: adminCookie },
  });
  record('TEST 8', 'Admin block user', 200, t8.status, t8.data.user.isBlocked === true);

  // 9. Blocked user immediately denied protected endpoint
  const t9 = await request('/api/donors/me', { headers: { Cookie: donorCookie } });
  record('TEST 9', 'Blocked user immediately denied protected API', 403, t9.status);

  // 10. Admin unblock user
  const t10 = await request(`/api/admin/users/${donor._id}/unblock`, {
    method: 'PATCH',
    headers: { Cookie: adminCookie },
  });
  record('TEST 10', 'Admin unblock user', 200, t10.status, t10.data.user.isBlocked === false);

  // 11. Admin cannot block self
  const t11 = await request(`/api/admin/users/${admin._id}/block`, {
    method: 'PATCH',
    headers: { Cookie: adminCookie },
  });
  record('TEST 11', 'Admin self-block protection', 400, t11.status);

  // 12. Admin request list
  const t12 = await request('/api/admin/requests', { headers: { Cookie: adminCookie } });
  record('TEST 12', 'Admin request list', 200, t12.status, t12.data.success && Array.isArray(t12.data.requests));

  // 13. Admin request details
  const t13 = await request(`/api/admin/requests/${requestObj._id}`, { headers: { Cookie: adminCookie } });
  record('TEST 13', 'Admin request details', 200, t13.status, t13.data.request.id === requestObj._id.toString());

  // 14. Admin cancels active request
  const t14 = await request(`/api/admin/requests/${requestObj._id}/cancel`, {
    method: 'PATCH',
    headers: { Cookie: adminCookie },
  });
  record('TEST 14', 'Admin cancels active request', 200, t14.status, t14.data.request.status === 'Cancelled');

  // 15. Admin cannot alter terminal request (Fulfilled -> Cancelled)
  requestObj.status = 'Fulfilled';
  await requestObj.save({ validateBeforeSave: false });
  const t15 = await request(`/api/admin/requests/${requestObj._id}/cancel`, {
    method: 'PATCH',
    headers: { Cookie: adminCookie },
  });
  record('TEST 15', 'Admin terminal request cancellation rejected', 400, t15.status);

  // 16. Audit log list
  const t16 = await request('/api/admin/audit-logs', { headers: { Cookie: adminCookie } });
  record('TEST 16', 'Admin audit log list', 200, t16.status, t16.data.success && Array.isArray(t16.data.logs));

  // 17. Donor cannot access audit logs
  const t17 = await request('/api/admin/audit-logs', { headers: { Cookie: donorCookie } });
  record('TEST 17', 'Donor denied audit log access', 403, t17.status);

  // 18. Recipient cannot access audit logs
  const t18 = await request('/api/admin/audit-logs', { headers: { Cookie: recipientCookie } });
  record('TEST 18', 'Recipient denied audit log access', 403, t18.status);

  // 19. Unauthenticated audit log access
  const t19 = await request('/api/admin/audit-logs');
  record('TEST 19', 'Unauthenticated audit log access denied', 401, t19.status);

  // 20. Audit log contains expected admin action (BLOCK_USER)
  const blockLog = await AuditLog.findOne({ action: 'BLOCK_USER', target: donor._id.toString() });
  record('TEST 20', 'Audit log contains BLOCK_USER event', 200, 200, blockLog !== null);

  // 21. Audit log contains request cancellation event
  const cancelLog = await AuditLog.findOne({ action: 'ADMIN_CANCEL_REQUEST', target: requestObj._id.toString() });
  record('TEST 21', 'Audit log contains ADMIN_CANCEL_REQUEST event', 200, 200, cancelLog !== null);

  // 22. Audit log does not contain passwords
  const sampleLog = await AuditLog.findOne({ category: 'ADMIN_ACTION' });
  const noPasswordInLog = sampleLog && !sampleLog.details.includes('password') && !sampleLog.details.includes('passwordHash');
  record('TEST 22', 'Audit log contains no passwords', 200, 200, noPasswordInLog);

  // 23. Audit log does not contain JWT / cookies
  const noJwtInLog = sampleLog && !sampleLog.details.includes('token') && !sampleLog.details.includes('cookie');
  record('TEST 23', 'Audit log contains no JWT / cookies', 200, 200, noJwtInLog);

  // 24. Public donor registration cannot create admin role
  const regDonorRes = await request('/api/auth/register/donor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Fake Admin Donor',
      email: 'fake_admin_donor_p8@bloodward.test',
      phone: '9876500099',
      password,
      role: 'admin',
      bloodGroup: 'O+',
    }),
  });
  const donorRoleForced = regDonorRes.data.user && regDonorRes.data.user.role === 'donor';
  record('TEST 24', 'Public donor registration forces donor role', 201, regDonorRes.status, donorRoleForced);

  // 25. Public recipient registration cannot create admin role
  const regRecRes = await request('/api/auth/register/recipient', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Fake Admin Recipient',
      email: 'fake_admin_rec_p8@bloodward.test',
      phone: '9876500098',
      password,
      role: 'admin',
    }),
  });
  const recipientRoleForced = regRecRes.data.user && regRecRes.data.user.role === 'recipient';
  record('TEST 25', 'Public recipient registration forces recipient role', 201, regRecRes.status, recipientRoleForced);

  // 26. Pagination works on admin lists
  const t26 = await request('/api/admin/users?page=1&limit=2', { headers: { Cookie: adminCookie } });
  const paginationOk = t26.data.count <= 2 && t26.data.page === 1;
  record('TEST 26', 'Admin user list pagination', 200, t26.status, paginationOk);

  // 27. Filtering works on admin user list (role=donor)
  const t27 = await request('/api/admin/users?role=donor', { headers: { Cookie: adminCookie } });
  const onlyDonors = t27.data.users && t27.data.users.every((u) => u.role === 'donor');
  record('TEST 27', 'Admin user list role filter (donor)', 200, t27.status, onlyDonors);

  // 28. Sensitive user fields (password/hash) are NOT returned in admin user APIs
  const adminUserObj = t7.data.user;
  const noSensitiveUserFields = adminUserObj && !('password' in adminUserObj) && !('passwordHash' in adminUserObj);
  record('TEST 28', 'Sensitive user fields omitted from admin user APIs', 200, t7.status, noSensitiveUserFields);

  // Clean up
  await User.deleteMany({ email: { $regex: 'test_p8@bloodward.test', $options: 'i' } });
  await BloodRequest.deleteMany({ hospitalName: { $regex: 'Test Hospital P8', $options: 'i' } });
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
  console.error('Phase 8 test suite error:', err);
  process.exit(1);
});
