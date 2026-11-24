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
        if (result.remainingSeconds) {
          res.set('Retry-After', String(result.remainingSeconds));
        }
        return res.status(429).json({
          success: false,
          inCooldown: true,
          remainingSeconds: result.remainingSeconds,
          message: result.error,
        });
      }

      if (result.errorCode === 'RATE_LIMIT_EXCEEDED') {
        res.set('Retry-After', '3600');
        return res.status(429).json({
          success: false,
          errorCode: 'RATE_LIMIT_EXCEEDED',
          message: result.error,
        });
      }

      if (result.errorCode === 'TIMEOUT' || result.isUncertain) {
        return res.status(504).json({
          success: false,
          errorCode: 'TIMEOUT',
          message: result.error || 'Email dispatch timed out. Please try again.',
        });
      }

      // Distinguish infrastructure / provider failures and return HTTP 503
      const providerErrorCodes = [
        'AUTH_FAILURE',
        'UNVERIFIED_SENDER',
        'DISPATCH_ERROR',
        'NETWORK_ERROR',
        'PROVIDER_UNHEALTHY',
        'QUOTA_EXHAUSTED',
        'SSRF_BLOCKED',
        'CONFIG_ERROR',
        'NO_EMAIL_PROVIDER_CONFIGURED',
        'ENV_SMTP_ERROR',
        'ENV_RESEND_ERROR',
      ];

      if (providerErrorCodes.includes(result.errorCode)) {
        return res.status(503).json({
          success: false,
          errorCode: result.errorCode,
          message: result.error || 'Email delivery service is currently unavailable. Please try again later.',
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
    if (error.message?.includes('OTP_HMAC_SECRET') || error.message?.includes('CRITICAL SECURITY CONFIGURATION')) {
      console.error('[Security Configuration Error]', error.message);
      return next(
        new AppError(
          process.env.NODE_ENV === 'production'
            ? 'Verification service is temporarily unavailable due to server configuration. Please try again later.'
            : error.message,
          500
        )
      );
    }
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
