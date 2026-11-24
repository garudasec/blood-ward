import mongoose from 'mongoose';
import { connectTestDB } from './testDb.js';
import User from '../models/user.model.js';
import BloodRequest from '../models/bloodRequest.js';
import Match from '../models/match.model.js';
import InAppNotification from '../models/inAppNotification.model.js';
import notificationManager from '../services/notification/notificationManager.js';
import { fulfillBloodRequest } from '../controllers/bloodRequestController.js';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    passed++;
    console.log(`  [✅ PASS] ${message}`);
  } else {
    console.error(`  [❌ FAIL] ${message}`);
  }
}

async function runTests() {
  console.log('==================================================');
  console.log('RUNNING PHASE 1 REGRESSION TESTS: MATCH FULFILLMENT & IN-APP NOTIFICATIONS');
  console.log('Enforcing database isolation on bloodward_test');
  console.log('==================================================\n');

  await connectTestDB();

  // Clean test data before tests
  await User.deleteMany({ email: { $regex: /@phase1test\.com$/ } });
  await BloodRequest.deleteMany({ hospitalName: 'Phase 1 Test Hospital' });
  await Match.deleteMany({ hospitalName: 'Phase 1 Test Hospital' });
  await InAppNotification.deleteMany({ title: { $regex: /Fulfilled|Completed/ } });

  // Save original sendEmail to confirm NO emails are sent during match fulfillment
  const originalSendEmail = notificationManager.sendEmail;

  try {
    // Setup test users
    const recipient = await User.create({
      fullName: 'Test Recipient',
      email: 'recipient@phase1test.com',
      phone: '+919876543210',
      password: 'Password123!',
      role: 'recipient',
      city: 'Mumbai',
      state: 'Maharashtra',
      bloodGroup: 'O+',
      isEmailVerified: true,
    });

    const donor1 = await User.create({
      fullName: 'Test Donor One',
      email: 'donor1@phase1test.com',
      phone: '+919876543211',
      password: 'Password123!',
      role: 'donor',
      city: 'Mumbai',
      state: 'Maharashtra',
      bloodGroup: 'O+',
      availability: 'available',
      dateOfBirth: new Date('1995-05-15'),
      isEmailVerified: true,
    });

    const donor2 = await User.create({
      fullName: 'Test Donor Two',
      email: 'donor2@phase1test.com',
      phone: '+919876543212',
      password: 'Password123!',
      role: 'donor',
      city: 'Mumbai',
      state: 'Maharashtra',
      bloodGroup: 'O+',
      availability: 'available',
      dateOfBirth: new Date('1992-08-20'),
      isEmailVerified: true,
    });

    const emailCalls = [];
    notificationManager.sendEmail = async (opts) => {
      emailCalls.push(opts);
      return { success: true, messageId: `msg_${Date.now()}` };
    };

    // -------------------------------------------------------------------------
    // TEST 1: Successful Fulfillment & In-App Notification Dispatch (No Email)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 1: Successful Fulfillment & In-App Notifications ---');

    const req1 = await BloodRequest.create({
      recipient: recipient._id,
      recipientName: recipient.fullName,
      bloodGroup: 'O+',
      unitsNeeded: 1,
      hospitalName: 'Phase 1 Test Hospital',
      city: 'Mumbai',
      status: 'In Progress',
      requiredDate: '2026-12-31',
      acceptedDonor: donor1._id,
    });

    const match1 = await Match.create({
      request: req1._id,
      donor: donor1._id,
      recipient: recipient._id,
      bloodGroup: 'O+',
      hospitalName: 'Phase 1 Test Hospital',
      city: 'Mumbai',
      status: 'Accepted',
    });

    let resStatus = null;
    let resData = null;
    const mockReq1 = {
      params: { id: req1._id.toString() },
      user: { _id: recipient._id, id: recipient._id, role: 'recipient', fullName: recipient.fullName },
      ip: '127.0.0.1',
    };
    const mockRes1 = {
      status: (code) => {
        resStatus = code;
        return {
          json: (data) => {
            resData = data;
          },
        };
      },
    };

    await fulfillBloodRequest(mockReq1, mockRes1, (err) => {
      if (err) console.error('Next called with err:', err);
    });

    assert(resStatus === 200, 'fulfillBloodRequest returns HTTP 200');
    assert(resData && resData.success === true, 'Response contains success: true');

    const updatedReq1 = await BloodRequest.findById(req1._id);
    assert(updatedReq1.status === 'Fulfilled', 'BloodRequest transitioned to Fulfilled');

    await new Promise((r) => setTimeout(r, 100));

    const updatedMatch1 = await Match.findById(match1._id);
    assert(updatedMatch1.status === 'Completed', 'Match status transitioned to Completed');
    assert(emailCalls.length === 0, 'Zero outbound emails dispatched on donation fulfillment');

    const donorNotif1 = await InAppNotification.findOne({ user: donor1._id, match: match1._id, type: 'donation_completed' });
    const recNotif1 = await InAppNotification.findOne({ user: recipient._id, match: match1._id, type: 'donation_completed' });
    assert(donorNotif1 !== null, 'Donor received in-app donation_completed notification');
    assert(recNotif1 !== null, 'Recipient received in-app donation_completed notification');

    // -------------------------------------------------------------------------
    // TEST 2: Idempotent Duplicate Fulfillment Requests
    // -------------------------------------------------------------------------
    console.log('\n--- Test 2: Idempotent Duplicate Fulfillment Requests ---');

    let dupStatus = null;
    let dupData = null;
    const resDup = {
      status: (code) => ({
        json: (data) => {
          dupStatus = code;
          dupData = data;
        },
      }),
    };

    await fulfillBloodRequest({ params: { id: req1._id.toString() }, user: mockReq1.user, ip: '127.0.0.1' }, resDup, () => {});
    await new Promise((r) => setTimeout(r, 50));

    assert(dupStatus === 200, 'Duplicate fulfillment returns HTTP 200 gracefully');
    assert(dupData.message.includes('already fulfilled'), 'Explains request is already fulfilled');

    const donorNotifsCount = await InAppNotification.countDocuments({ user: donor1._id, match: match1._id, type: 'donation_completed' });
    assert(donorNotifsCount === 1, 'No duplicate in-app notifications triggered on duplicate fulfillment');

    // -------------------------------------------------------------------------
    // TEST 3: Concurrent Fulfillment Race Condition Guard
    // -------------------------------------------------------------------------
    console.log('\n--- Test 3: Concurrent Fulfillment Requests (Atomic State Transition) ---');

    const reqConcurrent = await BloodRequest.create({
      recipient: recipient._id,
      recipientName: recipient.fullName,
      bloodGroup: 'O+',
      unitsNeeded: 1,
      hospitalName: 'Phase 1 Test Hospital',
      city: 'Mumbai',
      status: 'In Progress',
      requiredDate: '2026-12-31',
      acceptedDonor: donor1._id,
    });

    const matchConcurrent = await Match.create({
      request: reqConcurrent._id,
      donor: donor1._id,
      recipient: recipient._id,
      bloodGroup: 'O+',
      hospitalName: 'Phase 1 Test Hospital',
      city: 'Mumbai',
      status: 'Accepted',
    });

    const makeRes = (tracker) => ({
      status: (code) => ({
        json: (d) => {
          tracker.code = code;
          tracker.data = d;
        },
      }),
    });

    const t1 = {};
    const t2 = {};

    await Promise.all([
      fulfillBloodRequest({ params: { id: reqConcurrent._id.toString() }, user: mockReq1.user, ip: '127.0.0.1' }, makeRes(t1), () => {}),
      fulfillBloodRequest({ params: { id: reqConcurrent._id.toString() }, user: mockReq1.user, ip: '127.0.0.1' }, makeRes(t2), () => {}),
    ]);
    await new Promise((r) => setTimeout(r, 100));

    assert(t1.code === 200 && t2.code === 200, 'Both concurrent calls finish with HTTP 200');
    const finalReqConcurrent = await BloodRequest.findById(reqConcurrent._id);
    assert(finalReqConcurrent.status === 'Fulfilled', 'State atomically remains Fulfilled');

    const concurrentNotifsCount = await InAppNotification.countDocuments({
      user: donor1._id,
      match: matchConcurrent._id,
      type: 'donation_completed',
    });
    assert(concurrentNotifsCount === 1, 'Concurrent requests produce only 1 in-app notification per party');

    // -------------------------------------------------------------------------
    // TEST 4: Correct Donor and Recipient Selection Isolation
    // -------------------------------------------------------------------------
    console.log('\n--- Test 4: Correct Donor and Recipient Selection ---');

    const reqIsolated = await BloodRequest.create({
      recipient: recipient._id,
      recipientName: recipient.fullName,
      bloodGroup: 'O+',
      unitsNeeded: 1,
      hospitalName: 'Phase 1 Test Hospital',
      city: 'Mumbai',
      status: 'In Progress',
      requiredDate: '2026-12-31',
      acceptedDonor: donor2._id, // donor 2, not donor 1
    });

    const matchIsolated = await Match.create({
      request: reqIsolated._id,
      donor: donor2._id,
      recipient: recipient._id,
      bloodGroup: 'O+',
      hospitalName: 'Phase 1 Test Hospital',
      city: 'Mumbai',
      status: 'Accepted',
    });

    await fulfillBloodRequest({ params: { id: reqIsolated._id.toString() }, user: mockReq1.user, ip: '127.0.0.1' }, resDup, () => {});
    await new Promise((r) => setTimeout(r, 100));

    const donor2Notif = await InAppNotification.findOne({ user: donor2._id, match: matchIsolated._id });
    const donor1SpuriousNotif = await InAppNotification.findOne({ user: donor1._id, match: matchIsolated._id });
    assert(donor2Notif !== null, 'Donor 2 correctly received the in-app completion notification');
    assert(donor1SpuriousNotif === null, 'Donor 1 did NOT receive unassigned notification (cross-donor isolation)');
    assert(emailCalls.length === 0, 'Zero outbound emails dispatched across all fulfillment scenarios');

    console.log('\n==================================================');
    console.log(`FINAL RESULTS: ${passed}/${total} TESTS PASSED`);
    console.log('==================================================');
  } finally {
    notificationManager.sendEmail = originalSendEmail;
    await new Promise((r) => setTimeout(r, 200));
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
