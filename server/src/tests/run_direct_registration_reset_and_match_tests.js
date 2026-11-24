import './testDb.js';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

import connectDB from '../config/db.js';
import User from '../models/user.model.js';
import Hospital from '../models/hospital.model.js';
import BloodRequest from '../models/bloodRequest.js';
import Match from '../models/match.model.js';
import InAppNotification from '../models/inAppNotification.model.js';
import AuditLog from '../models/auditLog.js';
import NotificationProvider from '../models/notificationProvider.model.js';
import authRouter from '../routes/auth.routes.js';
import matchRouter from '../routes/match.routes.js';
import inAppNotificationRouter from '../routes/inAppNotification.routes.js';
import notFoundHandler from '../middleware/notFoundMiddleware.js';
import errorHandler from '../middleware/errorMiddleware.js';
import sanitizeMiddleware from '../middleware/sanitizeMiddleware.js';
import notificationManager from '../services/notification/notificationManager.js';
import { createAndNotifyPotentialMatches } from '../services/matchNotificationService.js';
import { ResendEmailProvider } from '../services/notification/resendEmailProvider.js';
import nodemailer from 'nodemailer';
import { sendPasswordResetEmail } from '../utils/emailService.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(helmet());
app.use(sanitizeMiddleware);
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

app.use('/api/auth', authRouter);
app.use('/api/matches', matchRouter);
app.use('/api/notifications', inAppNotificationRouter);
app.use(notFoundHandler);
app.use(errorHandler);

let server;
let baseUrl;
let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    passed++;
    console.log(`[PASS] (${passed}/${total}) - ${message}`);
  } else {
    console.error(`[FAIL] (${passed}/${total}) - ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function run() {
  console.log("==================================================");
  console.log("RUNNING REGISTRATION, PASSWORD RESET & MATCH NOTIFICATION SUITE");
  console.log("DATABASE: bloodward_test (Strict Isolation)");
  console.log("==================================================\n");

  await connectDB();

  // Safety check on connected database
  assert(
    mongoose.connection.name === "bloodward_test",
    `Strict test database guard active: connected to ${mongoose.connection.name}`
  );

  // Clean collections for clean isolation
  await User.deleteMany({ email: { $regex: /@bloodward-arch-test\.com$/ } });
  await BloodRequest.deleteMany({ patientName: "Architecture Test Patient" });
  await Match.deleteMany({});
  await InAppNotification.deleteMany({});
  await NotificationProvider.deleteMany({});

  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}/api`;

  try {
    // =========================================================================
    // SECTION 1: DIRECT DONOR REGISTRATION WITHOUT OTP
    // =========================================================================
    console.log("\n--- SECTION 1: Direct Voluntary Donor Registration (No OTP) ---");

    const donorPayload = {
      fullName: "Ananya Sharma",
      email: "ananya.sharma@bloodward-arch-test.com",
      phone: "9876543210",
      password: "StrongPassword123!",
      bloodGroup: "O+",
      dateOfBirth: "1995-06-15",
      gender: "Female",
      state: "Maharashtra",
      city: "Mumbai",
      pincode: "400001",
      availability: "available",
    };

    // 1.1 Direct donor registration must succeed immediately without any prior OTP
    const regRes = await fetch(`${baseUrl}/auth/register/donor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(donorPayload),
    });
    const regData = await regRes.json();

    assert(regRes.status === 201, "Direct donor registration succeeds with HTTP 201");
    assert(regData.success === true, "Response payload indicates success");
    assert(regData.user.fullName === "Ananya Sharma", "Registered donor full name preserved");
    assert(regData.user.email === donorPayload.email, "Registered donor email matches");
    assert(regData.user.isEmailVerified === false, "isEmailVerified is strictly false (no fake emailVerified flag)");
    assert(regData.user.emailVerifiedAt === null, "emailVerifiedAt is null");

    // 1.2 Verify database record directly
    const donorInDb = await User.findOne({ email: donorPayload.email }).select("+password");
    assert(donorInDb !== null, "Donor user record exists in database");
    assert(donorInDb.role === "donor", "User role is donor");
    assert(donorInDb.password !== donorPayload.password, "Password is fully hashed with bcrypt");
    assert(donorInDb.password.startsWith("$2"), "Password hash format is valid bcrypt");

    // 1.3 Duplicate donor registration rejection
    const dupRes = await fetch(`${baseUrl}/auth/register/donor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(donorPayload),
    });
    const dupData = await dupRes.json();
    assert(dupRes.status === 400, "Duplicate donor registration returns HTTP 400");
    assert(dupData.message.includes("already exists"), "Duplicate rejection message is clear");

    // 1.4 Underage / Minor registration rejection
    const minorPayload = { ...donorPayload, email: "minor@bloodward-arch-test.com", dateOfBirth: "2015-01-01" };
    const minorRes = await fetch(`${baseUrl}/auth/register/donor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(minorPayload),
    });
    assert(minorRes.status === 400, "Underage voluntary donor registration is rejected");

    // 1.5 Invalid phone number rejection
    const badPhonePayload = { ...donorPayload, email: "badphone@bloodward-arch-test.com", phone: "12345" };
    const badPhoneRes = await fetch(`${baseUrl}/auth/register/donor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(badPhonePayload),
    });
    assert(badPhoneRes.status === 400, "Invalid Indian phone number rejected with HTTP 400");

    // =========================================================================
    // SECTION 2: DIRECT RECIPIENT REGISTRATION WITHOUT OTP
    // =========================================================================
    console.log("\n--- SECTION 2: Direct Recipient Registration (No OTP) ---");

    const recipientPayload = {
      fullName: "Vikram Malhotra",
      email: "vikram.malhotra@bloodward-arch-test.com",
      phone: "9123456780",
      password: "RecipientPassword123!",
      gender: "Male",
      state: "Maharashtra",
      city: "Mumbai",
      accountType: "individual",
    };

    // 2.1 Direct individual recipient registration
    const recRes = await fetch(`${baseUrl}/auth/register/recipient`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(recipientPayload),
    });
    const recData = await recRes.json();

    assert(recRes.status === 201, "Direct recipient registration succeeds with HTTP 201");
    assert(recData.user.role === "recipient", "Registered user role is recipient");
    assert(recData.user.isEmailVerified === false, "Recipient isEmailVerified is strictly false");
    assert(recData.user.emailVerifiedAt === null, "Recipient emailVerifiedAt is null");

    // 2.2 Direct hospital representative recipient registration
    const hospRepPayload = {
      fullName: "Dr. Rajesh Kulkarni",
      email: "rajesh.kulkarni@bloodward-arch-test.com",
      phone: "9822012345",
      password: "DoctorPassword123!",
      gender: "Male",
      state: "Maharashtra",
      city: "Pune",
      accountType: "hospital_rep",
      hospitalName: "Apollo Hospital Pune",
      hospitalAddress: "Near Station, Pune",
      hospitalContactPhone: "02026123456",
      representativeDesignation: "Chief Medical Officer",
    };

    const hospRes = await fetch(`${baseUrl}/auth/register/recipient`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(hospRepPayload),
    });
    const hospData = await hospRes.json();

    assert(hospRes.status === 201, "Direct hospital rep registration succeeds with HTTP 201");
    assert(hospData.user.accountType === "hospital_rep", "Account type is hospital_rep");
    assert(hospData.user.verificationStatus === "pending", "Hospital rep starts in pending verification");

    const hospInDb = await Hospital.findOne({ name: "Apollo Hospital Pune" });
    assert(hospInDb !== null, "Hospital record automatically created and linked");

    // =========================================================================
    // SECTION 3: SECURE LINK-BASED FORGOT PASSWORD WORKFLOW
    // =========================================================================
    console.log("\n--- SECTION 3: Secure Link-Based Forgot Password ---");

    // 3.1 Non-existent email timing-safe response (account enumeration prevention)
    const nonExistentRes = await fetch(`${baseUrl}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "doesnotexist@bloodward-arch-test.com" }),
    });
    const nonExistentData = await nonExistentRes.json();
    assert(nonExistentRes.status === 200, "Non-existent email returns HTTP 200 (timing-safe)");
    assert(
      nonExistentData.message.includes("If an account matches that email"),
      "Generic message returned to prevent account enumeration"
    );

    // 3.2 Existing user requests password reset
    const forgotRes = await fetch(`${baseUrl}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: donorPayload.email }),
    });
    const forgotData = await forgotRes.json();

    assert(forgotRes.status === 200, "Forgot password request for valid user returns HTTP 200");
    assert(forgotData.testResetToken !== undefined, "Test reset token returned in test environment");

    const rawToken = forgotData.testResetToken;
    assert(typeof rawToken === "string" && rawToken.length === 64, "Raw token is a 32-byte hex string (64 characters)");

    // 3.3 Verify DB stores SHA-256 hash, NOT the raw token
    const donorAfterForgot = await User.findOne({ email: donorPayload.email }).select("+passwordResetToken +passwordResetExpires");
    assert(donorAfterForgot.passwordResetToken !== null, "passwordResetToken is stored in database");
    assert(donorAfterForgot.passwordResetToken !== rawToken, "Database stores hashed token, NOT the raw token");
    assert(donorAfterForgot.passwordResetToken.length === 64, "Stored token hash is 64 hex characters (SHA-256)");
    assert(donorAfterForgot.passwordResetExpires > Date.now(), "Token expiry is set in future (~15 minutes)");
    assert(
      donorAfterForgot.passwordResetExpires <= Date.now() + 16 * 60 * 1000,
      "Token expiry does not exceed 16 minutes"
    );

    // 3.4 Invalidation on invalid token
    const badTokenRes = await fetch(`${baseUrl}/auth/reset-password/completely-bogus-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "BrandNewPassword999!", confirmPassword: "BrandNewPassword999!" }),
    });
    assert(badTokenRes.status === 400, "Invalid reset token returns HTTP 400");

    // 3.5 Token expiration enforcement
    donorAfterForgot.passwordResetExpires = new Date(Date.now() - 5000); // Set to past
    await donorAfterForgot.save({ validateBeforeSave: false });

    const expiredRes = await fetch(`${baseUrl}/auth/reset-password/${rawToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "BrandNewPassword999!", confirmPassword: "BrandNewPassword999!" }),
    });
    assert(expiredRes.status === 400, "Expired reset token returns HTTP 400");

    // Restore valid expiry for successful reset test
    donorAfterForgot.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
    await donorAfterForgot.save({ validateBeforeSave: false });

    // 3.6 Password validation (mismatched confirmation)
    const mismatchRes = await fetch(`${baseUrl}/auth/reset-password/${rawToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "BrandNewPassword999!", confirmPassword: "DifferentPassword999!" }),
    });
    assert(mismatchRes.status === 400, "Mismatched password confirmation rejected with HTTP 400");

    // 3.7 Password validation (too short)
    const shortRes = await fetch(`${baseUrl}/auth/reset-password/${rawToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "short", confirmPassword: "short" }),
    });
    assert(shortRes.status === 400, "Short password (< 8 chars) rejected with HTTP 400");

    // Capture session token BEFORE password reset to test tokenVersion invalidation in authMiddleware
    const preResetLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: donorPayload.email, password: donorPayload.password }),
    });
    const preResetCookies = preResetLoginRes.headers.get("set-cookie") || "";
    const tokenMatch = preResetCookies.match(/token=([^;]+)/);
    const preResetToken = tokenMatch ? tokenMatch[1] : null;
    assert(preResetToken !== null, "Pre-reset session token obtained for donor");

    // 3.8 Successful password reset
    const initialTokenVersion = donorAfterForgot.tokenVersion || 0;
    const resetSuccessRes = await fetch(`${baseUrl}/auth/reset-password/${rawToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "BrandNewPassword999!", confirmPassword: "BrandNewPassword999!" }),
    });
    const resetSuccessData = await resetSuccessRes.json();

    assert(resetSuccessRes.status === 200, "Valid password reset returns HTTP 200");
    assert(resetSuccessData.success === true, "Password reset response indicates success");

    // 3.9 Single-use enforcement (reusing same token fails)
    const replayRes = await fetch(`${baseUrl}/auth/reset-password/${rawToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "AnotherPassword123!", confirmPassword: "AnotherPassword123!" }),
    });
    assert(replayRes.status === 400, "Single-use enforcement: re-using spent token fails with HTTP 400");

    // 3.10 Invalidate prior sessions (tokenVersion incremented) & verify new password
    const donorAfterReset = await User.findOne({ email: donorPayload.email }).select("+password +passwordResetToken +passwordResetExpires");
    assert(donorAfterReset.passwordResetToken === null, "passwordResetToken cleared upon reset");
    assert(donorAfterReset.passwordResetExpires === null, "passwordResetExpires cleared upon reset");
    assert(donorAfterReset.tokenVersion === initialTokenVersion + 1, "tokenVersion incremented to invalidate existing sessions");

    // 3.11 Login with new password succeeds
    const loginNewRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: donorPayload.email, password: "BrandNewPassword999!" }),
    });
    assert(loginNewRes.status === 200, "Login with updated password succeeds with HTTP 200");

    // 3.12 Login with old password fails
    const loginOldRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: donorPayload.email, password: donorPayload.password }),
    });
    assert(loginOldRes.status === 401, "Login with old invalidated password fails with HTTP 401");

    // 3.13 Verification of tokenVersion in authMiddleware
    // Protected endpoint with pre-reset token must be rejected with 401
    const protectedWithOldTokenRes = await fetch(`${baseUrl}/auth/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${preResetToken}`,
      },
      body: JSON.stringify({ fullName: "Should Not Update" }),
    });
    const protectedWithOldTokenData = await protectedWithOldTokenRes.json();
    assert(protectedWithOldTokenRes.status === 401, "authMiddleware rejects request with outdated tokenVersion (HTTP 401)");
    assert(
      protectedWithOldTokenData.message.includes("Password recently changed"),
      "authMiddleware returns session invalidation message: 'Password recently changed. Please log in again with your new password.'"
    );

    // 3.14 Indistinguishable response and account enumeration prevention on email delivery failure
    const originalNotificationSendEmail = notificationManager.sendEmail.bind(notificationManager);
    await NotificationProvider.create({
      providerType: 'email',
      driver: 'smtp',
      name: 'Test Failure Provider',
      isEnabled: true,
      isHealthy: true,
      priority: 1,
    });

    notificationManager.sendEmail = async () => {
      throw new Error("Simulated downstream SMTP network disconnection");
    };

    const forgotDeliveryFailRes = await fetch(`${baseUrl}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: donorPayload.email }),
    });
    const forgotDeliveryFailData = await forgotDeliveryFailRes.json();

    assert(forgotDeliveryFailRes.status === 200, "Delivery failure returns HTTP 200 (indistinguishable from success)");
    assert(
      forgotDeliveryFailData.message === "If an account matches that email, instructions to reset your password have been sent.",
      "Response message matches identical enumeration-safe text when delivery fails"
    );
    assert(
      forgotDeliveryFailData.testResetToken === undefined,
      "No active reset token is returned when delivery fails"
    );

    const donorAfterFailedDelivery = await User.findOne({ email: donorPayload.email }).select("+passwordResetToken +passwordResetExpires");
    assert(donorAfterFailedDelivery.passwordResetToken === null, "passwordResetToken is nullified in DB after delivery failure");

    // Clean up test provider and restore notificationManager.sendEmail
    await NotificationProvider.deleteMany({ name: 'Test Failure Provider' });
    notificationManager.sendEmail = originalNotificationSendEmail;

    // =========================================================================
    // SECTION 3B: PASSWORD RESET EMAIL DISPATCH PROVIDER FLOWS
    // =========================================================================
    console.log("\n--- SECTION 3B: Password Reset Provider Flows (Resend HTTPS, DB Provider, SMTP Fallback) ---");

    // 3.15 Password Reset Email via Mocked Resend HTTPS Environment Fallback
    const savedResendApiKey = process.env.RESEND_API_KEY;
    const savedResendFrom = process.env.RESEND_FROM;
    const savedResendSenderName = process.env.RESEND_SENDER_NAME;

    process.env.RESEND_API_KEY = "re_test_mock_env_resend_key_12345";
    process.env.RESEND_FROM = "BloodWard Security <security@bloodward.org>";
    process.env.RESEND_SENDER_NAME = "BloodWard Security";

    await NotificationProvider.deleteMany({}); // Ensure no database providers exist

    let capturedResendRequest = null;
    ResendEmailProvider.mockFetch = async (url, options) => {
      capturedResendRequest = { url, options, body: JSON.parse(options.body) };
      return new Response(JSON.stringify({ id: "msg_resend_env_mock_999" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const envResendDispatch = await sendPasswordResetEmail({
      to: donorPayload.email,
      userName: "Ananya Sharma",
      resetUrl: "http://localhost:5173/reset-password/sample-env-resend-token",
    });

    assert(envResendDispatch.sent === true, "Password reset email dispatches via environment Resend API");
    assert(envResendDispatch.messageId === "msg_resend_env_mock_999", "Message ID from mocked Resend HTTPS response preserved");
    assert(envResendDispatch.providerName === "Environment Resend API", "Provider identified as Environment Resend API");
    assert(capturedResendRequest !== null, "Resend HTTPS mockFetch was invoked");
    assert(capturedResendRequest.options.headers.Authorization === "Bearer re_test_mock_env_resend_key_12345", "Bearer authorization header matches RESEND_API_KEY");
    assert(capturedResendRequest.body.subject === "BloodWard — Password Reset Request", "Resend payload contains correct reset subject");
    assert(capturedResendRequest.body.html.includes("http://localhost:5173/reset-password/sample-env-resend-token"), "Resend HTML body contains fully qualified reset link");

    // 3.16 Password Reset Email via Database Resend Provider
    const dbResendProvider = new NotificationProvider({
      providerType: "email",
      driver: "resend",
      name: "Database Primary Resend Provider",
      priority: 1,
      isEnabled: true,
      isHealthy: true,
    });
    dbResendProvider.setCredentials({
      apiKey: "re_db_provider_key_xyz888",
      senderAddress: "alerts@hospital.org",
      senderName: "Hospital Blood Bank",
    });
    await dbResendProvider.save();

    let capturedDbResendRequest = null;
    ResendEmailProvider.mockFetch = async (url, options) => {
      capturedDbResendRequest = { url, options, body: JSON.parse(options.body) };
      return new Response(JSON.stringify({ id: "msg_db_resend_mock_888" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const dbResendDispatch = await sendPasswordResetEmail({
      to: donorPayload.email,
      userName: "Ananya Sharma",
      resetUrl: "http://localhost:5173/reset-password/sample-db-resend-token",
    });

    assert(dbResendDispatch.sent === true, "Password reset email dispatches via database Resend provider");
    assert(dbResendDispatch.messageId === "msg_db_resend_mock_888", "Database Resend provider messageId preserved");
    assert(dbResendDispatch.providerName === "Database Primary Resend Provider", "Provider name matches database record");
    assert(capturedDbResendRequest !== null, "Database Resend request was dispatched");
    assert(capturedDbResendRequest.options.headers.Authorization === "Bearer re_db_provider_key_xyz888", "Decrypted database credentials used for Resend dispatch");

    // Clean up DB provider
    await NotificationProvider.deleteMany({});
    ResendEmailProvider.mockFetch = null;

    // Restore Resend env vars
    process.env.RESEND_API_KEY = savedResendApiKey || "";
    process.env.RESEND_FROM = savedResendFrom || "";
    process.env.RESEND_SENDER_NAME = savedResendSenderName || "";

    // 3.17 Password Reset Email via Existing Environment SMTP Fallback
    const savedSmtpHost = process.env.SMTP_HOST;
    const savedSmtpPort = process.env.SMTP_PORT;
    const savedSmtpUser = process.env.SMTP_USER;
    const savedSmtpPass = process.env.SMTP_PASS;

    process.env.RESEND_API_KEY = ""; // Explicitly disable Resend to test SMTP fallback
    process.env.SMTP_HOST = "smtp.mock-mail.local";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "mock_smtp_user";
    process.env.SMTP_PASS = "mock_smtp_pass";

    const origCreateTransport = nodemailer.createTransport;
    let capturedSmtpMail = null;
    nodemailer.createTransport = () => ({
      sendMail: async (opts) => {
        capturedSmtpMail = opts;
        return { messageId: "msg_smtp_env_mock_777" };
      },
    });

    const smtpDispatch = await sendPasswordResetEmail({
      to: donorPayload.email,
      userName: "Ananya Sharma",
      resetUrl: "http://localhost:5173/reset-password/sample-smtp-token",
    });

    assert(smtpDispatch.sent === true, "Password reset email dispatches via environment SMTP fallback");
    assert(smtpDispatch.messageId === "msg_smtp_env_mock_777", "SMTP fallback messageId preserved");
    assert(smtpDispatch.providerName === "Default Environment SMTP", "Provider identified as Default Environment SMTP");
    assert(capturedSmtpMail !== null, "SMTP sendMail was invoked");
    assert(capturedSmtpMail.subject === "BloodWard — Password Reset Request", "SMTP message contains correct reset subject");
    assert(capturedSmtpMail.html.includes("http://localhost:5173/reset-password/sample-smtp-token"), "SMTP HTML body contains reset link");

    // Restore nodemailer and SMTP env vars
    nodemailer.createTransport = origCreateTransport;
    process.env.SMTP_HOST = savedSmtpHost || "";
    process.env.SMTP_PORT = savedSmtpPort || "";
    process.env.SMTP_USER = savedSmtpUser || "";
    process.env.SMTP_PASS = savedSmtpPass || "";
    process.env.RESEND_API_KEY = savedResendApiKey || "";

    // =========================================================================
    // SECTION 4: BLOOD DONOR MATCH NOTIFICATIONS & EMAIL INTEGRITY
    // =========================================================================
    console.log("\n--- SECTION 4: Blood Donor Match Notifications ---");

    const sentEmails = [];
    const originalSendEmail = notificationManager.sendEmail.bind(notificationManager);

    // Mock notificationManager.sendEmail to capture outbound email notifications safely
    notificationManager.sendEmail = async (params) => {
      sentEmails.push({ ...params });
      return { success: true, messageId: `msg_${Date.now()}` };
    };

    // Create Blood Request
    const recipientUser = await User.findOne({ email: recipientPayload.email });
    const bloodReq = await BloodRequest.create({
      patientName: "Architecture Test Patient",
      recipientName: recipientUser.fullName,
      bloodGroup: "O+",
      unitsNeeded: 2,
      urgency: "Emergency",
      hospitalName: "Lilavati Hospital Mumbai",
      state: "Maharashtra",
      city: "Mumbai",
      contactPhone: "9123456780",
      recipient: recipientUser._id,
      status: "Active",
      requiredDate: "2026-11-25",
    });

    // 4.1 Trigger match notifications
    const matchedDonors = [donorInDb];
    const createdMatches = await createAndNotifyPotentialMatches(bloodReq, matchedDonors);

    assert(createdMatches.length === 1, "One match record created for compatible donor");
    const matchId = createdMatches[0]._id;

    // 4.2 Verify In-App Notifications were created
    const donorNotif = await InAppNotification.findOne({ user: donorInDb._id, match: matchId });
    assert(donorNotif !== null, "In-app notification created for matched donor");
    assert(donorNotif.type === "potential_match", "Donor notification type is potential_match");
    assert(donorNotif.message.includes("Lilavati Hospital Mumbai"), "Donor notification mentions hospital name");

    const recNotif = await InAppNotification.findOne({ user: recipientUser._id, match: matchId });
    assert(recNotif !== null, "In-app notification created for requesting recipient");
    assert(recNotif.type === "potential_match", "Recipient notification type is potential_match");

    // Wait 50ms for setImmediate async email dispatch
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 4.3 Verify outbound email dispatch & subjects
    const donorEmail = sentEmails.find((e) => e.to === donorInDb.email);
    assert(donorEmail !== undefined, "Email dispatched to matched voluntary donor");
    assert(
      donorEmail.subject === "BloodWard – A blood donation match has been found",
      "Donor email subject exactly matches: 'BloodWard – A blood donation match has been found'"
    );

    const recEmail = sentEmails.find((e) => e.to === recipientUser.email);
    assert(recEmail !== undefined, "Email dispatched to blood requester");
    assert(
      recEmail.subject === "BloodWard – A donor match has been found for your request",
      "Recipient email subject exactly matches: 'BloodWard – A donor match has been found for your request'"
    );

    // 4.4 Privacy check: no private phone numbers or coordinates in emails
    assert(!donorEmail.html.includes(donorInDb.phone), "Donor phone number is NEVER leaked in email html");
    assert(!recEmail.html.includes(donorInDb.phone), "Donor phone number is NOT shared with recipient at matching stage");
    assert(!donorEmail.text.includes(donorInDb.phone), "Donor phone number is not in email text");

    // 4.5 Verify match email flags are set
    const matchInDb = await Match.findById(matchId);
    assert(matchInDb.donorEmailSent === true, "Match record updated with donorEmailSent: true");
    assert(matchInDb.recipientEmailSent === true, "Match record updated with recipientEmailSent: true");

    // 4.6 Deduplication: calling createAndNotifyPotentialMatches again must NOT send duplicate emails
    const initialSentCount = sentEmails.length;
    await createAndNotifyPotentialMatches(bloodReq, matchedDonors);
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert(sentEmails.length === initialSentCount, "Deduplication: no duplicate emails dispatched on replay");

    // 4.7 Email failure resilience: email failure must NEVER fail match creation or block in-app notifications
    notificationManager.sendEmail = async () => {
      throw new Error("Simulated downstream email provider failure");
    };

    const secondDonor = await User.create({
      fullName: "Pooja Hegde",
      email: "pooja.hegde@bloodward-arch-test.com",
      phone: "9876500000",
      password: "StrongPassword123!",
      bloodGroup: "O+",
      dateOfBirth: "1997-03-20",
      role: "donor",
      state: "Maharashtra",
      city: "Mumbai",
      availability: "available",
      isEmailVerified: false,
    });

    const secondMatches = await createAndNotifyPotentialMatches(bloodReq, [secondDonor]);
    assert(secondMatches.length === 1, "Match successfully created even when email provider fails");

    const secondDonorNotif = await InAppNotification.findOne({ user: secondDonor._id, match: secondMatches[0]._id });
    assert(secondDonorNotif !== null, "In-app notification created even when email dispatch fails");

    // Restore original sendEmail
    notificationManager.sendEmail = originalSendEmail;

    console.log(`\n==================================================`);
    console.log(`FINAL RESULTS: ${passed}/${total} PASS`);
    console.log(`==================================================\n`);
  } finally {
    if (server) server.close();
    await mongoose.connection.close();
  }
}

run().catch((err) => {
  console.error("Test Suite execution failed:", err);
  if (server) server.close();
  process.exit(1);
});
