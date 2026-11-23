import mongoose from 'mongoose';
import { verifyOtpHash } from '../utils/encryptionUtils.js';

const otpSchema = new mongoose.Schema(
  {
    target: {
      type: String,
      required: [true, 'Target (phone or email) is required'],
      trim: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ['phone', 'email'],
      required: [true, 'Target type is required (phone or email)'],
    },
    purpose: {
      type: String,
      enum: ['verification', 'password_reset', 'login'],
      required: [true, 'Purpose is required'],
    },
    // SHA-256 hash of the 6-digit OTP — plaintext OTP is NEVER stored
    otpHash: {
      type: String,
      required: [true, 'OTP hash is required'],
      select: false,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
      min: 1,
    },
    isUsed: {
      type: Boolean,
      default: false,
      index: true,
    },
    usedAt: {
      type: Date,
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    consumedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    consumedAt: {
      type: Date,
      default: null,
    },
    resendAvailableAt: {
      type: Date,
      required: [true, 'Resend cooldown timestamp is required'],
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration timestamp is required'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.otpHash;
        return ret;
      },
    },
    toObject: {
      transform(doc, ret) {
        delete ret.otpHash;
        return ret;
      },
    },
  }
);

// TTL Index for automatic document cleanup upon expiry
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound indexes for fast query resolution and cooldown enforcement
otpSchema.index({ target: 1, purpose: 1, isUsed: 1 });
otpSchema.index({ target: 1, purpose: 1, isUsed: 1, isVerified: 1, consumedByUserId: 1 });
otpSchema.index({ target: 1, resendAvailableAt: 1 });

/**
 * Checks if OTP has expired
 * @returns {boolean}
 */
otpSchema.methods.isExpired = function () {
  return new Date() > this.expiresAt;
};

/**
 * Checks if resend cooldown is currently active
 * @returns {boolean}
 */
otpSchema.methods.isCooldownActive = function () {
  return new Date() < this.resendAvailableAt;
};

/**
 * Checks if max verification attempts have been exhausted
 * @returns {boolean}
 */
otpSchema.methods.hasExceededMaxAttempts = function () {
  return this.attempts >= this.maxAttempts;
};

/**
 * Validates candidate OTP against stored hash using timing-safe comparison
 * @param {string|number} candidateOtp
 * @returns {boolean}
 */
otpSchema.methods.verify = function (candidateOtp) {
  if (!this.otpHash) {
    throw new Error('OTP hash is not selected. Query with "+otpHash".');
  }
  return verifyOtpHash({
    target: this.target,
    purpose: this.purpose,
    candidateOtp,
    storedHash: this.otpHash,
  });
};

const Otp = mongoose.model('Otp', otpSchema);

export default Otp;
