import crypto from 'crypto';
import { getCompatibleRecipientBloodGroups, isBloodCompatible } from '../utils/bloodCompatibility.js';
import { DEFAULT_MATCHING_RADIUS_KM } from '../config/constants.js';
import BloodRequest from '../models/bloodRequest.js';
import User from '../models/user.model.js';
import Hospital from '../models/hospital.model.js';
import Patient from '../models/patient.model.js';
import AppError from '../utils/appError.js';
import { isValidBloodGroup, isValidGeoCoordinates, validateDonorDOB, normalizeIndianPhone } from '../utils/validators.js';
import { generatePatientId, generateHospitalId } from '../utils/idGenerator.js';
import { sanitizeBloodRequest } from '../utils/requestSanitizer.js';
import { logAuditEvent } from '../utils/auditLogger.js';
import { getCityCoordinates } from '../utils/cityCoordinates.js';
import { notifyMatchingDonors, emitToUser, emitToRole } from '../socket.js';
import Match from '../models/match.model.js';
import { notifyAdminsOfNewBloodRequest } from '../services/adminNotificationService.js';
import {
  notifyDonorAccepted,
  notifyDonorDeclined,
  notifyDonationCompleted,
} from '../services/matchNotificationService.js';

/**
 * Auto-expiration helper for requests whose requiredDate has passed
 */


export const ALLOWED_RADIUS_PRESETS = [5, 10, 20, 30, 50];

/**
 * Calculate default radius based on date horizon in Asia/Kolkata (IST):
 * - Today (diff <= 0): 20 km
 * - Tomorrow (diff === 1): 30 km
 * - 2+ days later (diff >= 2): 50 km
 */
export const calculateDefaultRadiusKm = (requiredDate) => {
  if (!requiredDate) return 20;

  const nowIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

  let targetYMD = '';
  const dateStr = String(requiredDate).trim();
  const ymdMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    targetYMD = `${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}`;
  } else {
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) return 20;
    targetYMD = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(parsed);
  }

  const nowDate = new Date(`${nowIST}T00:00:00+05:30`);
  const targetDate = new Date(`${targetYMD}T00:00:00+05:30`);
  const diffDays = Math.round((targetDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 20;
  if (diffDays === 1) return 30;
  return 50;
};

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
  if (!request.requiredDate) return request;

  let expiryTimestamp;
  const dateStr = String(request.requiredDate).trim();

  // If date is in YYYY-MM-DD format, set expiry to 23:59:59.999 in IST (+05:30)
  const ymdMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    expiryTimestamp = new Date(`${year}-${month}-${day}T23:59:59.999+05:30`).getTime();
  } else {
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) return request;
    // Set to end of that calendar day in IST
    const ymdInIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(parsed);
    expiryTimestamp = new Date(`${ymdInIST}T23:59:59.999+05:30`).getTime();
  }

  if (Date.now() > expiryTimestamp) {
    request.status = 'Expired';
    await request.save({ validateBeforeSave: false });

    const expPayload = { requestId: request._id.toString(), status: 'Expired' };
    if (request.recipient) emitToUser(request.recipient, 'bloodRequest:statusChanged', expPayload);
    emitToRole('donor', 'bloodRequest:expired', expPayload);
    emitToRole('donor', 'bloodRequest:unavailable', expPayload);
    emitToRole('donor', 'request:unavailable', expPayload);

    logAuditEvent({
      actor: null,
      actorName: 'System',
      action: 'EXPIRE_REQUEST',
      category: 'SYSTEM',
      target: request._id.toString(),
      details: `Request expired automatically after end of required date: ${dateStr}.`,
    });
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
      radiusKm,
      additionalNotes = '',
      patientName,
      patientContactPhone,
      patientAge,
      patientGender,
      hospitalRegistrationNumber,
      wardDepartment,
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

    let finalRadius = 20;
    if (radiusKm !== undefined && radiusKm !== null && radiusKm !== '') {
      const parsedRadius = Number(radiusKm);
      if (!ALLOWED_RADIUS_PRESETS.includes(parsedRadius)) {
        return next(new AppError('Radius must be one of the approved presets: 5, 10, 20, 30, or 50 KM.', 400));
      }
      finalRadius = parsedRadius;
    } else {
      finalRadius = calculateDefaultRadiusKm(requiredDate);
    }

    let normalizedRequiredDate = String(requiredDate).trim();
    const ymdMatch = normalizedRequiredDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymdMatch) {
      normalizedRequiredDate = `${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}`;
    } else {
      const parsed = new Date(normalizedRequiredDate);
      if (!Number.isNaN(parsed.getTime())) {
        normalizedRequiredDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(parsed);
      }
    }

    const isHospitalRep = recipient.accountType === 'hospital_rep';
    const isVerified = !isHospitalRep || recipient.verificationStatus === 'verified';
    const initialStatus = isVerified ? 'Active' : 'Pending Verification';

    let linkedHospital = null;
    let linkedPatient = null;
    let patientDetails = {};
    let generatedClaimCode = null;

    if (isHospitalRep) {
      const trimmedHosp = hospitalName.trim();
      const escapedHosp = trimmedHosp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escapedCity = targetCity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      linkedHospital = recipient.hospital
        ? await Hospital.findById(recipient.hospital)
        : await Hospital.findOne({
            name: { $regex: new RegExp(`^${escapedHosp}$`, 'i') },
            city: { $regex: new RegExp(`^${escapedCity}$`, 'i') },
          });

      if (!linkedHospital) {
        const hospitalId = await generateHospitalId();
        linkedHospital = await Hospital.create({
          hospitalId,
          name: trimmedHosp,
          address: recipient.hospitalAddress || '',
          city: targetCity,
          state: targetState,
          contactPhone: recipient.hospitalContactPhone || '',
          verificationStatus: recipient.verificationStatus === 'verified' ? 'verified' : 'pending',
        });
      }

      if (!recipient.hospital) {
        recipient.hospital = linkedHospital._id;
        await recipient.save({ validateBeforeSave: false });
      }

      const pName = patientName && typeof patientName === 'string' && patientName.trim()
        ? patientName.trim()
        : 'Patient';

      const patientId = await generatePatientId();
      generatedClaimCode = `BW-CLM-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const claimCodeHash = crypto.createHash('sha256').update(generatedClaimCode).digest('hex');
      const claimCodeExpires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      linkedPatient = await Patient.create({
        patientId,
        name: pName,
        contactPhone: patientContactPhone ? (normalizeIndianPhone(patientContactPhone) || patientContactPhone.trim()) : '',
        age: patientAge ? Number(patientAge) : null,
        gender: patientGender ? patientGender.trim() : '',
        bloodGroup,
        hospital: linkedHospital._id,
        hospitalRegistrationNumber: hospitalRegistrationNumber ? hospitalRegistrationNumber.trim() : '',
        wardDepartment: wardDepartment ? wardDepartment.trim() : '',
        claimCodeHash,
        claimCodeExpires,
        claimCodeUsed: false,
        createdByUser: req.user._id,
      });

      patientDetails = {
        patientId: linkedPatient.patientId,
        name: linkedPatient.name,
        contactPhone: linkedPatient.contactPhone,
        age: linkedPatient.age,
        gender: linkedPatient.gender,
        hospitalRegistrationNumber: linkedPatient.hospitalRegistrationNumber,
        wardDepartment: linkedPatient.wardDepartment,
      };
    } else {
      patientDetails = {
        patientId: '',
        name: patientName ? patientName.trim() : (recipient?.fullName || req.user.fullName || 'Recipient'),
        contactPhone: patientContactPhone ? (normalizeIndianPhone(patientContactPhone) || patientContactPhone.trim()) : (recipient?.phone || ''),
        age: patientAge ? Number(patientAge) : null,
        gender: patientGender ? patientGender.trim() : '',
        hospitalRegistrationNumber: '',
        wardDepartment: '',
      };
    }

    const newRequest = await BloodRequest.create({
      recipient: req.user._id || req.user.id,
      recipientName: isHospitalRep && patientDetails.name ? patientDetails.name : (recipient?.fullName || req.user.fullName || 'Recipient'),
      bloodGroup,
      unitsNeeded: units,
      hospitalName: hospitalName.trim(),
      city: targetCity,
      location: reqLocation,
      urgency,
      requiredDate: normalizedRequiredDate,
      radiusKm: finalRadius,
      notifiedDonors: [],
      additionalNotes: additionalNotes ? additionalNotes.trim() : '',
      status: initialStatus,
      hospital: linkedHospital ? linkedHospital._id : null,
      patient: linkedPatient ? linkedPatient._id : null,
      patientDetails,
    });

    logAuditEvent({
      actor: req.user._id || req.user.id,
      actorName: req.user.fullName,
      action: 'CREATE_BLOOD_REQUEST',
      category: 'RECIPIENT_ACTION',
      target: newRequest._id.toString(),
      ipAddress: req.ip,
      severity: urgency === 'Emergency' ? 'HIGH' : 'NORMAL',
      details: isVerified
        ? `Request created in Active status.`
        : `Request created in Pending Verification status (Hospital account awaiting admin approval).`,
    });

    const populatedRequest = await BloodRequest.findById(newRequest._id).populate(
      'recipient',
      'fullName email phone'
    );

    if (isVerified) {
      notifyMatchingDonors(populatedRequest);
    }

    notifyAdminsOfNewBloodRequest(populatedRequest || newRequest).catch((err) => {
      console.warn('[BloodRequestController] Admin notification error on blood request creation:', err.message);
    });

    res.status(201).json({
      success: true,
      message: isVerified
        ? 'Blood request created successfully.'
        : 'Blood request submitted and held in Pending Verification. Donor matching will begin once hospital account verification is approved.',
      request: sanitizeBloodRequest(newRequest, req.user.role, req.user._id || req.user.id),
      isPendingVerification: !isVerified,
      ...(generatedClaimCode ? { claimCode: generatedClaimCode, patientId: linkedPatient?.patientId } : {}),
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

    // Expire overdue active requests for this recipient
    const activeRequests = await BloodRequest.find({ recipient: req.user._id, status: 'Active' });
    for (const doc of activeRequests) {
      await checkAndExpireRequest(doc);
    }

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

    // Mandatory Date of Birth / adult age check for receiving donation requests
    if (!req.user.dateOfBirth) {
      return res.status(200).json({
        success: true,
        count: 0,
        total: 0,
        page: pageNum,
        totalPages: 1,
        requiresProfileCompletion: true,
        message: 'Please complete your date of birth in your profile before receiving donation requests.',
        requests: [],
      });
    }

    const ageValidation = validateDonorDOB(req.user.dateOfBirth);
    if (!ageValidation.isValid) {
      return res.status(200).json({
        success: true,
        count: 0,
        total: 0,
        page: pageNum,
        totalPages: 1,
        requiresProfileCompletion: true,
        message: ageValidation.message,
        requests: [],
      });
    }

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

      const reqRadius = reqDoc.radiusKm || DEFAULT_MATCHING_RADIUS_KM;
      if (isAnyDistance || (dist !== null && dist <= reqRadius && dist <= radiusKm)) {
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

    if (!req.user.dateOfBirth) {
      return next(new AppError('Please complete your date of birth in your profile before accepting donation requests.', 400));
    }

    const ageValidation = validateDonorDOB(req.user.dateOfBirth);
    if (!ageValidation.isValid) {
      return next(new AppError(ageValidation.message, 400));
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
    const maxAllowedKm = targetRequest.radiusKm || DEFAULT_MATCHING_RADIUS_KM;
    if (dist === null || dist > maxAllowedKm) {
      return res.status(400).json({
        success: false,
        code: 'DISTANCE_LIMIT_EXCEEDED',
        message: 'You are too far away to accept this request.',
        supportingText: `This blood request is outside your eligible service area. You must be within ${maxAllowedKm} KM of the request location to accept it.`,
        distanceKm: dist,
        maxAllowedKm,
      });
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

    const unavailPayload = { requestId: id, status: 'Donor Accepted' };
    emitToRole('donor', 'bloodRequest:unavailable', unavailPayload);
    emitToRole('donor', 'request:unavailable', unavailPayload);

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

    // Update or create persistent match record and notify
    try {
      let match = await Match.findOne({ request: id, donor: req.user._id });
      if (!match) {
        match = await Match.create({
          request: id,
          donor: req.user._id,
          recipient: updatedRequest.recipient?._id || updatedRequest.recipient,
          bloodGroup: updatedRequest.bloodGroup,
          hospitalName: updatedRequest.hospitalName,
          city: updatedRequest.city,
          state: updatedRequest.state || '',
          unitsNeeded: updatedRequest.unitsNeeded || 1,
          urgency: updatedRequest.urgency || 'Normal',
          status: 'Accepted',
          donorRespondedAt: new Date(),
        });
      }
      await notifyDonorAccepted(match._id, req.user, updatedRequest);
    } catch (matchErr) {
      console.error('[BloodRequestController] Error notifying donor acceptance on match:', matchErr.message);
    }

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
    const maxAllowedKm = bloodRequest.radiusKm || DEFAULT_MATCHING_RADIUS_KM;
    if (dist === null || dist > maxAllowedKm) {
      return next(new AppError(`You are outside the eligible ${maxAllowedKm} km radius to decline this blood request.`, 400));
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

    // Update or create persistent match record and notify decline
    try {
      let match = await Match.findOne({ request: id, donor: req.user._id });
      if (!match) {
        match = await Match.create({
          request: id,
          donor: req.user._id,
          recipient: bloodRequest.recipient?._id || bloodRequest.recipient,
          bloodGroup: bloodRequest.bloodGroup,
          hospitalName: bloodRequest.hospitalName,
          city: bloodRequest.city,
          state: bloodRequest.state || '',
          unitsNeeded: bloodRequest.unitsNeeded || 1,
          urgency: bloodRequest.urgency || 'Normal',
          status: 'Declined',
          donorRespondedAt: new Date(),
        });
      }
      await notifyDonorDeclined(match._id, req.user, bloodRequest);
    } catch (matchErr) {
      console.error('[BloodRequestController] Error notifying donor decline on match:', matchErr.message);
    }

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

    // Idempotent: if already Fulfilled, return 200 without duplicate processing
    if (bloodRequest.status === 'Fulfilled') {
      return res.status(200).json({
        success: true,
        message: 'Blood request is already fulfilled.',
        request: sanitizeBloodRequest(bloodRequest, req.user.role, req.user._id),
      });
    }

    if (bloodRequest.status !== 'In Progress') {
      return next(new AppError('Request must be "In Progress" before it can be marked Fulfilled.', 400));
    }

    // Atomic state transition to prevent race conditions during concurrent requests
    const updatedRequest = await BloodRequest.findOneAndUpdate(
      { _id: id, status: 'In Progress' },
      { $set: { status: 'Fulfilled' } },
      { new: true }
    );

    if (!updatedRequest) {
      // Concurrently updated by another request
      const current = await BloodRequest.findById(id);
      if (current && current.status === 'Fulfilled') {
        return res.status(200).json({
          success: true,
          message: 'Blood request is already fulfilled.',
          request: sanitizeBloodRequest(current, req.user.role, req.user._id),
        });
      }
      return next(new AppError('Request must be "In Progress" before it can be marked Fulfilled.', 400));
    }

    const fPayload = { requestId: id, status: 'Fulfilled' };
    if (updatedRequest.recipient) emitToUser(updatedRequest.recipient, 'bloodRequest:fulfilled', fPayload);
    if (updatedRequest.acceptedDonor) emitToUser(updatedRequest.acceptedDonor, 'bloodRequest:fulfilled', fPayload);
    emitToRole('donor', 'bloodRequest:fulfilled', fPayload);
    emitToRole('donor', 'bloodRequest:unavailable', fPayload);
    emitToRole('donor', 'request:unavailable', fPayload);
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

    // Mark donation completed in Match lifecycle and dispatch notifications
    try {
      const match = await Match.findOne({
        request: id,
        status: { $in: ['Accepted', 'Completed'] },
      });
      if (match) {
        const donorUser = await User.findById(updatedRequest.acceptedDonor);
        const recipientUser = await User.findById(updatedRequest.recipient);
        if (donorUser && recipientUser) {
          await notifyDonationCompleted(match._id, donorUser, recipientUser, updatedRequest);
        }
      }
    } catch (matchErr) {
      console.error('[BloodRequestController] Error completing match notification lifecycle:', matchErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Blood request marked fulfilled successfully.',
      request: sanitizeBloodRequest(updatedRequest, req.user.role, req.user._id),
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

    // Mark active matches as Cancelled and release donor active lock
    await Match.updateMany(
      { request: id, status: { $in: ['Potential Match', 'Awaiting Response', 'Accepted'] } },
      { $set: { status: 'Cancelled' } }
    );
    if (bloodRequest.acceptedDonor) {
      await User.updateOne(
        { _id: bloodRequest.acceptedDonor },
        { $set: { activeAcceptedMatch: null } }
      );
    }

    const cPayload = { requestId: id, status: 'Cancelled' };
    if (bloodRequest.recipient) emitToUser(bloodRequest.recipient, 'bloodRequest:cancelled', cPayload);
    if (bloodRequest.acceptedDonor) emitToUser(bloodRequest.acceptedDonor, 'bloodRequest:cancelled', cPayload);
    emitToRole('donor', 'bloodRequest:cancelled', cPayload);
    emitToRole('donor', 'bloodRequest:unavailable', cPayload);
    emitToRole('donor', 'request:unavailable', cPayload);
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

/**
 * @desc    Recipient expands search radius for an active blood request
 * @route   PATCH /api/requests/:id/expand-radius
 * @access  Private (Recipient only)
 */
export const expandBloodRequestRadius = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newRadiusKm } = req.body;

    const parsedRadius = Number(newRadiusKm);
    if (!ALLOWED_RADIUS_PRESETS.includes(parsedRadius)) {
      return next(new AppError('Invalid radius. Allowed presets: 5, 10, 20, 30, 50 KM.', 400));
    }

    const bloodRequest = await BloodRequest.findById(id);
    if (!bloodRequest) {
      return next(new AppError('Blood request not found.', 404));
    }

    const recipientId = bloodRequest.recipient?._id || bloodRequest.recipient;
    if (recipientId.toString() !== (req.user._id || req.user.id).toString()) {
      return next(new AppError('Only the owning recipient can expand the request radius.', 403));
    }

    if (bloodRequest.status !== 'Active' && bloodRequest.status !== 'Created') {
      return next(new AppError(`Cannot expand radius for request in '${bloodRequest.status}' status. Only active pending requests can be expanded.`, 400));
    }

    const currentRadius = bloodRequest.radiusKm || 20;
    if (parsedRadius <= currentRadius) {
      return next(new AppError(`New radius (${parsedRadius} KM) must be greater than current radius (${currentRadius} KM).`, 400));
    }

    const previousRadius = currentRadius;
    bloodRequest.radiusKm = parsedRadius;

    // Find and notify only newly eligible donors
    const newlyNotifiedCount = await notifyMatchingDonors(bloodRequest, true);

    await bloodRequest.save();

    logAuditEvent({
      actor: req.user._id || req.user.id,
      actorName: req.user.fullName,
      action: 'EXPAND_REQUEST_RADIUS',
      category: 'RECIPIENT_ACTION',
      target: id,
      ipAddress: req.ip,
      severity: 'NORMAL',
      details: `Recipient expanded request radius from ${previousRadius} KM to ${parsedRadius} KM. ${newlyNotifiedCount} new donor(s) notified.`,
    });

    const populated = await BloodRequest.findById(id)
      .populate('recipient', 'fullName email phone')
      .populate('acceptedDonor', 'fullName phone bloodGroup city');

    res.status(200).json({
      success: true,
      message: `Search radius expanded to ${parsedRadius} KM. ${newlyNotifiedCount} new donor(s) notified.`,
      request: sanitizeBloodRequest(populated, req.user.role, req.user._id || req.user.id),
      newlyNotifiedCount,
    });
  } catch (error) {
    next(error);
  }
};
