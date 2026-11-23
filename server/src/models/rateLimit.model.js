import mongoose from 'mongoose';

const rateLimitHitSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    totalHits: {
      type: Number,
      required: true,
      default: 1,
    },
    resetTime: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'rate_limit_hits',
  }
);

// TTL index to automatically purge expired entries after resetTime passes
rateLimitHitSchema.index({ resetTime: 1 }, { expireAfterSeconds: 0 });

const RateLimitHit = mongoose.models.RateLimitHit || mongoose.model('RateLimitHit', rateLimitHitSchema);

export default RateLimitHit;
