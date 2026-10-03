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
app.use('/api/requests', bloodRequestRouter);
app.use('/api/admin', adminRouter);
app.use('/api/test/rbac', rbacTestRouter);
app.use(notFoundHandler);
app.use(errorHandler);

const runSuite = async () => {
  console.log('=== BLOODWARD PHASE 7 (BLOOD REQUEST LIFECYCLE) SUITE ===');
  await connectDB();

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = 'http://127.0.0.1:' + port;
  console.log('Test server running at ' + baseUrl);

  // Clean up any test records
  await User.deleteMany({ email: { $regex: 'test_p7@bloodward.test', $options: 'i' } });
  await BloodRequest.deleteMany({ hospitalName: { $regex: 'Test Hospital P7', $options: 'i' } });

  const password = 'Password123!';

  // Create Users
  const recipient1 = await User.create({
    fullName: 'Recipient One P7',
    email: 'recipient1_test_p7@bloodward.test',
    phone: '9876500001',
    password,
    role: 'recipient',
    state: 'Delhi',
    city: 'Delhi',
  });

  const recipient2 = await User.create({
    fullName: 'Recipient Two P7',
    email: 'recipient2_test_p7@bloodward.test',
    phone: '9876500002',
    password,
    role: 'recipient',
    state: 'Delhi',
    city: 'Delhi',
  });

  const donor1 = await User.create({
    fullName: 'Donor One P7',
    email: 'donor1_test_p7@bloodward.test',
    phone: '9876500003',
    password,
    role: 'donor',
    bloodGroup: 'O+',
    availability: 'available',
    state: 'Delhi',
    city: 'Delhi',
    location: { type: 'Point', coordinates: [77.2090, 28.6139] },
  });

  const donor2 = await User.create({
    fullName: 'Donor Two P7',
    email: 'donor2_test_p7@bloodward.test',
    phone: '9876500004',
    password,
    role: 'donor',
    bloodGroup: 'O+',
    availability: 'available',
    state: 'Delhi',
    city: 'Delhi',
    location: { type: 'Point', coordinates: [77.2100, 28.6150] },
  });

  const admin = await User.create({
    fullName: 'Admin P7',
    email: 'admin_test_p7@bloodward.test',
    phone: '9876500005',
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

  const rec1Login = await loginUser(recipient1.email);
  const rec2Login = await loginUser(recipient2.email);
  const don1Login = await loginUser(donor1.email);
  const don2Login = await loginUser(donor2.email);
  const adminLogin = await loginUser(admin.email);

  const getCookie = (res) => (res.setCookie ? res.setCookie.split(';')[0] : '');

  const rec1Cookie = getCookie(rec1Login);
  const rec2Cookie = getCookie(rec2Login);
  const don1Cookie = getCookie(don1Login);
  const don2Cookie = getCookie(don2Login);
  const adminCookie = getCookie(adminLogin);

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

  // 1. Recipient creates request
  const validReqBody = {
    bloodGroup: 'O+',
    unitsNeeded: 2,
    hospitalName: 'Test Hospital P7 Main',
    city: 'Delhi',
    urgency: 'Emergency',
    requiredDate: '2026-12-31',
    additionalNotes: 'Urgent requirement',
  };
  const t1 = await request('/api/requests', {
    method: 'POST',
    headers: { Cookie: rec1Cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify(validReqBody),
  });
  const createdRequestId = t1.data.request ? t1.data.request.id : null;
  record('TEST 1', 'Recipient creates request', 201, t1.status, t1.data.success && createdRequestId !== null);

  // 2. Donor attempts create request
  const t2 = await request('/api/requests', {
    method: 'POST',
    headers: { Cookie: don1Cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify(validReqBody),
  });
  record('TEST 2', 'Donor attempts create request', 403, t2.status);

  // 3. Admin attempts create request
  const t3 = await request('/api/requests', {
    method: 'POST',
    headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify(validReqBody),
  });
  record('TEST 3', 'Admin attempts create request', 403, t3.status);

  // 4. Unauthenticated create request
  const t4 = await request('/api/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validReqBody),
  });
  record('TEST 4', 'Unauthenticated create request', 401, t4.status);

  // 5. Invalid blood group
  const t5 = await request('/api/requests', {
    method: 'POST',
    headers: { Cookie: rec1Cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...validReqBody, bloodGroup: 'Z+' }),
  });
  record('TEST 5', 'Invalid blood group rejection', 400, t5.status);

  // 6. Invalid units needed
  const t6 = await request('/api/requests', {
    method: 'POST',
    headers: { Cookie: rec1Cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...validReqBody, unitsNeeded: 0 }),
  });
  record('TEST 6', 'Invalid units needed rejection', 400, t6.status);

  // 7. Invalid urgency
  const t7 = await request('/api/requests', {
    method: 'POST',
    headers: { Cookie: rec1Cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...validReqBody, urgency: 'SuperUrgent' }),
  });
  record('TEST 7', 'Invalid urgency rejection', 400, t7.status);

  // 8. Invalid location
  const t8 = await request('/api/requests', {
    method: 'POST',
    headers: { Cookie: rec1Cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...validReqBody, location: { type: 'Point', coordinates: [999, 999] } }),
  });
  record('TEST 8', 'Invalid location coordinates rejection', 400, t8.status);

  // 9. Client-supplied recipient ID ignored
  const t9 = await request('/api/requests', {
    method: 'POST',
    headers: { Cookie: rec1Cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...validReqBody, recipient: recipient2._id.toString() }),
  });
  const recipientIgnored = t9.data.request && t9.data.request.recipient.toString() === recipient1._id.toString();
  record('TEST 9', 'Client-supplied recipient ID ignored', 201, t9.status, recipientIgnored);

  // 10. Client-supplied status ignored (set to Active)
  const t10 = await request('/api/requests', {
    method: 'POST',
    headers: { Cookie: rec1Cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...validReqBody, status: 'Fulfilled' }),
  });
  const statusIgnored = t10.data.request && t10.data.request.status === 'Active';
  record('TEST 10', 'Client-supplied status ignored (forces Active)', 201, t10.status, statusIgnored);

  // 11. Recipient sees own requests
  const t11 = await request('/api/requests/my', { headers: { Cookie: rec1Cookie } });
  record('TEST 11', 'Recipient GET own requests', 200, t11.status, t11.data.success && t11.data.requests.length >= 1);

  // 12. Recipient cannot see another recipient\'s private request
  const t12 = await request(`/api/requests/${createdRequestId}`, { headers: { Cookie: rec2Cookie } });
  record('TEST 12', 'Recipient cannot view another recipient request', 403, t12.status);

  // 13. Eligible donor sees active compatible requests
  const t13 = await request('/api/requests/available', { headers: { Cookie: don1Cookie } });
  console.log('T13 DEBUG data:', JSON.stringify(t13.data)); record('TEST 13', 'Eligible donor GET available requests', 200, t13.status, t13.data.success && t13.data.requests.length >= 1);

  // 14. Unavailable donor cannot access available requests
  donor1.availability = 'not_available';
  await donor1.save();
  const t14 = await request('/api/requests/available', { headers: { Cookie: don1Cookie } });
  record('TEST 14', 'Unavailable donor denied available requests', 403, t14.status);
  // Restore availability
  donor1.availability = 'available';
  await donor1.save();

  // 15. Blocked donor cannot access available requests
  donor1.isBlocked = true;
  await donor1.save();
  const t15 = await request('/api/requests/available', { headers: { Cookie: don1Cookie } });
  record('TEST 15', 'Blocked donor denied available requests', 403, t15.status);
  donor1.isBlocked = false;
  await donor1.save();

  // 16. Donor 1 accepts active request
  const t16 = await request(`/api/requests/${createdRequestId}/accept`, {
    method: 'PATCH',
    headers: { Cookie: don1Cookie },
  });
  record('TEST 16', 'Donor 1 accepts active request', 200, t16.status, t16.data.request && t16.data.request.status === 'Donor Accepted');

  // 17. Second donor attempts to accept same request (Concurrency Conflict)
  const t17 = await request(`/api/requests/${createdRequestId}/accept`, {
    method: 'PATCH',
    headers: { Cookie: don2Cookie },
  });
  record('TEST 17', 'Second donor accept attempt (409 Conflict)', 409, t17.status);

  // 18. Unauthorized donor cannot manipulate another donor\'s acceptance
  const t18 = await request(`/api/requests/${createdRequestId}/in-progress`, {
    method: 'PATCH',
    headers: { Cookie: don2Cookie },
  });
  record('TEST 18', 'Unaccepted donor cannot move request to In Progress', 403, t18.status);

  // 19. Accepted donor moves request to In Progress
  const t19 = await request(`/api/requests/${createdRequestId}/in-progress`, {
    method: 'PATCH',
    headers: { Cookie: don1Cookie },
  });
  record('TEST 19', 'Accepted donor moves request to In Progress', 200, t19.status, t19.data.request.status === 'In Progress');

  // 20. Direct Active -> Fulfilled transition rejected
  const req2Id = t9.data.request.id;
  const t20 = await request(`/api/requests/${req2Id}/fulfill`, {
    method: 'PATCH',
    headers: { Cookie: rec1Cookie },
  });
  record('TEST 20', 'Direct Active -> Fulfilled transition rejected', 400, t20.status);

  // 21. In Progress request fulfilled by accepted donor
  const t21 = await request(`/api/requests/${createdRequestId}/fulfill`, {
    method: 'PATCH',
    headers: { Cookie: don1Cookie },
  });
  record('TEST 21', 'In Progress request fulfilled by accepted donor', 200, t21.status, t21.data.request.status === 'Fulfilled');

  // 22. Recipient cancels own active request
  const req3Id = t10.data.request.id;
  const t22 = await request(`/api/requests/${req3Id}/cancel`, {
    method: 'PATCH',
    headers: { Cookie: rec1Cookie },
  });
  record('TEST 22', 'Recipient owner cancels own active request', 200, t22.status, t22.data.request.status === 'Cancelled');

  // 23. Donor cannot cancel another recipient\'s request
  const t23 = await request(`/api/requests/${req2Id}/cancel`, {
    method: 'PATCH',
    headers: { Cookie: don1Cookie },
  });
  record('TEST 23', 'Donor denied cancelling another user request', 403, t23.status);

  // 24. Terminal request cannot be modified (Fulfilled -> Cancelled)
  const t24 = await request(`/api/requests/${createdRequestId}/cancel`, {
    method: 'PATCH',
    headers: { Cookie: rec1Cookie },
  });
  record('TEST 24', 'Terminal request modification rejected', 400, t24.status);

  // 25. Expired request acceptance rejected
  const expiredReq = await BloodRequest.create({
    recipient: recipient1._id,
    recipientName: recipient1.fullName,
    bloodGroup: 'O+',
    unitsNeeded: 1,
    hospitalName: 'Test Hospital P7 Main',
    city: 'Delhi',
    urgency: 'Normal',
    status: 'Active',
    requiredDate: '2020-01-01',
  });
  const t25 = await request(`/api/requests/${expiredReq._id}/accept`, {
    method: 'PATCH',
    headers: { Cookie: don1Cookie },
  });
  record('TEST 25', 'Expired request acceptance rejected', 409, t25.status);

  // 26. Privacy check for available requests (no email/phone exposed to discovering donors)
  const availableReq = t13.data.requests[0];
  const noRecipientSecrets = availableReq && !('email' in availableReq) && !('phone' in availableReq);
  record('TEST 26', 'Privacy check (no email/phone in available requests)', 200, t13.status, noRecipientSecrets);

  // 27. Audit event created for request creation
  const auditEntry = await AuditLog.findOne({ action: 'CREATE_BLOOD_REQUEST', target: createdRequestId });
  record('TEST 27', 'Audit event recorded for request creation', 200, 200, auditEntry !== null);

  // 28. Audit event created for donor acceptance
  const acceptAuditEntry = await AuditLog.findOne({ action: 'ACCEPT_BLOOD_REQUEST', target: createdRequestId });
  record('TEST 28', 'Audit event recorded for donor acceptance', 200, 200, acceptAuditEntry !== null);

  // 29. Audit log privacy (no password / token in audit records)
  const sampleLog = await AuditLog.findOne({ category: 'RECIPIENT_ACTION' });
  const safeLogDetails = sampleLog && !sampleLog.details.includes('password') && !sampleLog.details.includes('token');
  record('TEST 29', 'Audit log privacy (no secrets in details)', 200, 200, safeLogDetails);

  // Clean up
  await User.deleteMany({ email: { $regex: 'test_p7@bloodward.test', $options: 'i' } });
  await BloodRequest.deleteMany({ hospitalName: { $regex: 'Test Hospital P7', $options: 'i' } });
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
  console.error('Phase 7 test suite error:', err);
  process.exit(1);
});
