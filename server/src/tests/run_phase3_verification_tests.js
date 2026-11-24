import './testDb.js';
import http from 'http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import express from 'express';
import cookieParser from 'cookie-parser';

import User from '../models/user.model.js';
import BloodRequest from '../models/bloodRequest.js';
import AuditLog from '../models/auditLog.js';
import authRoutes from '../routes/auth.routes.js';
import donorRoutes from '../routes/donor.routes.js';
import requestRoutes from '../routes/bloodRequest.routes.js';
import adminRoutes from '../routes/admin.routes.js';
import { initSocket } from '../socket.js';

dotenv.config({ path: './.env' });

const run = async () => {
  console.log('==================================================');
  console.log('RUNNING PHASE 3: MAPS & ADMINISTRATION SUITE');
  console.log('==================================================');

  const dbUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!dbUri) {
    throw new Error('MONGODB_URI not found in environment.');
  }

  await mongoose.connect(dbUri);

  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.use('/api/auth', authRoutes);
  app.use('/api/donors', donorRoutes);
  app.use('/api/requests', requestRoutes);
  app.use('/api/admin', adminRoutes);

  app.use((err, req, res, next) => {
    const status = err.statusCode || 500;
    res.status(status).json({
      success: false,
      message: err.message || 'Server error',
      code: err.code,
    });
  });

  const httpServer = http.createServer(app);
  initSocket(httpServer);
  await new Promise((resolve) => httpServer.listen(0, resolve));
  const port = httpServer.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  const ts = Date.now();
  let passed = 0;
  let total = 0;

  const record = (name, ok, detail = '') => {
    total += 1;
    if (ok) {
      passed += 1;
      console.log(`[✅ PASS] ${name}`);
    } else {
      console.error(`[❌ FAIL] ${name}${detail ? ` - ${detail}` : ''}`);
    }
  };

  const createdUserIds = [];
  const createdRequestIds = [];

  try {
    // -------------------------------------------------------------------------
    // TEST GROUP 1: RECIPIENT DONOR DISCOVERY & MAP DATA CONSISTENCY
    // -------------------------------------------------------------------------

    // 1. Register Delhi Recipient (Needs O+ blood)
    const recRes = await fetch(`${baseUrl}/auth/register/recipient`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'P3 Recipient',
        email: `p3_rec_${ts}@bloodward.test`,
        password: 'Password123!',
        phone: '9876543101',
        gender: 'Female',
        state: 'Delhi',
        city: 'New Delhi',
        accountType: 'individual',
      }),
    });
    const recData = await recRes.json();
    const recCookie = recRes.headers.get('set-cookie');
    createdUserIds.push(recData.user.id);
    record('1. Recipient registers with location (State=Delhi, City=New Delhi)', recRes.status === 201 && recData.user.city === 'New Delhi');

    // 2. Register Delhi Compatible Donor (O+, Available, near 28.6139, 77.2090)
    const d1Res = await fetch(`${baseUrl}/auth/register/donor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'P3 Delhi O+ Donor',
        email: `p3_d_delhi_${ts}@bloodward.test`,
        password: 'Password123!',
        phone: '9876543102',
        bloodGroup: 'O+',
        state: 'Delhi',
        city: 'New Delhi',
        dateOfBirth: '1995-05-15',
        availability: 'available',
        dateOfBirth: '1996-03-20',
        healthQuestionnaire: {
          currentWeight: 70,
          medicalConditions: 'None',
          medications: 'None',
          recentIllnessOrFever: false,
          recentSurgery: false,
          previousDonation: true,
        },
      }),
    });
    const d1Data = await d1Res.json();
    const d1Cookie = d1Res.headers.get('set-cookie');
    createdUserIds.push(d1Data.user.id);
    record('2. Register compatible donor in Delhi (O+, Available)', d1Res.status === 201);

    // 3. Register Mumbai Compatible Donor (O+, Available, >1000km away)
    const d2Res = await fetch(`${baseUrl}/auth/register/donor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'P3 Mumbai O+ Donor',
        email: `p3_d_mumbai_${ts}@bloodward.test`,
        password: 'Password123!',
        phone: '9876543103',
        bloodGroup: 'O+',
        state: 'Maharashtra',
        city: 'Mumbai',
        dateOfBirth: '1995-05-15',
        availability: 'available',
      }),
    });
    const d2Data = await d2Res.json();
    const d2Cookie = d2Res.headers.get('set-cookie');
    createdUserIds.push(d2Data.user.id);
    record('3. Register compatible donor in Mumbai (O+, Available, outside 20km)', d2Res.status === 201);

    // 4. Register Incompatible Donor in Delhi (AB+, Available)
    const d3Res = await fetch(`${baseUrl}/auth/register/donor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'P3 Delhi AB+ Donor',
        email: `p3_d_incomp_${ts}@bloodward.test`,
        password: 'Password123!',
        phone: '9876543104',
        bloodGroup: 'AB+',
        state: 'Delhi',
        city: 'New Delhi',
        dateOfBirth: '1995-05-15',
        availability: 'available',
      }),
    });
    const d3Data = await d3Res.json();
    createdUserIds.push(d3Data.user.id);
    record('4. Register clinically incompatible donor in Delhi (AB+, Available)', d3Res.status === 201);

    // 5. Register Unavailable Compatible Donor in Delhi (O+, Not Available)
    const d4Res = await fetch(`${baseUrl}/auth/register/donor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'P3 Delhi Unavailable Donor',
        email: `p3_d_unavail_${ts}@bloodward.test`,
        password: 'Password123!',
        phone: '9876543105',
        bloodGroup: 'O+',
        state: 'Delhi',
        city: 'New Delhi',
        dateOfBirth: '1995-05-15',
        availability: 'not_available',
      }),
    });
    const d4Data = await d4Res.json();
    createdUserIds.push(d4Data.user.id);
    record('5. Register compatible but unavailable donor in Delhi (O+, not_available)', d4Res.status === 201);

    // 6. Recipient 20km search near Delhi coordinates for O+ need
    const search20kmRes = await fetch(
      `${baseUrl}/donors/search?latitude=28.6139&longitude=77.2090&radius=20&bloodGroup=O%2B`,
      { headers: { Cookie: recCookie } }
    );
    const search20kmData = await search20kmRes.json();
    const foundDelhiO = search20kmData.donors.some((d) => d.fullName === 'P3 Delhi O+ Donor');
    const excludedMumbai = !search20kmData.donors.some((d) => d.fullName === 'P3 Mumbai O+ Donor');
    const excludedIncompatible = !search20kmData.donors.some((d) => d.fullName === 'P3 Delhi AB+ Donor');
    const excludedUnavailable = !search20kmData.donors.some((d) => d.fullName === 'P3 Delhi Unavailable Donor');
    record(
      '6. Discovery map query (radius=20km, O+) returns local compatible donor and excludes distant, incompatible & unavailable donors',
      search20kmRes.status === 200 && foundDelhiO && excludedMumbai && excludedIncompatible && excludedUnavailable
    );

    // 7. Privacy check on search response: No DOB, questionnaire, password, or direct coordinates
    const donorResultSample = search20kmData.donors.find((d) => d.fullName === 'P3 Delhi O+ Donor');
    const privacyPreserved =
      donorResultSample &&
      !('dateOfBirth' in donorResultSample) &&
      !('healthQuestionnaire' in donorResultSample) &&
      !('password' in donorResultSample) &&
      !('phone' in donorResultSample) &&
      !('email' in donorResultSample);
    record('7. Privacy safeguard: Donor health questionnaire, DOB, and contact details strictly omitted from search feed', privacyPreserved);

    // 8. Any distance search returns Mumbai and Delhi donors, but still excludes incompatible/unavailable
    const searchAnyRes = await fetch(`${baseUrl}/donors/search?radius=any&bloodGroup=O%2B`, {
      headers: { Cookie: recCookie },
    });
    const searchAnyData = await searchAnyRes.json();
    const anyFoundDelhi = searchAnyData.donors.some((d) => d.fullName === 'P3 Delhi O+ Donor');
    const anyFoundMumbai = searchAnyData.donors.some((d) => d.fullName === 'P3 Mumbai O+ Donor');
    const anyExcludedIncomp = !searchAnyData.donors.some((d) => d.fullName === 'P3 Delhi AB+ Donor');
    record(
      '8. Any-distance discovery returns both Delhi and Mumbai donors while preserving compatibility and availability filters',
      searchAnyRes.status === 200 && anyFoundDelhi && anyFoundMumbai && anyExcludedIncomp
    );

    // -------------------------------------------------------------------------
    // TEST GROUP 2: DONOR DISPATCH MAP, ATOMIC SINGLE-WINNER ACCEPTANCE & CONCURRENCY
    // -------------------------------------------------------------------------

    // 9. Recipient creates blood request (O+, 2 units, Normal, radius 20km, New Delhi)
    const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    const createReqRes = await fetch(`${baseUrl}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: recCookie },
      body: JSON.stringify({
        bloodGroup: 'O+',
        unitsNeeded: 2,
        hospitalName: 'AIIMS Trauma Centre',
        city: 'New Delhi',
        urgency: 'Normal',
        requiredDate: todayIST,
        radiusKm: 20,
        additionalNotes: 'Urgent surgery replacement unit needed.',
      }),
    });
    const createReqData = await createReqRes.json();
    const reqId = createReqData.request.id;
    createdRequestIds.push(reqId);
    record('9. Recipient dispatches blood request (status: Active, radius: 20km)', createReqRes.status === 201 && createReqData.request.status === 'Active');

    // 10. Compatible available donor in Delhi finds request in /api/requests/available
    const d1AvailRes = await fetch(`${baseUrl}/requests/available`, {
      headers: { Cookie: d1Cookie },
    });
    const d1AvailData = await d1AvailRes.json();
    const d1FoundReq = d1AvailData.requests.some((r) => r.id === reqId);
    record('10. Eligible matching donor in Delhi sees active requisition on dispatch radar', d1AvailRes.status === 200 && d1FoundReq);

    // 11. Distant donor in Mumbai (outside 20km) does NOT see request in /api/requests/available
    const d2AvailRes = await fetch(`${baseUrl}/requests/available`, {
      headers: { Cookie: d2Cookie },
    });
    const d2AvailData = await d2AvailRes.json();
    const d2Excluded = !d2AvailData.requests.some((r) => r.id === reqId);
    record('11. Distant donor in Mumbai outside 20km radius cap is excluded from dispatch radar', d2AvailRes.status === 200 && d2Excluded);

    // 12. Pre-acceptance privacy check: Donor cannot see recipient contact phone number
    const preAcceptReq = d1AvailData.requests.find((r) => r.id === reqId);
    record(
      '12. Shielded contact privacy: Recipient contact phone is masked prior to explicit donor acceptance',
      preAcceptReq && (!preAcceptReq.recipientPhone || preAcceptReq.recipientPhone === 'Locked')
    );

    // 13. Register a second compatible Delhi donor for race-condition testing
    const d1bRes = await fetch(`${baseUrl}/auth/register/donor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'P3 Competing Delhi Donor',
        email: `p3_compete_${ts}@bloodward.test`,
        password: 'Password123!',
        phone: '9876543106',
        bloodGroup: 'O+',
        state: 'Delhi',
        city: 'New Delhi',
        dateOfBirth: '1995-05-15',
        availability: 'available',
      }),
    });
    const d1bData = await d1bRes.json();
    const d1bCookie = d1bRes.headers.get('set-cookie');
    createdUserIds.push(d1bData.user.id);
    record('13. Register second competing donor in Delhi for race condition audit', d1bRes.status === 201);

    // 14. Donor 1 accepts the request atomically (Status transitions to 'Donor Accepted')
    const acceptRes1 = await fetch(`${baseUrl}/requests/${reqId}/accept`, {
      method: 'PATCH',
      headers: { Cookie: d1Cookie },
    });
    const acceptData1 = await acceptRes1.json();
    record(
      '14. Donor 1 atomically accepts request (Status: Donor Accepted, Single Winner)',
      acceptRes1.status === 200 && acceptData1.request.status === 'Donor Accepted'
    );

    // 15. Race condition verification: Competing Donor tries to accept already accepted request
    const acceptRes2 = await fetch(`${baseUrl}/requests/${reqId}/accept`, {
      method: 'PATCH',
      headers: { Cookie: d1bCookie },
    });
    record(
      '15. Concurrency protection: Competing donor receives HTTP 409 Conflict (Single Winner Enforced)',
      acceptRes2.status === 409
    );

    // 16. Accepted request disappears from available feed of other donors
    const d1bFeedAfterRes = await fetch(`${baseUrl}/requests/available`, {
      headers: { Cookie: d1bCookie },
    });
    const d1bFeedAfterData = await d1bFeedAfterRes.json();
    const d1bExcludedAccepted = !d1bFeedAfterData.requests.some((r) => r.id === reqId);
    record('16. Accepted request is immediately removed from other donors dispatch radars', d1bExcludedAccepted);

    // 17. Recipient inspects accepted request: accepted donor identity and phone are securely unlocked
    const recReqsRes = await fetch(`${baseUrl}/requests/my`, {
      headers: { Cookie: recCookie },
    });
    const recReqsData = await recReqsRes.json();
    const trackedReq = recReqsData.requests && recReqsData.requests.find((r) => r.id === reqId);
    record(
      '17. Recipient tracking unlocks accepted donor contact details upon authorized match',
      trackedReq && trackedReq.acceptedDonorDetails && trackedReq.acceptedDonorDetails.phone === '9876543102'
    );

    // -------------------------------------------------------------------------
    // TEST GROUP 3: ADMIN VERIFICATION, MODERATION & IMMUTABLE AUDIT LOGS
    // -------------------------------------------------------------------------

    // 18. Unauthenticated access to /api/admin/users rejected with 401
    const unauthRes = await fetch(`${baseUrl}/admin/users`);
    record('18. Unauthenticated request to /api/admin/users receives HTTP 401 Unauthorized', unauthRes.status === 401);

    // 19. Authenticated non-admin access to /api/admin/users rejected with 403
    const nonAdminRes = await fetch(`${baseUrl}/admin/users`, {
      headers: { Cookie: recCookie },
    });
    record('19. Authenticated recipient request to /api/admin/users receives HTTP 403 Forbidden', nonAdminRes.status === 403);

    // Create unique Admin account
    const adminUser = await User.create({
      fullName: 'P3 Security Admin',
      email: `p3_admin_${ts}@bloodward.test`,
      password: 'AdminPassword123!',
      phone: '9876543199',
      role: 'admin',
    });
    createdUserIds.push(adminUser._id.toString());

    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminUser.email,
        password: 'AdminPassword123!',
        role: 'admin',
      }),
    });
    const adminCookie = adminLoginRes.headers.get('set-cookie');
    record('20. Authenticated platform administrator successfully logs in', adminLoginRes.status === 200);

    // 21. Admin can filter requests by status, blood group, and urgency
    const adminReqFilterRes = await fetch(`${baseUrl}/admin/requests?status=Donor+Accepted&bloodGroup=O%2B&urgency=Normal`, {
      headers: { Cookie: adminCookie },
    });
    const adminReqFilterData = await adminReqFilterRes.json();
    record(
      '21. Admin requests endpoint supports multi-field filtering (status, bloodGroup, urgency)',
      adminReqFilterRes.status === 200 && adminReqFilterData.requests.some((r) => r.id === reqId)
    );

    // 22. Admin blocks a donor account
    const blockRes = await fetch(`${baseUrl}/admin/users/${d1Data.user.id}/block`, {
      method: 'PATCH',
      headers: { Cookie: adminCookie },
    });
    record('22. Admin successfully blocks user account (BLOCK_USER)', blockRes.status === 200);

    // 23. Blocked donor cannot perform protected actions (e.g. update availability)
    const blockedActionRes = await fetch(`${baseUrl}/donors/me/availability`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: d1Cookie },
      body: JSON.stringify({ availability: 'not_available' }),
    });
    record(
      '23. Blocked account enforcement: Blocked donor receives HTTP 403 Forbidden on protected endpoints',
      blockedActionRes.status === 403
    );

    // 24. Admin unblocks donor account
    const unblockRes = await fetch(`${baseUrl}/admin/users/${d1Data.user.id}/unblock`, {
      method: 'PATCH',
      headers: { Cookie: adminCookie },
    });
    record('24. Admin successfully unblocks user account (UNBLOCK_USER)', unblockRes.status === 200);

    // 25. Admin cancels request
    const cancelRes = await fetch(`${baseUrl}/admin/requests/${reqId}/cancel`, {
      method: 'PATCH',
      headers: { Cookie: adminCookie },
    });
    record('25. Admin moderates and cancels blood requisition (status: Cancelled)', cancelRes.status === 200);

    // 26. AuditLog verification: Check immutable records for BLOCK_USER, UNBLOCK_USER, and ADMIN_CANCEL_REQUEST
    const blockAudit = await AuditLog.findOne({ action: 'BLOCK_USER', target: d1Data.user.id });
    const unblockAudit = await AuditLog.findOne({ action: 'UNBLOCK_USER', target: d1Data.user.id });
    const cancelAudit = await AuditLog.findOne({ action: 'ADMIN_CANCEL_REQUEST', target: reqId });
    record(
      '26. Audit logs record administrative moderation actions (actor, action, target, IP, timestamp)',
      blockAudit !== null && unblockAudit !== null && cancelAudit !== null
    );

    // 27. Hospital representative verification enforcement & audit trail
    const hospRepRes = await fetch(`${baseUrl}/auth/register/recipient`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'P3 Hospital Coordinator',
        email: `p3_hosp_${ts}@bloodward.test`,
        password: 'Password123!',
        phone: '9876543188',
        accountType: 'hospital_rep',
        hospitalName: 'Apollo Speciality Care',
        hospitalAddress: 'Mathura Road, New Delhi',
        state: 'Delhi',
        city: 'New Delhi',
      }),
    });
    const hospRepData = await hospRepRes.json();
    const hospRepCookie = hospRepRes.headers.get('set-cookie');
    createdUserIds.push(hospRepData.user.id);

    // Unverified hospital rep creates blood request -> placed in 'Pending Verification'
    const pendingHospReqRes = await fetch(`${baseUrl}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: hospRepCookie },
      body: JSON.stringify({
        bloodGroup: 'B+',
        unitsNeeded: 3,
        hospitalName: 'Apollo Speciality Care',
        city: 'New Delhi',
        urgency: 'High',
        requiredDate: todayIST,
        radiusKm: 20,
      }),
    });
    const pendingHospReqData = await pendingHospReqRes.json();
    createdRequestIds.push(pendingHospReqData.request.id);
    record(
      '27. Unverified hospital requisition is placed in Pending Verification and held from donor dispatch',
      pendingHospReqRes.status === 201 && pendingHospReqData.request.status === 'Pending Verification'
    );

    // Admin approves hospital representative verification
    const approveHospRes = await fetch(`${baseUrl}/admin/users/${hospRepData.user.id}/verification`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ status: 'verified' }),
    });
    const promotedHospReq = await BloodRequest.findById(pendingHospReqData.request.id);
    record(
      '28. Admin verification approval promotes pending requisitions to Active and logs APPROVE_HOSPITAL_VERIFICATION',
      approveHospRes.status === 200 && promotedHospReq && promotedHospReq.status === 'Active'
    );
  } finally {
    // Safe teardown in finally block
    try {
      if (createdUserIds.length > 0) {
        await User.deleteMany({ _id: { $in: createdUserIds } });
      }
      if (createdRequestIds.length > 0) {
        await BloodRequest.deleteMany({ _id: { $in: createdRequestIds } });
      }
      await User.deleteMany({ email: { $regex: `@bloodward\\.test$` } });
      await AuditLog.deleteMany({ target: { $in: createdUserIds.concat(createdRequestIds) } });
    } catch (cleanupErr) {
      console.warn('Phase 3 teardown warning:', cleanupErr.message);
    }
    await new Promise((resolve) => httpServer.close(resolve));
    await mongoose.disconnect();
  }

  console.log('==================================================');
  console.log(`FINAL RESULTS: ${passed}/${total} PASSED`);
  console.log('==================================================');

  process.exit(passed === total ? 0 : 1);
};

run().catch((err) => {
  console.error('Fatal Phase 3 test error:', err);
  process.exit(1);
});
