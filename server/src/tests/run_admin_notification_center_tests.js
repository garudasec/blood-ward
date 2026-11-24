import './testDb.js';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

import connectDB from '../config/db.js';
import User from '../models/user.model.js';
import InAppNotification from '../models/inAppNotification.model.js';
import inAppNotificationRouter from '../routes/inAppNotification.routes.js';
import notFoundHandler from '../middleware/notFoundMiddleware.js';
import errorHandler from '../middleware/errorMiddleware.js';
import sanitizeMiddleware from '../middleware/sanitizeMiddleware.js';
import {
  notifyAdmins,
  notifyAdminsOfNewDonor,
  notifyAdminsOfNewRecipient,
  notifyAdminsOfNewBloodRequest,
  notifyAdminsOfNewComplaint,
  notifyAdminsOfMatchAccepted,
  notifyAdminsOfDonationCompleted,
} from '../services/adminNotificationService.js';

dotenv.config();

const app = express();
app.use(helmet());
app.use(sanitizeMiddleware);
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

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
    console.log(`[✅ PASS] (${passed}/${total}) - ${message}`);
  } else {
    console.error(`[❌ FAIL] (${passed}/${total}) - ${message}`);
  }
}

function makeToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role, tokenVersion: user.tokenVersion || 0 },
    process.env.JWT_SECRET || 'testsecret1234567890123456789012',
    { expiresIn: '1h' }
  );
}

async function runTests() {
  console.log('--- Starting System Admin Notification Centre Tests ---');

  await connectDB();

  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;

  const uniqueSuffix = Date.now();

  try {
    // 1. Setup Test Users
    const adminUser = await User.create({
      fullName: 'Admin Test Lead',
      email: `admin.notif.${uniqueSuffix}@bloodward-test.com`,
      phone: '+919876543210',
      password: 'Password123!',
      role: 'admin',
      availability: 'available',
    });

    const donorUser = await User.create({
      fullName: 'Donor Test Volunteer',
      email: `donor.notif.${uniqueSuffix}@bloodward-test.com`,
      phone: '+919876543211',
      password: 'Password123!',
      role: 'donor',
      bloodGroup: 'O+',
      city: 'Kolkata',
      state: 'West Bengal',
      availability: 'available',
    });

    const recipientUser = await User.create({
      fullName: 'Recipient Test Beneficiary',
      email: `recip.notif.${uniqueSuffix}@bloodward-test.com`,
      phone: '+919876543212',
      password: 'Password123!',
      role: 'recipient',
      city: 'Howrah',
      state: 'West Bengal',
    });

    const adminToken = makeToken(adminUser);
    const donorToken = makeToken(donorUser);
    const recipientToken = makeToken(recipientUser);

    // ==========================================
    // Suite 1: Admin Notification Helper Functions
    // ==========================================
    console.log('\n[Suite 1: Event-driven Admin Notifications]');

    // 1.1 New Donor Notification
    const donorNotifs = await notifyAdminsOfNewDonor(donorUser);
    assert(donorNotifs.length > 0, 'notifyAdminsOfNewDonor dispatches notification to admin');
    const adminDonorNotif = await InAppNotification.findOne({ user: adminUser._id, type: 'new_donor' });
    assert(adminDonorNotif !== null, 'InAppNotification of type new_donor saved in database for admin');
    assert(adminDonorNotif.link === '/admin/donors', 'new_donor notification links to /admin/donors');
    assert(!adminDonorNotif.message.includes('Password'), 'new_donor notification does not expose sensitive data');

    // 1.2 Deduplication Test
    const dupDonorNotifs = await notifyAdminsOfNewDonor(donorUser);
    assert(dupDonorNotifs.length === 0, 'Deduplication prevents creating duplicate new_donor notification');
    const countDonorNotifs = await InAppNotification.countDocuments({ user: adminUser._id, type: 'new_donor' });
    assert(countDonorNotifs === 1, 'Exactly one new_donor notification exists after duplicate call');

    // 1.3 New Recipient Notification (Individual)
    const recipNotifs = await notifyAdminsOfNewRecipient(recipientUser, false);
    assert(recipNotifs.length > 0, 'notifyAdminsOfNewRecipient dispatches notification for individual recipient');
    const adminRecipNotif = await InAppNotification.findOne({ user: adminUser._id, type: 'new_recipient', 'metadata.isHospitalRep': false });
    assert(adminRecipNotif !== null, 'new_recipient notification for individual recipient created');
    assert(adminRecipNotif.link === '/admin/recipients', 'new_recipient notification links to /admin/recipients');

    // 1.4 New Recipient Notification (Hospital Representative)
    const hospitalRepUser = {
      _id: new mongoose.Types.ObjectId(),
      fullName: 'Dr. Test Rep',
      city: 'Kolkata',
    };
    await notifyAdminsOfNewRecipient(hospitalRepUser, true, 'Apollo Multispeciality');
    const adminRepNotif = await InAppNotification.findOne({ user: adminUser._id, type: 'new_recipient', 'metadata.isHospitalRep': true });
    assert(adminRepNotif !== null, 'new_recipient notification for hospital representative created');
    assert(adminRepNotif.message.includes('Apollo Multispeciality'), 'Hospital rep notification includes hospital name');

    // 1.5 New Blood Request Notification
    const mockRequest = {
      _id: new mongoose.Types.ObjectId(),
      bloodGroup: 'B+',
      unitsNeeded: 2,
      urgency: 'Emergency',
      hospitalName: 'SSKM Hospital',
      city: 'Kolkata',
    };
    await notifyAdminsOfNewBloodRequest(mockRequest);
    const adminReqNotif = await InAppNotification.findOne({ user: adminUser._id, type: 'new_request' });
    assert(adminReqNotif !== null, 'new_request notification created for emergency blood requisition');
    assert(adminReqNotif.link === '/admin/requests', 'new_request notification links to /admin/requests');
    assert(adminReqNotif.title.includes('Emergency'), 'Emergency request notification reflects emergency urgency');

    // 1.6 New Complaint Notification
    const mockComplaint = {
      _id: new mongoose.Types.ObjectId(),
      complaintId: `CMP-${uniqueSuffix}`,
      category: 'Incorrect information was provided',
    };
    await notifyAdminsOfNewComplaint(mockComplaint);
    const adminCmpNotif = await InAppNotification.findOne({ user: adminUser._id, type: 'new_complaint' });
    assert(adminCmpNotif !== null, 'new_complaint notification created for new complaint');
    assert(adminCmpNotif.link === '/admin/complaints', 'new_complaint notification links to /admin/complaints');

    // 1.7 Match Accepted Notification
    const mockMatch = {
      _id: new mongoose.Types.ObjectId(),
    };
    await notifyAdminsOfMatchAccepted(mockMatch, mockRequest, donorUser);
    const adminMatchNotif = await InAppNotification.findOne({ user: adminUser._id, type: 'match_accepted' });
    assert(adminMatchNotif !== null, 'match_accepted notification created for admin');

    // 1.8 Donation Completed Notification
    await notifyAdminsOfDonationCompleted(mockMatch, mockRequest);
    const adminDoneNotif = await InAppNotification.findOne({ user: adminUser._id, type: 'donation_completed' });
    assert(adminDoneNotif !== null, 'donation_completed notification created for admin');

    // ==========================================
    // Suite 2: GET /api/notifications API & Authorization
    // ==========================================
    console.log('\n[Suite 2: GET /api/notifications API & Authorization]');

    // 2.1 Admin fetches their notifications
    const adminFetchRes = await fetch(`${baseUrl}/api/notifications?limit=20`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminFetchData = await adminFetchRes.json();
    assert(adminFetchRes.status === 200, 'Admin can fetch notifications with HTTP 200');
    assert(adminFetchData.success === true, 'Admin response success is true');
    assert(adminFetchData.notifications.length >= 7, `Admin receives their notifications (count: ${adminFetchData.notifications.length})`);
    assert(adminFetchData.unreadCount >= 7, `Admin receives correct unreadCount (${adminFetchData.unreadCount})`);

    // 2.2 Donor user fetches notifications - MUST be isolated
    const donorFetchRes = await fetch(`${baseUrl}/api/notifications`, {
      headers: { Authorization: `Bearer ${donorToken}` },
    });
    const donorFetchData = await donorFetchRes.json();
    assert(donorFetchRes.status === 200, 'Donor can fetch notifications with HTTP 200');
    assert(donorFetchData.notifications.length === 0, 'Donor receives 0 admin notifications (strict user isolation)');
    assert(donorFetchData.unreadCount === 0, 'Donor unreadCount is 0');

    // 2.3 Recipient user fetches notifications - MUST be isolated
    const recipFetchRes = await fetch(`${baseUrl}/api/notifications`, {
      headers: { Authorization: `Bearer ${recipientToken}` },
    });
    const recipFetchData = await recipFetchRes.json();
    assert(recipFetchRes.status === 200, 'Recipient can fetch notifications with HTTP 200');
    assert(recipFetchData.notifications.length === 0, 'Recipient receives 0 admin notifications (strict user isolation)');

    // 2.4 Unauthenticated request is rejected
    const unauthRes = await fetch(`${baseUrl}/api/notifications`);
    assert(unauthRes.status === 401, 'Unauthenticated GET /api/notifications is rejected with HTTP 401');

    // ==========================================
    // Suite 3: Mark Single Notification Read (PATCH /api/notifications/:id/read)
    // ==========================================
    console.log('\n[Suite 3: Mark Single Notification Read]');

    const targetNotif = adminDonorNotif;

    // 3.1 Cross-user unauthorized attempt: Donor tries to mark Admin's notification read
    const crossUserRes = await fetch(`${baseUrl}/api/notifications/${targetNotif._id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${donorToken}` },
    });
    assert(crossUserRes.status === 404, 'Donor attempting to mark admin notification read receives HTTP 404 (unauthorized)');

    // Verify it was NOT modified
    const checkTargetBefore = await InAppNotification.findById(targetNotif._id);
    assert(checkTargetBefore.read === false, 'Target notification remains unread after unauthorized attempt');

    // 3.2 Admin marks single notification as read
    const markReadRes = await fetch(`${baseUrl}/api/notifications/${targetNotif._id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const markReadData = await markReadRes.json();
    assert(markReadRes.status === 200, 'Admin marks notification as read with HTTP 200');
    assert(markReadData.notification.read === true, 'Response confirms notification read is true');

    const checkTargetAfter = await InAppNotification.findById(targetNotif._id);
    assert(checkTargetAfter.read === true, 'Database confirms notification read is true');
    assert(checkTargetAfter.readAt !== null, 'Database confirms readAt timestamp is recorded');

    // 3.3 Verify unreadCount decreased by 1
    const adminFetchAfterOneRead = await fetch(`${baseUrl}/api/notifications`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminDataAfterOneRead = await adminFetchAfterOneRead.json();
    assert(
      adminDataAfterOneRead.unreadCount === adminFetchData.unreadCount - 1,
      `Unread count decremented from ${adminFetchData.unreadCount} to ${adminDataAfterOneRead.unreadCount}`
    );

    // ==========================================
    // Suite 4: Mark All Notifications Read (PATCH /api/notifications/read-all)
    // ==========================================
    console.log('\n[Suite 4: Mark All Notifications Read]');

    // 4.1 Donor marks all read - should NOT affect admin's unread notifications
    const donorMarkAllRes = await fetch(`${baseUrl}/api/notifications/read-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${donorToken}` },
    });
    assert(donorMarkAllRes.status === 200, 'Donor mark-all-read succeeds');

    const adminCheckAfterDonorMarkAll = await InAppNotification.countDocuments({ user: adminUser._id, read: false });
    assert(
      adminCheckAfterDonorMarkAll === adminDataAfterOneRead.unreadCount,
      'Admin unread notifications unaffected when donor calls mark-all-read'
    );

    // 4.2 Admin calls mark-all-read
    const adminMarkAllRes = await fetch(`${baseUrl}/api/notifications/read-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminMarkAllData = await adminMarkAllRes.json();
    assert(adminMarkAllRes.status === 200, 'Admin mark-all-read returns HTTP 200');
    assert(adminMarkAllData.success === true, 'Admin mark-all-read reports success');
    assert(adminMarkAllData.modifiedCount > 0, `Modified ${adminMarkAllData.modifiedCount} notifications`);

    // 4.3 Verify admin unread count is now 0
    const adminFetchAfterAllRead = await fetch(`${baseUrl}/api/notifications`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminDataAfterAllRead = await adminFetchAfterAllRead.json();
    assert(adminDataAfterAllRead.unreadCount === 0, 'Admin unreadCount is now exactly 0');
    assert(adminDataAfterAllRead.notifications.every((n) => n.read === true), 'All admin notifications are read: true');

    // ==========================================
    // Suite 5: Retention & Operational Flag Verification
    // ==========================================
    console.log('\n[Suite 5: Retention & Operational Flag]');

    const sampleAdminNotif = await InAppNotification.findOne({ user: adminUser._id });
    assert(
      sampleAdminNotif.isOperationalMatchData === false,
      'Admin notifications are created with isOperationalMatchData: false (prevent accidental cleanup)'
    );

    // Cleanup test records
    await InAppNotification.deleteMany({ user: { $in: [adminUser._id, donorUser._id, recipientUser._id] } });
    await User.deleteMany({ _id: { $in: [adminUser._id, donorUser._id, recipientUser._id] } });

    console.log(`\n========================================`);
    console.log(`FINAL RESULTS: ${passed}/${total}`);
    console.log(`Results: ${passed}/${total} assertions passed`);
    console.log(`========================================\n`);

    if (passed < total) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
    await mongoose.connection.close();
  }
}

runTests();
