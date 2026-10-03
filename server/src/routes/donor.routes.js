import express from 'express';
import {
  getDonorProfile,
  updateDonorProfile,
  updateDonorAvailability,
  searchDonors,
} from '../controllers/donorController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// Donor Profile & Availability Management (Donor Only)
router.get('/me', protect, restrictTo('donor'), getDonorProfile);
router.put('/me', protect, restrictTo('donor'), updateDonorProfile);
router.patch('/me/availability', protect, restrictTo('donor'), updateDonorAvailability);
router.put('/me/availability', protect, restrictTo('donor'), updateDonorAvailability);

// Recipient Donor Search (Recipient Only)
router.get('/search', protect, restrictTo('recipient'), searchDonors);

export default router;
