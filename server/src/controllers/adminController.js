import User from '../models/user.model.js';
import BloodRequest from '../models/bloodRequest.js';
import AuditLog from '../models/auditLog.js';
import AppError from '../utils/appError.js';
import { logAuditEvent } from '../utils/auditLogger.js';
import { sanitizeBloodRequest } from '../utils/requestSanitizer.js';

/**
 * @desc    Get system-wide aggregate dashboard metrics
 * @route   GET /api/admin/dashboard
 * @access  Private (Admin only)
 */
export const getAdminDashboard = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalDonors,
      totalRecipients,
      availableDonors,
      blockedUsers,
      totalRequests,
      activeRequests,
      donorAcceptedRequests,
      inProgressRequests,
      fulfilledRequests,
      cancelledRequests,
      emergencyRequests,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'donor' }),
      User.countDocuments({ role: 'recipient' }),
      User.countDocuments({ role: 'donor', availability: 'available', isBlocked: false }),
      User.countDocuments({ isBlocked: true }),
      BloodRequest.countDocuments(),
      BloodRequest.countDocuments({ status: 'Active' }),
      BloodRequest.countDocuments({ status: 'Donor Accepted' }),
      BloodRequest.countDocuments({ status: 'In Progress' }),
      BloodRequest.countDocuments({ status: 'Fulfilled' }),
      BloodRequest.countDocuments({ status: 'Cancelled' }),
      BloodRequest.countDocuments({ urgency: 'Emergency', status: { $in: ['Active', 'Donor Accepted', 'In Progress'] } }),
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalDonors,
        totalRecipients,
        availableDonors,
        blockedUsers,
        totalRequests,
        activeRequests,
        donorAcceptedRequests,
        inProgressRequests,
        fulfilledRequests,
        cancelledRequests,
        emergencyRequests,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get paginated user list with filters for admin management
 * @route   GET /api/admin/users
 * @access  Private (Admin only)
 */
export const getAdminUsers = async (req, res, next) => {
  try {
    const { role, isBlocked, search, page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

    const query = {};

    if (role && ['admin', 'donor', 'recipient'].includes(role)) {
      query.role = role;
    }

    if (isBlocked !== undefined && isBlocked !== '') {
      query.isBlocked = isBlocked === 'true' || isBlocked === true;
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const term = search.trim();
      query.$or = [
        { fullName: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
        { phone: { $regex: term, $options: 'i' } },
        { city: { $regex: term, $options: 'i' } },
      ];
    }

    const total = await User.countDocuments(query);
    const skip = (pageNum - 1) * limitNum;

    const users = await User.find(query)
      .select('-password -__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const safeUsers = users.map((u) => ({
      id: u._id,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      role: u.role,
      bloodGroup: u.bloodGroup || null,
      availability: u.availability || 'not_available',
      city: u.city || '',
      pincode: u.pincode || '',
      isBlocked: u.isBlocked || false,
      lastActiveAt: u.lastActiveAt,
      createdAt: u.createdAt,
    }));

    res.status(200).json({
      success: true,
      count: safeUsers.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      users: safeUsers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user details by ID for administrative inspection
 * @route   GET /api/admin/users/:id
 * @access  Private (Admin only)
 */
export const getAdminUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password -__v');
    if (!user) {
      return next(new AppError('User account not found.', 404));
    }

    const safeUser = {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      bloodGroup: user.bloodGroup || null,
      availability: user.availability || 'not_available',
      city: user.city || '',
      pincode: user.pincode || '',
      location: user.location || null,
      isBlocked: user.isBlocked || false,
      lastActiveAt: user.lastActiveAt,
      createdAt: user.createdAt,
    };

    res.status(200).json({
      success: true,
      user: safeUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Block a user account (Admin only with self-block protection)
 * @route   PATCH /api/admin/users/:id/block
 * @access  Private (Admin only)
 */
export const blockUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === req.user._id.toString()) {
      return next(new AppError('Administrators cannot block their own account.', 400));
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return next(new AppError('User account not found.', 404));
    }

    targetUser.isBlocked = true;
    await targetUser.save({ validateBeforeSave: false });

    logAuditEvent({
      actor: req.user._id,
      actorName: req.user.fullName,
      action: 'BLOCK_USER',
      category: 'ADMIN_ACTION',
      target: id,
      ipAddress: req.ip,
      severity: 'HIGH',
      details: `Admin ${req.user.fullName} blocked user ${targetUser.email} (${targetUser.role}).`,
    });

    res.status(200).json({
      success: true,
      message: `User ${targetUser.fullName} has been blocked successfully.`,
      user: {
        id: targetUser._id,
        email: targetUser.email,
        isBlocked: targetUser.isBlocked,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Unblock a user account
 * @route   PATCH /api/admin/users/:id/unblock
 * @access  Private (Admin only)
 */
export const unblockUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return next(new AppError('User account not found.', 404));
    }

    targetUser.isBlocked = false;
    await targetUser.save({ validateBeforeSave: false });

    logAuditEvent({
      actor: req.user._id,
      actorName: req.user.fullName,
      action: 'UNBLOCK_USER',
      category: 'ADMIN_ACTION',
      target: id,
      ipAddress: req.ip,
      severity: 'NORMAL',
      details: `Admin ${req.user.fullName} unblocked user ${targetUser.email}.`,
    });

    res.status(200).json({
      success: true,
      message: `User ${targetUser.fullName} has been unblocked successfully.`,
      user: {
        id: targetUser._id,
        email: targetUser.email,
        isBlocked: targetUser.isBlocked,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Safe account removal/deactivation
 * @route   DELETE /api/admin/users/:id
 * @access  Private (Admin only)
 */
export const deactivateUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === req.user._id.toString()) {
      return next(new AppError('Administrators cannot delete or deactivate their own account.', 400));
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return next(new AppError('User account not found.', 404));
    }

    targetUser.isBlocked = true;
    await targetUser.save({ validateBeforeSave: false });

    logAuditEvent({
      actor: req.user._id,
      actorName: req.user.fullName,
      action: 'DEACTIVATE_USER',
      category: 'ADMIN_ACTION',
      target: id,
      ipAddress: req.ip,
      severity: 'HIGH',
      details: `Admin ${req.user.fullName} deactivated account ${targetUser.email}.`,
    });

    res.status(200).json({
      success: true,
      message: `User account ${targetUser.email} has been deactivated successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all blood requests with filters for admin
 * @route   GET /api/admin/requests
 * @access  Private (Admin only)
 */
export const getAdminRequests = async (req, res, next) => {
  try {
    const { status, urgency, bloodGroup, city, page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

    const query = {};

    if (status && typeof status === 'string' && status.trim() !== '') {
      query.status = status.trim();
    }
    if (urgency && ['Normal', 'High', 'Emergency'].includes(urgency)) {
      query.urgency = urgency;
    }
    if (bloodGroup && typeof bloodGroup === 'string' && bloodGroup.trim() !== '') {
      query.bloodGroup = bloodGroup.trim();
    }
    if (city && typeof city === 'string' && city.trim() !== '') {
      query.city = { $regex: city.trim(), $options: 'i' };
    }

    const total = await BloodRequest.countDocuments(query);
    const skip = (pageNum - 1) * limitNum;

    const requests = await BloodRequest.find(query)
      .populate('recipient', 'fullName email phone')
      .populate('acceptedDonor', 'fullName phone bloodGroup city')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const sanitizedRequests = requests.map((r) => sanitizeBloodRequest(r, 'admin', req.user._id));

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
 * @desc    Get request details for admin
 * @route   GET /api/admin/requests/:id
 * @access  Private (Admin only)
 */
export const getAdminRequestById = async (req, res, next) => {
  try {
    const request = await BloodRequest.findById(req.params.id)
      .populate('recipient', 'fullName email phone')
      .populate('acceptedDonor', 'fullName email phone bloodGroup city');

    if (!request) {
      return next(new AppError('Blood request not found.', 404));
    }

    res.status(200).json({
      success: true,
      request: sanitizeBloodRequest(request, 'admin', req.user._id),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin cancel blood request
 * @route   PATCH /api/admin/requests/:id/cancel
 * @access  Private (Admin only)
 */
export const cancelAdminRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    const bloodRequest = await BloodRequest.findById(id);
    if (!bloodRequest) {
      return next(new AppError('Blood request not found.', 404));
    }

    const terminalStates = ['Fulfilled', 'Cancelled', 'Expired'];
    if (terminalStates.includes(bloodRequest.status)) {
      return next(
        new AppError(`Cannot cancel a blood request that is already in a terminal state (${bloodRequest.status}).`, 400)
      );
    }

    bloodRequest.status = 'Cancelled';
    await bloodRequest.save({ validateBeforeSave: false });

    logAuditEvent({
      actor: req.user._id,
      actorName: req.user.fullName,
      action: 'ADMIN_CANCEL_REQUEST',
      category: 'ADMIN_ACTION',
      target: id,
      ipAddress: req.ip,
      severity: 'NORMAL',
      details: `Admin ${req.user.fullName} cancelled blood request ${id}.`,
    });

    res.status(200).json({
      success: true,
      message: 'Blood request cancelled by administrator.',
      request: sanitizeBloodRequest(bloodRequest, 'admin', req.user._id),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get paginated audit logs (Immutable)
 * @route   GET /api/admin/audit-logs
 * @access  Private (Admin only)
 */
export const getAuditLogs = async (req, res, next) => {
  try {
    const { category, severity, actor, page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

    const query = {};

    if (category && typeof category === 'string' && category.trim() !== '') {
      query.category = category.trim();
    }
    if (severity && typeof severity === 'string' && severity.trim() !== '') {
      query.severity = severity.trim();
    }
    if (actor && typeof actor === 'string' && actor.trim() !== '') {
      query.actor = actor.trim();
    }

    const total = await AuditLog.countDocuments(query);
    const skip = (pageNum - 1) * limitNum;

    const logs = await AuditLog.find(query)
      .populate('actor', 'fullName email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const safeLogs = logs.map((log) => ({
      id: log._id,
      actor: log.actor ? { id: log.actor._id, fullName: log.actor.fullName, email: log.actor.email, role: log.actor.role } : null,
      actorName: log.actorName,
      action: log.action,
      category: log.category,
      target: log.target,
      ipAddress: log.ipAddress,
      severity: log.severity,
      details: log.details,
      createdAt: log.createdAt,
    }));

    res.status(200).json({
      success: true,
      count: safeLogs.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      logs: safeLogs,
    });
  } catch (error) {
    next(error);
  }
};
