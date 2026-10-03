import express from 'express';
import {
  createBloodRequest,
  getMyRequests,
  getAvailableRequests,
  getRequestById,
  acceptBloodRequest,
  rejectBloodRequest,
  getDonorHistory,
  markInProgress,
  fulfillBloodRequest,
  cancelBloodRequest,
} from '../controllers/bloodRequestController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// Recipient request creation and personal list
router.post('/', protect, restrictTo('recipient'), createBloodRequest);
router.get('/my', protect, restrictTo('recipient'), getMyRequests);

// Available active requests for donors
router.get('/available', protect, restrictTo('donor'), getAvailableRequests);
router.get('/donor/history', protect, restrictTo('donor'), getDonorHistory);

// Ownership-aware request details
router.get('/:id', protect, getRequestById);

// Donor lifecycle actions
router.patch('/:id/accept', protect, restrictTo('donor'), acceptBloodRequest);
router.patch('/:id/reject', protect, restrictTo('donor'), rejectBloodRequest);

// Status transition endpoints
router.patch('/:id/in-progress', protect, markInProgress);
router.patch('/:id/fulfill', protect, fulfillBloodRequest);
router.patch('/:id/cancel', protect, cancelBloodRequest);

export default router;
