import express from 'express';
import {
  sendEmailOtp,
  verifyEmailOtp,
} from '../controllers/otpController.js';
import { otpRequestLimiter, otpVerifyLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/send-email-otp', otpRequestLimiter, sendEmailOtp);
router.post('/verify-email-otp', otpVerifyLimiter, verifyEmailOtp);

export default router;
