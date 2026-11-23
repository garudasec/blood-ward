import Match from '../models/match.model.js';
import BloodRequest from '../models/bloodRequest.js';
import User from '../models/user.model.js';
import AppError from '../utils/appError.js';
import { notifyDonorAccepted, notifyDonorDeclined } from '../services/matchNotificationService.js';
import { logAuditEvent } from '../utils/auditLogger.js';

/**
 * @desc    Get matches for current authenticated user (Donor or Recipient)
 * @route   GET /api/matches/my-matches
 * @access  Private (Donor, Recipient, or Admin)
 */
export const getMyMatches = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;
    const { status, page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    let query = {};
    if (role === 'donor') {
      query.donor = userId;
    } else if (role === 'recipient') {
      query.recipient = userId;
    } else if (role === 'admin') {
      // Admin can view all
    } else {
      return next(new AppError('Unauthorized role for accessing matches.', 403));
    }

    if (status && typeof status === 'string' && status.trim()) {
      query.status = status.trim();
    }

    const total = await Match.countDocuments(query);
    const matches = await Match.find(query)
      .populate('request', 'hospitalName city state bloodGroup unitsNeeded urgency requiredDate status additionalNotes')
      .populate('donor', 'fullName bloodGroup availability city phone email')
      .populate('recipient', 'fullName city state')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Apply strict privacy controls based on role and match status
    const sanitizedMatches = matches.map((m) => {
      const matchObj = m.toObject();

      if (role === 'recipient') {
        // Privacy rule: Recipient can only see donor contact details AFTER donor has Accepted or Completed
        if (matchObj.status !== 'Accepted' && matchObj.status !== 'Completed') {
          if (matchObj.donor) {
            delete matchObj.donor.phone;
            delete matchObj.donor.email;
          }
        }
      } else if (role === 'donor') {
        // Donor never sees recipient phone/email in match object
        if (matchObj.recipient) {
          delete matchObj.recipient.phone;
          delete matchObj.recipient.email;
        }
      }

      return matchObj;
    });

    res.status(200).json({
      success: true,
      count: sanitizedMatches.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      matches: sanitizedMatches,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Donor accepts a match
 * @route   PATCH /api/matches/:id/accept
 * @access  Private (Donor only)
 */
export const acceptMatch = async (req, res, next) => {
  try {
    const { id } = req.params;

    const match = await Match.findById(id).populate('request');
    if (!match) {
      return next(new AppError('Match record not found.', 404));
    }

    // Verify donor ownership
    if (match.donor.toString() !== req.user._id.toString()) {
      return next(new AppError('You are not authorized to accept this match.', 403));
    }

    if (match.status === 'Accepted') {
      return res.status(200).json({
        success: true,
        message: 'Match is already accepted.',
        match,
      });
    }

    if (['Completed', 'Declined', 'Cancelled', 'Expired'].includes(match.status)) {
      return next(new AppError(`Cannot accept match with status: ${match.status}`, 400));
    }

    // Restriction: Prevent conflicting simultaneous active acceptances for the donor.
    // 1. Check existing active accepted matches in Match model
    const existingActiveMatch = await Match.findOne({
      donor: req.user._id,
      _id: { $ne: match._id },
      status: 'Accepted',
    }).populate('request');

    if (
      existingActiveMatch &&
      existingActiveMatch.request &&
      !['Fulfilled', 'Cancelled', 'Expired'].includes(existingActiveMatch.request.status)
    ) {
      return next(
        new AppError(
          'You already have an active accepted blood donation request. Please complete or conclude your current donation before accepting another request.',
          400
        )
      );
    }

    // 2. Clear any stale lock if previous active match was completed or cancelled
    const currentUser = await User.findById(req.user._id);
    if (currentUser?.activeAcceptedMatch && currentUser.activeAcceptedMatch.toString() !== match._id.toString()) {
      const lockMatch = await Match.findById(currentUser.activeAcceptedMatch).populate('request');
      if (
        !lockMatch ||
        lockMatch.status !== 'Accepted' ||
        !lockMatch.request ||
        ['Fulfilled', 'Cancelled', 'Expired'].includes(lockMatch.request.status)
      ) {
        await User.updateOne({ _id: req.user._id }, { $set: { activeAcceptedMatch: null } });
      }
    }

    // 3. Concurrency-safe atomic lock on donor user document to prevent simultaneous race conditions
    const lockedUser = await User.findOneAndUpdate(
      {
        _id: req.user._id,
        $or: [
          { activeAcceptedMatch: null },
          { activeAcceptedMatch: { $exists: false } },
          { activeAcceptedMatch: match._id }, // Idempotency
        ],
      },
      { $set: { activeAcceptedMatch: match._id } },
      { new: true }
    );

    if (!lockedUser) {
      return next(
        new AppError(
          'You already have an active accepted blood donation request. Please complete or conclude your current donation before accepting another request.',
          400
        )
      );
    }

    // Update match status
    match.status = 'Accepted';
    match.donorRespondedAt = new Date();
    await match.save();

    // Also update underlying blood request if Active
    const bloodRequest = await BloodRequest.findOneAndUpdate(
      { _id: match.request._id || match.request, status: 'Active' },
      {
        $set: { status: 'Donor Accepted', acceptedDonor: req.user._id },
        $inc: { donorResponsesCount: 1 },
      },
      { new: true }
    );

    await notifyDonorAccepted(match._id, req.user, bloodRequest || match.request);

    logAuditEvent({
      actor: req.user._id,
      actorName: req.user.fullName,
      action: 'ACCEPT_MATCH',
      category: 'DONOR_ACTION',
      target: match._id.toString(),
      ipAddress: req.ip,
      severity: 'NORMAL',
    });

    res.status(200).json({
      success: true,
      message: 'Match accepted successfully.',
      match,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Donor declines a match
 * @route   PATCH /api/matches/:id/decline
 * @access  Private (Donor only)
 */
export const declineMatch = async (req, res, next) => {
  try {
    const { id } = req.params;

    const match = await Match.findById(id).populate('request');
    if (!match) {
      return next(new AppError('Match record not found.', 404));
    }

    // Verify donor ownership
    if (match.donor.toString() !== req.user._id.toString()) {
      return next(new AppError('You are not authorized to decline this match.', 403));
    }

    if (match.status === 'Declined') {
      return res.status(200).json({
        success: true,
        message: 'Match is already declined.',
        match,
      });
    }

    if (['Completed', 'Accepted', 'Cancelled'].includes(match.status)) {
      return next(new AppError(`Cannot decline match with status: ${match.status}`, 400));
    }

    match.status = 'Declined';
    match.donorRespondedAt = new Date();
    await match.save();

    // Increment request donorResponsesCount
    await BloodRequest.updateOne(
      { _id: match.request._id || match.request },
      {
        $addToSet: { declinedDonors: req.user._id },
        $inc: { donorResponsesCount: 1 },
      }
    );

    await notifyDonorDeclined(match._id, req.user, match.request);

    logAuditEvent({
      actor: req.user._id,
      actorName: req.user.fullName,
      action: 'DECLINE_MATCH',
      category: 'DONOR_ACTION',
      target: match._id.toString(),
      ipAddress: req.ip,
      severity: 'LOW',
    });

    res.status(200).json({
      success: true,
      message: 'Match declined successfully.',
      match,
    });
  } catch (error) {
    next(error);
  }
};
