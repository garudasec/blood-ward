import BloodRequest from '../models/bloodRequest.js';
import User from '../models/user.model.js';
import AppError from '../utils/appError.js';
import { isValidBloodGroup, isValidGeoCoordinates } from '../utils/validators.js';
import { sanitizeBloodRequest } from '../utils/requestSanitizer.js';
import { logAuditEvent } from '../utils/auditLogger.js';

/**
 * Auto-expiration helper for requests whose requiredDate has passed
 */
const checkAndExpireRequest = async (request) => {
  if (!request || request.status !== 'Active') return request;
  if (request.requiredDate) {
    const reqDate = new Date(request.requiredDate);
    if (!Number.isNaN(reqDate.getTime()) && reqDate < new Date()) {
      request.status = 'Expired';
      await request.save({ validateBeforeSave: false });
      logAuditEvent({
        actor: null,
        actorName: 'System',
        action: 'EXPIRE_REQUEST',
        category: 'SYSTEM',
        target: request._id.toString(),
        details: `Request expired automatically as requiredDate ${request.requiredDate} passed.`,
      });
    }
  }
  return request;
};

/**
 * @desc    Create a new blood request
 * @route   POST /api/requests
 * @access  Private (Recipient only)
 */
export const createBloodRequest = async (req, res, next) => {
  try {
    const {
      bloodGroup,
      unitsNeeded,
      hospitalName,
      city,
      location,
      urgency = 'Normal',
      requiredDate,
      additionalNotes = '',
    } = req.body;

    if (!bloodGroup || !isValidBloodGroup(bloodGroup)) {
      return next(new AppError('A valid blood group is required.', 400));
    }

    const units = parseInt(unitsNeeded, 10);
    if (Number.isNaN(units) || units < 1) {
      return next(new AppError('Units needed must be an integer of at least 1.', 400));
    }

    if (!hospitalName || typeof hospitalName !== 'string' || hospitalName.trim().length === 0) {
      return next(new AppError('Hospital name is required.', 400));
    }

    if (!city || typeof city !== 'string' || city.trim().length === 0) {
      return next(new AppError('City is required.', 400));
    }

    const allowedUrgencies = ['Normal', 'High', 'Emergency'];
    if (!allowedUrgencies.includes(urgency)) {
      return next(new AppError('Urgency must be one of: Normal, High, Emergency.', 400));
    }

    if (!requiredDate || typeof requiredDate !== 'string') {
      return next(new AppError('Required date is required.', 400));
    }

    const parsedDate = new Date(requiredDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return next(new AppError('Required date must be a valid date string.', 400));
    }

    let parsedLocation = undefined;
    if (location && typeof location === 'object') {
      if (
        location.type === 'Point' &&
        Array.isArray(location.coordinates) &&
        location.coordinates.length === 2
      ) {
        const [lng, lat] = location.coordinates;
        if (!isValidGeoCoordinates(lng, lat)) {
          return next(new AppError('Invalid coordinates for request location.', 400));
        }
        parsedLocation = { type: 'Point', coordinates: [Number(lng), Number(lat)] };
      }
    }

    // Force server-side identity & initial status
    const newRequest = await BloodRequest.create({
      recipient: req.user._id,
      recipientName: req.user.fullName,
      bloodGroup,
      unitsNeeded: units,
      hospitalName: hospitalName.trim(),
      city: city.trim(),
      location: parsedLocation,
      urgency,
      status: 'Active',
      requiredDate: requiredDate.trim(),
      additionalNotes: typeof additionalNotes === 'string' ? additionalNotes.trim() : '',
    });

    logAuditEvent({
      actor: req.user._id,
      actorName: req.user.fullName,
      action: 'CREATE_BLOOD_REQUEST',
      category: 'RECIPIENT_ACTION',
      target: newRequest._id.toString(),
      ipAddress: req.ip,
      severity: urgency === 'Emergency' ? 'HIGH' : 'NORMAL',
      details: `Blood request created for ${units} unit(s) of ${bloodGroup} at ${hospitalName}, ${city}.`,
    });

    res.status(201).json({
      success: true,
      message: 'Blood request created successfully.',
      request: sanitizeBloodRequest(newRequest, req.user.role, req.user._id),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get requests created by authenticated recipient
 * @route   GET /api/requests/my
 * @access  Private (Recipient only)
 */
export const getMyRequests = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

    const query = { recipient: req.user._id };
    if (status && typeof status === 'string' && status.trim() !== '') {
      query.status = status.trim();
    }

    const total = await BloodRequest.countDocuments(query);
    const skip = (pageNum - 1) * limitNum;

    const requests = await BloodRequest.find(query)
      .populate('acceptedDonor', 'fullName phone bloodGroup city')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const sanitizedRequests = requests.map((reqDoc) =>
      sanitizeBloodRequest(reqDoc, req.user.role, req.user._id)
    );

    res.status(200).json({
      success: true,
      count: sanitizedRequests.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      requests: sanitizedRequests,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get available active blood requests for donors
 * @route   GET /api/requests/available
 * @access  Private (Donor only)
 */
export const getAvailableRequests = async (req, res, next) => {
  try {
    if (req.user.availability !== 'available' || req.user.isBlocked) {
      return next(new AppError('Only available, unblocked donors can view active requests.', 403));
    }

    const { bloodGroup, page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

    const query = { status: 'Active' };
    if (bloodGroup && typeof bloodGroup === 'string' && bloodGroup.trim() !== '') {
      if (isValidBloodGroup(bloodGroup.trim())) {
        query.bloodGroup = bloodGroup.trim();
      }
    }

    const activeRequests = await BloodRequest.find(query);
    for (const reqDoc of activeRequests) {
      await checkAndExpireRequest(reqDoc);
    }

    // Re-query after auto-expiration
    const total = await BloodRequest.countDocuments(query);
    const skip = (pageNum - 1) * limitNum;

    const requests = await BloodRequest.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const sanitizedRequests = requests.map((reqDoc) =>
      sanitizeBloodRequest(reqDoc, req.user.role, req.user._id)
    );

    res.status(200).json({
      success: true,
      count: sanitizedRequests.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      requests: sanitizedRequests,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get request details by ID (Ownership-aware)
 * @route   GET /api/requests/:id
 * @access  Private
 */
export const getRequestById = async (req, res, next) => {
  try {
    let bloodRequest = await BloodRequest.findById(req.params.id)
      .populate('recipient', 'fullName email phone')
      .populate('acceptedDonor', 'fullName phone bloodGroup city');

    if (!bloodRequest) {
      return next(new AppError('Blood request not found.', 404));
    }

    bloodRequest = await checkAndExpireRequest(bloodRequest);

    const isOwner = bloodRequest.recipient && bloodRequest.recipient._id.toString() === req.user._id.toString();
    const isAcceptedDonor = bloodRequest.acceptedDonor && bloodRequest.acceptedDonor._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isDonor = req.user.role === 'donor';

    if (req.user.role === 'recipient' && !isOwner) {
      return next(new AppError('You are not authorized to view another recipient\'s request.', 403));
    }

    if (isDonor && !isAcceptedDonor && bloodRequest.status !== 'Active') {
      return next(new AppError('You are not authorized to view details of this inactive request.', 403));
    }

    res.status(200).json({
      success: true,
      request: sanitizeBloodRequest(bloodRequest, req.user.role, req.user._id),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Donor accepts an active blood request (Concurrency-safe atomic transition)
 * @route   PATCH /api/requests/:id/accept
 * @access  Private (Donor only)
 */
export const acceptBloodRequest = async (req, res, next) => {
  try {
    if (req.user.availability !== 'available' || req.user.isBlocked) {
      return next(new AppError('Unavailable or blocked donors cannot accept requests.', 400));
    }

    const { id } = req.params;

    let targetRequest = await BloodRequest.findById(id);
    if (!targetRequest) {
      return next(new AppError('Blood request not found.', 404));
    }

    targetRequest = await checkAndExpireRequest(targetRequest);

    if (targetRequest.status !== 'Active') {
      return next(
        new AppError(
          'This blood request is no longer active or has already been accepted by another donor.',
          409
        )
      );
    }

    // Atomic conditional update to prevent race conditions
    const updatedRequest = await BloodRequest.findOneAndUpdate(
      { _id: id, status: 'Active' },
      {
        $set: { status: 'Donor Accepted', acceptedDonor: req.user._id },
        $inc: { donorResponsesCount: 1 },
      },
      { new: true }
    )
      .populate('recipient', 'fullName email phone')
      .populate('acceptedDonor', 'fullName phone bloodGroup city');

    if (!updatedRequest) {
      return next(
        new AppError(
          'This blood request was just accepted by another donor or is no longer active.',
          409
        )
      );
    }

    logAuditEvent({
      actor: req.user._id,
      actorName: req.user.fullName,
      action: 'ACCEPT_BLOOD_REQUEST',
      category: 'DONOR_ACTION',
      target: id,
      ipAddress: req.ip,
      severity: 'NORMAL',
      details: `Donor ${req.user.fullName} accepted blood request ${id}.`,
    });

    res.status(200).json({
      success: true,
      message: 'Blood request accepted successfully.',
      request: sanitizeBloodRequest(updatedRequest, req.user.role, req.user._id),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Donor declines an available request
 * @route   PATCH /api/requests/:id/reject
 * @access  Private (Donor only)
 */
export const rejectBloodRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    const bloodRequest = await BloodRequest.findById(id);
    if (!bloodRequest) {
      return next(new AppError('Blood request not found.', 404));
    }

    bloodRequest.donorResponsesCount += 1;
    await bloodRequest.save({ validateBeforeSave: false });

    logAuditEvent({
      actor: req.user._id,
      actorName: req.user.fullName,
      action: 'DECLINE_BLOOD_REQUEST',
      category: 'DONOR_ACTION',
      target: id,
      ipAddress: req.ip,
      severity: 'LOW',
    });

    res.status(200).json({
      success: true,
      message: 'Blood request declined successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Transition request from 'Donor Accepted' to 'In Progress'
 * @route   PATCH /api/requests/:id/in-progress
 * @access  Private (Accepted Donor or Admin)
 */
export const markInProgress = async (req, res, next) => {
  try {
    const { id } = req.params;

    const bloodRequest = await BloodRequest.findById(id);
    if (!bloodRequest) {
      return next(new AppError('Blood request not found.', 404));
    }

    const isAcceptedDonor = bloodRequest.acceptedDonor && bloodRequest.acceptedDonor.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isAcceptedDonor && !isAdmin) {
      return next(new AppError('Only the accepted donor or admin can mark a request in-progress.', 403));
    }

    if (bloodRequest.status !== 'Donor Accepted') {
      return next(new AppError('Request must be in "Donor Accepted" state to transition to In Progress.', 400));
    }

    bloodRequest.status = 'In Progress';
    await bloodRequest.save({ validateBeforeSave: false });

    logAuditEvent({
      actor: req.user._id,
      actorName: req.user.fullName,
      action: 'REQUEST_IN_PROGRESS',
      category: 'REQUEST_MGMT',
      target: id,
      ipAddress: req.ip,
      severity: 'NORMAL',
    });

    res.status(200).json({
      success: true,
      message: 'Blood request marked in-progress.',
      request: sanitizeBloodRequest(bloodRequest, req.user.role, req.user._id),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Fulfill request ('In Progress' -> 'Fulfilled')
 * @route   PATCH /api/requests/:id/fulfill
 * @access  Private (Accepted Donor, Recipient Owner, or Admin)
 */
export const fulfillBloodRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    const bloodRequest = await BloodRequest.findById(id);
    if (!bloodRequest) {
      return next(new AppError('Blood request not found.', 404));
    }

    const isOwner = bloodRequest.recipient && bloodRequest.recipient.toString() === req.user._id.toString();
    const isAcceptedDonor = bloodRequest.acceptedDonor && bloodRequest.acceptedDonor.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAcceptedDonor && !isAdmin) {
      return next(new AppError('Only the request owner, accepted donor, or admin can fulfill a request.', 403));
    }

    if (bloodRequest.status !== 'In Progress') {
      return next(new AppError('Request must be "In Progress" before it can be marked Fulfilled.', 400));
    }

    bloodRequest.status = 'Fulfilled';
    await bloodRequest.save({ validateBeforeSave: false });

    logAuditEvent({
      actor: req.user._id,
      actorName: req.user.fullName,
      action: 'FULFILL_BLOOD_REQUEST',
      category: 'REQUEST_MGMT',
      target: id,
      ipAddress: req.ip,
      severity: 'HIGH',
      details: `Blood request ${id} successfully fulfilled.`,
    });

    res.status(200).json({
      success: true,
      message: 'Blood request marked fulfilled successfully.',
      request: sanitizeBloodRequest(bloodRequest, req.user.role, req.user._id),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel request (Owner Recipient or Admin)
 * @route   PATCH /api/requests/:id/cancel
 * @access  Private (Recipient Owner or Admin)
 */
export const cancelBloodRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    const bloodRequest = await BloodRequest.findById(id);
    if (!bloodRequest) {
      return next(new AppError('Blood request not found.', 404));
    }

    const isOwner = bloodRequest.recipient && bloodRequest.recipient.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return next(new AppError('Only the request owner or admin can cancel this blood request.', 403));
    }

    const terminalStates = ['Fulfilled', 'Cancelled', 'Expired'];
    if (terminalStates.includes(bloodRequest.status)) {
      return next(new AppError(`Cannot cancel a blood request that is already in a terminal state (${bloodRequest.status}).`, 400));
    }

    bloodRequest.status = 'Cancelled';
    await bloodRequest.save({ validateBeforeSave: false });

    logAuditEvent({
      actor: req.user._id,
      actorName: req.user.fullName,
      action: 'CANCEL_BLOOD_REQUEST',
      category: 'REQUEST_MGMT',
      target: id,
      ipAddress: req.ip,
      severity: 'NORMAL',
    });

    res.status(200).json({
      success: true,
      message: 'Blood request cancelled successfully.',
      request: sanitizeBloodRequest(bloodRequest, req.user.role, req.user._id),
    });
  } catch (error) {
    next(error);
  }
};
