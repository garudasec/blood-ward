import Match from '../models/match.model.js';
import InAppNotification from '../models/inAppNotification.model.js';
import User from '../models/user.model.js';
import { emitToUser } from '../socket.js';
import { notifyAdminsOfMatchAccepted, notifyAdminsOfDonationCompleted } from './adminNotificationService.js';

/**
 * Creates persistent match records and dispatches initial in-app notifications to donor and recipient.
 * @param {object} bloodRequest - Blood request mongoose document or object
 * @param {Array<object>} eligibleDonors - Array of matched donor user objects
 * @returns {Promise<Array<object>>} - Created match documents
 */
export async function createAndNotifyPotentialMatches(bloodRequest, eligibleDonors) {
  if (!bloodRequest || !eligibleDonors || eligibleDonors.length === 0) {
    return [];
  }

  const recipientUser = await User.findById(bloodRequest.recipient);
  if (!recipientUser) {
    console.error('[MatchNotificationService] Recipient not found for blood request:', bloodRequest._id);
    return [];
  }

  const createdMatches = [];

  for (const donor of eligibleDonors) {
    try {
      // Prevent duplicate match creation
      let match = await Match.findOne({
        request: bloodRequest._id,
        donor: donor._id,
      });

      let isNew = false;
      if (!match) {
        match = await Match.create({
          request: bloodRequest._id,
          donor: donor._id,
          recipient: recipientUser._id,
          bloodGroup: bloodRequest.bloodGroup,
          hospitalName: bloodRequest.hospitalName,
          city: bloodRequest.city,
          state: bloodRequest.state || recipientUser.state || '',
          unitsNeeded: bloodRequest.unitsNeeded || 1,
          urgency: bloodRequest.urgency || 'Normal',
          status: 'Awaiting Response',
          notifiedAt: new Date(),
          metadata: {
            requiredDate: bloodRequest.requiredDate,
          },
        });
        isNew = true;
        createdMatches.push(match);
      }

      // If this match was already created and notified, do NOT send duplicate in-app notifications
      if (!isNew) {
        continue;
      }

      // 1. Create In-App Notification for Donor
      const donorInApp = await InAppNotification.create({
        user: donor._id,
        match: match._id,
        request: bloodRequest._id,
        type: 'potential_match',
        title: '🩸 Compatible Blood Request Found',
        message: `A compatible ${bloodRequest.bloodGroup} blood request has been found at ${bloodRequest.hospitalName}, ${bloodRequest.city}. Please review and respond.`,
        link: '/donor/requests',
        metadata: {
          bloodGroup: bloodRequest.bloodGroup,
          hospitalName: bloodRequest.hospitalName,
          urgency: bloodRequest.urgency,
          unitsNeeded: bloodRequest.unitsNeeded,
        },
      });

      // Live socket push to donor
      emitToUser(donor._id, 'notification:new', donorInApp);

      // 2. Create In-App Notification for Recipient (deduplicated per blood request)
      const existingRecInApp = await InAppNotification.findOne({
        user: recipientUser._id,
        request: bloodRequest._id,
        type: 'potential_match',
      });

      if (!existingRecInApp) {
        const recipientInApp = await InAppNotification.create({
          user: recipientUser._id,
          match: match._id,
          request: bloodRequest._id,
          type: 'potential_match',
          title: '🎯 Potential Donor Match Found',
          message: `A potential donor has been matched for your ${bloodRequest.bloodGroup} request at ${bloodRequest.hospitalName}. Awaiting donor response.`,
          link: '/recipient/requests',
          metadata: {
            bloodGroup: bloodRequest.bloodGroup,
            hospitalName: bloodRequest.hospitalName,
            matchId: match._id.toString(),
          },
        });
        emitToUser(recipientUser._id, 'notification:new', recipientInApp);
      }
    } catch (err) {
      console.error(`[MatchNotificationService] Error processing potential match for donor ${donor._id}:`, err.message);
    }
  }

  return createdMatches;
}

/**
 * Handles donor acceptance lifecycle event via in-app and admin notifications.
 */
export async function notifyDonorAccepted(matchId, donorUser, bloodRequest) {
  const match = await Match.findById(matchId).populate('recipient').populate('donor');
  if (!match) return;

  match.status = 'Accepted';
  match.donorRespondedAt = new Date();
  await match.save();

  const recipient = match.recipient;

  // 1. Recipient In-App Notification
  if (recipient?._id) {
    const recInApp = await InAppNotification.create({
      user: recipient._id,
      match: match._id,
      request: bloodRequest._id,
      type: 'match_accepted',
      title: '🎉 Good News! Donor Accepted',
      message: `A donor (${donorUser.bloodGroup}) accepted your blood request for ${bloodRequest.hospitalName}. Contact information is now accessible.`,
      link: '/recipient/requests',
      metadata: {
        matchId: match._id.toString(),
        donorName: donorUser.fullName,
        bloodGroup: donorUser.bloodGroup,
      },
    });
    emitToUser(recipient._id, 'notification:new', recInApp);
  }

  // 2. Donor In-App Confirmation
  const donorInApp = await InAppNotification.create({
    user: donorUser._id,
    match: match._id,
    request: bloodRequest._id,
    type: 'match_accepted',
    title: '✅ Request Accepted',
    message: `You accepted the blood request at ${bloodRequest.hospitalName}. Please coordinate with the hospital/recipient for donation.`,
    link: '/donor/requests',
    metadata: {
      matchId: match._id.toString(),
      hospitalName: bloodRequest.hospitalName,
    },
  });
  emitToUser(donorUser._id, 'notification:new', donorInApp);

  // 3. Notify Admins
  notifyAdminsOfMatchAccepted(match, bloodRequest, donorUser).catch((err) => {
    console.warn('[MatchNotificationService] Admin notification error on match accepted:', err.message);
  });
}

/**
 * Handles donor decline lifecycle event via in-app notification.
 */
export async function notifyDonorDeclined(matchId, donorUser, bloodRequest) {
  const match = await Match.findById(matchId).populate('recipient');
  if (!match) return;

  match.status = 'Declined';
  match.donorRespondedAt = new Date();
  await match.save();

  const recipient = match.recipient;
  if (!recipient) return;

  // In-app notification to recipient through website
  const recInApp = await InAppNotification.create({
    user: recipient._id,
    match: match._id,
    request: bloodRequest._id,
    type: 'match_declined',
    title: 'ℹ️ Potential Donor Update',
    message: `A potential donor was unable to fulfill your blood request for ${bloodRequest.hospitalName}. BloodWard is searching for other eligible donors.`,
    link: '/recipient/requests',
    metadata: {
      matchId: match._id.toString(),
      hospitalName: bloodRequest.hospitalName,
    },
  });
  emitToUser(recipient._id, 'notification:new', recInApp);
}

/**
 * Handles donation completion lifecycle event.
 * Transition is atomic and idempotent, dispatching in-app and admin notifications.
 */
export async function notifyDonationCompleted(matchId, donorUser, recipientUser, bloodRequest) {
  const completionTimestamp = new Date();

  // Atomically claim the transition to 'Completed' to avoid duplicate notifications under concurrency
  const claimedTransition = await Match.findOneAndUpdate(
    { _id: matchId, status: { $ne: 'Completed' } },
    { $set: { status: 'Completed', completedAt: completionTimestamp } },
    { returnDocument: 'after' }
  ).populate('donor').populate('recipient').populate('request');

  const match = claimedTransition || await Match.findById(matchId).populate('donor').populate('recipient').populate('request');
  if (!match) return null;

  const effectiveDonor = donorUser || match.donor;
  const effectiveRecipient = recipientUser || match.recipient;
  const effectiveRequest = bloodRequest || match.request;

  // Release donor's active accepted match lock upon successful completion
  if (effectiveDonor?._id) {
    await User.updateOne(
      { _id: effectiveDonor._id, activeAcceptedMatch: match._id },
      { $set: { activeAcceptedMatch: null } }
    );
  }

  // Only dispatch in-app & admin notifications on the first transition (avoid duplicates)
  if (claimedTransition) {
    // 1. Donor In-App Notification
    if (effectiveDonor?._id && effectiveRequest?._id) {
      const donorInApp = await InAppNotification.create({
        user: effectiveDonor._id,
        match: match._id,
        request: effectiveRequest._id,
        type: 'donation_completed',
        title: '🏆 Donation Completed',
        message: `Thank you for your life-saving blood donation for ${effectiveRequest.bloodGroup} at ${effectiveRequest.hospitalName}. Completed on ${completionTimestamp.toLocaleDateString()}.`,
        link: '/donor/history',
        metadata: {
          matchId: match._id.toString(),
          completedAt: completionTimestamp,
        },
      });
      emitToUser(effectiveDonor._id, 'notification:new', donorInApp);
    }

    // 2. Recipient In-App Notification
    if (effectiveRecipient?._id && effectiveRequest?._id) {
      const recInApp = await InAppNotification.create({
        user: effectiveRecipient._id,
        match: match._id,
        request: effectiveRequest._id,
        type: 'donation_completed',
        title: '🩸 Donation Completed Successfully',
        message: `Blood donation for your request at ${effectiveRequest.hospitalName} has been completed. Match reference: ${match._id}.`,
        link: '/recipient/requests',
        metadata: {
          matchId: match._id.toString(),
          completedAt: completionTimestamp,
        },
      });
      emitToUser(effectiveRecipient._id, 'notification:new', recInApp);
    }

    // Notify Admins of completion
    notifyAdminsOfDonationCompleted(match, effectiveRequest).catch((err) => {
      console.warn('[MatchNotificationService] Admin notification error on donation completed:', err.message);
    });
  }

  return match;
}
