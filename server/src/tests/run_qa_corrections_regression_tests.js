import dns from 'dns';
dns.setServers(['1.1.1.1', '8.8.8.8']);
import { enforceTestEnvironment } from './testDb.js';
enforceTestEnvironment();

import mongoose from 'mongoose';
import User from '../models/user.model.js';
import BloodRequest from '../models/bloodRequest.js';
import Match from '../models/match.model.js';
import { notifyDonationCompleted } from '../services/matchNotificationService.js';
import { cancelBloodRequest } from '../controllers/bloodRequestController.js';
import { acceptMatch } from '../controllers/matchController.js';
import errorHandler from '../middleware/errorMiddleware.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function pass(testName) {
  totalTests++;
  passedTests++;
  console.log(`[✅ PASS] ${testName}`);
}

function fail(testName, err) {
  totalTests++;
  failedTests++;
  console.error(`[❌ FAIL] ${testName}:`, err?.message || err);
}

function mockRes() {
  return {
    statusCode: 200,
    data: null,
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
  console.log("RUNNING QA CORRECTIONS REGRESSION TEST SUITE");
  console.log("Single Active Acceptance, Race Condition & CastError Handling");
  console.log("==================================================\n");

  try {
    const mongoUri = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);

    const ts = Date.now();

    // 1. Setup donor & recipient
    const recipient = await User.create({
      fullName: `QA Recipient ${ts}`,
      email: `qa_recip_${ts}@test.local`,
      password: 'BloodWardSecurePass123!',
      phone: `98765${Math.floor(10000 + Math.random() * 90000)}`,
      role: 'recipient',
      bloodGroup: 'B+',
      state: 'Karnataka',
      city: 'Bengaluru',
      location: { type: 'Point', coordinates: [77.5946, 12.9716] },
      isEmailVerified: true
    });

    const donor = await User.create({
      fullName: `QA Donor ${ts}`,
      email: `qa_donor_${ts}@test.local`,
      password: 'BloodWardSecurePass123!',
      phone: `98765${Math.floor(10000 + Math.random() * 90000)}`,
      role: 'donor',
      bloodGroup: 'B+',
      availability: 'available',
      state: 'Karnataka',
      city: 'Bengaluru',
      dateOfBirth: '1995-05-15',
      location: { type: 'Point', coordinates: [77.6000, 12.9700] },
      isEmailVerified: true
    });

    // 2. Setup 2 blood requests
    const req1 = await BloodRequest.create({
      recipient: recipient._id,
      recipientName: recipient.fullName,
      bloodGroup: 'B+',
      unitsNeeded: 2,
      hospitalName: 'City Hospital A',
      city: 'Bengaluru',
      state: 'Karnataka',
      urgency: 'Emergency',
      status: 'Active',
      requiredDate: '2026-11-25',
      location: { type: 'Point', coordinates: [77.5946, 12.9716] }
    });

    const req2 = await BloodRequest.create({
      recipient: recipient._id,
      recipientName: recipient.fullName,
      bloodGroup: 'B+',
      unitsNeeded: 1,
      hospitalName: 'City Hospital B',
      city: 'Bengaluru',
      state: 'Karnataka',
      urgency: 'Normal',
      status: 'Active',
      requiredDate: '2026-11-25',
      location: { type: 'Point', coordinates: [77.5946, 12.9716] }
    });

    const match1 = await Match.create({
      request: req1._id,
      donor: donor._id,
      recipient: recipient._id,
      bloodGroup: 'B+',
      hospitalName: 'City Hospital A',
      city: 'Bengaluru',
      status: 'Awaiting Response'
    });

    const match2 = await Match.create({
      request: req2._id,
      donor: donor._id,
      recipient: recipient._id,
      bloodGroup: 'B+',
      hospitalName: 'City Hospital B',
      city: 'Bengaluru',
      status: 'Awaiting Response'
    });

    // TEST 1: First acceptance succeeds
    const res1 = mockRes();
    await callController(acceptMatch, { params: { id: match1._id.toString() }, user: { _id: donor._id, role: 'donor' } }, res1);
    if (res1.statusCode === 200 && (res1.data.status === 'success' || res1.data.success === true)) {
      pass("First match acceptance succeeds (HTTP 200)");
    } else {
      fail("First match acceptance succeeds", new Error(`Expected 200, got ${res1.statusCode}: ${JSON.stringify(res1.data)}`));
    }

    const updatedDonor1 = await User.findById(donor._id);
    if (updatedDonor1.activeAcceptedMatch && updatedDonor1.activeAcceptedMatch.toString() === match1._id.toString()) {
      pass("Donor record locked with activeAcceptedMatch set to match1 ID");
    } else {
      fail("Donor record locked with activeAcceptedMatch", new Error("activeAcceptedMatch not set"));
    }

    // TEST 2: Second conflicting acceptance is rejected
    const res2 = mockRes();
    await callController(acceptMatch, { params: { id: match2._id.toString() }, user: { _id: donor._id, role: 'donor' } }, res2);
    if (res2.statusCode === 400 && res2.data.status === 'fail' && res2.data.message.includes('already have an active accepted blood donation request')) {
      pass("Second conflicting acceptance rejected with HTTP 400 and clear message");
    } else {
      fail("Second conflicting acceptance rejected", new Error(`Expected 400 with active message, got ${res2.statusCode}: ${JSON.stringify(res2.data)}`));
    }

    // TEST 3: Completing donation unlocks donor
    req1.status = 'Fulfilled';
    await req1.save();
    match1.status = 'Completed';
    await match1.save();
    await notifyDonationCompleted(match1._id, donor, recipient, req1);

    const updatedDonor2 = await User.findById(donor._id);
    if (updatedDonor2.activeAcceptedMatch === null) {
      pass("notifyDonationCompleted clears donor activeAcceptedMatch lock");
    } else {
      fail("notifyDonationCompleted clears donor lock", new Error(`Expected null, got ${updatedDonor2.activeAcceptedMatch}`));
    }

    // Donor can now accept match2
    const res2Retry = mockRes();
    await callController(acceptMatch, { params: { id: match2._id.toString() }, user: { _id: donor._id, role: 'donor' } }, res2Retry);
    if (res2Retry.statusCode === 200) {
      pass("After completion, donor can accept a new eligible match (HTTP 200)");
    } else {
      fail("After completion, donor can accept new match", new Error(`Expected 200, got ${res2Retry.statusCode}`));
    }

    // TEST 4: Request cancellation releases active donor lock
    const cancelRes = mockRes();
    await callController(cancelBloodRequest, { params: { id: req2._id.toString() }, user: { _id: recipient._id, id: recipient._id.toString(), role: 'recipient' } }, cancelRes);
    const updatedDonor3 = await User.findById(donor._id);
    const updatedMatch2 = await Match.findById(match2._id);
    if (cancelRes.statusCode === 200 && updatedDonor3.activeAcceptedMatch === null && updatedMatch2.status === 'Cancelled') {
      pass("Cancelling blood request marks match Cancelled and frees donor lock");
    } else {
      fail("Cancelling blood request frees donor lock", new Error(`Status: ${cancelRes.statusCode}, donor lock: ${updatedDonor3.activeAcceptedMatch}`));
    }

    // TEST 5: Concurrency test - Two simultaneous acceptances
    const donorC = await User.create({
      fullName: `Concurrency Donor ${ts}`,
      email: `c_donor_${ts}@test.local`,
      password: 'BloodWardSecurePass123!',
      phone: `98765${Math.floor(10000 + Math.random() * 90000)}`,
      role: 'donor',
      bloodGroup: 'O+',
      availability: 'available',
      state: 'Karnataka',
      city: 'Bengaluru',
      dateOfBirth: '1995-05-15',
      location: { type: 'Point', coordinates: [77.6000, 12.9700] },
      isEmailVerified: true
    });

    const reqC1 = await BloodRequest.create({
      recipient: recipient._id,
      recipientName: recipient.fullName,
      bloodGroup: 'O+',
      unitsNeeded: 1,
      hospitalName: 'Hospital C1',
      city: 'Bengaluru',
      state: 'Karnataka',
      urgency: 'Emergency',
      status: 'Active',
      requiredDate: '2026-11-25',
      location: { type: 'Point', coordinates: [77.5946, 12.9716] }
    });

    const reqC2 = await BloodRequest.create({
      recipient: recipient._id,
      recipientName: recipient.fullName,
      bloodGroup: 'O+',
      unitsNeeded: 1,
      hospitalName: 'Hospital C2',
      city: 'Bengaluru',
      state: 'Karnataka',
      urgency: 'Emergency',
      status: 'Active',
      requiredDate: '2026-11-25',
      location: { type: 'Point', coordinates: [77.5946, 12.9716] }
    });

    const matchC1 = await Match.create({
      request: reqC1._id,
      donor: donorC._id,
      recipient: recipient._id,
      bloodGroup: 'O+',
      hospitalName: 'Hospital C1',
      city: 'Bengaluru',
      status: 'Awaiting Response'
    });

    const matchC2 = await Match.create({
      request: reqC2._id,
      donor: donorC._id,
      recipient: recipient._id,
      bloodGroup: 'O+',
      hospitalName: 'Hospital C2',
      city: 'Bengaluru',
      status: 'Awaiting Response'
    });

    const resC1 = mockRes();
    const resC2 = mockRes();

    // Trigger concurrently
    await Promise.all([
      callController(acceptMatch, { params: { id: matchC1._id.toString() }, user: { _id: donorC._id, role: 'donor' } }, resC1),
      callController(acceptMatch, { params: { id: matchC2._id.toString() }, user: { _id: donorC._id, role: 'donor' } }, resC2)
    ]);

    const statusCodes = [resC1.statusCode, resC2.statusCode].sort();
    if (statusCodes[0] === 200 && statusCodes[1] === 400) {
      pass("Concurrency race: Exactly one acceptance succeeded (200) and one rejected (400)");
    } else {
      fail("Concurrency race", new Error(`Expected [200, 400], got [${resC1.statusCode}, ${resC2.statusCode}]`));
    }

    const acceptedMatches = await Match.find({ donor: donorC._id, status: 'Accepted' });
    if (acceptedMatches.length === 1) {
      pass("Database integrity: Exactly one match record is in 'Accepted' state in MongoDB");
    } else {
      fail("Database integrity on concurrent accept", new Error(`Expected 1 accepted match, found ${acceptedMatches.length}`));
    }

    // TEST 6: CastError Error Handling in errorMiddleware
    const castError = new mongoose.Error.CastError('ObjectId', 'invalid-id-xyz', '_id');
    const errRes1 = mockRes();
    errorHandler(castError, {}, errRes1, () => {});
    if (errRes1.statusCode === 400 && errRes1.data.status === 'fail' && (errRes1.data.message.includes('Invalid format for'))) {
      pass("CastError returns HTTP 400 with status: 'fail' and sanitized message");
    } else {
      fail("CastError returns HTTP 400", new Error(`Expected 400 fail, got ${errRes1.statusCode}: ${JSON.stringify(errRes1.data)}`));
    }

    if (!errRes1.data.stack && !JSON.stringify(errRes1.data).includes('Cast to ObjectId failed')) {
      pass("CastError sanitization: No stack trace or internal DB query details exposed");
    } else {
      fail("CastError sanitization", new Error("Internal details leaked in response"));
    }

    // TEST 7: Nonexistent valid ObjectId preserved as 404 in controller
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const notFoundRes = mockRes();
    await callController(acceptMatch, { params: { id: nonExistentId }, user: { _id: donor._id, role: 'donor' } }, notFoundRes);
    if (notFoundRes.statusCode === 404 && notFoundRes.data.status === 'fail' && notFoundRes.data.message.includes('not found')) {
      pass("Nonexistent valid ObjectId returns HTTP 404 Not Found");
    } else {
      fail("Nonexistent valid ObjectId returns 404", new Error(`Expected 404, got ${notFoundRes.statusCode}`));
    }

    // Cleanup synthetic test records
    await User.deleteMany({ _id: { $in: [recipient._id, donor._id, donorC._id] } });
    await BloodRequest.deleteMany({ _id: { $in: [req1._id, req2._id, reqC1._id, reqC2._id] } });
    await Match.deleteMany({ _id: { $in: [match1._id, match2._id, matchC1._id, matchC2._id] } });

    console.log(`\nFINAL RESULTS: ${passedTests}/${totalTests}`);
  } catch (err) {
    fail("Suite execution error", err);
  } finally {
    await mongoose.disconnect();
    process.exit(failedTests > 0 ? 1 : 0);
  }
}

run();
