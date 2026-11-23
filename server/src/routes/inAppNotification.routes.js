import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../controllers/inAppNotificationController.js';

const router = express.Router();

router.use(protect);

router.get('/', getMyNotifications);
router.patch('/:id/read', markNotificationRead);
router.patch('/read-all', markAllNotificationsRead);

export default router;
