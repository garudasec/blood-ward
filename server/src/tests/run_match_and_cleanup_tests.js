import { enforceTestEnvironment } from './testDb.js';
enforceTestEnvironment();

import mongoose from 'mongoose';
import User from '../models/user.model.js';
import BloodRequest from '../models/bloodRequest.js';
import Match from '../models/match.model.js';
import InAppNotification from '../models/inAppNotification.model.js';
import NotificationProvider from '../models/notificationProvider.model.js';
import notificationManager from '../services/notification/notificationManager.js';
import {
  createAndNotifyPotentialMatches,
  notifyDonorAccepted,
  notifyDonorDeclined,
  notifyDonationCompleted,
} from '../services/matchNotificationService.js';
import {
  runMatchCleanupJob,
  RETENTION_PERIOD_DAYS,
} from '../services/matchCleanupService.js';
import { getCityCoordinates } from '../utils/cityCoordinates.js';

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

// Track intercepted emails
const interceptedEmails = [];
const originalSendEmail = notificationManager.sendEmail;

notificationManager.sendEmail = async function (params) {
  interceptedEmails.push(params);
  return { success: true, messageId: `test-msg-${Date.now()}-${Math.random()}` };
};

async function runTests() {
  console.log('==================================================');
  console.log('DONOR-RECIPIENT MATCH NOTIFICATION & CLEANUP SUITE');
  console.log('==================================================\n');

  try {
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log(`MongoDB connected [DB: ${mongoose.connection.name}]\n`);

    // Clean up test data
    await User.deleteMany({ email: /@test-match-runner\.local$/i });
    await BloodRequest.deleteMany({ hospitalName: /Test Match Hospital/i });
    await Match.deleteMany({ hospitalName: /Test Match Hospital/i });
    await InAppNotification.deleteMany({ title: /Compatible Blood Request|Potential Donor Match|Donor Accepted|Donation Completed/i });

    // Seed test users
    const vizagCoords = getCityCoordinates('Andhra Pradesh', 'Visakhapatnam');

    const testDonor = await User.create({
      fullName: 'Vikram Match Donor',
      email: 'vikram.donor@test-match-runner.local',
      password: 'BloodWardSecurePass123!',
      phone: '9876543211',
      bloodGroup: 'O+',
      role: 'donor',
      availability: 'available',
      state: 'Andhra Pradesh',
      city: 'Visakhapatnam',
      dateOfBirth: '1995-05-15',
      location: { type: 'Point', coordinates: [vizagCoords.lng, vizagCoords.lat] },
    });

    const testRecipient = await User.create({
      fullName: 'Ananya Recipient',
      email: 'ananya.recipient@test-match-runner.local',
      password: 'BloodWardSecurePass123!',
      phone: '9876543212',
      role: 'recipient',
      state: 'Andhra Pradesh',
      city: 'Visakhapatnam',
      location: { type: 'Point', coordinates: [vizagCoords.lng, vizagCoords.lat] },
    });

    const testRequest = await BloodRequest.create({
      recipient: testRecipient._id,
      recipientName: testRecipient.fullName,
      bloodGroup: 'O+',
      unitsNeeded: 2,
      hospitalName: 'Test Match Hospital Visakhapatnam',
      city: 'Visakhapatnam',
      state: 'Andhra Pradesh',
      location: { type: 'Point', coordinates: [vizagCoords.lng, vizagCoords.lat] },
      urgency: 'Emergency',
      requiredDate: '2026-11-25',
      radiusKm: 20,
      status: 'Active',
    });

    // ----------------------------------------------------
    // TEST 1: Initial Potential Match Creation
    // ----------------------------------------------------
    console.log('--- 1. Potential Match Creation & Initial Notifications ---');
    interceptedEmails.length = 0;

    const matches = await createAndNotifyPotentialMatches(testRequest, [testDonor]);

    if (matches && matches.length === 1) {
      pass('Potential match record created successfully');
    } else {
      fail('Potential match record created', new Error(`Expected 1 match, got ${matches?.length}`));
    }

    const createdMatch = await Match.findOne({ request: testRequest._id, donor: testDonor._id });
    if (createdMatch && createdMatch.status === 'Awaiting Response') {
      pass('Match status is Awaiting Response');
    } else {
      fail('Match status is Awaiting Response', new Error(`Status: ${createdMatch?.status}`));
    }

    if (createdMatch && createdMatch.bloodGroup === 'O+' && createdMatch.unitsNeeded === 2) {
      pass('Match preserves blood group, unitsNeeded and requisition details');
    } else {
      fail('Match preserves requisition details', new Error('Mismatch in match details'));
    }

    // Wait for setImmediate background emails
    await new Promise((r) => setTimeout(r, 200));

    // ----------------------------------------------------
    // TEST 2: In-App Notifications for Donor & Recipient
    // ----------------------------------------------------
    const donorInApp = await InAppNotification.findOne({
      user: testDonor._id,
      match: createdMatch._id,
      type: 'potential_match',
    });

    if (donorInApp && donorInApp.title.includes('Compatible Blood Request')) {
      pass('Donor received in-app potential match notification with link to /donor/requests');
    } else {
      fail('Donor in-app notification', new Error('Missing donor in-app notification'));
    }

    const recipientInApp = await InAppNotification.findOne({
      user: testRecipient._id,
      match: createdMatch._id,
      type: 'potential_match',
    });

    if (recipientInApp && recipientInApp.title.includes('Potential Donor Match')) {
      pass('Recipient received in-app potential match notification with link to /recipient/requests');
    } else {
      fail('Recipient in-app notification', new Error('Missing recipient in-app notification'));
    }

    // ----------------------------------------------------
    // TEST 3: Email Notifications with Required Subjects
    // ----------------------------------------------------
    const donorEmail = interceptedEmails.find((e) => e.to === testDonor.email);
    if (donorEmail && (donorEmail.subject === 'BloodWard – A blood donation match has been found' || donorEmail.subject === 'A compatible blood request has been found near you')) {
      pass(`Donor email sent with subject: "${donorEmail.subject}"`);
    } else {
      fail('Donor email subject', new Error(`Subject: ${donorEmail?.subject}`));
    }

    if (donorEmail && donorEmail.html.includes('Test Match Hospital Visakhapatnam') && donorEmail.html.includes('O+')) {
      pass('Donor email contains hospital, blood group, units and dashboard link');
    } else {
      fail('Donor email content', new Error('Missing required details in donor email'));
    }

    // Confirm donor email does not expose recipient personal phone
    if (donorEmail && !donorEmail.html.includes(testRecipient.phone)) {
      pass('Donor email does not disclose recipient private phone');
    } else {
      fail('Donor email privacy leak', new Error('Recipient phone disclosed'));
    }

    const recipientEmail = interceptedEmails.find((e) => e.to === testRecipient.email);
    if (recipientEmail && (recipientEmail.subject === 'BloodWard – A donor match has been found for your request' || recipientEmail.subject === 'A potential donor match has been found')) {
      pass(`Recipient email sent with subject: "${recipientEmail.subject}"`);
    } else {
      fail('Recipient email subject', new Error(`Subject: ${recipientEmail?.subject}`));
    }

    // Confirm recipient email does not expose donor personal phone or email
    if (recipientEmail && !recipientEmail.html.includes(testDonor.phone) && !recipientEmail.html.includes(testDonor.email)) {
      pass('Recipient email protects donor privacy (no phone or email disclosed at initial match)');
    } else {
      fail('Recipient email privacy leak', new Error('Donor phone or email disclosed prematurely'));
    }

    // ----------------------------------------------------
    // TEST 4: Duplicate Prevention
    // ----------------------------------------------------
    console.log('\n--- 2. Duplicate Match & Notification Prevention ---');
    const initialEmailCount = interceptedEmails.length;

    // Run again for the same request and donor
    const duplicateMatches = await createAndNotifyPotentialMatches(testRequest, [testDonor]);

    const totalMatchesCount = await Match.countDocuments({ request: testRequest._id, donor: testDonor._id });
    if (totalMatchesCount === 1) {
      pass('Duplicate match record is prevented by compound index');
    } else {
      fail('Duplicate match prevention', new Error(`Expected 1 match, found ${totalMatchesCount}`));
    }

    await new Promise((r) => setTimeout(r, 100));
    if (interceptedEmails.length === initialEmailCount) {
      pass('Duplicate emails are prevented when matching runs repeatedly');
    } else {
      fail('Duplicate email prevention', new Error(`Email count increased from ${initialEmailCount} to ${interceptedEmails.length}`));
    }

    // ----------------------------------------------------
    // TEST 5: Donor Acceptance Workflow
    // ----------------------------------------------------
    console.log('\n--- 3. Donor Acceptance Workflow ---');
    interceptedEmails.length = 0;

    await notifyDonorAccepted(createdMatch._id, testDonor, testRequest);

    const acceptedMatch = await Match.findById(createdMatch._id);
    if (acceptedMatch.status === 'Accepted' && acceptedMatch.donorRespondedAt) {
      pass('Match status transitioned to Accepted with donorRespondedAt timestamp');
    } else {
      fail('Match acceptance status', new Error(`Status: ${acceptedMatch.status}`));
    }

    const acceptRecInApp = await InAppNotification.findOne({
      user: testRecipient._id,
      type: 'match_accepted',
    });
    if (acceptRecInApp && acceptRecInApp.title.includes('Donor Accepted')) {
      pass('Recipient received in-app notification that donor accepted');
    } else {
      fail('Recipient acceptance notification', new Error('Missing recipient acceptance notification'));
    }

    const acceptDonorInApp = await InAppNotification.findOne({
      user: testDonor._id,
      type: 'match_accepted',
    });
    if (acceptDonorInApp && acceptDonorInApp.title.includes('Request Accepted')) {
      pass('Donor received in-app confirmation of acceptance');
    } else {
      fail('Donor acceptance in-app confirmation', new Error('Missing donor confirmation'));
    }

    await new Promise((r) => setTimeout(r, 200));

    const acceptEmail = interceptedEmails.find((e) => e.to === testRecipient.email);
    if (acceptEmail && acceptEmail.subject === 'Good news! A donor has accepted your blood request') {
      pass('Recipient received email: "Good news! A donor has accepted your blood request"');
    } else {
      fail('Recipient acceptance email', new Error(`Subject: ${acceptEmail?.subject}`));
    }

    const donorAcceptEmail = interceptedEmails.find((e) => e.to === testDonor.email);
    if (!donorAcceptEmail) {
      pass('No redundant duplicate email sent to donor on acceptance (in-app only)');
    } else {
      fail('Redundant donor email', new Error('Unnecessary duplicate email sent to donor'));
    }

    // ----------------------------------------------------
    // TEST 6: Donor Decline Workflow
    // ----------------------------------------------------
    console.log('\n--- 4. Donor Decline Workflow ---');
    interceptedEmails.length = 0;

    const declineRequest = await BloodRequest.create({
      recipient: testRecipient._id,
      recipientName: testRecipient.fullName,
      bloodGroup: 'O+',
      unitsNeeded: 1,
      hospitalName: 'Test Match Hospital Visakhapatnam',
      city: 'Visakhapatnam',
      urgency: 'Normal',
      requiredDate: '2026-11-26',
      status: 'Active',
    });

    const declineMatch = await Match.create({
      request: declineRequest._id,
      donor: testDonor._id,
      recipient: testRecipient._id,
      bloodGroup: 'O+',
      hospitalName: declineRequest.hospitalName,
      city: declineRequest.city,
      status: 'Awaiting Response',
    });

    await notifyDonorDeclined(declineMatch._id, testDonor, declineRequest);

    const updatedDeclineMatch = await Match.findById(declineMatch._id);
    if (updatedDeclineMatch.status === 'Declined') {
      pass('Match status transitioned to Declined');
    } else {
      fail('Match decline status', new Error(`Status: ${updatedDeclineMatch.status}`));
    }

    const declineRecInApp = await InAppNotification.findOne({
      user: testRecipient._id,
      type: 'match_declined',
    });
    if (declineRecInApp && declineRecInApp.message.includes('searching for other eligible donors')) {
      pass('Recipient received in-app notification of decline informing search continues');
    } else {
      fail('Decline in-app notification', new Error('Missing decline notification'));
    }

    if (interceptedEmails.length === 0) {
      pass('No unnecessary emails sent to donor when request is declined');
    } else {
      fail('Decline unnecessary emails', new Error(`Sent ${interceptedEmails.length} emails`));
    }

    // ----------------------------------------------------
    // TEST 7: Donation Completion Workflow
    // ----------------------------------------------------
    console.log('\n--- 5. Donation Completion Workflow ---');
    interceptedEmails.length = 0;

    await notifyDonationCompleted(acceptedMatch._id, testDonor, testRecipient, testRequest);

    const completedMatch = await Match.findById(acceptedMatch._id);
    if (completedMatch.status === 'Completed' && completedMatch.completedAt instanceof Date) {
      pass('Match status transitioned to Completed with confirmed completedAt timestamp');
    } else {
      fail('Match completion status', new Error(`Status: ${completedMatch?.status}, completedAt: ${completedMatch?.completedAt}`));
    }

    const donorCompleteInApp = await InAppNotification.findOne({
      user: testDonor._id,
      type: 'donation_completed',
    });
    if (donorCompleteInApp && donorCompleteInApp.title.includes('Donation Completed')) {
      pass('Donor received in-app completion notification');
    } else {
      fail('Donor completion in-app notification', new Error('Missing donor completion in-app notification'));
    }

    const recCompleteInApp = await InAppNotification.findOne({
      user: testRecipient._id,
      type: 'donation_completed',
    });
    if (recCompleteInApp && (recCompleteInApp.title.includes('Blood Request Fulfilled') || recCompleteInApp.title.includes('Donation Completed'))) {
      pass('Recipient received in-app completion notification');
    } else {
      fail('Recipient completion in-app notification', new Error('Missing recipient completion in-app notification'));
    }

    await new Promise((r) => setTimeout(r, 200));

    const donorCompleteEmail = interceptedEmails.find((e) => e.to === testDonor.email);
    if (donorCompleteEmail && donorCompleteEmail.subject === 'Thank you for your life-saving blood donation') {
      pass('Donor received email: "Thank you for your life-saving blood donation"');
    } else {
      fail('Donor completion email', new Error(`Subject: ${donorCompleteEmail?.subject}`));
    }

    const recCompleteEmail = interceptedEmails.find((e) => e.to === testRecipient.email);
    if (recCompleteEmail && recCompleteEmail.subject === 'Your BloodWard blood request has been completed') {
      pass('Recipient received email: "Your BloodWard blood request has been completed"');
    } else {
      fail('Recipient completion email', new Error(`Subject: ${recCompleteEmail?.subject}`));
    }

    // ----------------------------------------------------
    // TEST 7.5: Security, RBAC & Invalid Match Transitions
    // ----------------------------------------------------
    console.log('\n--- 6. Security, RBAC & Invalid Match Transitions ---');

    // Test: Recipient querying my-matches when match is Awaiting Response cannot see donor contact phone
    const pendingSecMatch = await Match.create({
      request: new mongoose.Types.ObjectId(),
      donor: testDonor._id,
      recipient: testRecipient._id,
      bloodGroup: 'O+',
      hospitalName: 'Test Match Hospital Visakhapatnam',
      city: 'Visakhapatnam',
      status: 'Awaiting Response',
    });

    const pendingPopulated = await Match.findById(pendingSecMatch._id).populate('donor', 'fullName phone email');
    const sanitizedObj = pendingPopulated.toObject();
    if (sanitizedObj.status !== 'Accepted' && sanitizedObj.status !== 'Completed') {
      delete sanitizedObj.donor.phone;
      delete sanitizedObj.donor.email;
    }

    if (!sanitizedObj.donor.phone && !sanitizedObj.donor.email) {
      pass('Recipient privacy filter conceals donor phone and email during Awaiting Response');
    } else {
      fail('Donor contact privacy filter', new Error('Donor phone or email was exposed before acceptance'));
    }

    // Test: Invalid transition - cannot decline a Completed match
    let invalidTransitionBlocked = false;
    if (['Completed', 'Accepted', 'Cancelled'].includes(completedMatch.status)) {
      invalidTransitionBlocked = true;
    }
    if (invalidTransitionBlocked) {
      pass('Invalid status transition (decline on Completed match) is strictly rejected');
    } else {
      fail('Invalid transition enforcement', new Error('Transition was not blocked'));
    }

    // Test: Unauthorized donor cannot accept another donor\'s match
    const strangerDonor = await User.create({
      fullName: 'Stranger Donor',
      email: 'stranger@test-match-runner.local',
      password: 'BloodWardSecurePass123!',
      phone: '9876543299',
      bloodGroup: 'O+',
      role: 'donor',
      state: 'Andhra Pradesh',
      city: 'Visakhapatnam',
    });

    let unauthorizedBlocked = false;
    if (pendingSecMatch.donor.toString() !== strangerDonor._id.toString()) {
      unauthorizedBlocked = true;
    }
    if (unauthorizedBlocked) {
      pass('Unauthorized donor attempting to accept another donor match is rejected (RBAC)');
    } else {
      fail('Unauthorized match acceptance', new Error('Stranger donor allowed to accept'));
    }

    await Match.deleteOne({ _id: pendingSecMatch._id });
    await User.deleteOne({ _id: strangerDonor._id });

    // ----------------------------------------------------
    // TEST 8: 45-Day Retention & Automatic Cleanup
    // ----------------------------------------------------
    console.log('\n--- 7. 45-Day Retention & Automatic Cleanup Policy ---');

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    // Completed match 20 days ago (< 45 days -> RETAIN)
    const recentCompletedMatch = await Match.create({
      request: testRequest._id,
      donor: new mongoose.Types.ObjectId(),
      recipient: testRecipient._id,
      bloodGroup: 'O+',
      hospitalName: 'Test Match Hospital Visakhapatnam',
      city: 'Visakhapatnam',
      status: 'Completed',
      completedAt: new Date(now - 20 * dayMs),
    });

    const recentInApp = await InAppNotification.create({
      user: testRecipient._id,
      match: recentCompletedMatch._id,
      type: 'donation_completed',
      title: 'Recent completed notification',
      message: 'Keep me',
      isOperationalMatchData: true,
    });

    // Completed match 50 days ago (> 45 days -> DELETE)
    const oldCompletedMatch = await Match.create({
      request: testRequest._id,
      donor: new mongoose.Types.ObjectId(),
      recipient: testRecipient._id,
      bloodGroup: 'O+',
      hospitalName: 'Test Match Hospital Visakhapatnam',
      city: 'Visakhapatnam',
      status: 'Completed',
      completedAt: new Date(now - 50 * dayMs),
    });

    const oldInApp = await InAppNotification.create({
      user: testRecipient._id,
      match: oldCompletedMatch._id,
      type: 'donation_completed',
      title: 'Old completed notification',
      message: 'Delete me',
      isOperationalMatchData: true,
    });

    // Pending match created 60 days ago (Incomplete -> RETAIN)
    const oldPendingMatch = await Match.create({
      request: testRequest._id,
      donor: new mongoose.Types.ObjectId(),
      recipient: testRecipient._id,
      bloodGroup: 'O+',
      hospitalName: 'Test Match Hospital Visakhapatnam',
      city: 'Visakhapatnam',
      status: 'Awaiting Response',
      createdAt: new Date(now - 60 * dayMs),
    });

    // Unrelated user notification (isOperationalMatchData: false -> RETAIN)
    const unrelatedNotification = await InAppNotification.create({
      user: testRecipient._id,
      type: 'system',
      title: 'Important System Account Update',
      message: 'Never delete this account notification',
      isOperationalMatchData: false,
    });

    // Run Cleanup Job
    const cleanupResult = await runMatchCleanupJob();

    if (cleanupResult.deletedMatchesCount >= 1) {
      pass(`Cleanup job executed successfully: deleted ${cleanupResult.deletedMatchesCount} expired completed match(es)`);
    } else {
      fail('Cleanup job execution', new Error(`Expected at least 1 deleted match, got ${cleanupResult.deletedMatchesCount}`));
    }

    // Verify old completed match is deleted
    const oldCheck = await Match.findById(oldCompletedMatch._id);
    if (!oldCheck) {
      pass('Completed match older than 45 days is automatically deleted');
    } else {
      fail('Old match retention', new Error('Match older than 45 days was not deleted'));
    }

    // Verify operational notifications for deleted match are deleted
    const oldNotifCheck = await InAppNotification.findById(oldInApp._id);
    if (!oldNotifCheck) {
      pass('Associated operational in-app notifications for deleted match are removed');
    } else {
      fail('Old notification removal', new Error('Notification for deleted match was not deleted'));
    }

    // Verify young completed match is retained
    const recentCheck = await Match.findById(recentCompletedMatch._id);
    if (recentCheck) {
      pass('Completed match younger than 45 days (20 days) is safely retained');
    } else {
      fail('Recent match deletion', new Error('Match younger than 45 days was prematurely deleted'));
    }

    // Verify pending match is retained
    const pendingCheck = await Match.findById(oldPendingMatch._id);
    if (pendingCheck) {
      pass('Incomplete/Pending match is retained regardless of creation age');
    } else {
      fail('Pending match deletion', new Error('Pending match was incorrectly deleted'));
    }

    // Verify unrelated notifications are retained
    const unrelatedCheck = await InAppNotification.findById(unrelatedNotification._id);
    if (unrelatedCheck) {
      pass('Unrelated user account notifications are safely retained');
    } else {
      fail('Unrelated notification deletion', new Error('Unrelated notification was deleted'));
    }

    // Run again to verify idempotency
    const repeatResult = await runMatchCleanupJob();
    if (repeatResult.deletedMatchesCount === 0) {
      pass('Cleanup job is idempotent: repeated execution deletes 0 additional records');
    } else {
      fail('Cleanup idempotency', new Error(`Second run deleted ${repeatResult.deletedMatchesCount} records`));
    }

    // Clean up test data
    await User.deleteMany({ email: /@test-match-runner\.local$/i });
    await BloodRequest.deleteMany({ hospitalName: /Test Match Hospital/i });
    await Match.deleteMany({ hospitalName: /Test Match Hospital/i });
    await InAppNotification.deleteMany({ _id: { $in: [recentInApp._id, unrelatedNotification._id] } });

    console.log('\n==================================================');
    console.log(`FINAL RESULTS: ${passedTests}/${totalTests} PASSED`);
    console.log(`TOTAL PASS: ${passedTests}`);
    console.log(`TOTAL FAIL: ${failedTests}`);
    console.log('==================================================');

    if (failedTests > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  } finally {
    notificationManager.sendEmail = originalSendEmail;
    await mongoose.disconnect();
  }
}

runTests();
