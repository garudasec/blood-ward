import express from 'express';
import {
  getAdminDashboard,
  getAdminUsers,
  getAdminUserById,
  blockUser,
  unblockUser,
  deactivateUser,
  getAdminRequests,
  getAdminRequestById,
  cancelAdminRequest,
  getAuditLogs,
} from '../controllers/adminController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// Enforce admin authorization on all admin routes
router.use(protect, restrictTo('admin'));

router.get('/dashboard', getAdminDashboard);

router.get('/users', getAdminUsers);
router.get('/users/:id', getAdminUserById);
router.patch('/users/:id/block', blockUser);
router.patch('/users/:id/unblock', unblockUser);
router.delete('/users/:id', deactivateUser);

router.get('/requests', getAdminRequests);
router.get('/requests/:id', getAdminRequestById);
router.patch('/requests/:id/cancel', cancelAdminRequest);

router.get('/audit-logs', getAuditLogs);

export default router;
