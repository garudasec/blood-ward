import crypto from 'crypto';
import Otp from '../models/otp.model.js';
import OtpThrottle from '../models/otpThrottle.model.js';
import User from '../models/user.model.js';
import { hashOtp } from '../utils/encryptionUtils.js';
import notificationManager from './notification/notificationManager.js';

/**
 * Concurrency-safe sliding window rate limiter for OTP dispatches per target.
 * Uses atomic aggregation pipeline in MongoDB to prune requests older than 1 hour
 * and conditionally append the new request only if the active count is below the limit.
 *
 * @param {object} params
 * @param {string} params.target Normalized target (email)
 * @param {'email'} [params.targetType='email']
 * @param {number} [params.maxLimit] Maximum requests per rolling hour (default env OTP_MAX_PER_TARGET_PER_HOUR or 5)
 * @param {Date} [params.now=new Date()]
 * @returns {Promise<{ allowed: boolean, currentCount: number, maxLimit: number }>}
 */
export async function checkAndRecordTargetRateLimit({ target, targetType = 'email', maxLimit, now = new Date() }) {
  const limit = maxLimit !== undefined ? maxLimit : (Number(process.env.OTP_MAX_PER_TARGET_PER_HOUR) || 5);
  const normalized = normalizeTarget(target, targetType);
  const key = `throttle:${targetType}:${normalized}`;
  const cutoff = new Date(now.getTime() - 60 * 60 * 1000); // 1 rolling hour

  const doc = await OtpThrottle.findOneAndUpdate(
    { key },
    [
      {
        $set: {
          key,
          target: normalized,
          targetType,
          requests: {
            $let: {
              vars: {
                activeRequests: {
                  $filter: {
                    input: { $ifNull: ['$requests', []] },
                    as: 't',
                    cond: { $gte: ['$$t', cutoff] },
                  },
                },
              },
              in: {
                $cond: {
                  if: { $lt: [{ $size: '$$activeRequests' }, limit] },
                  then: { $concatArrays: ['$$activeRequests', [now]] },
                  else: '$$activeRequests',
                },
              },
            },
          },
          updatedAt: now,
        },
      },
    ],
    { upsert: true, returnDocument: 'after', updatePipeline: true }
  );

  const allowed = doc.requests.some((d) => d.getTime() === now.getTime());
  return {
    allowed,
    currentCount: doc.requests.length,
    maxLimit: limit,
  };
}

/**
 * Normalizes destination target based on channel type
 * @param {string} target
 * @param {'email'|string} targetType
 * @returns {string}
 */
export function normalizeTarget(target, targetType = 'email') {
  if (!target || typeof target !== 'string') {
    throw new Error('Target must be a valid non-empty string.');
  }

  if (targetType === 'email') {
    const cleaned = target.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
      throw new Error('Please provide a valid email address.');
    }
    return cleaned;
  }

  if (targetType === 'phone') {
    throw new Error('Phone verification has been discontinued. Please use email verification.');
  }

  throw new Error(`Unsupported targetType: "${targetType}". Must be "email".`);
}

/**
 * Generates and dispatches a cryptographically secure 6-digit OTP to email
 * @param {object} params
 * @param {string} params.target Destination email
 * @param {'email'} [params.targetType='email']
 * @param {'verification'|'password_reset'|'login'} params.purpose
 * @param {string} [params.userName] Optional user display name for email templates
 * @returns {Promise<{ success: boolean, message: string, resendAvailableAt?: Date, expiresAt?: Date, inCooldown?: boolean, remainingSeconds?: number, testOtp?: string }>}
 */
export async function generateAndSendOtp({ target, targetType = 'email', purpose = 'verification', userName }) {
  if (targetType === 'phone') {
    return {
      success: false,
      errorCode: 'PHONE_OTP_DISCONTINUED',
      error: 'Phone verification has been discontinued. Please use email verification.',
    };
  }

  const normalized = normalizeTarget(target, targetType);
  const now = new Date();

  // 1. Check for active unexpired OTP to enforce resend cooldown
  const activeExisting = await Otp.findOne({
    target: normalized,
    purpose,
    isUsed: false,
    expiresAt: { $gt: now },
  }).sort({ createdAt: -1 });

  if (activeExisting && activeExisting.isCooldownActive()) {
    const remainingSeconds = Math.max(1, Math.ceil((new Date(activeExisting.resendAvailableAt) - now) / 1000));
    return {
      success: false,
      inCooldown: true,
      remainingSeconds,
      error: `Please wait ${remainingSeconds} seconds before requesting a new verification code.`,
    };
  }

  // 1b. Enforce per-target rolling hour rate limit (atomic across all instances)
  const throttleResult = await checkAndRecordTargetRateLimit({
    target: normalized,
    targetType,
    now,
  });

  if (!throttleResult.allowed) {
    return {
      success: false,
      errorCode: 'RATE_LIMIT_EXCEEDED',
      error: 'Too many verification code requests for this destination. Please try again later.',
    };
  }

  // 2. Invalidate any prior active OTPs for this target & purpose before issuing a new one
  if (activeExisting) {
    await Otp.updateMany(
      {
        target: normalized,
        purpose,
        isUsed: false,
      },
      {
        $set: { isUsed: true, usedAt: now },
      }
    );
  }

  // 3. Generate cryptographically secure 6-digit numeric OTP
  const rawOtp = String(crypto.randomInt(100000, 1000000));

  // 4. Compute HMAC-SHA256 bound to normalized target and purpose
  const otpHash = hashOtp({
    target: normalized,
    purpose,
    rawOtp,
  });

  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes
  const resendAvailableAt = new Date(now.getTime() + 60 * 1000); // 60 seconds

  // 5. Persist Otp record
  const otpDoc = new Otp({
    target: normalized,
    targetType,
    purpose,
    otpHash,
    expiresAt,
    resendAvailableAt,
    attempts: 0,
    maxAttempts: 3,
    isUsed: false,
  });

  await otpDoc.save();

  // 6. Dispatch through NotificationManager (Email)
  const subject =
    purpose === 'password_reset'
      ? 'BloodWard — Password Reset Code'
      : 'BloodWard — Email Verification Code';

  const actionText =
    purpose === 'password_reset'
      ? 'reset your account password'
      : 'verify your email address';

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #A61B2B; margin: 0; font-size: 24px; font-weight: 800;">BLOODWARD</h2>
        <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Healthcare & Blood Donation Network</p>
      </div>
      <p style="color: #334155; font-size: 15px; line-height: 1.6;">Hello ${userName || 'there'},</p>
      <p style="color: #334155; font-size: 15px; line-height: 1.6;">Use the following 6-digit verification code to ${actionText}:</p>
      <div style="margin: 28px 0; text-align: center;">
        <span style="display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #A61B2B; background-color: #FEF2F2; padding: 14px 28px; border-radius: 8px; border: 1px solid #FECACA;">${rawOtp}</span>
      </div>
      <p style="color: #64748b; font-size: 13px; line-height: 1.5;">This code will expire in <strong>10 minutes</strong>. For your security, never share this code with anyone.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 11px; margin: 0; text-align: center;">If you did not request this verification code, please ignore this email.</p>
    </div>
  `;

  const textBody = `Hello ${userName || 'there'},\n\nYour BloodWard verification code is: ${rawOtp}\n\nThis code is valid for 10 minutes. Do not share this code with anyone.\n\nBest regards,\nThe BloodWard Team`;

  const dispatchResult = await notificationManager.sendEmail({
    to: normalized,
    subject,
    html: htmlBody,
    text: textBody,
    purpose: `otp_${purpose}`,
  });

  // Handle provider dispatch errors
  if (!dispatchResult.success) {
    if (process.env.NODE_ENV === 'test') {
      return {
        success: true,
        message: 'Verification code generated for testing.',
        resendAvailableAt,
        expiresAt,
        testOtp: rawOtp,
      };
    }
    return {
      success: false,
      errorCode: dispatchResult.errorCode,
      error: `Failed to deliver verification code: ${dispatchResult.error}`,
    };
  }

  return {
    success: true,
    message: 'Verification code sent successfully.',
    resendAvailableAt,
    expiresAt,
    ...(process.env.NODE_ENV === 'test' ? { testOtp: rawOtp } : {}),
  };
}

/**
 * Verifies candidate 6-digit OTP against active OTP record
 * Atomic against concurrent replay attacks and enforces max 3 attempts
 * @param {object} params
 * @param {string} params.target Destination email
 * @param {'email'} [params.targetType='email']
 * @param {'verification'|'password_reset'|'login'} params.purpose
 * @param {string} params.otp 6-digit candidate OTP
 * @param {string} [params.userId] Optional authenticated User ID to update directly
 * @returns {Promise<{ success: boolean, message?: string, error?: string, errorCode?: string, attemptsRemaining?: number }>}
 */
export async function verifyOtp({ target, targetType = 'email', purpose = 'verification', otp, userId }) {
  if (targetType === 'phone') {
    return {
      success: false,
      errorCode: 'PHONE_OTP_DISCONTINUED',
      error: 'Phone verification has been discontinued. Please use email verification.',
    };
  }

  if (!otp || typeof otp !== 'string' || !/^\d{6}$/.test(otp.trim())) {
    return {
      success: false,
      errorCode: 'INVALID_FORMAT',
      error: 'Please enter a valid 6-digit numeric verification code.',
    };
  }

  const normalized = normalizeTarget(target, targetType);
  const candidateOtp = otp.trim();
  const now = new Date();

  // 1. Locate the latest active, unexpired, and unused OTP record
  const activeRecord = await Otp.findOne({
    target: normalized,
    purpose,
    isUsed: false,
    expiresAt: { $gt: now },
  }).sort({ createdAt: -1 });

  if (!activeRecord) {
    return {
      success: false,
      errorCode: 'INVALID_OR_EXPIRED',
      error: 'Verification code is invalid or has expired. Please request a new code.',
    };
  }

  // 2. Atomically increment attempts counter (preventing concurrent brute-force beyond maxAttempts)
  const updatedRecord = await Otp.findOneAndUpdate(
    {
      _id: activeRecord._id,
      isUsed: false,
      attempts: { $lt: activeRecord.maxAttempts },
    },
    {
      $inc: { attempts: 1 },
    },
    {
      returnDocument: 'after',
      select: '+otpHash',
    }
  );

  // If update returned null, max attempts were already exhausted concurrently
  if (!updatedRecord) {
    return {
      success: false,
      errorCode: 'MAX_ATTEMPTS_EXCEEDED',
      error: 'Maximum verification attempts exceeded. Please request a new verification code.',
      attemptsRemaining: 0,
    };
  }

  // 3. Verify hash using constant-time timingSafeEqual
  const isValid = updatedRecord.verify(candidateOtp);

  if (!isValid) {
    if (updatedRecord.attempts >= updatedRecord.maxAttempts) {
      await Otp.updateOne(
        { _id: updatedRecord._id },
        { $set: { isUsed: true, usedAt: now, isVerified: false, verifiedAt: null } }
      );
      return {
        success: false,
        errorCode: 'MAX_ATTEMPTS_EXCEEDED',
        error: 'Too many incorrect attempts. This code has been deactivated. Please request a new one.',
        attemptsRemaining: 0,
      };
    }

    const remaining = updatedRecord.maxAttempts - updatedRecord.attempts;
    return {
      success: false,
      errorCode: 'INCORRECT_OTP',
      error: `Incorrect verification code. ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} remaining.`,
      attemptsRemaining: remaining,
    };
  }

  // 4. Success: Atomically mark OTP as used and verified (single-use enforcement)
  const consumeResult = await Otp.updateOne(
    {
      _id: updatedRecord._id,
      isUsed: false,
    },
    {
      $set: {
        isUsed: true,
        usedAt: now,
        isVerified: true,
        verifiedAt: now,
        ...(userId ? { consumedByUserId: userId, consumedAt: now } : {}),
      },
    }
  );

  if (consumeResult.modifiedCount !== 1) {
    return {
      success: false,
      errorCode: 'ALREADY_USED',
      error: 'This verification code has already been used. Please request a new one.',
    };
  }

  // 5. Update user contact verification status if matching user is identified
  try {
    const updateQuery = userId ? { _id: userId } : { email: normalized };
    await User.updateMany(updateQuery, {
      $set: { isEmailVerified: true, emailVerifiedAt: now },
    });
  } catch (userUpdateErr) {
    // User update failure shouldn't abort valid verification
  }

  return {
    success: true,
    message: 'Email verified successfully.',
  };
}

/**
 * Invalidates all active OTPs for a target upon successful password change or account action
 * @param {string} target
 * @param {string} purpose
 */
export async function invalidateOtpsForTarget({ target, purpose }) {
  if (!target) return;
  const cleaned = target.trim().toLowerCase();
  await Otp.updateMany(
    {
      target: cleaned,
      purpose,
      isUsed: false,
    },
    {
      $set: { isUsed: true, usedAt: new Date(), isVerified: false, verifiedAt: null },
    }
  );
}

/**
 * Checks whether an unconsumed, verified OTP exists for registration within window
 * @param {object} params
 * @param {string} params.target
 * @param {'email'} [params.targetType='email']
 * @param {'verification'|'password_reset'|'login'} [params.purpose='verification']
 * @param {number} [params.windowMs=1800000] 30 minutes default
 * @returns {Promise<boolean>}
 */
export async function isRegistrationOtpVerified({ target, targetType = 'email', purpose = 'verification', windowMs = 30 * 60 * 1000 }) {
  if (targetType === 'phone') return false;
  const normalized = normalizeTarget(target, targetType);
  const cutoff = new Date(Date.now() - windowMs);
  const exists = await Otp.exists({
    target: normalized,
    targetType,
    purpose,
    isUsed: true,
    isVerified: true,
    consumedByUserId: null,
    $or: [
      { verifiedAt: { $gt: cutoff } },
      { usedAt: { $gt: cutoff } },
    ],
  });
  return Boolean(exists);
}

/**
 * Atomically consumes verified registration OTP records binding them to the new user ID
 * @param {object} params
 * @param {string} params.target
 * @param {'email'} [params.targetType='email']
 * @param {'verification'|'password_reset'|'login'} [params.purpose='verification']
 * @param {string|import('mongoose').Types.ObjectId} params.userId
 * @param {number} [params.windowMs=1800000]
 * @returns {Promise<boolean>}
 */
export async function consumeRegistrationOtp({ target, targetType = 'email', purpose = 'verification', userId, windowMs = 30 * 60 * 1000 }) {
  if (!userId || targetType === 'phone') return false;
  const normalized = normalizeTarget(target, targetType);
  const cutoff = new Date(Date.now() - windowMs);
  const now = new Date();

  const result = await Otp.updateMany(
    {
      target: normalized,
      targetType,
      purpose,
      isUsed: true,
      isVerified: true,
      consumedByUserId: null,
      $or: [
        { verifiedAt: { $gt: cutoff } },
        { usedAt: { $gt: cutoff } },
      ],
    },
    {
      $set: {
        consumedByUserId: userId,
        consumedAt: now,
      },
    }
  );

  return result.modifiedCount > 0;
}
