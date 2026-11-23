import express from 'express';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import {
  getMyMatches,
  acceptMatch,
  declineMatch,
} from '../controllers/matchController.js';

const router = express.Router();

router.use(protect);

router.get('/my-matches', getMyMatches);
router.patch('/:id/accept', restrictTo('donor'), acceptMatch);
router.patch('/:id/decline', restrictTo('donor'), declineMatch);

export default router;
