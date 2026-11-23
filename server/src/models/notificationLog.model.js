import mongoose from 'mongoose';

export const FORBIDDEN_SENSITIVE_KEYS = [
  'otp',
  'rawotp',
  'password',
  'smtppass',
  'apikey',
  'secret',
  'encryptionsecret',
  'otphmacsecret',
  'credentials',
];

// Matches explicit OTP or passcode disclosures, e.g. "OTP: 123456", "passcode 654321", "verification code 982145"
// Does NOT match legitimate BloodWard IDs (BW-HSP-000021) or ordinary PIN codes / timestamps
const EXPLICIT_OTP_REGEX = /(?:otp|one[\s-]?time[\s-]?pass(?:code|word)?|passcode|verification[\s-]?code|auth(?:entication)?[\s-]?code)[\s:=_-]*\b(\d{4,8})\b/i;

/**
 * Checks a string or object for explicit OTP leakage or forbidden credential keys.
 * Accurately preserves legitimate BloodWard IDs, Indian PIN codes, and numeric timestamps.
 * @param {*} obj
 * @param {string} path
 */
export function detectSensitiveLeak(obj, path = '') {
  if (!obj) return null;

  if (typeof obj === 'string') {
    // Check for explicit OTP disclosures
    const match = obj.match(EXPLICIT_OTP_REGEX);
    if (match) {
      return `explicit OTP disclosure detected at "${path || 'root'}": code "${match[1]}"`;
    }
    return null;
  }

  if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      const lowerKey = key.toLowerCase();
      if (FORBIDDEN_SENSITIVE_KEYS.some((forbidden) => lowerKey === forbidden || lowerKey.includes(forbidden))) {
        // If already safely redacted, do not flag as violation
        if (obj[key] === '[REDACTED]' || obj[key] === '[REDACTED_OTP]') {
          continue;
        }
        return `sensitive credential key "${key}" detected at "${path ? `${path}.${key}` : key}"`;
      }
      const nestedLeak = detectSensitiveLeak(obj[key], path ? `${path}.${key}` : key);
      if (nestedLeak) return nestedLeak;
    }
  }

  return null;
}

/**
 * Redacts any explicit OTP patterns and forbidden keys from a payload
 * @param {*} data
 * @returns {*} Redacted clone
 */
export function sanitizeAndRedact(data) {
  if (!data) return data;

  // Preserve ObjectIds, Dates, and Buffers without mutating internal properties
  if (
    data instanceof mongoose.Types.ObjectId ||
    (data && data._bsontype === 'ObjectId') ||
    data instanceof Date ||
    Buffer.isBuffer(data)
  ) {
    return data;
  }

  if (typeof data === 'string') {
    return data.replace(EXPLICIT_OTP_REGEX, (match, code) => {
      return match.replace(code, '[REDACTED_OTP]');
    });
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeAndRedact(item));
  }

  if (typeof data === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (FORBIDDEN_SENSITIVE_KEYS.some((forbidden) => lowerKey === forbidden || lowerKey.includes(forbidden))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeAndRedact(value);
      }
    }
    return sanitized;
  }

  return data;
}

const notificationLogSchema = new mongoose.Schema(
  {
    channel: {
      type: String,
      enum: ['sms', 'email'],
      required: [true, 'Notification channel is required (sms or email)'],
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NotificationProvider',
      default: null,
    },
    providerName: {
      type: String,
      default: '',
      trim: true,
    },
    driver: {
      type: String,
      enum: ['textbee', 'capcom6', 'smtp', 'mock', 'none'],
      default: 'none',
    },
    purpose: {
      type: String,
      required: [true, 'Purpose is required'],
      trim: true,
    },
    recipientMasked: {
      type: String,
      required: [true, 'Masked recipient is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['delivered', 'failed', 'fallback_triggered', 'accepted', 'sent', 'uncertain'],
      required: [true, 'Delivery status is required'],
    },
    errorDetails: {
      type: String,
      default: '',
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
notificationLogSchema.index({ createdAt: -1 });
notificationLogSchema.index({ channel: 1, status: 1 });
notificationLogSchema.index({ recipientMasked: 1 });

// Automatic TTL log retention: 30 days
notificationLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Security pre-validate hook: reject direct saves containing unredacted credentials or explicit OTP leaks
notificationLogSchema.pre('validate', function () {
  if (this.errorDetails) {
    const leak = detectSensitiveLeak(this.errorDetails, 'errorDetails');
    if (leak) {
      throw new Error(`Security violation: ${leak}.`);
    }
  }
  if (this.metadata) {
    const leak = detectSensitiveLeak(this.metadata, 'metadata');
    if (leak) {
      throw new Error(`Security violation: ${leak}.`);
    }
  }
});

/**
 * Primary safe logger: sanitizes payload and records log entry without ever crashing caller.
 * Guarantees that logging errors cannot disrupt the critical notification delivery workflow.
 * @param {object} logData
 * @returns {Promise<NotificationLog|null>}
 */
notificationLogSchema.statics.recordLog = async function (logData) {
  try {
    if (!logData || typeof logData !== 'object') {
      return null;
    }

    const sanitizedData = sanitizeAndRedact(logData);
    const logEntry = new this(sanitizedData);
    return await logEntry.save();
  } catch (err) {
    // If saving fails for any reason, log a local warning but NEVER throw to caller
    console.warn('[NotificationLog] Failed to persist delivery log entry:', err.message);
    return null;
  }
};

const NotificationLog = mongoose.model('NotificationLog', notificationLogSchema);

export default NotificationLog;
