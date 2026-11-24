import Complaint from '../models/complaint.model.js';
import BloodRequest from '../models/bloodRequest.js';
import Patient from '../models/patient.model.js';
import Hospital from '../models/hospital.model.js';
import User from '../models/user.model.js';
import AppError from '../utils/appError.js';
import { logAuditEvent } from '../utils/auditLogger.js';
import { generateComplaintId } from '../utils/idGenerator.js';
import { notifyAdminsOfNewComplaint } from '../services/adminNotificationService.js';

const ALLOWED_CATEGORIES = [
  'Blood was not provided to the intended patient',
  'Hospital did not respond after donor acceptance',
  'Suspected diversion of donated blood',
  'Incorrect information was provided',
  'Other concern',
];

/**
 * @desc    Submit a patient or family misconduct complaint
 * @route   POST /api/complaints
 * @access  Private (Patient or Authorized Family Member)
 */
export const createComplaint = async (req, res, next) => {
  try {
    const {
      patientId,
      hospitalId,
      requestId,
      complainantType,
      familyRelationship,
      category,
      description,
      evidenceUrls,
    } = req.body;

    if (!complainantType || !['patient', 'family_member', 'donor'].includes(complainantType)) {
      return next(new AppError("Complainant type must be 'patient', 'family_member', or 'donor'.", 400));
    }

    if (!category || !ALLOWED_CATEGORIES.includes(category)) {
      return next(new AppError('Please select a valid complaint category.', 400));
    }

    if (!description || typeof description !== 'string' || description.trim().length < 20) {
      return next(new AppError('Complaint description must be at least 20 characters long.', 400));
    }

    if (description.trim().length > 2000) {
      return next(new AppError('Complaint description cannot exceed 2000 characters.', 400));
    }

    if (!requestId) {
      return next(new AppError('Blood request reference is required.', 400));
    }

    const bloodRequest = await BloodRequest.findById(requestId);
    if (!bloodRequest) {
      return next(new AppError('Referenced blood request not found.', 404));
    }

    // Resolve Patient document
    let patient = null;
    if (patientId) {
      patient = await Patient.findOne({
        $or: [
          { _id: patientId.match(/^[0-9a-fA-F]{24}$/) ? patientId : null },
          { patientId: patientId.trim().toUpperCase() },
        ],
      });
    } else if (bloodRequest.patient) {
      patient = await Patient.findById(bloodRequest.patient);
    }

    if (!patient) {
      return next(new AppError('Referenced patient record not found.', 404));
    }

    // Resolve Hospital document
    let hospital = null;
    if (hospitalId) {
      hospital = await Hospital.findOne({
        $or: [
          { _id: hospitalId.match(/^[0-9a-fA-F]{24}$/) ? hospitalId : null },
          { hospitalId: hospitalId.trim().toUpperCase() },
        ],
      });
    } else if (bloodRequest.hospital) {
      hospital = await Hospital.findById(bloodRequest.hospital);
    }

    if (!hospital) {
      return next(new AppError('Referenced hospital entity not found.', 404));
    }

    // Verify backend relationship consistency
    if (bloodRequest.patient && bloodRequest.patient.toString() !== patient._id.toString()) {
      return next(new AppError('The referenced blood request does not match the specified patient.', 400));
    }

    if (bloodRequest.hospital && bloodRequest.hospital.toString() !== hospital._id.toString()) {
      return next(new AppError('The referenced blood request does not match the specified hospital.', 400));
    }

    // Authorization checks
    const isAdmin = req.user.role === 'admin';
    const isDonor = req.user.role === 'donor';
    const isPatient = patient.claimedByUser && patient.claimedByUser.toString() === req.user._id.toString();
    const isApprovedFamily = patient.familyAccess && patient.familyAccess.some(
      (fa) => fa.user && fa.user.toString() === req.user._id.toString() && fa.status === 'approved'
    );

    if (!isAdmin) {
      if (complainantType === 'donor') {
        if (!isDonor) {
          return next(new AppError('Only registered donors can submit a complaint as a donor.', 403));
        }
        // Verify donor is associated with this blood request
        const isAssociatedDonor =
          (bloodRequest.acceptedDonor && bloodRequest.acceptedDonor.toString() === req.user._id.toString()) ||
          (bloodRequest.notifiedDonors && bloodRequest.notifiedDonors.some((d) => d.toString() === req.user._id.toString())) ||
          (bloodRequest.declinedDonors && bloodRequest.declinedDonors.some((d) => d.toString() === req.user._id.toString()));
        if (!isAssociatedDonor) {
          return next(new AppError('You are not associated with this blood request as a donor.', 403));
        }
      } else if (complainantType === 'patient' && !isPatient) {
        return next(new AppError('You are not authorized to submit a complaint as the primary patient for this record.', 403));
      } else if (complainantType === 'family_member' && !isApprovedFamily) {
        return next(new AppError('You must have approved family access for this patient record before submitting a complaint.', 403));
      }
    }

    // Prevent duplicate active complaint for the same blood request by the same user
    const existingActiveComplaint = await Complaint.findOne({
      bloodRequest: bloodRequest._id,
      complainant: req.user._id,
      status: { $in: ['Submitted', 'Under Review', 'Investigation'] },
    });

    if (existingActiveComplaint) {
      return next(new AppError('You already have an active complaint under review for this blood request.', 400));
    }

    const complaintId = await generateComplaintId();

    const newComplaint = await Complaint.create({
      complaintId,
      patient: patient._id,
      hospital: hospital._id,
      bloodRequest: bloodRequest._id,
      complainant: req.user._id,
      complainantType,
      familyRelationship: familyRelationship ? familyRelationship.trim() : '',
      category,
      description: description.trim(),
      evidenceUrls: Array.isArray(evidenceUrls) ? evidenceUrls.filter((u) => typeof u === 'string' && u.trim()) : [],
      status: 'Submitted',
    });

    await logAuditEvent({
      actor: req.user._id,
      actorName: req.user.fullName,
      action: 'SUBMIT_COMPLAINT',
      category: 'RECIPIENT_ACTION',
      target: newComplaint._id.toString(),
      ipAddress: req.ip,
      severity: 'HIGH',
      details: `Complaint ${complaintId} filed by ${req.user.fullName} (${complainantType}) against hospital ${hospital.name} for request ${bloodRequest._id}.`,
    });

    notifyAdminsOfNewComplaint(newComplaint).catch((err) => {
      console.warn('[ComplaintController] Admin notification error on complaint creation:', err.message);
    });

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully and logged for administrative investigation.',
      complaintId: newComplaint.complaintId,
      complaint: newComplaint,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit a public misconduct complaint (unauthenticated)
 * @route   POST /api/complaints/public
 * @access  Public
 */
export const createPublicComplaint = async (req, res, next) => {
  try {
    const { patientId, hospitalId, category, description, contactEmail } = req.body;

    // Validate presence and types
    if (!patientId || typeof patientId !== 'string' || !patientId.trim()) {
      return next(new AppError('Patient ID is required.', 400));
    }

    if (!hospitalId || typeof hospitalId !== 'string' || !hospitalId.trim()) {
      return next(new AppError('Hospital ID is required.', 400));
    }

    if (!description || typeof description !== 'string' || description.trim().length < 20) {
      return next(new AppError('Complaint description must be at least 20 characters long.', 400));
    }

    if (description.trim().length > 2000) {
      return next(new AppError('Complaint description cannot exceed 2000 characters.', 400));
    }

    if (category && !ALLOWED_CATEGORIES.includes(category)) {
      return next(new AppError('Please select a valid complaint category.', 400));
    }

    if (contactEmail && typeof contactEmail === 'string' && contactEmail.trim()) {
      const emailTrimmed = contactEmail.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
        return next(new AppError('Please provide a valid contact email address.', 400));
      }
    }

    // Sanitize and query identifiers
    const cleanPatientId = String(patientId).trim();
    const cleanHospitalId = String(hospitalId).trim();

    const patientQuery = cleanPatientId.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: cleanPatientId }
      : { patientId: cleanPatientId.toUpperCase() };

    const hospitalQuery = cleanHospitalId.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: cleanHospitalId }
      : { hospitalId: cleanHospitalId.toUpperCase() };

    const [patient, hospital] = await Promise.all([
      Patient.findOne(patientQuery),
      Hospital.findOne(hospitalQuery),
    ]);

    // Anti-enumeration security: return generic message if patient/hospital missing or mismatched
    const GENERIC_ERROR_MSG = 'Invalid Patient ID, Hospital ID, or hospital association. Please verify your identifiers.';

    if (!patient || !hospital) {
      return next(new AppError(GENERIC_ERROR_MSG, 400));
    }

    if (!patient.hospital || patient.hospital.toString() !== hospital._id.toString()) {
      return next(new AppError(GENERIC_ERROR_MSG, 400));
    }

    const complaintId = await generateComplaintId();

    const newComplaint = await Complaint.create({
      complaintId,
      patient: patient._id,
      hospital: hospital._id,
      bloodRequest: null,
      complainant: null,
      complainantType: 'public',
      contactEmail: contactEmail ? contactEmail.trim().toLowerCase() : '',
      category: category || 'Other concern',
      description: description.trim(),
      status: 'Pending',
    });

    await logAuditEvent({
      actor: null,
      actorName: contactEmail ? `Public User (${contactEmail.trim().toLowerCase()})` : 'Anonymous Public User',
      action: 'SUBMIT_PUBLIC_COMPLAINT',
      category: 'RECIPIENT_ACTION',
      target: newComplaint._id.toString(),
      ipAddress: req.ip,
      severity: 'NORMAL',
      details: `Public complaint ${complaintId} submitted against hospital ${hospital.name} for patient ${patient.patientId}.`,
    });

    notifyAdminsOfNewComplaint(newComplaint).catch((err) => {
      console.warn('[ComplaintController] Admin notification error on public complaint creation:', err.message);
    });

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully.',
      complaintReferenceId: newComplaint.complaintId,
      status: newComplaint.status,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get complaints submitted by the authenticated user
 * @route   GET /api/complaints/my
 * @access  Private
 */
export const getMyComplaints = async (req, res, next) => {
  try {
    const complaints = await Complaint.find({ complainant: req.user._id })
      .populate('patient', 'patientId name bloodGroup hospitalRegistrationNumber')
      .populate('hospital', 'hospitalId name city')
      .populate('bloodRequest', 'bloodGroup unitsNeeded status requiredDate hospitalName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: complaints.length,
      complaints,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get detailed complaint by ID
 * @route   GET /api/complaints/:id
 * @access  Private (Complainant or Admin)
 */
export const getComplaintById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const complaint = await Complaint.findById(id)
      .populate('patient', 'patientId name age gender bloodGroup hospitalRegistrationNumber wardDepartment')
      .populate('hospital', 'hospitalId name city address contactPhone verificationStatus')
      .populate({
        path: 'bloodRequest',
        populate: [
          { path: 'recipient', select: 'fullName email phone' },
          { path: 'acceptedDonor', select: 'fullName phone bloodGroup city' },
        ],
      })
      .populate('complainant', 'fullName email phone role')
      .populate('investigationNotes.addedBy', 'fullName email role');

    if (!complaint) {
      return next(new AppError('Complaint record not found.', 404));
    }

    const isComplainant = complaint.complainant && complaint.complainant._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isComplainant && !isAdmin) {
      return next(new AppError('You are not authorized to view this complaint.', 403));
    }

    res.status(200).json({
      success: true,
      complaint,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin: List complaints with search and filtering
 * @route   GET /api/admin/complaints
 * @access  Private (Admin only)
 */
export const getAdminComplaints = async (req, res, next) => {
  try {
    const { status, category, search, page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

    const query = {};

    if (status && ['Pending', 'Submitted', 'Under Review', 'Investigation', 'Resolved', 'Rejected'].includes(status)) {
      query.status = status;
    }

    if (category && ALLOWED_CATEGORIES.includes(category)) {
      query.category = category;
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const term = search.trim();
      query.$or = [
        { complaintId: { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } },
      ];
    }

    const total = await Complaint.countDocuments(query);
    const skip = (pageNum - 1) * limitNum;

    const complaints = await Complaint.find(query)
      .populate('patient', 'patientId name bloodGroup hospitalRegistrationNumber')
      .populate('hospital', 'hospitalId name city')
      .populate('bloodRequest', 'bloodGroup unitsNeeded status requiredDate hospitalName')
      .populate('complainant', 'fullName email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: complaints.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      complaints,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin: Update complaint status and add investigation note
 * @route   PATCH /api/admin/complaints/:id/status
 * @access  Private (Admin only)
 */
export const updateComplaintStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    if (!['Pending', 'Submitted', 'Under Review', 'Investigation'].includes(status)) {
      return next(new AppError("Status can only be transitioned to 'Pending', 'Submitted', 'Under Review', or 'Investigation' via this endpoint.", 400));
    }

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return next(new AppError('Complaint record not found.', 404));
    }

    const prevStatus = complaint.status;
    complaint.status = status;

    if (note && typeof note === 'string' && note.trim()) {
      complaint.investigationNotes.push({
        note: note.trim(),
        addedBy: req.user._id,
        addedAt: new Date(),
      });
    }

    await complaint.save();

    await logAuditEvent({
      actor: req.user._id,
      actorName: req.user.fullName,
      action: 'UPDATE_COMPLAINT_STATUS',
      category: 'ADMIN_ACTION',
      target: complaint._id.toString(),
      ipAddress: req.ip,
      severity: 'NORMAL',
      details: `Admin ${req.user.fullName} changed complaint ${complaint.complaintId} status from '${prevStatus}' to '${status}'.`,
    });

    res.status(200).json({
      success: true,
      message: `Complaint status updated to '${status}'.`,
      complaint,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin: Resolve or reject a complaint
 * @route   PATCH /api/admin/complaints/:id/resolve
 * @access  Private (Admin only)
 */
export const resolveComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, resolutionReason, note } = req.body;

    if (!['Resolved', 'Rejected'].includes(status)) {
      return next(new AppError("Resolution status must be 'Resolved' or 'Rejected'.", 400));
    }

    if (!resolutionReason || typeof resolutionReason !== 'string' || !resolutionReason.trim()) {
      return next(new AppError('A recorded resolution reason is required.', 400));
    }

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return next(new AppError('Complaint record not found.', 404));
    }

    complaint.status = status;
    complaint.resolutionReason = resolutionReason.trim();
    complaint.resolvedBy = req.user._id;
    complaint.resolvedAt = new Date();

    if (note && typeof note === 'string' && note.trim()) {
      complaint.investigationNotes.push({
        note: note.trim(),
        addedBy: req.user._id,
        addedAt: new Date(),
      });
    }

    await complaint.save();

    await logAuditEvent({
      actor: req.user._id,
      actorName: req.user.fullName,
      action: `COMPLAINT_${status.toUpperCase()}`,
      category: 'ADMIN_ACTION',
      target: complaint._id.toString(),
      ipAddress: req.ip,
      severity: 'HIGH',
      details: `Admin ${req.user.fullName} ${status.toLowerCase()} complaint ${complaint.complaintId}. Reason: ${resolutionReason.trim()}`,
    });

    res.status(200).json({
      success: true,
      message: `Complaint has been successfully ${status.toLowerCase()}.`,
      complaint,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Track public complaint status by reference ID
 * @route   GET /api/complaints/public/track/:complaintId
 * @access  Public (Rate limited)
 */
export const trackPublicComplaint = async (req, res, next) => {
  try {
    const { complaintId } = req.params;
    if (!complaintId || typeof complaintId !== 'string' || !complaintId.trim()) {
      return next(new AppError('Complaint Reference ID is required.', 400));
    }

    const cleanId = complaintId.trim().toUpperCase();
    const complaint = await Complaint.findOne({ complaintId: cleanId });

    if (!complaint) {
      return next(new AppError('No complaint found with this Reference ID. Please verify and try again.', 404));
    }

    // Privacy-preserving response: return status and lifecycle timestamps without exposing medical identifiers
    res.status(200).json({
      success: true,
      complaint: {
        complaintId: complaint.complaintId,
        status: complaint.status,
        category: complaint.category,
        createdAt: complaint.createdAt,
        updatedAt: complaint.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};
