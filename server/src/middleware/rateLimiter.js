import mongoose from 'mongoose';
import rateLimit, { MemoryStore } from 'express-rate-limit';
import RateLimitHit from '../models/rateLimit.model.js';

// Global API Rate Limiter: 200 requests per 15 minutes window
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  standardHeaders: true, // Return rate limit info in the RateLimit-* headers
  legacyHeaders: false, // Disable the X-RateLimit-* headers
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});

// Dedicated Forgot Password Rate Limiter: Maximum 5 attempts per IP per hour
export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password reset requests from this IP. Please try again after an hour.',
  },
  skip: () => process.env.NODE_ENV === 'test',
});

// Dedicated Public Complaint Limiter: Maximum 10 submissions per IP per 15 minutes
export const publicComplaintLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many complaints submitted from this IP. Please try again after 15 minutes.',
  },
  skip: () => process.env.NODE_ENV === 'test' && !process.env.TEST_RATE_LIMITER,
});

/**
 * Shared atomic rate-limit store backed by MongoDB for multi-instance deployments
 * (e.g. Render horizontally scaled instances), with seamless in-memory fallback.
 * Implements express-rate-limit Store interface.
 */
export class MongoRateLimitStore {
  constructor(options = {}) {
    this.prefix = options.prefix || '';
    this.windowMs = options.windowMs || (10 * 60 * 1000);
    this.fallbackStore = new MemoryStore();
    if (typeof this.fallbackStore.init === 'function') {
      this.fallbackStore.init({ windowMs: this.windowMs });
    }
  }

  init(options) {
    if (options && options.windowMs) {
      this.windowMs = options.windowMs;
      if (this.fallbackStore && typeof this.fallbackStore.init === 'function') {
        this.fallbackStore.init(options);
      }
    }
  }

  async increment(key) {
    // Fall back gracefully to in-memory store if MongoDB is not connected
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      return this.fallbackStore.increment(key);
    }

    const fullKey = `${this.prefix}${key}`;
    const now = new Date();

    try {
      // 1. Try atomic increment if active window exists
      const active = await RateLimitHit.findOneAndUpdate(
        { key: fullKey, resetTime: { $gt: now } },
        { $inc: { totalHits: 1 } },
        { returnDocument: 'after' }
      );

      if (active) {
        return {
          totalHits: active.totalHits,
          resetTime: active.resetTime,
        };
      }

      // 2. No active window: create/reset window atomically
      const resetTime = new Date(now.getTime() + this.windowMs);
      const doc = await RateLimitHit.findOneAndUpdate(
        {
          key: fullKey,
          $or: [{ resetTime: { $lte: now } }, { resetTime: { $exists: false } }],
        },
        {
          $set: {
            totalHits: 1,
            resetTime,
          },
        },
        {
          upsert: true,
          returnDocument: 'after',
          setDefaultsOnInsert: true,
        }
      );

      return {
        totalHits: doc.totalHits,
        resetTime: doc.resetTime,
      };
    } catch (err) {
      if (err.code === 11000) {
        // Concurrent insert race condition caught; increment the newly created document
        try {
          const retry = await RateLimitHit.findOneAndUpdate(
            { key: fullKey },
            { $inc: { totalHits: 1 } },
            { returnDocument: 'after' }
          );
          if (retry) {
            return {
              totalHits: retry.totalHits,
              resetTime: retry.resetTime,
            };
          }
        } catch (retryErr) {
          // fall through to memory fallback
        }
      }
      return this.fallbackStore.increment(key);
    }
  }

  async decrement(key) {
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      return this.fallbackStore.decrement(key);
    }
    const fullKey = `${this.prefix}${key}`;
    try {
      await RateLimitHit.findOneAndUpdate(
        { key: fullKey, totalHits: { $gt: 0 } },
        { $inc: { totalHits: -1 } }
      );
    } catch (e) {
      if (typeof this.fallbackStore.decrement === 'function') {
        this.fallbackStore.decrement(key);
      }
    }
  }

  async resetKey(key) {
    if (this.fallbackStore && typeof this.fallbackStore.resetKey === 'function') {
      this.fallbackStore.resetKey(key);
    }
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      const fullKey = `${this.prefix}${key}`;
      await RateLimitHit.deleteOne({ key: fullKey });
    }
  }

  async resetAll() {
    if (this.fallbackStore && typeof this.fallbackStore.resetAll === 'function') {
      this.fallbackStore.resetAll();
    }
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      return await RateLimitHit.deleteMany({ key: { $regex: `^${this.prefix}` } });
    }
    return Promise.resolve();
  }

  async get(key) {
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      return this.fallbackStore.get(key);
    }
    const fullKey = `${this.prefix}${key}`;
    const now = new Date();
    const doc = await RateLimitHit.findOne({ key: fullKey, resetTime: { $gt: now } });
    if (!doc) return undefined;
    return {
      totalHits: doc.totalHits,
      resetTime: doc.resetTime,
    };
  }
}

// Dedicated Atomic Shared Stores for provider test limiters across multiple instances
export const adminProviderTestStore = new MongoRateLimitStore({
  prefix: 'admin_test:',
  windowMs: 10 * 60 * 1000,
});
export const ipProviderTestStore = new MongoRateLimitStore({
  prefix: 'ip_test:',
  windowMs: 10 * 60 * 1000,
});
export const unauthenticatedProviderTestStore = new MongoRateLimitStore({
  prefix: 'unauth_test:',
  windowMs: 10 * 60 * 1000,
});

export const resetProviderTestStores = async () => {
  return await Promise.all([
    adminProviderTestStore.resetAll(),
    ipProviderTestStore.resetAll(),
    unauthenticatedProviderTestStore.resetAll(),
  ]);
};

/**
 * Common handler for rate-limit exceeded (HTTP 429) responses
 * Ensures accurate Retry-After header and structured JSON body.
 */
const createRateLimitHandler = (errorCode, defaultMessage) => {
  return (req, res, next, options) => {
    const retryAfterHeader = res.getHeader ? res.getHeader('Retry-After') : null;
    const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : Math.ceil(options.windowMs / 1000);
    if (res.setHeader && !res.getHeader('Retry-After')) {
      res.setHeader('Retry-After', String(retryAfter));
    }
    const message = typeof options.message === 'object' && options.message !== null
      ? options.message.message || defaultMessage
      : options.message || defaultMessage;

    res.status(options.statusCode || 429).json({
      success: false,
      errorCode,
      message,
      retryAfter: Number(retryAfter),
    });
  };
};

/**
 * 1. Authenticated Administrator Limiter: 20 requests per 10 minutes
 * Keyed strictly by verified server-side user ID (req.user._id), ignoring client headers.
 */
export const adminProviderTestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // 20 requests per 10 minutes per admin account
  store: adminProviderTestStore,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { default: false },
  keyGenerator: (req) => {
    if (req.user && req.user._id) {
      return `admin:${req.user._id.toString()}`;
    }
    return req.ip;
  },
  handler: createRateLimitHandler(
    'ADMIN_RATE_LIMIT_EXCEEDED',
    'Too many provider test requests for this administrator account. Please try again after 10 minutes.'
  ),
  skip: () => process.env.NODE_ENV === 'test' && !process.env.TEST_RATE_LIMITER,
});

/**
 * 2. Secondary IP-Level Limiter: 40 requests per 10 minutes
 * Caps overall test requests originating from a shared public IP address.
 */
export const ipProviderTestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 40, // 40 requests per 10 minutes per IP
  store: ipProviderTestStore,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { default: false },
  keyGenerator: (req) => req.ip,
  handler: createRateLimitHandler(
    'IP_RATE_LIMIT_EXCEEDED',
    'Too many provider test requests from this IP address. Please try again after 10 minutes.'
  ),
  skip: () => process.env.NODE_ENV === 'test' && !process.env.TEST_RATE_LIMITER,
});

/**
 * 4. Separate Strict IP-Level Limiter for Unauthenticated Requests: 5 requests per 10 minutes
 */
export const unauthenticatedProviderTestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // Strict 5 requests per 10 minutes for unauthenticated requests
  store: unauthenticatedProviderTestStore,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { default: false },
  keyGenerator: (req) => req.ip,
  handler: createRateLimitHandler(
    'UNAUTHENTICATED_RATE_LIMIT_EXCEEDED',
    'Too many unauthenticated requests from this IP. Please try again after 10 minutes.'
  ),
  skip: (req) => (process.env.NODE_ENV === 'test' && !process.env.TEST_RATE_LIMITER) || Boolean(req.user),
});

/**
 * Unified provider test limiter composite middleware:
 * - If unauthenticated: enforces strict unauthenticated limit (5 req / 10 min)
 * - If authenticated admin: enforces individual admin limit (20 req / 10 min) and secondary IP limit (40 req / 10 min)
 */
export const providerTestLimiter = (req, res, next) => {
  if (!req.user) {
    return unauthenticatedProviderTestLimiter(req, res, next);
  }
  return adminProviderTestLimiter(req, res, (err) => {
    if (err) return next(err);
    return ipProviderTestLimiter(req, res, next);
  });
};
