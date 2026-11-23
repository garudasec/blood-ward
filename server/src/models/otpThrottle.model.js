import mongoose from 'mongoose';

const otpThrottleSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    target: {
      type: String,
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ['phone', 'email'],
      required: true,
    },
    requests: [
      {
        type: Date,
      },
    ],
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index to automatically purge throttle documents inactive for 24 hours
otpThrottleSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 86400 });

const OtpThrottle = mongoose.models.OtpThrottle || mongoose.model('OtpThrottle', otpThrottleSchema);

export default OtpThrottle;
