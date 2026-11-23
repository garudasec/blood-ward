import { generateAndSendOtp, verifyOtp } from '../services/otpService.js';
import User from '../models/user.model.js';
import AppError from '../utils/appError.js';

/**
 * @desc    Send 6-digit OTP to email address
 * @route   POST /api/otp/send-email-otp
 * @access  Public
 */
export const sendEmailOtp = async (req, res, next) => {
  try {
    const { email, purpose = 'verification' } = req.body;

    if (!email || typeof email !== 'string') {
      return next(new AppError('Email address is required.', 400));
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return next(new AppError('Please provide a valid email address.', 400));
    }

    if (purpose === 'verification' && !req.user) {
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return next(new AppError('An account with this email address already exists. Please log in instead.', 400));
      }
    }

    const result = await generateAndSendOtp({
      target: normalizedEmail,
      targetType: 'email',
      purpose,
      userName: req.user?.fullName,
    });

    if (!result.success) {
      if (result.inCooldown) {
        return res.status(429).json({
          success: false,
          inCooldown: true,
          remainingSeconds: result.remainingSeconds,
          message: result.error,
        });
      }
      return next(new AppError(result.error || 'Failed to dispatch email verification OTP.', 400));
    }

    res.status(200).json({
      success: true,
      message: result.message,
      resendAvailableAt: result.resendAvailableAt,
      expiresAt: result.expiresAt,
      ...(result.testOtp ? { testOtp: result.testOtp } : {}),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify 6-digit email OTP
 * @route   POST /api/otp/verify-email-otp
 * @access  Public
 */
export const verifyEmailOtp = async (req, res, next) => {
  try {
    const { email, otp, purpose = 'verification' } = req.body;

    if (!email || !otp) {
      return next(new AppError('Email address and 6-digit OTP code are required.', 400));
    }

    const result = await verifyOtp({
      target: email,
      targetType: 'email',
      purpose,
      otp,
      userId: req.user?._id,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        errorCode: result.errorCode,
        message: result.error,
        attemptsRemaining: result.attemptsRemaining,
      });
    }

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};
