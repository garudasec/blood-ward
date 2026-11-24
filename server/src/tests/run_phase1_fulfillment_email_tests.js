import mongoose from 'mongoose';
import { connectTestDB } from './testDb.js';
import User from '../models/user.model.js';
import BloodRequest from '../models/bloodRequest.js';
import Match from '../models/match.model.js';
import InAppNotification from '../models/inAppNotification.model.js';
import notificationManager from '../services/notification/notificationManager.js';
import {
  notifyDonationCompleted,
  dispatchCompletionEmails,
  retryCompletionEmail,
} from '../services/matchNotificationService.js';
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
  console.log('RUNNING PHASE 1 REGRESSION TESTS: MATCH FULFILLMENT & EMAIL DELIVERY');
  console.log('Enforcing database isolation on bloodward_test');
  console.log('==================================================\n');

  await connectTestDB();

  // Clean test data before tests
  await User.deleteMany({ email: { $regex: /@phase1test\.com$/ } });
  await BloodRequest.deleteMany({ hospitalName: 'Phase 1 Test Hospital' });
  await Match.deleteMany({ hospitalName: 'Phase 1 Test Hospital' });
  await InAppNotification.deleteMany({ title: { $regex: /Fulfilled|Completed/ } });

  // Save original sendEmail
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

    // -------------------------------------------------------------------------
    // TEST 1: Successful Fulfillment & Delivery Acceptance
    // -------------------------------------------------------------------------
    console.log('\n--- Test 1: Successful Fulfillment & Email Acceptance ---');

    let emailCalls = [];
    notificationManager.sendEmail = async (opts) => {
      emailCalls.push(opts);
      return { success: true, messageId: `msg_${Date.now()}` };
    };

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

    // Mock controller req/res
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
    const mockNext1 = (err) => {
      if (err) console.error('Next called with err:', err);
    };

    await fulfillBloodRequest(mockReq1, mockRes1, mockNext1);

    assert(resStatus === 200, 'fulfillBloodRequest returns HTTP 200');
    assert(resData && resData.success === true, 'Response contains success: true');

    const updatedReq1 = await BloodRequest.findById(req1._id);
    assert(updatedReq1.status === 'Fulfilled', 'BloodRequest transitioned to Fulfilled');

    // Wait a short moment for async notifications
    await new Promise((r) => setTimeout(r, 100));

    const updatedMatch1 = await Match.findById(match1._id);
    assert(updatedMatch1.status === 'Completed', 'Match status transitioned to Completed');
    assert(updatedMatch1.completionEmailSent === true, 'completionEmailSent marked true after successful provider acceptance');
    assert(emailCalls.length === 2, 'Sent completion emails to both donor and recipient');
    assert(
      emailCalls.some((c) => c.to === donor1.email) && emailCalls.some((c) => c.to === recipient.email),
      'Correct donor and recipient emails targeted'
    );

    // -------------------------------------------------------------------------
    // TEST 2: Email Provider Failure (Definite Failure)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 2: Definite Email Provider Failure ---');

    emailCalls = [];
    notificationManager.sendEmail = async (opts) => {
      emailCalls.push(opts);
      return { success: false, error: 'SMTP connection refused 550' };
    };

    const req2 = await BloodRequest.create({
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

    const match2 = await Match.create({
      request: req2._id,
      donor: donor1._id,
      recipient: recipient._id,
      bloodGroup: 'O+',
      hospitalName: 'Phase 1 Test Hospital',
      city: 'Mumbai',
      status: 'Accepted',
    });

    const res2 = {
      status: (code) => ({
        json: (data) => {
          resStatus = code;
          resData = data;
        },
      }),
    };
    await fulfillBloodRequest({ params: { id: req2._id.toString() }, user: mockReq1.user, ip: '127.0.0.1' }, res2, () => {});

    await new Promise((r) => setTimeout(r, 100));

    const updatedReq2 = await BloodRequest.findById(req2._id);
    assert(updatedReq2.status === 'Fulfilled', 'Request remains Fulfilled despite email failure (no improper rollback)');

    const updatedMatch2 = await Match.findById(match2._id);
    assert(updatedMatch2.status === 'Completed', 'Match remains Completed');
    assert(updatedMatch2.completionEmailSent === false, 'completionEmailSent is FALSE when email delivery fails');
    assert(
      updatedMatch2.metadata?.donorCompletionEmailError !== undefined,
      'Definite failure records actionable error in metadata'
    );

    // -------------------------------------------------------------------------
    // TEST 3: Email Retry for Failed Delivery
    // -------------------------------------------------------------------------
    console.log('\n--- Test 3: Email Retry on Failed Match ---');

    emailCalls = [];
    notificationManager.sendEmail = async (opts) => {
      emailCalls.push(opts);
      return { success: true, messageId: `msg_retry_${Date.now()}` };
    };

    const retryResult = await retryCompletionEmail(match2._id);
    assert(retryResult.success === true, 'retryCompletionEmail returns success: true');

    const retriedMatch2 = await Match.findById(match2._id);
    assert(retriedMatch2.completionEmailSent === true, 'completionEmailSent updated to true after successful retry');
    assert(emailCalls.length === 2, 'Dispatched retry messages to unconfirmed parties');

    // -------------------------------------------------------------------------
    // TEST 4: Uncertain Delivery Outcome
    // -------------------------------------------------------------------------
    console.log('\n--- Test 4: Uncertain Delivery Outcome Handling ---');

    emailCalls = [];
    notificationManager.sendEmail = async (opts) => {
      emailCalls.push(opts);
      return { success: false, isUncertain: true, error: 'Gateway timeout 504' };
    };

    const req3 = await BloodRequest.create({
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

    const match3 = await Match.create({
      request: req3._id,
      donor: donor1._id,
      recipient: recipient._id,
      bloodGroup: 'O+',
      hospitalName: 'Phase 1 Test Hospital',
      city: 'Mumbai',
      status: 'Accepted',
    });

    await fulfillBloodRequest({ params: { id: req3._id.toString() }, user: mockReq1.user, ip: '127.0.0.1' }, res2, () => {});
    await new Promise((r) => setTimeout(r, 100));

    const updatedMatch3 = await Match.findById(match3._id);
    assert(updatedMatch3.completionEmailSent === false, 'completionEmailSent remains false on uncertain outcome');
    assert(updatedMatch3.metadata?.completionEmailUncertain === true, 'Match metadata flags completionEmailUncertain');

    // -------------------------------------------------------------------------
    // TEST 5: Duplicate Fulfillment Request (Idempotency)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 5: Idempotent Duplicate Fulfillment Requests ---');

    emailCalls = [];
    notificationManager.sendEmail = async (opts) => {
      emailCalls.push(opts);
      return { success: true };
    };

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

    // Call fulfill on already fulfilled req1
    await fulfillBloodRequest({ params: { id: req1._id.toString() }, user: mockReq1.user, ip: '127.0.0.1' }, resDup, () => {});

    assert(dupStatus === 200, 'Duplicate fulfillment returns HTTP 200 gracefully');
    assert(dupData.message.includes('already fulfilled'), 'Explains request is already fulfilled');
    assert(emailCalls.length === 0, 'No duplicate email notifications triggered on duplicate fulfillment');

    // -------------------------------------------------------------------------
    // TEST 6: Concurrent Fulfillment Race Condition Guard
    // -------------------------------------------------------------------------
    console.log('\n--- Test 6: Concurrent Fulfillment Requests (Atomic State Transition) ---');

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

    let calls1 = 0;
    let calls2 = 0;
    const makeRes = (tracker) => ({
      status: (code) => ({
        json: (d) => {
          if (code === 200) tracker.success = true;
          tracker.code = code;
          tracker.data = d;
        },
      }),
    });

    const t1 = {};
    const t2 = {};

    // Execute concurrently
    await Promise.all([
      fulfillBloodRequest({ params: { id: reqConcurrent._id.toString() }, user: mockReq1.user, ip: '127.0.0.1' }, makeRes(t1), () => {}),
      fulfillBloodRequest({ params: { id: reqConcurrent._id.toString() }, user: mockReq1.user, ip: '127.0.0.1' }, makeRes(t2), () => {}),
    ]);

    assert(t1.code === 200 && t2.code === 200, 'Both concurrent calls finish with HTTP 200');
    const finalReqConcurrent = await BloodRequest.findById(reqConcurrent._id);
    assert(finalReqConcurrent.status === 'Fulfilled', 'State atomically remains Fulfilled');

    // -------------------------------------------------------------------------
    // TEST 7: Correct Donor and Recipient Selection Isolation
    // -------------------------------------------------------------------------
    console.log('\n--- Test 7: Correct Donor and Recipient Selection ---');

    emailCalls = [];
    notificationManager.sendEmail = async (opts) => {
      emailCalls.push(opts);
      return { success: true };
    };

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

    assert(
      emailCalls.some((c) => c.to === donor2.email),
      'Donor 2 correctly received the notification'
    );
    assert(
      !emailCalls.some((c) => c.to === donor1.email),
      'Donor 1 did NOT receive unassigned notification (cross-donor isolation)'
    );

    console.log('\n==================================================');
    console.log(`FINAL RESULTS: ${passed}/${total} TESTS PASSED`);
    console.log('==================================================');
  } finally {
    // Restore original sendEmail
    notificationManager.sendEmail = originalSendEmail;
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
