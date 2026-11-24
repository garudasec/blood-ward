import Match from '../models/match.model.js';
import InAppNotification from '../models/inAppNotification.model.js';
import User from '../models/user.model.js';
import notificationManager from './notification/notificationManager.js';
import { emitToUser } from '../socket.js';
import { maskEmail } from '../utils/encryptionUtils.js';

const CLIENT_BASE_URL = process.env.CLIENT_URL || 'http://localhost:5173';

/**
 * Safe email dispatch helper that never throws or blocks execution.
 */
async function safeSendEmail({ to, subject, html, text, purpose, metadata }) {
  if (!to || typeof to !== 'string' || !to.includes('@')) {
    return { success: false, error: 'Invalid recipient email' };
  }
  try {
    const res = await notificationManager.sendEmail({
      to,
      subject,
      html,
      text,
      purpose: purpose || 'match_notification',
      metadata: metadata || {},
    });
    return res;
  } catch (err) {
    console.error(`[MatchNotificationService] Safe sendEmail error (${purpose} to ${maskEmail(to)}):`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Creates persistent match records and dispatches initial notifications to donor and recipient.
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

      // If this match was already created and notified, do NOT send duplicate notifications!
      if (!isNew && match.donorEmailSent && match.recipientEmailSent) {
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

      // 2. Create In-App Notification for Recipient
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

      // Live socket push to recipient
      emitToUser(recipientUser._id, 'notification:new', recipientInApp);

      // 3. Asynchronously send initial emails without blocking matching engine
      setImmediate(async () => {
        // Donor Email
        if (!match.donorEmailSent && donor.email) {
          const donorSubject = 'BloodWard – A blood donation match has been found';
          const donorHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1E293B;">
              <div style="background-color: #A61B2B; padding: 16px 24px; border-radius: 8px 8px 0 0; color: #ffffff;">
                <h2 style="margin: 0; font-size: 20px;">BloodWard — Compatible Blood Request</h2>
              </div>
              <div style="padding: 24px; border: 1px solid #E2E8F0; border-top: none; border-radius: 0 0 8px 8px; background-color: #ffffff;">
                <p style="font-size: 15px; line-height: 1.5;">Dear <strong>${donor.fullName || 'Donor'}</strong>,</p>
                <p style="font-size: 14px; line-height: 1.5;">A compatible blood requisition matching your blood profile has been registered in your service area:</p>
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
                  <tr><td style="padding: 8px; border-bottom: 1px solid #E2E8F0; color: #64748B;">Blood Group Required:</td><td style="padding: 8px; border-bottom: 1px solid #E2E8F0; font-weight: bold; color: #A61B2B;">${bloodRequest.bloodGroup}</td></tr>
                  <tr><td style="padding: 8px; border-bottom: 1px solid #E2E8F0; color: #64748B;">Hospital Name:</td><td style="padding: 8px; border-bottom: 1px solid #E2E8F0; font-weight: bold;">${bloodRequest.hospitalName}</td></tr>
                  <tr><td style="padding: 8px; border-bottom: 1px solid #E2E8F0; color: #64748B;">General Location:</td><td style="padding: 8px; border-bottom: 1px solid #E2E8F0;">${bloodRequest.city}${bloodRequest.state ? `, ${bloodRequest.state}` : ''}</td></tr>
                  <tr><td style="padding: 8px; border-bottom: 1px solid #E2E8F0; color: #64748B;">Required Units:</td><td style="padding: 8px; border-bottom: 1px solid #E2E8F0;">${bloodRequest.unitsNeeded || 1} unit(s)</td></tr>
                  <tr><td style="padding: 8px; border-bottom: 1px solid #E2E8F0; color: #64748B;">Urgency Level:</td><td style="padding: 8px; border-bottom: 1px solid #E2E8F0; font-weight: bold; color: ${bloodRequest.urgency === 'Emergency' ? '#DC2626' : '#2563EB'};">${bloodRequest.urgency || 'Normal'}</td></tr>
                  <tr><td style="padding: 8px; border-bottom: 1px solid #E2E8F0; color: #64748B;">Required Date:</td><td style="padding: 8px; border-bottom: 1px solid #E2E8F0;">${bloodRequest.requiredDate || 'Immediate'}</td></tr>
                </table>
                <p style="font-size: 13px; line-height: 1.5; color: #475569;">Please review this request on your dashboard to accept or decline the donation opportunity:</p>
                <div style="margin: 24px 0; text-align: center;">
                  <a href="${CLIENT_BASE_URL}/donor/requests" style="background-color: #A61B2B; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">Review & Respond on Dashboard</a>
                </div>
                <p style="font-size: 11px; color: #94A3B8; margin-top: 24px;">Your exact home coordinates and personal contact details are never shared with the recipient at this preliminary stage.</p>
              </div>
            </div>
          `;
          const donorText = `BloodWard Compatible Blood Request: ${bloodRequest.bloodGroup} needed at ${bloodRequest.hospitalName}, ${bloodRequest.city}. Urgency: ${bloodRequest.urgency}. Please visit ${CLIENT_BASE_URL}/donor/requests to accept or decline.`;
          const dRes = await safeSendEmail({
            to: donor.email,
            subject: donorSubject,
            html: donorHtml,
            text: donorText,
            purpose: 'potential_match_donor',
            metadata: { matchId: match._id.toString(), requestId: bloodRequest._id.toString() },
          });
          if (dRes.success) {
            await Match.updateOne({ _id: match._id }, { $set: { donorEmailSent: true } });
          }
        }

        // Recipient Email
        if (!match.recipientEmailSent && recipientUser.email) {
          const recSubject = 'BloodWard – A donor match has been found for your request';
          const recHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1E293B;">
              <div style="background-color: #315B83; padding: 16px 24px; border-radius: 8px 8px 0 0; color: #ffffff;">
                <h2 style="margin: 0; font-size: 20px;">BloodWard — Potential Donor Matched</h2>
              </div>
              <div style="padding: 24px; border: 1px solid #E2E8F0; border-top: none; border-radius: 0 0 8px 8px; background-color: #ffffff;">
                <p style="font-size: 15px; line-height: 1.5;">Dear <strong>${recipientUser.fullName || 'Recipient'}</strong>,</p>
                <p style="font-size: 14px; line-height: 1.5;">A qualified potential donor has been matched for your active blood requisition:</p>
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
                  <tr><td style="padding: 8px; border-bottom: 1px solid #E2E8F0; color: #64748B;">Blood Group:</td><td style="padding: 8px; border-bottom: 1px solid #E2E8F0; font-weight: bold; color: #A61B2B;">${bloodRequest.bloodGroup}</td></tr>
                  <tr><td style="padding: 8px; border-bottom: 1px solid #E2E8F0; color: #64748B;">Hospital / Location:</td><td style="padding: 8px; border-bottom: 1px solid #E2E8F0;">${bloodRequest.hospitalName}, ${bloodRequest.city}</td></tr>
                  <tr><td style="padding: 8px; border-bottom: 1px solid #E2E8F0; color: #64748B;">Match Status:</td><td style="padding: 8px; border-bottom: 1px solid #E2E8F0; font-weight: bold; color: #D97706;">Awaiting donor response</td></tr>
                </table>
                <p style="font-size: 13px; line-height: 1.5; color: #475569;">The potential donor has been notified to review the requisition. You will be updated immediately once the donor accepts.</p>
                <div style="margin: 24px 0; text-align: center;">
                  <a href="${CLIENT_BASE_URL}/recipient/requests" style="background-color: #315B83; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">View Status on Recipient Dashboard</a>
                </div>
                <p style="font-size: 11px; color: #94A3B8; margin-top: 24px;">To protect donor privacy, donor personal contact information is only released after voluntary donor acceptance.</p>
              </div>
            </div>
          `;
          const recText = `BloodWard Potential Match: A potential donor has been matched for your ${bloodRequest.bloodGroup} request at ${bloodRequest.hospitalName}. Status: Awaiting donor response. View dashboard: ${CLIENT_BASE_URL}/recipient/requests`;
          const rRes = await safeSendEmail({
            to: recipientUser.email,
            subject: recSubject,
            html: recHtml,
            text: recText,
            purpose: 'potential_match_recipient',
            metadata: { matchId: match._id.toString(), requestId: bloodRequest._id.toString() },
          });
          if (rRes.success) {
            await Match.updateOne({ _id: match._id }, { $set: { recipientEmailSent: true } });
          }
        }
      });
    } catch (err) {
      console.error(`[MatchNotificationService] Error processing potential match for donor ${donor._id}:`, err.message);
    }
  }

  return createdMatches;
}

/**
 * Handles donor acceptance lifecycle event.
 */
export async function notifyDonorAccepted(matchId, donorUser, bloodRequest) {
  const match = await Match.findById(matchId).populate('recipient').populate('donor');
  if (!match) return;

  match.status = 'Accepted';
  match.donorRespondedAt = new Date();
  await match.save();

  const recipient = match.recipient;

  // 1. Recipient In-App Notification
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

  // 2. Donor In-App Confirmation (no duplicate email sent to donor)
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

  // 3. Asynchronously send Recipient Email
  if (!match.acceptanceEmailSent && recipient.email) {
    setImmediate(async () => {
      const emailSubject = 'Good news! A donor has accepted your blood request';
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1E293B;">
          <div style="background-color: #28734A; padding: 16px 24px; border-radius: 8px 8px 0 0; color: #ffffff;">
            <h2 style="margin: 0; font-size: 20px;">BloodWard — Donor Accepted Your Request</h2>
          </div>
          <div style="padding: 24px; border: 1px solid #E2E8F0; border-top: none; border-radius: 0 0 8px 8px; background-color: #ffffff;">
            <p style="font-size: 15px; line-height: 1.5;">Dear <strong>${recipient.fullName || 'Recipient'}</strong>,</p>
            <p style="font-size: 14px; line-height: 1.5; color: #15803D; font-weight: bold;">Great news! A voluntary donor has officially accepted your blood request.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
              <tr><td style="padding: 8px; border-bottom: 1px solid #E2E8F0; color: #64748B;">Donor Name:</td><td style="padding: 8px; border-bottom: 1px solid #E2E8F0; font-weight: bold;">${donorUser.fullName}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #E2E8F0; color: #64748B;">Blood Group:</td><td style="padding: 8px; border-bottom: 1px solid #E2E8F0; font-weight: bold; color: #A61B2B;">${donorUser.bloodGroup}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #E2E8F0; color: #64748B;">Hospital:</td><td style="padding: 8px; border-bottom: 1px solid #E2E8F0;">${bloodRequest.hospitalName}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #E2E8F0; color: #64748B;">Match Status:</td><td style="padding: 8px; border-bottom: 1px solid #E2E8F0; font-weight: bold; color: #15803D;">Accepted</td></tr>
            </table>
            <p style="font-size: 13px; line-height: 1.5; color: #475569;">You can now view the donor's authorized contact information on your dashboard to coordinate donation timings.</p>
            <div style="margin: 24px 0; text-align: center;">
              <a href="${CLIENT_BASE_URL}/recipient/requests" style="background-color: #28734A; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">View Donor Details on Dashboard</a>
            </div>
          </div>
        </div>
      `;
      const emailText = `BloodWard: Good news! A donor (${donorUser.fullName}, ${donorUser.bloodGroup}) accepted your blood request for ${bloodRequest.hospitalName}. Please coordinate via ${CLIENT_BASE_URL}/recipient/requests`;
      const aRes = await safeSendEmail({
        to: recipient.email,
        subject: emailSubject,
        html: emailHtml,
        text: emailText,
        purpose: 'match_accepted_recipient',
        metadata: { matchId: match._id.toString(), requestId: bloodRequest._id.toString() },
      });
      if (aRes.success) {
        await Match.updateOne({ _id: match._id }, { $set: { acceptanceEmailSent: true } });
      }
    });
  }
}

/**
 * Handles donor decline lifecycle event.
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
 */
export async function notifyDonationCompleted(matchId, donorUser, recipientUser, bloodRequest) {
  const match = await Match.findById(matchId).populate('donor').populate('recipient').populate('request');
  if (!match) return;

  const effectiveDonor = donorUser || match.donor;
  const effectiveRecipient = recipientUser || match.recipient;
  const effectiveRequest = bloodRequest || match.request;

  const completionTimestamp = new Date();
  match.status = 'Completed';
  match.completedAt = completionTimestamp;
  await match.save();

  // Release donor's active accepted match lock upon successful completion
  if (effectiveDonor?._id) {
    await User.updateOne(
      { _id: effectiveDonor._id, activeAcceptedMatch: match._id },
      { $set: { activeAcceptedMatch: null } }
    );
  }

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

  // 3. Asynchronously send completion emails to both users
  if (!match.completionEmailSent) {
    setImmediate(async () => {
      // Donor Email
      if (effectiveDonor?.email) {
        const donorSubject = 'Thank you for your life-saving blood donation';
        const donorHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1E293B;">
            <div style="background-color: #A61B2B; padding: 16px 24px; border-radius: 8px 8px 0 0; color: #ffffff;">
              <h2 style="margin: 0; font-size: 20px;">BloodWard — Donation Confirmed</h2>
            </div>
            <div style="padding: 24px; border: 1px solid #E2E8F0; border-top: none; border-radius: 0 0 8px 8px; background-color: #ffffff;">
              <p style="font-size: 15px; line-height: 1.5;">Dear <strong>${effectiveDonor.fullName || 'Hero'}</strong>,</p>
              <p style="font-size: 14px; line-height: 1.5; color: #15803D; font-weight: bold;">Your blood donation has been officially confirmed as completed.</p>
              <p style="font-size: 13px; line-height: 1.5; color: #475569;">Thank you for your generosity in providing emergency blood support for ${effectiveRequest?.bloodGroup || ''} at ${effectiveRequest?.hospitalName || 'hospital'}. Your contribution saves lives.</p>
              <div style="margin: 24px 0; text-align: center;">
                <a href="${CLIENT_BASE_URL}/donor/history" style="background-color: #A61B2B; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">View Donation History</a>
              </div>
            </div>
          </div>
        `;
        await safeSendEmail({
          to: effectiveDonor.email,
          subject: donorSubject,
          html: donorHtml,
          text: `BloodWard: Thank you for your life-saving blood donation at ${effectiveRequest?.hospitalName || 'hospital'}. View history: ${CLIENT_BASE_URL}/donor/history`,
          purpose: 'donation_completed_donor',
          metadata: { matchId: match._id.toString() },
        });
      }

      // Recipient Email
      if (effectiveRecipient?.email) {
        const recSubject = 'Your BloodWard blood request has been completed';
        const recHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1E293B;">
            <div style="background-color: #315B83; padding: 16px 24px; border-radius: 8px 8px 0 0; color: #ffffff;">
              <h2 style="margin: 0; font-size: 20px;">BloodWard — Request Completed</h2>
            </div>
            <div style="padding: 24px; border: 1px solid #E2E8F0; border-top: none; border-radius: 0 0 8px 8px; background-color: #ffffff;">
              <p style="font-size: 15px; line-height: 1.5;">Dear <strong>${effectiveRecipient.fullName || 'Recipient'}</strong>,</p>
              <p style="font-size: 14px; line-height: 1.5;">Your blood request for ${effectiveRequest?.bloodGroup || ''} at ${effectiveRequest?.hospitalName || 'hospital'} has been officially recorded as completed.</p>
              <div style="margin: 24px 0; text-align: center;">
                <a href="${CLIENT_BASE_URL}/recipient/requests" style="background-color: #315B83; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">View Completed Request</a>
              </div>
            </div>
          </div>
        `;
        await safeSendEmail({
          to: effectiveRecipient.email,
          subject: recSubject,
          html: recHtml,
          text: `BloodWard: Your blood request for ${effectiveRequest?.bloodGroup || ''} at ${effectiveRequest?.hospitalName || 'hospital'} is completed. View dashboard: ${CLIENT_BASE_URL}/recipient/requests`,
          purpose: 'donation_completed_recipient',
          metadata: { matchId: match._id.toString() },
        });
      }

      await Match.updateOne({ _id: match._id }, { $set: { completionEmailSent: true } });
    });
  }
}
