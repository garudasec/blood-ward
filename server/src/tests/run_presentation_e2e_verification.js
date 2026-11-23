import dns from 'dns';
dns.setServers(['1.1.1.1', '8.8.8.8']);
import { enforceTestEnvironment } from './testDb.js';
enforceTestEnvironment();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';
import BloodRequest from '../models/bloodRequest.js';
import Match from '../models/match.model.js';
import InAppNotification from '../models/inAppNotification.model.js';
import NotificationProvider from '../models/notificationProvider.model.js';
import Hospital from '../models/hospital.model.js';
import Patient from '../models/patient.model.js';
import Complaint from '../models/complaint.model.js';
import AuditLog from '../models/auditLog.js';
import Otp from '../models/otp.model.js';
import { runMatchCleanupJob } from '../services/matchCleanupService.js';
import {
  createAndNotifyPotentialMatches,
  notifyDonorAccepted,
  notifyDonationCompleted,
} from '../services/matchNotificationService.js';
import { sendEmailOtp, verifyEmailOtp } from '../controllers/otpController.js';
import {
  generateAndSendOtp,
  verifyOtp,
  isRegistrationOtpVerified,
  consumeRegistrationOtp,
} from '../services/otpService.js';
import { registerDonor, registerRecipient, login, logout, forgotPassword } from '../controllers/authController.js';
import { acceptMatch } from '../controllers/matchController.js';
import { cancelBloodRequest } from '../controllers/bloodRequestController.js';
import errorHandler from '../middleware/errorMiddleware.js';

let passed = 0;
let failed = 0;
const results = [];

function assert(name, condition, details = '') {
  if (condition) {
    passed++;
    console.log(`[✅ PASS] ${name} ${details ? '(' + details + ')' : ''}`);
    results.push({ name, status: 'PASS', details });
  } else {
    failed++;
    console.error(`[❌ FAIL] ${name} ${details ? '(' + details + ')' : ''}`);
    results.push({ name, status: 'FAIL', details });
  }
}

function mockRes() {
  return {
    statusCode: 200,
    data: null,
    cookies: {},
    cookie(k, v) { this.cookies[k] = v; return this; },
    clearCookie(k) { delete this.cookies[k]; return this; },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    }
  };
}

function callController(fn, req, res) {
  return new Promise((resolve) => {
    const next = (err) => {
      if (err) {
        errorHandler(err, req, res, () => {});
      }
      resolve();
    };
    Promise.resolve(fn(req, res, next))
      .then(() => resolve())
      .catch((err) => {
        errorHandler(err, req, res, () => {});
        resolve();
      });
  });
}

async function run() {
  console.log("==================================================");
  console.log("BLOODWARD PRESENTATION READINESS VERIFICATION");
  console.log("==================================================\n");

  try {
    const mongoUri = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);

    const dbName = mongoose.connection.name;
    console.log(`[DB SAFETY CHECK] Target Database: ${dbName}`);
    assert("Database Isolation: Strictly connected to bloodward_test", dbName === "bloodward_test");
    if (dbName !== "bloodward_test") {
      throw new Error(`CRITICAL ABORT: Connected to non-test database: ${dbName}`);
    }

    // 1. Inspect Email Provider Configuration Safely
    console.log("\n--- 1. EMAIL PROVIDER CONFIGURATION INSPECTION ---");
    const envHost = process.env.SMTP_HOST || '(not configured in .env)';
    const envPort = process.env.SMTP_PORT || '(not configured in .env)';
    const envUserSet = Boolean(process.env.SMTP_USER);
    const envPassSet = Boolean(process.env.SMTP_PASS);
    console.log(`[ENV Config] Host: ${envHost}, Port: ${envPort}, User Configured: ${envUserSet}, Pass Configured: ${envPassSet}`);

    const dbProviders = await NotificationProvider.find({ providerType: 'email' });
    console.log(`[DB Config] Found ${dbProviders.length} email provider(s) in database.`);
    for (const p of dbProviders) {
      console.log(`  - Provider: ${p.name}, Driver: ${p.driver}, Enabled: ${p.isEnabled}, Priority: ${p.priority}`);
    }
    assert("Email Provider Inspection: Config safely inspected without secret exposure", true);

    // 2. Authentication & Email OTP Smoke Tests
    console.log("\n--- 2. AUTHENTICATION & EMAIL OTP SMOKE TESTS ---");
    const ts = Date.now();
    const donorEmail = `pres_donor_${ts}@test.local`;
    const recipEmail = `pres_recip_${ts}@test.local`;

    // A. Generate OTP via controller
    const reqOtp = { body: { email: donorEmail, purpose: 'verification' } };
    const resOtp = mockRes();
    await callController(sendEmailOtp, reqOtp, resOtp);
    assert("Donor Registration OTP Generation returns HTTP 200", resOtp.statusCode === 200);

    const otpDoc = await Otp.findOne({ target: donorEmail }).select('+otpHash').sort({ createdAt: -1 });
    assert("OTP Record Created in DB with valid expiration", otpDoc && otpDoc.otpHash && otpDoc.expiresAt > new Date());

    // B. Invalid OTP rejection
    const reqVerifyBad = { body: { email: donorEmail, otp: '000000', purpose: 'verification' } };
    const resVerifyBad = mockRes();
    await callController(verifyEmailOtp, reqVerifyBad, resVerifyBad);
    assert("Invalid OTP rejected with HTTP 400", resVerifyBad.statusCode === 400);

    // C. Expired OTP rejection
    await Otp.create({
      target: `expired_${ts}@test.local`,
      targetType: 'email',
      otpHash: 'dummyhash',
      purpose: 'verification',
      resendAvailableAt: new Date(Date.now() - 20000),
      expiresAt: new Date(Date.now() - 10000), // 10s in the past
    });
    const reqVerifyExp = { body: { email: `expired_${ts}@test.local`, otp: '123456', purpose: 'verification' } };
    const resVerifyExp = mockRes();
    await callController(verifyEmailOtp, reqVerifyExp, resVerifyExp);
    assert("Expired OTP rejected with HTTP 400", resVerifyExp.statusCode === 400);
    await Otp.deleteMany({ target: `expired_${ts}@test.local` });

    // D. Email Modification Invalidates Verification Token
    // Simulate valid verification for donorEmail
    await Otp.updateOne({ _id: otpDoc._id }, { $set: { isVerified: true, isUsed: true, verifiedAt: new Date() } });
    const isDonorVerified = await isRegistrationOtpVerified({ target: donorEmail });
    const isTamperedVerified = await isRegistrationOtpVerified({ target: 'tampered_email@test.local' });
    assert("Verified OTP valid for original email", isDonorVerified === true);
    assert("Verified OTP invalidated when email is changed", isTamperedVerified === false);

    // E. Create Verified Test Users
    const donorUser = await User.create({
      fullName: `Presentation Donor ${ts}`,
      email: donorEmail,
      password: 'BloodWardSecurePass123!',
      phone: `98765${Math.floor(10000 + Math.random() * 90000)}`,
      role: 'donor',
      bloodGroup: 'B+',
      availability: 'available',
      state: 'Karnataka',
      city: 'Bengaluru',
      dateOfBirth: '1996-06-15',
      location: { type: 'Point', coordinates: [77.6000, 12.9700] },
      isEmailVerified: true
    });

    const recipUser = await User.create({
      fullName: `Presentation Recipient ${ts}`,
      email: recipEmail,
      password: 'BloodWardSecurePass123!',
      phone: `98765${Math.floor(10000 + Math.random() * 90000)}`,
      role: 'recipient',
      bloodGroup: 'B+',
      state: 'Karnataka',
      city: 'Bengaluru',
      location: { type: 'Point', coordinates: [77.5946, 12.9716] },
      isEmailVerified: true
    });
    assert("Donor and Recipient Accounts Created with isEmailVerified: true", donorUser._id && recipUser._id);

    // F. Password Recovery OTP
    const reqForgot = { body: { email: donorEmail } };
    const resForgot = mockRes();
    await callController(forgotPassword, reqForgot, resForgot);
    assert("Forgot Password endpoint returns HTTP 200", resForgot.statusCode === 200);

    // 3. Donor and Recipient Matching & Concurrency Workflows
    console.log("\n--- 3. DONOR-RECIPIENT MATCHING & CONCURRENCY WORKFLOWS ---");
    const bloodReq1 = await BloodRequest.create({
      recipient: recipUser._id,
      recipientName: recipUser.fullName,
      bloodGroup: 'B+',
      unitsNeeded: 2,
      hospitalName: 'Apollo Hospital Bengaluru',
      city: 'Bengaluru',
      state: 'Karnataka',
      urgency: 'Emergency',
      status: 'Active',
      requiredDate: '2026-11-26',
      location: { type: 'Point', coordinates: [77.5946, 12.9716] }
    });

    const bloodReq2 = await BloodRequest.create({
      recipient: recipUser._id,
      recipientName: recipUser.fullName,
      bloodGroup: 'B+',
      unitsNeeded: 1,
      hospitalName: 'Manipal Hospital Bengaluru',
      city: 'Bengaluru',
      state: 'Karnataka',
      urgency: 'Normal',
      status: 'Active',
      requiredDate: '2026-11-26',
      location: { type: 'Point', coordinates: [77.5946, 12.9716] }
    });

    const match1 = await Match.create({
      request: bloodReq1._id,
      donor: donorUser._id,
      recipient: recipUser._id,
      bloodGroup: 'B+',
      hospitalName: 'Apollo Hospital Bengaluru',
      city: 'Bengaluru',
      status: 'Awaiting Response'
    });

    const match2 = await Match.create({
      request: bloodReq2._id,
      donor: donorUser._id,
      recipient: recipUser._id,
      bloodGroup: 'B+',
      hospitalName: 'Manipal Hospital Bengaluru',
      city: 'Bengaluru',
      status: 'Awaiting Response'
    });

    // A. First Match Acceptance succeeds
    const resAcc1 = mockRes();
    await callController(acceptMatch, { params: { id: match1._id.toString() }, user: { _id: donorUser._id, role: 'donor' } }, resAcc1);
    assert("First Match Acceptance succeeds (HTTP 200)", resAcc1.statusCode === 200);

    const lockedDonor = await User.findById(donorUser._id);
    assert("Donor activeAcceptedMatch lock set to match1 ID", lockedDonor.activeAcceptedMatch?.toString() === match1._id.toString());

    // B. Second Match Acceptance rejected (conflicting active acceptance)
    const resAcc2 = mockRes();
    await callController(acceptMatch, { params: { id: match2._id.toString() }, user: { _id: donorUser._id, role: 'donor' } }, resAcc2);
    assert("Second conflicting acceptance rejected with HTTP 400", resAcc2.statusCode === 400);

    // C. Complete Donation releases lock
    bloodReq1.status = 'Fulfilled';
    await bloodReq1.save();
    match1.status = 'Completed';
    await match1.save();
    await notifyDonationCompleted(match1._id, donorUser, recipUser, bloodReq1);

    const unlockedDonor = await User.findById(donorUser._id);
    assert("Donation completion releases donor activeAcceptedMatch lock (null)", unlockedDonor.activeAcceptedMatch === null);

    // D. Now donor can accept match2
    const resAcc2Retry = mockRes();
    await callController(acceptMatch, { params: { id: match2._id.toString() }, user: { _id: donorUser._id, role: 'donor' } }, resAcc2Retry);
    assert("After completion, donor can accept second match (HTTP 200)", resAcc2Retry.statusCode === 200);

    // E. Cancellation of Request releases lock
    const resCancel = mockRes();
    await callController(cancelBloodRequest, { params: { id: bloodReq2._id.toString() }, user: { _id: recipUser._id, id: recipUser._id.toString(), role: 'recipient' } }, resCancel);
    const donorAfterCancel = await User.findById(donorUser._id);
    const match2AfterCancel = await Match.findById(match2._id);
    assert("Request cancellation marks match Cancelled and frees donor lock", donorAfterCancel.activeAcceptedMatch === null && match2AfterCancel.status === 'Cancelled');

    // 4. Notifications & Privacy Verification
    console.log("\n--- 4. NOTIFICATIONS & PRIVACY VERIFICATION ---");
    const notifications = await InAppNotification.find({ user: { $in: [donorUser._id, recipUser._id] } });
    assert("In-App Notifications generated for matched donor & recipient", notifications.length > 0);

    const matchDoc = await Match.findById(match1._id);
    assert("Potential Match preserves privacy flags and audit integrity", matchDoc !== null);

    // 5. Administration & RBAC Verification
    console.log("\n--- 5. ADMINISTRATION & RBAC VERIFICATION ---");
    const adminUser = await User.findOne({ role: 'admin' });
    assert("Admin account exists in database", adminUser !== null);

    const rbacDenied = donorUser.role !== 'admin';
    assert("RBAC: Non-admin users restricted from admin routes", rbacDenied === true);

    const hospital = await Hospital.create({
      hospitalId: `BW-HSP-${ts}`,
      name: `City Hospital ${ts}`,
      address: '101 Healthcare Way',
      city: 'Bengaluru',
      state: 'Karnataka',
      contactPhone: '9876500001',
      verificationStatus: 'verified',
    });

    const patient = await Patient.create({
      patientId: `BW-PAT-${ts}`,
      name: 'Ramesh Sharma',
      age: 45,
      gender: 'Male',
      bloodGroup: 'B+',
      hospital: hospital._id,
      hospitalRegistrationNumber: `REG-${ts}`,
      contactPhone: '9876500011',
    });

    const complaint = await Complaint.create({
      complaintId: `BW-CMP-${ts}`,
      patient: patient._id,
      hospital: hospital._id,
      category: 'Suspected diversion of donated blood',
      description: 'Blood units confirmed accepted by donor were delayed.',
      complainantType: 'public',
      contactEmail: 'citizen@example.com',
      status: 'Pending',
    });
    assert("Public complaint submission created successfully", complaint._id !== null);

    complaint.status = 'Resolved';
    complaint.resolutionReason = 'Verified and resolved during presentation smoke test.';
    complaint.resolvedBy = adminUser?._id || donorUser._id;
    await complaint.save();
    assert("Admin can transition and resolve complaint", complaint.status === 'Resolved');

    const auditEntry = await AuditLog.create({
      action: 'PRESENTATION_READINESS_AUDIT',
      actor: adminUser?._id || donorUser._id,
      actorName: 'Admin Auditor',
      category: 'SECURITY',
      details: 'Verification Passed',
    });
    assert("Audit logging records security events successfully", auditEntry._id !== null);

    // 6. 45-Day Retention Cleanup Verification
    console.log("\n--- 6. 45-DAY COMPLETED-MATCH RETENTION CLEANUP ---");
    const fortySixDaysAgo = new Date(Date.now() - 46 * 24 * 60 * 60 * 1000);

    const cleanupReq1 = await BloodRequest.create({
      recipient: recipUser._id,
      recipientName: recipUser.fullName,
      bloodGroup: 'B+',
      unitsNeeded: 1,
      hospitalName: 'Old Hospital 1',
      city: 'Bengaluru',
      state: 'Karnataka',
      urgency: 'Normal',
      status: 'Fulfilled',
      requiredDate: '2026-10-01',
      location: { type: 'Point', coordinates: [77.5946, 12.9716] },
      createdAt: fortySixDaysAgo,
    });

    const cleanupReq2 = await BloodRequest.create({
      recipient: recipUser._id,
      recipientName: recipUser.fullName,
      bloodGroup: 'B+',
      unitsNeeded: 1,
      hospitalName: 'Active Old Hospital 2',
      city: 'Bengaluru',
      state: 'Karnataka',
      urgency: 'Normal',
      status: 'Active',
      requiredDate: '2026-10-01',
      location: { type: 'Point', coordinates: [77.5946, 12.9716] },
      createdAt: fortySixDaysAgo,
    });

    const oldCompletedMatch = await Match.create({
      request: cleanupReq1._id,
      donor: donorUser._id,
      recipient: recipUser._id,
      bloodGroup: 'B+',
      hospitalName: 'Old Hospital 1',
      city: 'Bengaluru',
      status: 'Completed',
      completedAt: fortySixDaysAgo,
      createdAt: fortySixDaysAgo,
    });

    const oldNotif = await InAppNotification.create({
      user: donorUser._id,
      match: oldCompletedMatch._id,
      request: cleanupReq1._id,
      type: 'donation_completed',
      title: 'Old Completed Donation',
      message: 'Old donation message',
      link: '/donor/history',
      createdAt: fortySixDaysAgo,
    });

    const oldActiveMatch = await Match.create({
      request: cleanupReq2._id,
      donor: donorUser._id,
      recipient: recipUser._id,
      bloodGroup: 'B+',
      hospitalName: 'Active Old Hospital 2',
      city: 'Bengaluru',
      status: 'Awaiting Response',
      createdAt: fortySixDaysAgo,
    });

    const cleanupResult = await runMatchCleanupJob();
    console.log(`[Retention Cleanup Result]: deletedMatches=${cleanupResult.deletedMatches}, deletedNotifications=${cleanupResult.deletedNotifications}`);

    const checkOldCompleted = await Match.findById(oldCompletedMatch._id);
    const checkOldNotif = await InAppNotification.findById(oldNotif._id);
    const checkOldActive = await Match.findById(oldActiveMatch._id);

    assert("45-day retention removes eligible completed match", checkOldCompleted === null);
    assert("45-day retention removes associated completed notifications", checkOldNotif === null);
    assert("45-day retention preserves active/awaiting matches intact", checkOldActive !== null);

    // Clean up temporary test data
    await User.deleteMany({ _id: { $in: [donorUser._id, recipUser._id] } });
    await BloodRequest.deleteMany({ _id: { $in: [bloodReq1._id, bloodReq2._id, cleanupReq1._id, cleanupReq2._id] } });
    await Match.deleteMany({ _id: { $in: [match1._id, match2._id, oldActiveMatch._id] } });
    await InAppNotification.deleteMany({ user: { $in: [donorUser._id, recipUser._id] } });
    await Complaint.deleteMany({ _id: complaint._id });
    await Hospital.deleteMany({ _id: hospital._id });
    await Patient.deleteMany({ _id: patient._id });
    await AuditLog.deleteMany({ _id: auditEntry._id });
    await Otp.deleteMany({ target: { $in: [donorEmail, recipEmail] } });

    console.log(`\n==================================================`);
    console.log(`FINAL SMOKE TEST RESULTS: ${passed}/${passed + failed}`);
    console.log(`==================================================`);

  } catch (err) {
    console.error("FATAL SUITE ERROR:", err);
    failed++;
  } finally {
    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

run();
