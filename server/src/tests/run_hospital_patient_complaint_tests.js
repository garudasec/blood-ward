import './testDb.js';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import connectDB from '../config/db.js';
import User from '../models/user.model.js';
import Hospital from '../models/hospital.model.js';
import Patient from '../models/patient.model.js';
import Complaint from '../models/complaint.model.js';
import BloodRequest from '../models/bloodRequest.js';

import authRouter from '../routes/auth.routes.js';
import adminRouter from '../routes/admin.routes.js';
import donorRouter from '../routes/donor.routes.js';
import bloodRequestRouter from '../routes/bloodRequest.routes.js';
import hospitalRouter from '../routes/hospital.routes.js';
import patientRouter from '../routes/patient.routes.js';
import complaintRouter from '../routes/complaint.routes.js';

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

app.use('/api/auth', authRouter);
app.use('/api/donors', donorRouter);
app.use('/api/requests', bloodRequestRouter);
app.use('/api/admin', adminRouter);
app.use('/api/hospitals', hospitalRouter);
app.use('/api/patients', patientRouter);
app.use('/api/complaints', complaintRouter);
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

async function runTests() {
  console.log('=== BLOODWARD HOSPITAL, PATIENT, COMPLAINT & FORGOT PASSWORD TEST SUITE ===');
  await connectDB();

  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  const suffix = Date.now();
  const adminEmail = `admin_hpc_${suffix}@bloodward.test`;
  const rep1Email = `rep1_${suffix}@hospital.test`;
  const rep2Email = `rep2_${suffix}@hospital.test`;
  const patientUserEmail = `patient_user_${suffix}@patient.test`;
  const familyUserEmail = `family_user_${suffix}@family.test`;
  const strangerEmail = `stranger_${suffix}@stranger.test`;
  const password = 'SecurePassword123!';

  let adminCookie = '';
  let rep1Cookie = '';
  let rep2Cookie = '';
  let patientCookie = '';
  let familyCookie = '';
  let strangerCookie = '';

  let hospitalId = '';
  let hospitalMongoId = '';
  let patientRecordId = '';
  let patientDbId = '';
  let claimCode = '';
  let requestId = '';
  let complaintId = '';

  try {
    // 1. Create Admin
    const adminUser = await User.create({
      fullName: 'Admin User',
      email: adminEmail,
      phone: '9876543210',
      password,
      role: 'admin',
      state: 'Punjab',
      city: 'Chandigarh',
      verificationStatus: 'verified',
    });

    const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password }),
    });
    adminCookie = adminLoginRes.headers.get('set-cookie');
    assert(adminLoginRes.status === 200, 'Admin logged in successfully');

    // 2. Register Hospital Rep 1 (Hospital Auto-Creation)
    const rep1Res = await fetch(`${baseUrl}/api/auth/register/recipient`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Dr. Coordinator One',
        email: rep1Email,
        phone: '9876543211',
        password,
        state: 'Punjab',
        city: 'Mohali',
        accountType: 'hospital_rep',
        hospitalName: 'Fortis Healthcare Mohali',
        hospitalAddress: 'Sector 62, Phase VIII',
        hospitalContactPhone: '9876543211',
        representativeDesignation: 'Blood Bank Officer',
      }),
    });
    const rep1Data = await rep1Res.json();
    rep1Cookie = rep1Res.headers.get('set-cookie');
    assert(rep1Res.status === 201, 'Hospital Rep 1 registered successfully');
    assert(rep1Data.user.accountType === 'hospital_rep', 'Rep 1 has accountType hospital_rep');

    const createdHospital = await Hospital.findOne({ name: 'Fortis Healthcare Mohali' });
    assert(Boolean(createdHospital), 'Hospital entity created automatically in database');
    assert(createdHospital.hospitalId.startsWith('BW-HSP-'), 'Hospital assigned formatted ID BW-HSP-xxxxxx');
    hospitalId = createdHospital.hospitalId;
    hospitalMongoId = createdHospital._id.toString();

    // 3. Register Hospital Rep 2 for the SAME hospital (Preventing Duplicate Hospital)
    const rep2Res = await fetch(`${baseUrl}/api/auth/register/recipient`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Dr. Coordinator Two',
        email: rep2Email,
        phone: '9876543212',
        password,
        state: 'Punjab',
        city: 'Mohali',
        accountType: 'hospital_rep',
        hospitalName: 'Fortis Healthcare Mohali',
        hospitalAddress: 'Sector 62, Phase VIII',
        hospitalContactPhone: '9876543212',
        representativeDesignation: 'Emergency CMO',
      }),
    });
    rep2Cookie = rep2Res.headers.get('set-cookie');
    assert(rep2Res.status === 201, 'Hospital Rep 2 registered successfully');

    const hospitalCount = await Hospital.countDocuments({ name: 'Fortis Healthcare Mohali' });
    assert(hospitalCount === 1, 'Duplicate hospital prevented: Only 1 Hospital record exists for Fortis Healthcare Mohali');

    const rep2User = await User.findOne({ email: rep2Email });
    assert(rep2User.hospital.toString() === hospitalMongoId, 'Rep 2 references the existing Hospital record');

    // 4. Admin Verifies Rep 1 & Cascades to Hospital
    const verifyRepRes = await fetch(`${baseUrl}/api/admin/users/${rep1Data.user.id}/verification`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ status: 'verified' }),
    });
    assert(verifyRepRes.status === 200, 'Admin verified Hospital Rep 1');

    const updatedHospital = await Hospital.findById(hospitalMongoId);
    assert(updatedHospital.verificationStatus === 'verified', 'Hospital verificationStatus automatically cascaded to verified');

    // 5. Hospital Rep 1 Creates Blood Request for a Patient
    const reqCreateRes = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: rep1Cookie },
      body: JSON.stringify({
        bloodGroup: 'B+',
        unitsNeeded: 2,
        hospitalName: 'Fortis Healthcare Mohali',
        city: 'Mohali',
        urgency: 'Emergency',
        requiredDate: '2026-12-01',
        radiusKm: 20,
        patientName: 'Sunil Verma',
        patientContactPhone: '9812345678',
        patientAge: 52,
        patientGender: 'Male',
        hospitalRegistrationNumber: 'IPD-89421',
        wardDepartment: 'Cardiology ICU Bed 8',
      }),
    });
    const reqCreateData = await reqCreateRes.json();
    assert(reqCreateRes.status === 201, 'Hospital Rep created blood request for patient');
    assert(Boolean(reqCreateData.claimCode), 'Response includes single-use patient claimCode');
    assert(reqCreateData.claimCode.startsWith('BW-CLM-'), 'Claim code has formatted prefix BW-CLM-');
    claimCode = reqCreateData.claimCode;
    requestId = reqCreateData.request.id;
    patientRecordId = reqCreateData.patientId;

    const patientInDb = await Patient.findOne({ patientId: patientRecordId });
    assert(Boolean(patientInDb), 'Patient record created in database');
    assert(patientInDb.name === 'Sunil Verma', 'Patient name matches');
    assert(patientInDb.hospitalRegistrationNumber === 'IPD-89421', 'Hospital registration number recorded');
    assert(patientInDb.claimCodeUsed === false, 'Patient claimCodeUsed is false initially');
    patientDbId = patientInDb._id.toString();

    const createdBloodRequest = await BloodRequest.findById(requestId);
    assert(createdBloodRequest.patient.toString() === patientDbId, 'BloodRequest correctly references Patient entity');
    assert(createdBloodRequest.hospital.toString() === hospitalMongoId, 'BloodRequest correctly references Hospital entity');
    assert(createdBloodRequest.patientDetails.name === 'Sunil Verma', 'BloodRequest patientDetails snapshot stored');

    // 6. Register Patient User & Claim Patient Record
    const patientUserRes = await fetch(`${baseUrl}/api/auth/register/recipient`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Sunil Verma',
        email: patientUserEmail,
        phone: '9812345678',
        password,
        state: 'Punjab',
        city: 'Mohali',
        accountType: 'individual',
      }),
    });
    patientCookie = patientUserRes.headers.get('set-cookie');
    assert(patientUserRes.status === 201, 'Patient registered user account');

    // Test invalid claim code
    const invalidClaimRes = await fetch(`${baseUrl}/api/patients/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: patientCookie },
      body: JSON.stringify({ patientId: patientRecordId, claimCode: 'BW-CLM-WRONG99' }),
    });
    assert(invalidClaimRes.status === 400, 'Invalid claim code rejected with 400');

    // Test successful claim
    const validClaimRes = await fetch(`${baseUrl}/api/patients/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: patientCookie },
      body: JSON.stringify({ patientId: patientRecordId, claimCode }),
    });
    assert(validClaimRes.status === 200, 'Valid claim code successfully claimed patient record');

    const claimedPatient = await Patient.findOne({ patientId: patientRecordId });
    assert(Boolean(claimedPatient.claimedByUser), 'Patient claimedByUser is now populated');
    assert(claimedPatient.claimCodeUsed === true, 'claimCodeUsed marked true');

    // Test reuse of claimed code
    const reuseClaimRes = await fetch(`${baseUrl}/api/patients/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: patientCookie },
      body: JSON.stringify({ patientId: patientRecordId, claimCode }),
    });
    assert(reuseClaimRes.status === 409 || reuseClaimRes.status === 400, 'Reused claim code rejected');

    // 7. Register Family Member & Request Family Access
    const familyUserRes = await fetch(`${baseUrl}/api/auth/register/recipient`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Pooja Verma',
        email: familyUserEmail,
        phone: '9812345679',
        password,
        state: 'Punjab',
        city: 'Mohali',
        accountType: 'individual',
      }),
    });
    familyCookie = familyUserRes.headers.get('set-cookie');
    assert(familyUserRes.status === 201, 'Family member registered account');

    const familyAccessReqRes = await fetch(`${baseUrl}/api/patients/${patientDbId}/family-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: familyCookie },
      body: JSON.stringify({ relationship: 'Daughter', notes: 'Primary attendant' }),
    });
    assert(familyAccessReqRes.status === 201, 'Family access request submitted with status pending');

    const patientWithPending = await Patient.findById(patientDbId);
    const accessId = patientWithPending.familyAccess[0]._id.toString();
    assert(patientWithPending.familyAccess[0].status === 'pending', 'Family access item has status pending');

    // 8. Patient Approves Family Access
    const approveFamilyRes = await fetch(`${baseUrl}/api/patients/${patientDbId}/family-access/${accessId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: patientCookie },
      body: JSON.stringify({ status: 'approved', notes: 'Verified family member' }),
    });
    assert(approveFamilyRes.status === 200, 'Patient approved family access');

    // Register an unrelated stranger
    const strangerRes = await fetch(`${baseUrl}/api/auth/register/recipient`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Stranger Dan',
        email: strangerEmail,
        phone: '9812345670',
        password,
        state: 'Punjab',
        city: 'Mohali',
        accountType: 'individual',
      }),
    });
    strangerCookie = strangerRes.headers.get('set-cookie');

    // Stranger blocked from viewing private patient details
    const strangerGetRes = await fetch(`${baseUrl}/api/patients/${patientDbId}`, {
      headers: { Cookie: strangerCookie },
    });
    assert(strangerGetRes.status === 403, 'Unauthorized stranger blocked from patient record with 403');

    // Approved family member CAN view patient details
    const familyGetRes = await fetch(`${baseUrl}/api/patients/${patientDbId}`, {
      headers: { Cookie: familyCookie },
    });
    const familyGetData = await familyGetRes.json();
    assert(familyGetRes.status === 200, 'Approved family member can view patient details');
    assert(familyGetData.patient.name === 'Sunil Verma', 'Family member retrieved patient name');

    // 9. Complaint System: Stranger Blocked from Filing Complaint
    const strangerComplaintRes = await fetch(`${baseUrl}/api/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: strangerCookie },
      body: JSON.stringify({
        patientId: patientRecordId,
        hospitalId,
        requestId,
        complainantType: 'family_member',
        category: 'Blood was not provided to the intended patient',
        description: 'Unauthorized complaint attempt by non-family stranger.',
      }),
    });
    assert(strangerComplaintRes.status === 403, 'Unauthorized user blocked from submitting complaint with 403');

    // 10. Approved Family Member Submits Complaint
    const familyComplaintRes = await fetch(`${baseUrl}/api/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: familyCookie },
      body: JSON.stringify({
        patientId: patientRecordId,
        hospitalId,
        requestId,
        complainantType: 'family_member',
        familyRelationship: 'Daughter',
        category: 'Hospital did not respond after donor acceptance',
        description: 'The hospital coordinator did not facilitate the blood transfusion after donor arrived at the ward.',
      }),
    });
    const complaintData = await familyComplaintRes.json();
    assert(familyComplaintRes.status === 201, 'Approved family member submitted complaint');
    assert(complaintData.complaint.complaintId.startsWith('BW-CMP-'), 'Complaint ID has prefix BW-CMP-');
    complaintId = complaintData.complaint._id;

    // Duplicate active complaint blocked
    const duplicateComplaintRes = await fetch(`${baseUrl}/api/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: familyCookie },
      body: JSON.stringify({
        patientId: patientRecordId,
        hospitalId,
        requestId,
        complainantType: 'family_member',
        familyRelationship: 'Daughter',
        category: 'Hospital did not respond after donor acceptance',
        description: 'Another duplicate complaint attempt for the exact same request.',
      }),
    });
    assert(duplicateComplaintRes.status === 400, 'Duplicate active complaint rejected with 400');

    // 11. Admin Complaint Investigation Dashboard
    const adminComplaintsRes = await fetch(`${baseUrl}/api/admin/complaints`, {
      headers: { Cookie: adminCookie },
    });
    const adminComplaintsData = await adminComplaintsRes.json();
    assert(adminComplaintsRes.status === 200, 'Admin fetched complaints list');
    assert(adminComplaintsData.complaints.length > 0, 'Admin complaints list contains submitted complaint');

    // Admin updates complaint status to 'Investigation'
    const adminInvestigateRes = await fetch(`${baseUrl}/api/admin/complaints/${complaintId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        status: 'Investigation',
        note: 'Contacted Fortis blood bank in-charge for logs.',
      }),
    });
    assert(adminInvestigateRes.status === 200, 'Admin updated complaint status to Investigation with note');

    // Admin resolves complaint
    const adminResolveRes = await fetch(`${baseUrl}/api/admin/complaints/${complaintId}/resolve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        status: 'Resolved',
        resolutionReason: 'Investigation complete: Hospital clarified donor arrived after hours. Corrective protocol issued.',
        note: 'Hospital administration briefed.',
      }),
    });
    const resolvedData = await adminResolveRes.json();
    assert(adminResolveRes.status === 200, 'Admin resolved complaint');
    assert(resolvedData.complaint.status === 'Resolved', 'Complaint status marked Resolved');

    // Blood request status remains independent
    const reqAfterComplaint = await BloodRequest.findById(requestId);
    assert(reqAfterComplaint.status === 'Active', 'Blood request status remained Active independent of complaint resolution');

    // 12. Feature F: Forgot Password & Reset Password Workflow + Session Invalidation
    // Log in user before password reset to obtain pre-reset session cookie
    const preResetLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: strangerEmail, password }),
    });
    const preResetCookie = preResetLogin.headers.get('set-cookie');
    assert(preResetLogin.status === 200 && Boolean(preResetCookie), 'Pre-reset session token obtained');

    // Pre-reset token works before password change
    const preResetMe = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: preResetCookie },
    });
    assert(preResetMe.status === 200, 'Pre-reset token works on protected endpoint before password reset');

    // Test forgot password
    const forgotRes = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: strangerEmail }),
    });
    const forgotData = await forgotRes.json();
    assert(forgotRes.status === 200, 'Forgot password request returned 200');
    assert(Boolean(forgotData.testResetToken), 'Test reset token generated');
    assert(!forgotData.resetUrl, 'Reset URL is not exposed in JSON API response');
    const rawResetToken = forgotData.testResetToken;

    // Test timing-safe response for non-existent email
    const nonExistentForgotRes = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent_user_999@random.test' }),
    });
    const nonExistentData = await nonExistentForgotRes.json();
    assert(nonExistentForgotRes.status === 200, 'Non-existent email returns identical success message (timing-safe)');
    assert(!nonExistentData.testResetToken, 'No test token returned for non-existent email');

    // Test reset password with invalid token
    const invalidResetRes = await fetch(`${baseUrl}/api/auth/reset-password/invalid_token_12345`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'BrandNewPassword123!', confirmPassword: 'BrandNewPassword123!' }),
    });
    assert(invalidResetRes.status === 400, 'Invalid reset token rejected with 400');

    // Test successful reset password
    const validResetRes = await fetch(`${baseUrl}/api/auth/reset-password/${rawResetToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'BrandNewPassword123!', confirmPassword: 'BrandNewPassword123!' }),
    });
    assert(validResetRes.status === 200, 'Valid reset token successfully updated password');

    // SESSION INVALIDATION CHECK: Protected endpoint must reject pre-reset session with 401
    const postResetProtected = await fetch(`${baseUrl}/api/patients/me`, {
      headers: { Cookie: preResetCookie },
    });
    assert(postResetProtected.status === 401, 'Old JWT session token invalidated after password reset (401)');

    // And GET /api/auth/me returns authenticated: false
    const postResetOldTokenMe = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: preResetCookie },
    });
    const postResetMeData = await postResetOldTokenMe.json();
    assert(postResetMeData.authenticated === false, 'Old session is unauthenticated after password reset');

    // Test single-use: token cannot be reused
    const reuseResetRes = await fetch(`${baseUrl}/api/auth/reset-password/${rawResetToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'AnotherNewPassword123!', confirmPassword: 'AnotherNewPassword123!' }),
    });
    assert(reuseResetRes.status === 400, 'Reused reset token rejected (single-use enforced)');

    // Test login with new password
    const newLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: strangerEmail, password: 'BrandNewPassword123!' }),
    });
    const newCookie = newLoginRes.headers.get('set-cookie');
    assert(newLoginRes.status === 200, 'User successfully logged in with newly reset password');

    // Newly issued token works
    const newPostResetMe = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: newCookie },
    });
    assert(newPostResetMe.status === 200, 'Newly issued token after password reset works on protected endpoint');

    // Email Service Unit Test: verify emailService structure and safe fallback
    const { isEmailConfigured, sendPasswordResetEmail } = await import('../utils/emailService.js');
    assert(typeof isEmailConfigured === 'function', 'Email configuration helper function exported');
    const emailResult = await sendPasswordResetEmail({
      to: 'unconfigured_test@example.com',
      userName: 'Test User',
      resetUrl: 'http://localhost:5173/reset-password/sample',
    });
    assert(emailResult.sent === false && Boolean(emailResult.reason), 'Email service handles missing SMTP credentials gracefully without crashing');

  } catch (err) {
    console.error('Test suite error:', err);
    failed++;
  } finally {
    if (server) server.close();
  }

  console.log('==================================================');
  console.log(`FINAL RESULTS: ${passed}/${passed + failed}`);
  console.log('==================================================');
  process.exit(failed === 0 ? 0 : 1);
}

runTests();
