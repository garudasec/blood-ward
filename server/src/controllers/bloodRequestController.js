import { getCompatibleRecipientBloodGroups, isBloodCompatible } from '../utils/bloodCompatibility.js';
import { DEFAULT_MATCHING_RADIUS_KM } from '../config/constants.js';
import BloodRequest from '../models/bloodRequest.js';
import User from '../models/user.model.js';
import AppError from '../utils/appError.js';
import { isValidBloodGroup, isValidGeoCoordinates } from '../utils/validators.js';
import { sanitizeBloodRequest } from '../utils/requestSanitizer.js';
import { logAuditEvent } from '../utils/auditLogger.js';
import { getCityCoordinates } from '../utils/cityCoordinates.js';
import { notifyMatchingDonors, emitToUser } from '../socket.js';

/**
 * Auto-expiration helper for requests whose requiredDate has passed
 */


const calculateHaversineDistance = (coords1, coords2) => {
  if (!coords1 || !coords2 || coords1.length < 2 || coords2.length < 2) return null;
  const [lng1, lat1] = coords1;
  const [lng2, lat2] = coords2;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

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

    if (location) {
      if (!location.coordinates || !Array.isArray(location.coordinates) || !isValidGeoCoordinates(location.coordinates[0], location.coordinates[1])) {
        return next(new AppError('Invalid location coordinates provided. Longitude [-180, 180], Latitude [-90, 90].', 400));
      }
    }

    const recipient = await User.findById(req.user._id || req.user.id);
    if (!recipient) {
      return next(new AppError('Recipient profile not found.', 400));
    }

    const targetState = (recipient.state || '').trim();
    const targetCity = (recipient.city || '').trim();

    if (!targetState || !targetCity) {
      return next(new AppError('Recipient state and city are required in profile to create a blood request.', 400));
    }

    // Server-side authoritative location derivation from recipient State + City
    const cityCoords = getCityCoordinates(targetState, targetCity);
    if (!cityCoords) {
      return next(new AppError('Could not resolve location coordinates for recipient state and city.', 400));
    }

    const reqLocation = { type: 'Point', coordinates: [cityCoords.lng, cityCoords.lat] };

    const allowedUrgentLevels = ['Normal', 'High', 'Emergency'];
    if (!allowedUrgentLevels.includes(urgency)) {
      return next(new AppError('Urgency level must be Normal, High, or Emergency.', 400));
    }

    if (!requiredDate || typeof requiredDate !== 'string' || requiredDate.trim().length === 0) {
      return next(new AppError('Required date is required.', 400));
    }

    const newRequest = await BloodRequest.create({
      recipient: req.user._id || req.user.id,
      recipientName: recipient?.fullName || req.user.fullName || 'Recipient',
      bloodGroup,
      unitsNeeded: units,
      hospitalName: hospitalName.trim(),
      city: targetCity,
      location: reqLocation,
      urgency,
      requiredDate: new Date(requiredDate),
      additionalNotes: additionalNotes ? additionalNotes.trim() : '',
      status: 'Active',
    });

    logAuditEvent({
      actor: req.user._id || req.user.id,
      actorName: req.user.fullName,
      action: 'CREATE_BLOOD_REQUEST',
      category: 'RECIPIENT_ACTION',
      target: newRequest._id.toString(),
      ipAddress: req.ip,
      severity: urgency === 'Emergency' ? 'HIGH' : 'NORMAL',
    });

    const populatedRequest = await BloodRequest.findById(newRequest._id).populate(
      'recipient',
      'fullName email phone'
    );

    notifyMatchingDonors(populatedRequest);

    res.status(201).json({
      success: true,
      message: 'Blood request created successfully.',
      request: sanitizeBloodRequest(newRequest, req.user.role, req.user._id || req.user.id),
    });
  } catch (error) {
    next(error);
  }
};

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

    const { bloodGroup, radius = '20', page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

    // Auto-expire overdue requests
    const activeDocs = await BloodRequest.find({ status: 'Active' });
    for (const doc of activeDocs) {
      await checkAndExpireRequest(doc);
    }

    const matchCriteria = { status: 'Active' };
    const donorBloodGroup = (bloodGroup && typeof bloodGroup === 'string' && isValidBloodGroup(bloodGroup.trim()))
      ? bloodGroup.trim()
      : req.user.bloodGroup;

    const compatibleGroups = getCompatibleRecipientBloodGroups(donorBloodGroup);
    if (compatibleGroups && compatibleGroups.length > 0) {
      matchCriteria.bloodGroup = { $in: compatibleGroups };
    } else {
      matchCriteria.bloodGroup = { $in: [] };
    }

    // Get donor location
    let donorCoords = req.user.location?.coordinates;
    if (!donorCoords && req.user.state && req.user.city) {
      const cityCoords = getCityCoordinates(req.user.state, req.user.city);
      if (cityCoords) {
        donorCoords = [cityCoords.lng, cityCoords.lat];
      }
    }

    const isAnyDistance = radius === 'any' || radius === '9999' || radius === 9999;
    const radiusKm = isAnyDistance ? Infinity : (Number(radius) || DEFAULT_MATCHING_RADIUS_KM);

    const skip = (pageNum - 1) * limitNum;

    // CRITICAL: If radius is numeric and donor has NO coordinates, exclude location-dependent requests
    if (!isAnyDistance && !donorCoords) {
      return res.status(200).json({
        success: true,
        count: 0,
        total: 0,
        page: pageNum,
        totalPages: 1,
        requests: [],
      });
    }

    const allMatching = await BloodRequest.find(matchCriteria).sort({ createdAt: -1 });

    const requestsWithDistance = [];
    for (const reqDoc of allMatching) {
      const sanitized = sanitizeBloodRequest(reqDoc, req.user.role, req.user._id);

      let reqCoords = reqDoc.location?.coordinates;
      if (!reqCoords && reqDoc.city) {
        const cityCoords = getCityCoordinates('', reqDoc.city);
        if (cityCoords) reqCoords = [cityCoords.lng, cityCoords.lat];
      }

      // CRITICAL: If radius is numeric and request has NO coordinates, exclude request
      if (!isAnyDistance && !reqCoords) {
        continue;
      }

      let dist = null;
      if (donorCoords && reqCoords) {
        dist = calculateHaversineDistance(donorCoords, reqCoords);
      }

      if (isAnyDistance || (dist !== null && dist <= radiusKm)) {
        requestsWithDistance.push({ ...sanitized, distanceKm: dist });
      }
    }

    const totalDocs = requestsWithDistance.length;
    const paginatedRequests = requestsWithDistance.slice(skip, skip + limitNum);
    const totalPages = Math.ceil(totalDocs / limitNum) || 1;

    res.status(200).json({
      success: true,
      count: paginatedRequests.length,
      total: totalDocs,
      page: pageNum,
      totalPages,
      requests: paginatedRequests,
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
      return next(new AppError('Unavailable or blocked donors cannot accept requests.', 403));
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

    // Verify donor blood group compatibility
    if (!isBloodCompatible(req.user.bloodGroup, targetRequest.bloodGroup)) {
      return next(new AppError('Your blood group is not compatible with this request.', 400));
    }

    // Verify geographic eligibility
    let donorCoords = req.user.location?.coordinates;
    if (!donorCoords && req.user.state && req.user.city) {
      const cityCoords = getCityCoordinates(req.user.state, req.user.city);
      if (cityCoords) donorCoords = [cityCoords.lng, cityCoords.lat];
    }

    let reqCoords = targetRequest.location?.coordinates;
    if (!reqCoords && targetRequest.city) {
      const cityCoords = getCityCoordinates('', targetRequest.city);
      if (cityCoords) reqCoords = [cityCoords.lng, cityCoords.lat];
    }

    if (!donorCoords || !reqCoords) {
      return next(new AppError('Geographic location coordinates missing. Cannot verify donor eligibility.', 400));
    }

    const dist = calculateHaversineDistance(donorCoords, reqCoords);
    if (dist === null || dist > DEFAULT_MATCHING_RADIUS_KM) {
      return next(new AppError(`You are outside the eligible ${DEFAULT_MATCHING_RADIUS_KM} km radius for this blood request.`, 400));
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

    if (updatedRequest.recipient) {
      const recId = updatedRequest.recipient._id || updatedRequest.recipient;
      emitToUser(recId, 'bloodRequest:accepted', sanitizeBloodRequest(updatedRequest, 'recipient', recId));
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
    if (req.user.availability !== 'available' || req.user.isBlocked) {
      return next(new AppError('Unavailable or blocked donors cannot reject requests.', 400));
    }

    const { id } = req.params;

    let bloodRequest = await BloodRequest.findById(id);
    if (!bloodRequest) {
      return next(new AppError('Blood request not found.', 404));
    }

    bloodRequest = await checkAndExpireRequest(bloodRequest);

    if (bloodRequest.status !== 'Active') {
      return next(new AppError('This blood request is no longer active.', 400));
    }

    // Verify blood group compatibility
    if (!isBloodCompatible(req.user.bloodGroup, bloodRequest.bloodGroup)) {
      return next(new AppError('You are not eligible to decline this blood request.', 400));
    }

    // Verify geographic eligibility
    let donorCoords = req.user.location?.coordinates;
    if (!donorCoords && req.user.state && req.user.city) {
      const cityCoords = getCityCoordinates(req.user.state, req.user.city);
      if (cityCoords) donorCoords = [cityCoords.lng, cityCoords.lat];
    }

    let reqCoords = bloodRequest.location?.coordinates;
    if (!reqCoords && bloodRequest.city) {
      const cityCoords = getCityCoordinates('', bloodRequest.city);
      if (cityCoords) reqCoords = [cityCoords.lng, cityCoords.lat];
    }

    if (!donorCoords || !reqCoords) {
      return next(new AppError('Geographic location coordinates missing. Cannot verify donor eligibility.', 400));
    }

    const dist = calculateHaversineDistance(donorCoords, reqCoords);
    if (dist === null || dist > DEFAULT_MATCHING_RADIUS_KM) {
      return next(new AppError(`You are outside the eligible ${DEFAULT_MATCHING_RADIUS_KM} km radius to decline this blood request.`, 400));
    }

    if (!bloodRequest.declinedDonors) {
      bloodRequest.declinedDonors = [];
    }
    if (!bloodRequest.declinedDonors.some(dId => dId.toString() === req.user._id.toString())) {
      bloodRequest.declinedDonors.push(req.user._id);
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

    const isOwner = bloodRequest.recipient && bloodRequest.recipient.toString() === req.user._id.toString();
    const isAcceptedDonor = bloodRequest.acceptedDonor && bloodRequest.acceptedDonor.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAcceptedDonor && !isAdmin) {
      return next(new AppError('Only the request owner, accepted donor, or admin can mark a request in-progress.', 403));
    }

    if (bloodRequest.status !== 'Donor Accepted') {
      return next(new AppError('Request must be in "Donor Accepted" state to transition to In Progress.', 400));
    }

    bloodRequest.status = 'In Progress';
    await bloodRequest.save({ validateBeforeSave: false });

    const pPayload = { requestId: id, status: 'In Progress' }; if (bloodRequest.recipient) emitToUser(bloodRequest.recipient, 'bloodRequest:statusChanged', pPayload); if (bloodRequest.acceptedDonor) emitToUser(bloodRequest.acceptedDonor, 'bloodRequest:statusChanged', pPayload);
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

    const fPayload = { requestId: id, status: 'Fulfilled' }; if (bloodRequest.recipient) emitToUser(bloodRequest.recipient, 'bloodRequest:fulfilled', fPayload); if (bloodRequest.acceptedDonor) emitToUser(bloodRequest.acceptedDonor, 'bloodRequest:fulfilled', fPayload);
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

    const cPayload = { requestId: id, status: 'Cancelled' }; if (bloodRequest.recipient) emitToUser(bloodRequest.recipient, 'bloodRequest:cancelled', cPayload); if (bloodRequest.acceptedDonor) emitToUser(bloodRequest.acceptedDonor, 'bloodRequest:cancelled', cPayload);
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


/**
 * @desc    Get donation history for authenticated donor
 * @route   GET /api/requests/donor/history
 * @access  Private (Donor only)
 */
export const getDonorHistory = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

    const query = {
      $or: [
        { acceptedDonor: req.user._id },
        { declinedDonors: req.user._id },
      ],
    };

    const allRequests = await BloodRequest.find(query)
      .populate('recipient', 'fullName city')
      .populate('acceptedDonor', 'fullName phone bloodGroup city')
      .sort({ updatedAt: -1 });

    const historyItems = allRequests.map((reqDoc) => {
      const isAccepted = reqDoc.acceptedDonor && (reqDoc.acceptedDonor._id || reqDoc.acceptedDonor).toString() === req.user._id.toString();
      const isDeclined = reqDoc.declinedDonors && reqDoc.declinedDonors.some((dId) => dId.toString() === req.user._id.toString());

      let historyStatus = reqDoc.status;
      if (isDeclined && !isAccepted) {
        historyStatus = 'Declined';
      }

      const sanitized = sanitizeBloodRequest(reqDoc, req.user.role, req.user._id);
      return {
        ...sanitized,
        status: historyStatus,
      };
    });

    let filteredItems = historyItems;
    if (status && status !== 'ALL') {
      if (status === 'Declined') {
        filteredItems = historyItems.filter((i) => i.status === 'Declined');
      } else if (status === 'Accepted') {
        filteredItems = historyItems.filter((i) => i.status === 'Donor Accepted' || i.status === 'In Progress');
      } else if (status === 'Fulfilled' || status === 'Completed') {
        filteredItems = historyItems.filter((i) => i.status === 'Fulfilled');
      } else if (status === 'Cancelled') {
        filteredItems = historyItems.filter((i) => i.status === 'Cancelled');
      }
    }

    const totalDocs = filteredItems.length;
    const skip = (pageNum - 1) * limitNum;
    const paginatedItems = filteredItems.slice(skip, skip + limitNum);

    res.status(200).json({
      success: true,
      count: paginatedItems.length,
      total: totalDocs,
      page: pageNum,
      totalPages: Math.ceil(totalDocs / limitNum) || 1,
      requests: paginatedItems,
    });
  } catch (error) {
    next(error);
  }
};
