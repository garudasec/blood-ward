import express from 'express';
import {
  getAdminDashboard,
  getAdminUsers,
  getAdminUserById,
  blockUser,
  unblockUser,
  deactivateUser,
  verifyUser,
  getAdminRequests,
  getAdminRequestById,
  cancelAdminRequest,
  getAuditLogs,
  getAdminHospitals,
} from '../controllers/adminController.js';
import {
  getAdminComplaints,
  getComplaintById,
  updateComplaintStatus,
  resolveComplaint,
} from '../controllers/complaintController.js';
import jwt from 'jsonwebtoken';
import {
  getProviders,
  getProviderById,
  createProvider,
  updateProvider,
  toggleProviderStatus,
  recoverProvider,
  testProvider,
  deleteProvider,
  getNotificationLogs,
  getNotificationStats,
} from '../controllers/adminNotificationController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import {
  providerTestLimiter,
  unauthenticatedProviderTestLimiter,
} from '../middleware/rateLimiter.js';

const router = express.Router();

// Pre-auth strict rate limit for unauthenticated requests targeting provider testing (F-02 / Requirement 4)
router.post('/notification-providers/:id/test', (req, res, next) => {
  let hasValidToken = false;
  const token = req.cookies?.token || (req.headers.authorization?.startsWith('Bearer') ? req.headers.authorization.split(' ')[1] : null);
  if (token && process.env.JWT_SECRET) {
    try {
      jwt.verify(token, process.env.JWT_SECRET);
      hasValidToken = true;
    } catch (e) {
      hasValidToken = false;
    }
  }
  if (!hasValidToken) {
    return unauthenticatedProviderTestLimiter(req, res, next);
  }
  next();
});

// Enforce admin authorization on all admin routes
router.use(protect, restrictTo('admin'));

router.get('/dashboard', getAdminDashboard);

router.get('/users', getAdminUsers);
router.get('/users/:id', getAdminUserById);
router.patch('/users/:id/block', blockUser);
router.patch('/users/:id/unblock', unblockUser);
router.patch('/users/:id/verification', verifyUser);
router.delete('/users/:id', deactivateUser);

router.get('/hospitals', getAdminHospitals);

router.get('/requests', getAdminRequests);
router.get('/requests/:id', getAdminRequestById);
router.patch('/requests/:id/cancel', cancelAdminRequest);

router.get('/complaints', getAdminComplaints);
router.get('/complaints/:id', getComplaintById);
router.patch('/complaints/:id/status', updateComplaintStatus);
router.patch('/complaints/:id/resolve', resolveComplaint);

router.get('/audit-logs', getAuditLogs);

// Notification Providers & Delivery Monitoring
router.get('/notification-providers', getProviders);
router.post('/notification-providers', createProvider);
router.get('/notification-providers/:id', getProviderById);
router.patch('/notification-providers/:id', updateProvider);
router.patch('/notification-providers/:id/toggle', toggleProviderStatus);
router.patch('/notification-providers/:id/recover', recoverProvider);
router.post('/notification-providers/:id/test', providerTestLimiter, testProvider);
router.delete('/notification-providers/:id', deleteProvider);

router.get('/notification-logs', getNotificationLogs);
router.get('/notification-stats', getNotificationStats);

export default router;
