import InAppNotification from '../models/inAppNotification.model.js';
import User from '../models/user.model.js';
import { emitToUser } from '../socket.js';

/**
 * Dispatches an in-app notification to all active system administrators.
 * Ensures deduplication and real-time WebSocket delivery.
 *
 * @param {object} options
 * @param {string} options.type - Notification type
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message (sanitized, no sensitive PII)
 * @param {string} [options.link='/admin'] - Relative link to navigate to in admin dashboard
 * @param {string} [options.deduplicationKey] - Unique key to prevent duplicate notifications
 * @param {object} [options.metadata] - Non-sensitive metadata object
 * @returns {Promise<Array<object>>} - Created notification documents
 */
export async function notifyAdmins({
  type = 'system',
  title,
  message,
  link = '/admin',
  deduplicationKey,
  metadata = {},
}) {
  try {
    if (!title || !message) {
      return [];
    }

    const admins = await User.find({ role: 'admin', isBlocked: false }).select('_id');
    if (!admins || admins.length === 0) {
      return [];
    }

    const createdNotifications = [];

    for (const admin of admins) {
      if (deduplicationKey) {
        const exists = await InAppNotification.exists({
          user: admin._id,
          'metadata.deduplicationKey': deduplicationKey,
        });
        if (exists) {
          continue;
        }
      }

      const notificationDoc = await InAppNotification.create({
        user: admin._id,
        type,
        title,
        message,
        link,
        isOperationalMatchData: false,
        metadata: {
          ...metadata,
          ...(deduplicationKey ? { deduplicationKey } : {}),
        },
      });

      createdNotifications.push(notificationDoc);

      // Real-time WebSocket emission to admin's private room
      try {
        emitToUser(admin._id, 'notification:new', notificationDoc);
      } catch (socketErr) {
        console.warn(`[AdminNotificationService] Socket emission error for admin ${admin._id}:`, socketErr.message);
      }
    }

    return createdNotifications;
  } catch (error) {
    console.error('[AdminNotificationService] Error dispatching admin notifications:', error.message);
    return [];
  }
}

/**
 * Notify admins of a newly registered voluntary donor.
 */
export async function notifyAdminsOfNewDonor(donor) {
  if (!donor || !donor._id) return [];
  const group = donor.bloodGroup ? ` (${donor.bloodGroup})` : '';
  const loc = [donor.city, donor.state].filter(Boolean).join(', ');
  return notifyAdmins({
    type: 'new_donor',
    title: '👤 New Donor Registered',
    message: `A new voluntary donor${group} registered${loc ? ` from ${loc}` : ''}.`,
    link: '/admin/donors',
    deduplicationKey: `donor_reg_${donor._id.toString()}`,
    metadata: {
      donorId: donor._id.toString(),
      bloodGroup: donor.bloodGroup || null,
      city: donor.city || null,
      state: donor.state || null,
    },
  });
}

/**
 * Notify admins of a newly registered recipient or hospital representative.
 */
export async function notifyAdminsOfNewRecipient(recipient, isHospitalRep = false, hospitalName = '') {
  if (!recipient || !recipient._id) return [];

  if (isHospitalRep) {
    const hosp = hospitalName ? ` for ${hospitalName}` : '';
    const loc = recipient.city ? ` in ${recipient.city}` : '';
    return notifyAdmins({
      type: 'new_recipient',
      title: '🏥 Hospital Representative Registered',
      message: `A hospital representative registered${hosp}${loc} and is pending verification.`,
      link: '/admin/recipients',
      deduplicationKey: `recipient_rep_reg_${recipient._id.toString()}`,
      metadata: {
        recipientId: recipient._id.toString(),
        hospitalName: hospitalName || null,
        isHospitalRep: true,
      },
    });
  }

  const loc = [recipient.city, recipient.state].filter(Boolean).join(', ');
  return notifyAdmins({
    type: 'new_recipient',
    title: '👤 New Recipient Registered',
    message: `A new recipient registered${loc ? ` from ${loc}` : ''}.`,
    link: '/admin/recipients',
    deduplicationKey: `recipient_reg_${recipient._id.toString()}`,
    metadata: {
      recipientId: recipient._id.toString(),
      city: recipient.city || null,
      state: recipient.state || null,
      isHospitalRep: false,
    },
  });
}

/**
 * Notify admins of a newly created blood requisition.
 */
export async function notifyAdminsOfNewBloodRequest(bloodRequest) {
  if (!bloodRequest || !bloodRequest._id) return [];
  const units = bloodRequest.unitsNeeded || 1;
  const group = bloodRequest.bloodGroup || 'Blood';
  const urgency = bloodRequest.urgency || 'Normal';
  const hosp = bloodRequest.hospitalName ? ` at ${bloodRequest.hospitalName}` : '';
  const loc = bloodRequest.city ? `, ${bloodRequest.city}` : '';

  const isEmergency = urgency === 'Emergency';
  return notifyAdmins({
    type: 'new_request',
    title: isEmergency ? '🚨 Emergency Blood Requisition' : '🩸 New Blood Requisition Created',
    message: `A new request for ${units} unit(s) of ${group} [${urgency}] was submitted${hosp}${loc}.`,
    link: '/admin/requests',
    deduplicationKey: `request_created_${bloodRequest._id.toString()}`,
    metadata: {
      requestId: bloodRequest._id.toString(),
      bloodGroup: bloodRequest.bloodGroup,
      unitsNeeded: units,
      urgency,
      hospitalName: bloodRequest.hospitalName || null,
      city: bloodRequest.city || null,
    },
  });
}

/**
 * Notify admins of a newly filed complaint.
 */
export async function notifyAdminsOfNewComplaint(complaint) {
  if (!complaint || !complaint._id) return [];
  const cid = complaint.complaintId || complaint._id.toString();
  const cat = complaint.category || 'General';
  return notifyAdmins({
    type: 'new_complaint',
    title: '⚠️ New Complaint Filed',
    message: `Complaint ${cid} (${cat}) has been filed and requires administrative review.`,
    link: '/admin/complaints',
    deduplicationKey: `complaint_filed_${complaint._id.toString()}`,
    metadata: {
      complaintId: cid,
      category: complaint.category || null,
    },
  });
}

/**
 * Notify admins of an accepted match event.
 */
export async function notifyAdminsOfMatchAccepted(match, bloodRequest, donorUser) {
  if (!match || !match._id) return [];
  const group = bloodRequest?.bloodGroup || donorUser?.bloodGroup || '';
  const hosp = bloodRequest?.hospitalName ? ` for ${bloodRequest.hospitalName}` : '';
  const loc = bloodRequest?.city ? `, ${bloodRequest.city}` : '';

  return notifyAdmins({
    type: 'match_accepted',
    title: '🎉 Donor Match Accepted',
    message: `A voluntary donor accepted a blood request${group ? ` (${group})` : ''}${hosp}${loc}.`,
    link: '/admin/requests',
    deduplicationKey: `match_accepted_${match._id.toString()}`,
    metadata: {
      matchId: match._id.toString(),
      requestId: bloodRequest?._id?.toString() || null,
      bloodGroup: group || null,
    },
  });
}

/**
 * Notify admins of a completed blood donation.
 */
export async function notifyAdminsOfDonationCompleted(match, bloodRequest) {
  if (!match || !match._id) return [];
  const group = bloodRequest?.bloodGroup ? ` for ${bloodRequest.bloodGroup}` : '';
  const hosp = bloodRequest?.hospitalName ? ` at ${bloodRequest.hospitalName}` : '';
  const loc = bloodRequest?.city ? `, ${bloodRequest.city}` : '';

  return notifyAdmins({
    type: 'donation_completed',
    title: '🏆 Blood Donation Completed',
    message: `Blood donation completed successfully${group}${hosp}${loc}.`,
    link: '/admin/requests',
    deduplicationKey: `donation_completed_${match._id.toString()}`,
    metadata: {
      matchId: match._id.toString(),
      requestId: bloodRequest?._id?.toString() || null,
    },
  });
}
