import express from 'express';
import {
  createComplaint,
  createPublicComplaint,
  trackPublicComplaint,
  getMyComplaints,
  getComplaintById,
} from '../controllers/complaintController.js';
import { protect } from '../middleware/authMiddleware.js';
import { publicComplaintLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public unauthenticated complaint submission and tracking
router.post('/public', publicComplaintLimiter, createPublicComplaint);
router.get('/public/track/:complaintId', publicComplaintLimiter, trackPublicComplaint);

// Protected routes
router.use(protect);

router.post('/', createComplaint);
router.get('/my', getMyComplaints);
router.get('/:id', getComplaintById);

export default router;
