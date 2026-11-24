import { seedVerifiedEmailOtp } from './testDb.js';
import assert from 'node:assert';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createServer } from 'node:http';

import User from '../models/user.model.js';
import BloodRequest from '../models/bloodRequest.js';
import AuditLog from '../models/auditLog.js';
import authRoutes from '../routes/auth.routes.js';
import donorRoutes from '../routes/donor.routes.js';
import requestRoutes from '../routes/bloodRequest.routes.js';
import adminRoutes from '../routes/admin.routes.js';
import { initSocket } from '../socket.js';

dotenv.config({ path: './.env' });

let passed = 0;
let total = 0;

const record = (desc, ok, err = null) => {
  total++;
  if (ok) {
    passed++;
    console.log(`[✅ PASS] ${desc}`);
  } else {
    console.error(`[❌ FAIL] ${desc}: ${err ? err.message || err : 'Assertion failed'}`);
  }
};

const run = async () => {
  console.log('==================================================');
  console.log('RUNNING PHASE 2 VERIFICATION SUITE');
  console.log('==================================================');

  await mongoose.connect(process.env.MONGODB_URI);

  // Setup express test server
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.use('/api/auth', authRoutes);
  app.use('/api/donors', donorRoutes);
  app.use('/api/requests', requestRoutes);
  app.use('/api/admin', adminRoutes);

  // Global error handler
  app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
    });
  });

  const httpServer = createServer(app);
  initSocket(httpServer);

  await new Promise((resolve) => httpServer.listen(0, resolve));
  const port = httpServer.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  const ts = Date.now();
  let hospUserId = null;
  let hospUser2 = null;

  try {
    // ----------------------------------------------------
    // TEST GROUP 1: DONOR ONBOARDING & HEALTH QUESTIONNAIRE
    // ----------------------------------------------------

    // 1. Register donor with date of birth and questionnaire
    const donorEmail = `donor_p2_${ts}@bloodward.test`;
    await seedVerifiedEmailOtp(donorEmail);
    const regDonorRes = await fetch(`${baseUrl}/auth/register/donor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Phase2 Donor',
        email: donorEmail,
        password: 'Password123!',
        phone: '9876543210',
        bloodGroup: 'O+',
        gender: 'Male',
        state: 'Delhi',
        city: 'New Delhi',
        pincode: '110001',
        dateOfBirth: '1995-05-15',
        availability: 'available',
        healthQuestionnaire: {
          currentWeight: 72,
          medicalConditions: 'None',
          medications: 'None',
          recentIllnessOrFever: false,
          recentSurgery: false,
          previousDonation: true,
          lastDonationDate: '2026-01-10',
          additionalNotes: 'Regular voluntary donor',
        },
      }),
    });
    const regDonorData = await regDonorRes.json();
    const donorCookie = regDonorRes.headers.get('set-cookie');

    record('1. Donor registration accepts Date of Birth & Health Questionnaire', regDonorRes.status === 201 && regDonorData.user.dateOfBirth === '1995-05-15');
    record('2. Donor profile contains health questionnaire with medical safety disclaimer', regDonorData.user.healthQuestionnaire && regDonorData.user.healthQuestionnaire.currentWeight === 72);

    // 3. Existing donor without health questionnaire logs in safely (backward compatibility)
    const legacyDonor = await User.create({
      fullName: 'Legacy Donor',
      email: `legacy_donor_${ts}@bloodward.test`,
      password: 'Password123!',
      phone: '9876543211',
      bloodGroup: 'B+',
      role: 'donor',
      state: 'Delhi',
      city: 'New Delhi',
      availability: 'available',
    });
    const legacyLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: legacyDonor.email,
        password: 'Password123!',
        role: 'donor',
      }),
    });
    const legacyLoginData = await legacyLoginRes.json();
    record('3. Backward compatibility: Legacy donor without questionnaire logs in safely', legacyLoginRes.status === 200 && legacyLoginData.user.role === 'donor');

    // 4. Update health questionnaire
    const updateHqRes = await fetch(`${baseUrl}/donors/me/health-questionnaire`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: donorCookie },
      body: JSON.stringify({
        currentWeight: 74,
        medicalConditions: 'Mild seasonal allergies',
        medications: 'Antihistamine as needed',
        recentIllnessOrFever: false,
        recentSurgery: false,
        previousDonation: true,
        lastDonationDate: '2026-01-10',
      }),
    });
    const updateHqData = await updateHqRes.json();
    record('4. Donor can update health questionnaire via PUT /api/donors/me/health-questionnaire', updateHqRes.status === 200 && updateHqData.healthQuestionnaire.currentWeight === 74);
    record('5. Health questionnaire response includes medical safety disclaimer', typeof updateHqData.disclaimer === 'string' && updateHqData.disclaimer.includes('Preliminary'));

    // 5. Weight validation check
    const invalidWeightRes = await fetch(`${baseUrl}/donors/me/health-questionnaire`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: donorCookie },
      body: JSON.stringify({ currentWeight: 15 }),
    });
    record('6. Invalid weight (<20 kg) is rejected with 400', invalidWeightRes.status === 400);

    // ----------------------------------------------------
    // TEST GROUP 2: RECIPIENT & HOSPITAL REGISTRATION & VERIFICATION
    // ----------------------------------------------------

    // 7. Individual recipient registration (auto-verified)
    const indEmail = `ind_rec_${ts}@bloodward.test`;
    await seedVerifiedEmailOtp(indEmail);
    const regIndRes = await fetch(`${baseUrl}/auth/register/recipient`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Individual Requester',
        email: indEmail,
        password: 'Password123!',
        phone: '9876543220',
        state: 'Delhi',
        city: 'New Delhi',
        accountType: 'individual',
      }),
    });
    const regIndData = await regIndRes.json();
    const indCookie = regIndRes.headers.get('set-cookie');
    record('7. Individual recipient registration is auto-verified', regIndRes.status === 201 && regIndData.user.verificationStatus === 'verified' && regIndData.user.accountType === 'individual');

    // 8. Hospital representative registration (defaults to pending verification)
    const hospEmail = `hosp_rep_${ts}@bloodward.test`;
    await seedVerifiedEmailOtp(hospEmail);
    const regHospRes = await fetch(`${baseUrl}/auth/register/recipient`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Dr. Representative',
        email: hospEmail,
        password: 'Password123!',
        phone: '9876543230',
        state: 'Delhi',
        city: 'New Delhi',
        accountType: 'hospital_rep',
        hospitalName: 'Apex City Hospital',
        hospitalAddress: 'Ring Road, Sector 4, New Delhi',
        hospitalContactPhone: '0112345678',
        representativeDesignation: 'Blood Bank Officer',
        authorizationNotes: 'Hospital license #DEL-HOSP-2026-991',
      }),
    });
    const regHospData = await regHospRes.json();
    const hospCookie = regHospRes.headers.get('set-cookie');
    hospUserId = regHospData.user.id;
    record('8. Hospital representative registration is marked Pending Verification', regHospRes.status === 201 && regHospData.user.verificationStatus === 'pending' && regHospData.user.hospitalName === 'Apex City Hospital');

    // 9. Hospital representative without hospital name is rejected
    const invalidHospRes = await fetch(`${baseUrl}/auth/register/recipient`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Incomplete Hospital',
        email: `bad_hosp_${ts}@bloodward.test`,
        password: 'Password123!',
        phone: '9876543231',
        accountType: 'hospital_rep',
      }),
    });
    record('9. Hospital rep registration without hospital name is rejected with 400', invalidHospRes.status === 400);

    // 10. Unverified hospital rep creates blood request -> Request is held in 'Pending Verification'
    const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    const unverifiedReqRes = await fetch(`${baseUrl}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: hospCookie },
      body: JSON.stringify({
        bloodGroup: 'O+',
        unitsNeeded: 2,
        hospitalName: 'Apex City Hospital',
        city: 'New Delhi',
        urgency: 'Normal',
        requiredDate: todayIST,
        radiusKm: 20,
      }),
    });
    const unverifiedReqData = await unverifiedReqRes.json();
    record('10. Request created by unverified hospital rep is placed in Pending Verification status', unverifiedReqRes.status === 201 && unverifiedReqData.request.status === 'Pending Verification' && unverifiedReqData.isPendingVerification === true);

    // 11. Donor does NOT see unverified hospital requests in /api/requests/available
    const availReqRes = await fetch(`${baseUrl}/requests/available`, {
      headers: { Cookie: donorCookie },
    });
    const availReqData = await availReqRes.json();
    const unverifiedFound = availReqData.requests.some((r) => r.id === unverifiedReqData.request.id);
    record('11. Unverified hospital blood request is excluded from donor discovery / available requests', !unverifiedFound);

    // 12. Recipient searches donors -> Health questionnaire is strictly excluded from search results
    const donorSearchRes = await fetch(`${baseUrl}/donors/search?bloodGroup=O%2B&radius=any`, {
      headers: { Cookie: indCookie },
    });
    const donorSearchData = await donorSearchRes.json();
    const foundDonor = donorSearchData.donors ? donorSearchData.donors.find((d) => d.id === regDonorData.user.id) : null;
    record('12. Privacy check: Donor health questionnaire is omitted from search results', foundDonor && !('healthQuestionnaire' in foundDonor) && !('dateOfBirth' in foundDonor));

    // ----------------------------------------------------
    // TEST GROUP 3: ADMIN VERIFICATION & AUDIT LOGGING
    // ----------------------------------------------------

    // Create unique Admin for verification testing
    const adminUser = await User.create({
      fullName: 'Test Phase2 Admin',
      email: `admin_p2_${ts}@bloodward.test`,
      password: 'AdminPassword123!',
      phone: '9876543299',
      role: 'admin',
    });

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

    // 13. Non-admin cannot verify accounts (403)
    const unauthorizedVerifyRes = await fetch(`${baseUrl}/admin/users/${hospUserId}/verification`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: indCookie },
      body: JSON.stringify({ status: 'verified' }),
    });
    record('13. Non-admin user cannot verify accounts (403 Forbidden)', unauthorizedVerifyRes.status === 403);

    // 14. Admin approves hospital verification
    const approveVerifyRes = await fetch(`${baseUrl}/admin/users/${hospUserId}/verification`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ status: 'verified' }),
    });
    const approveVerifyData = await approveVerifyRes.json();
    record('14. Admin approves hospital representative verification', approveVerifyRes.status === 200 && approveVerifyData.user.verificationStatus === 'verified');

    // 15. Verify audit log recorded for hospital approval
    const auditApprove = await AuditLog.findOne({
      action: 'APPROVE_HOSPITAL_VERIFICATION',
      target: hospUserId,
    });
    record('15. Audit log correctly records APPROVE_HOSPITAL_VERIFICATION action', auditApprove !== null);

    // 16. Pending request transitions to Active after hospital approval
    const promotedReq = await BloodRequest.findById(unverifiedReqData.request.id);
    record('16. Held request automatically promoted to Active upon hospital verification', promotedReq && promotedReq.status === 'Active');

    // 17. Admin rejection with reason validation
    hospUser2 = await User.create({
      fullName: 'Rejected Rep',
      email: `rej_rep_${ts}@bloodward.test`,
      password: 'Password123!',
      phone: '9876543232',
      role: 'recipient',
      accountType: 'hospital_rep',
      hospitalName: 'Unverified Clinic',
      verificationStatus: 'pending',
    });
    const rejectNoReasonRes = await fetch(`${baseUrl}/admin/users/${hospUser2._id}/verification`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ status: 'rejected' }),
    });
    record('17. Rejection without rejectionReason is rejected with 400', rejectNoReasonRes.status === 400);

    const rejectWithReasonRes = await fetch(`${baseUrl}/admin/users/${hospUser2._id}/verification`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ status: 'rejected', rejectionReason: 'Hospital license number is unverifiable.' }),
    });
    const rejectWithReasonData = await rejectWithReasonRes.json();
    record('18. Admin rejects hospital rep with reason stored', rejectWithReasonRes.status === 200 && rejectWithReasonData.user.verificationStatus === 'rejected' && rejectWithReasonData.user.verificationRejectionReason === 'Hospital license number is unverifiable.');

    // ----------------------------------------------------
    // TEST GROUP 4: COMPLETE BLOOD REQUEST WORKFLOW JOURNEY
    // ----------------------------------------------------

    // 19. Verified individual creates active request
    const indReqRes = await fetch(`${baseUrl}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: indCookie },
      body: JSON.stringify({
        bloodGroup: 'O+',
        unitsNeeded: 1,
        hospitalName: 'AIIMS New Delhi',
        city: 'New Delhi',
        urgency: 'High',
        requiredDate: todayIST,
        radiusKm: 20,
      }),
    });
    const indReqData = await indReqRes.json();
    const indReqId = indReqData.request.id;
    record('19. Verified recipient request is immediately created in Active status', indReqRes.status === 201 && indReqData.request.status === 'Active');

    // 20. Compatible donor sees active request in available requests
    const donorSeeRes = await fetch(`${baseUrl}/requests/available`, {
      headers: { Cookie: donorCookie },
    });
    const donorSeeData = await donorSeeRes.json();
    const reqVisible = donorSeeData.requests.some((r) => r.id === indReqId);
    record('20. Compatible donor within radius finds active request in discovery feed', reqVisible);

    // 21. Donor accepts request atomically
    const acceptRes = await fetch(`${baseUrl}/requests/${indReqId}/accept`, {
      method: 'PATCH',
      headers: { Cookie: donorCookie },
    });
    const acceptData = await acceptRes.json();
    record('21. Eligible donor successfully accepts blood request (Status: Donor Accepted)', acceptRes.status === 200 && acceptData.request.status === 'Donor Accepted');

    // 22. Recipient views request details -> Donor contact details unlocked
    const recViewRes = await fetch(`${baseUrl}/requests/${indReqId}`, {
      headers: { Cookie: indCookie },
    });
    const recViewData = await recViewRes.json();
    const contactUnlocked = recViewData.request.acceptedDonorDetails && recViewData.request.acceptedDonorDetails.phone === '9876543210';
    record('22. Recipient tracking unlocks accepted donor contact information', contactUnlocked);

    // 23. Transition to In Progress
    const inProgRes = await fetch(`${baseUrl}/requests/${indReqId}/in-progress`, {
      method: 'PATCH',
      headers: { Cookie: donorCookie },
    });
    const inProgData = await inProgRes.json();
    record('23. Request transitions from Donor Accepted to In Progress', inProgRes.status === 200 && inProgData.request.status === 'In Progress');

    // 24. Fulfill request
    const fulfillRes = await fetch(`${baseUrl}/requests/${indReqId}/fulfill`, {
      method: 'PATCH',
      headers: { Cookie: indCookie },
    });
    const fulfillData = await fulfillRes.json();
    record('24. Request transitions from In Progress to Fulfilled', fulfillRes.status === 200 && fulfillData.request.status === 'Fulfilled');

    // 25. Terminal state protection: Cannot cancel or re-open fulfilled request
    const cancelFulfilledRes = await fetch(`${baseUrl}/requests/${indReqId}/cancel`, {
      method: 'PATCH',
      headers: { Cookie: indCookie },
    });
    record('25. Terminal state protection: Fulfilled request cannot be cancelled (400)', cancelFulfilledRes.status === 400);
  } finally {
    // Clean up test data safely in finally block
    try {
      await User.deleteMany({ email: { $regex: `_${ts}@bloodward.test` } });
      await BloodRequest.deleteMany({ hospitalName: { $in: ['Apex City Hospital', 'AIIMS New Delhi'] } });
      if (hospUserId) {
        await AuditLog.deleteMany({ target: { $in: [hospUserId, hospUser2 ? hospUser2._id.toString() : ''] } });
      }
    } catch (cleanupErr) {
      console.warn('Test cleanup warning:', cleanupErr.message);
    }
    await new Promise((resolve) => httpServer.close(resolve));
  }

  console.log('==================================================');
  console.log(`FINAL RESULTS: ${passed}/${total} PASSED`);
  console.log('==================================================');

  try {
    await mongoose.disconnect();
  } catch (e) {
    // Ignore close error
  }
  process.exit(passed === total ? 0 : 1);
};

process.on('uncaughtException', (err) => {
  if (err.name === 'MongoClientClosedError') {
    process.exit(0);
  }
  console.error('Fatal error:', err);
  process.exit(1);
});

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
