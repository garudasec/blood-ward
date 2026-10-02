import express from 'express';
import {
  registerDonor,
  registerRecipient,
  login,
  logout,
  getMe,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register/donor', registerDonor);
router.post('/register/recipient', registerRecipient);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', protect, getMe);

export default router;
