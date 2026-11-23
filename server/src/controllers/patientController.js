import crypto from 'crypto';
import Patient from '../models/patient.model.js';
import BloodRequest from '../models/bloodRequest.js';
import Hospital from '../models/hospital.model.js';
import AppError from '../utils/appError.js';
import { logAuditEvent } from '../utils/auditLogger.js';

/**
 * Sanitize patient details for authorized viewer
 */
const sanitizePatient = (doc, user = null) => {
  if (!doc) return null;
  const isClaimedByMe = user && doc.claimedByUser && doc.claimedByUser.toString() === user._id.toString();
  const isAdmin = user && user.role === 'admin';
  const isApprovedFamily = user && doc.familyAccess && doc.familyAccess.some(
    (fa) => fa.user && fa.user.toString() === user._id.toString() && fa.status === 'approved'
  );

  return {
    id: doc._id,
    patientId: doc.patientId,
    name: doc.name,
    contactPhone: (isClaimedByMe || isAdmin || isApprovedFamily) ? doc.contactPhone : '',
    age: doc.age,
    gender: doc.gender,
    bloodGroup: doc.bloodGroup,
    hospital: doc.hospital,
    hospitalRegistrationNumber: (isClaimedByMe || isAdmin || isApprovedFamily) ? doc.hospitalRegistrationNumber : '',
    wardDepartment: doc.wardDepartment,
    isClaimed: Boolean(doc.claimedByUser),
    claimedAt: doc.claimedAt,
    familyAccess: (isClaimedByMe || isAdmin) ? doc.familyAccess : undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

/**
 * @desc    Claim patient record using patientId and single-use claim code
 * @route   POST /api/patients/claim
 * @access  Private (Authenticated Recipient / Patient)
 */
export const claimPatientRecord = async (req, res, next) => {
  try {
    const { patientId, claimCode } = req.body;

    if (!patientId || typeof patientId !== 'string' || !patientId.trim()) {
      return next(new AppError('Patient ID is required.', 400));
    }

    if (!claimCode || typeof claimCode !== 'string' || !claimCode.trim()) {
      return next(new AppError('Claim code is required.', 400));
    }

    const normalizedPatientId = patientId.trim().toUpperCase();
    const normalizedClaimCode = claimCode.trim().toUpperCase();

    const patient = await Patient.findOne({ patientId: normalizedPatientId }).select('+claimCodeHash');
    if (!patient) {
      return next(new AppError('No patient record found matching this Patient ID.', 404));
    }

    if (patient.claimedByUser) {
      return next(new AppError('This patient record has already been claimed by a user account.', 409));
    }

    if (patient.claimCodeUsed) {
      return next(new AppError('This claim code has already been used and cannot be reused.', 400));
    }

    if (patient.claimCodeExpires && patient.claimCodeExpires < new Date()) {
      return next(new AppError('This claim code has expired. Please request a reissued code from the hospital coordinator.', 400));
    }

    const hashedInput = crypto.createHash('sha256').update(normalizedClaimCode).digest('hex');
    if (patient.claimCodeHash !== hashedInput) {
      return next(new AppError('Invalid claim code provided.', 400));
    }

    patient.claimedByUser = req.user._id;
    patient.claimedAt = new Date();
    patient.claimCodeUsed = true;
    patient.claimCodeHash = null;
    await patient.save();

    await logAuditEvent({
      actor: req.user._id,
      actorName: req.user.fullName,
      action: 'CLAIM_PATIENT_RECORD',
      category: 'RECIPIENT_ACTION',
      target: patient._id.toString(),
      ipAddress: req.ip,
      severity: 'NORMAL',
      details: `User ${req.user.fullName} (${req.user.email}) claimed patient record ${patient.patientId} (${patient.name}).`,
    });

    res.status(200).json({
      success: true,
      message: 'Patient record successfully claimed and linked to your account.',
      patient: sanitizePatient(patient, req.user),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reissue single-use claim code for a patient
 * @route   POST /api/patients/:id/reissue-claim-code
 * @access  Private (Authorized Hospital Representative or Admin)
 */
export const reissueClaimCode = async (req, res, next) => {
  try {
    const { id } = req.params;

    const patient = await Patient.findById(id).populate('hospital');
    if (!patient) {
      return next(new AppError('Patient record not found.', 404));
    }

    const isAdmin = req.user.role === 'admin';
    const isHospitalRep = req.user.accountType === 'hospital_rep' &&
      req.user.hospital &&
      patient.hospital &&
      (patient.hospital._id || patient.hospital).toString() === req.user.hospital.toString();

    if (!isAdmin && !isHospitalRep) {
      return next(new AppError('You are not authorized to reissue claim codes for this patient.', 403));
    }

    if (patient.claimedByUser) {
      return next(new AppError('This patient record is already claimed and does not require a claim code.', 400));
    }

    const newRawCode = `BW-CLM-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const newHash = crypto.createHash('sha256').update(newRawCode).digest('hex');
    const newExpiry = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    patient.claimCodeHash = newHash;
    patient.claimCodeExpires = newExpiry;
    patient.claimCodeUsed = false;
    await patient.save();

    await logAuditEvent({
      actor: req.user._id,
      actorName: req.user.fullName,
      action: 'REISSUE_PATIENT_CLAIM_CODE',
      category: isAdmin ? 'ADMIN_ACTION' : 'RECIPIENT_ACTION',
      target: patient._id.toString(),
      ipAddress: req.ip,
      severity: 'NORMAL',
      details: `New claim code reissued for patient ${patient.patientId} by ${req.user.fullName}.`,
    });

    res.status(200).json({
      success: true,
      message: 'New claim code generated successfully.',
      claimCode: newRawCode,
      expiresAt: newExpiry,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Request family access to a patient record
 * @route   POST /api/patients/:id/family-access
 * @access  Private (Authenticated User)
 */
export const requestFamilyAccess = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { relationship, notes } = req.body;

    if (!relationship || typeof relationship !== 'string' || !relationship.trim()) {
      return next(new AppError('Relationship to patient is required (e.g. Spouse, Parent, Child, Sibling).', 400));
    }

    const patient = await Patient.findById(id);
    if (!patient) {
      return next(new AppError('Patient record not found.', 404));
    }

    if (patient.claimedByUser && patient.claimedByUser.toString() === req.user._id.toString()) {
      return next(new AppError('You are already the primary account holder for this patient record.', 400));
    }

    const existingRequest = patient.familyAccess.find(
      (fa) => fa.user && fa.user.toString() === req.user._id.toString()
    );

    if (existingRequest) {
      if (existingRequest.status === 'approved') {
        return next(new AppError('You already have approved family access for this patient.', 400));
      }
      if (existingRequest.status === 'pending') {
        return next(new AppError('You already have a pending family access request for this patient.', 400));
      }
      // If previously rejected or revoked, allow re-requesting
      existingRequest.status = 'pending';
      existingRequest.relationship = relationship.trim();
      existingRequest.notes = notes ? notes.trim() : '';
      existingRequest.requestedAt = new Date();
      existingRequest.decisionAt = null;
      existingRequest.decisionBy = null;
    } else {
      patient.familyAccess.push({
        user: req.user._id,
        relationship: relationship.trim(),
        notes: notes ? notes.trim() : '',
        status: 'pending',
      });
    }

    await patient.save();

    await logAuditEvent({
      actor: req.user._id,
      actorName: req.user.fullName,
      action: 'REQUEST_FAMILY_ACCESS',
      category: 'RECIPIENT_ACTION',
      target: patient._id.toString(),
      ipAddress: req.ip,
      severity: 'NORMAL',
      details: `${req.user.fullName} requested family access (${relationship.trim()}) for patient ${patient.patientId}.`,
    });

    res.status(201).json({
      success: true,
      message: 'Family access request submitted. Awaiting patient or administrative authorization.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve, reject, or revoke family access
 * @route   PATCH /api/patients/:id/family-access/:accessId
 * @access  Private (Claimed Patient or Admin)
 */
export const updateFamilyAccess = async (req, res, next) => {
  try {
    const { id, accessId } = req.params;
    const { status, notes } = req.body;

    if (!['approved', 'rejected', 'revoked'].includes(status)) {
      return next(new AppError("Status must be 'approved', 'rejected', or 'revoked'.", 400));
    }

    const patient = await Patient.findById(id);
    if (!patient) {
      return next(new AppError('Patient record not found.', 404));
    }

    const isPatient = patient.claimedByUser && patient.claimedByUser.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isPatient && !isAdmin) {
      return next(new AppError('Only the patient or an administrator can authorize family access.', 403));
    }

    const accessItem = patient.familyAccess.id(accessId);
    if (!accessItem) {
      return next(new AppError('Family access request not found.', 404));
    }

    accessItem.status = status;
    accessItem.decisionAt = new Date();
    accessItem.decisionBy = req.user._id;
    if (notes && typeof notes === 'string') {
      accessItem.notes = notes.trim();
    }

    await patient.save();

    await logAuditEvent({
      actor: req.user._id,
      actorName: req.user.fullName,
      action: `FAMILY_ACCESS_${status.toUpperCase()}`,
      category: isAdmin ? 'ADMIN_ACTION' : 'RECIPIENT_ACTION',
      target: patient._id.toString(),
      ipAddress: req.ip,
      severity: 'HIGH',
      details: `Family access ${status} for user ${accessItem.user} on patient ${patient.patientId} by ${req.user.fullName}.`,
    });

    res.status(200).json({
      success: true,
      message: `Family access status updated to '${status}'.`,
      familyAccess: patient.familyAccess,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get patient records associated with current authenticated user
 * @route   GET /api/patients/me
 * @access  Private
 */
export const getMyPatients = async (req, res, next) => {
  try {
    const query = {
      $or: [
        { claimedByUser: req.user._id },
        { 'familyAccess.user': req.user._id, 'familyAccess.status': 'approved' },
      ],
    };

    if (req.user.accountType === 'hospital_rep' && req.user.hospital) {
      query.$or.push({ hospital: req.user.hospital });
    }

    const patients = await Patient.find(query).populate('hospital', 'hospitalId name city verificationStatus');

    const safePatients = patients.map((p) => sanitizePatient(p, req.user));

    res.status(200).json({
      success: true,
      count: safePatients.length,
      patients: safePatients,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get detailed patient record by ID (with authorization check)
 * @route   GET /api/patients/:id
 * @access  Private (Claimed Patient, Approved Family, Associated Hospital Rep, Admin)
 */
export const getPatientById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const patient = await Patient.findById(id).populate('hospital', 'hospitalId name city contactPhone');
    if (!patient) {
      return next(new AppError('Patient record not found.', 404));
    }

    const isPatient = patient.claimedByUser && patient.claimedByUser.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isApprovedFamily = patient.familyAccess.some(
      (fa) => fa.user && fa.user.toString() === req.user._id.toString() && fa.status === 'approved'
    );
    const isHospitalRep = req.user.accountType === 'hospital_rep' &&
      req.user.hospital &&
      patient.hospital &&
      (patient.hospital._id || patient.hospital).toString() === req.user.hospital.toString();

    if (!isPatient && !isAdmin && !isApprovedFamily && !isHospitalRep) {
      return next(new AppError('You are not authorized to view this patient record.', 403));
    }

    const associatedRequests = await BloodRequest.find({ patient: patient._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      patient: sanitizePatient(patient, req.user),
      requests: associatedRequests,
    });
  } catch (error) {
    next(error);
  }
};
