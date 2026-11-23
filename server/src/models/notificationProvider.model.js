import mongoose from 'mongoose';
import { encrypt, decrypt } from '../utils/encryptionUtils.js';

const notificationProviderSchema = new mongoose.Schema(
  {
    providerType: {
      type: String,
      enum: ['sms', 'email'],
      required: [true, 'Provider type is required (sms or email)'],
    },
    driver: {
      type: String,
      enum: ['textbee', 'capcom6', 'smtp'],
      required: [true, 'Driver is required (textbee, capcom6, or smtp)'],
    },
    name: {
      type: String,
      required: [true, 'Provider name is required'],
      trim: true,
    },
    priority: {
      type: Number,
      default: 1,
      min: [1, 'Priority must be at least 1'],
    },
    isEnabled: {
      type: Boolean,
      default: true,
    },
    // Configurable daily limits and tracking
    dailyLimit: {
      type: Number,
      default: 500,
      min: [0, 'Daily limit cannot be negative'],
    },
    sentToday: {
      type: Number,
      default: 0,
      min: [0, 'Sent count cannot be negative'],
    },
    quotaResetAt: {
      type: Date,
      default: () => {
        const next = new Date();
        next.setUTCHours(24, 0, 0, 0);
        return next;
      },
    },
    // Health status and failure tracking
    isHealthy: {
      type: Boolean,
      default: true,
    },
    lastHealthCheckAt: {
      type: Date,
      default: null,
    },
    lastFailureReason: {
      type: String,
      default: '',
      trim: true,
    },
    consecutiveFailures: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    // AES-256-GCM Encrypted credentials payload (never selected by default)
    encryptedCredentials: {
      type: String,
      select: false,
      default: null,
    },
    // Safe, non-secret summary metadata for UI display (e.g. host, masked account/deviceId)
    configSummary: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.encryptedCredentials;
        delete ret.credentials;
        return ret;
      },
    },
    toObject: {
      transform(doc, ret) {
        delete ret.encryptedCredentials;
        delete ret.credentials;
        return ret;
      },
    },
  }
);

// Indexes
notificationProviderSchema.index({ providerType: 1, isEnabled: 1, priority: 1 });
notificationProviderSchema.index({ driver: 1 });

// Validate driver compatibility with providerType
notificationProviderSchema.pre('validate', function () {
  if (this.providerType === 'sms' && !['textbee', 'capcom6'].includes(this.driver)) {
    throw new Error(`Invalid driver "${this.driver}" for SMS provider. Allowed: "textbee", "capcom6".`);
  }
  if (this.providerType === 'email' && this.driver !== 'smtp') {
    throw new Error(`Invalid driver "${this.driver}" for Email provider. Allowed: "smtp".`);
  }
});

/**
 * Encrypts and sets credentials payload using AES-256-GCM.
 * Automatically generates a safe non-secret configSummary.
 * @param {object} credentials
 */
notificationProviderSchema.methods.setCredentials = function (credentials) {
  if (!credentials || typeof credentials !== 'object') {
    throw new Error('Credentials must be a non-empty object.');
  }

  // Encrypt with AES-256-GCM
  this.encryptedCredentials = encrypt(credentials);

  // Build safe summary without secrets
  if (this.driver === 'textbee') {
    const devId = credentials.deviceId ? String(credentials.deviceId) : '';
    this.configSummary = {
      deviceId: devId ? (devId.length > 8 ? `${devId.slice(0, 4)}...${devId.slice(-4)}` : devId) : '',
      hasApiKey: Boolean(credentials.apiKey),
    };
  } else if (this.driver === 'capcom6') {
    const devId = credentials.deviceId ? String(credentials.deviceId) : '';
    const login = credentials.login || credentials.username || '';
    const endpoint = credentials.endpoint || credentials.baseUrl || 'https://api.sms-gate.app';
    const rawKeyVer = (credentials.pinnedKeyVersion !== undefined && credentials.pinnedKeyVersion !== null && String(credentials.pinnedKeyVersion).trim() !== '')
      ? credentials.pinnedKeyVersion
      : credentials.keyVersion;
    const parsedKeyVer = (rawKeyVer !== undefined && rawKeyVer !== null && String(rawKeyVer).trim() !== '') ? Number(rawKeyVer) : null;
    const isEncrypted = Boolean(credentials.isEncrypted || credentials.publicKey || credentials.pinnedFingerprint || parsedKeyVer !== null);
    this.configSummary = {
      deviceId: devId ? (devId.length > 8 ? `${devId.slice(0, 4)}...${devId.slice(-4)}` : devId) : 'auto',
      loginMasked: login ? (login.length > 4 ? `${login.slice(0, 2)}***${login.slice(-2)}` : `${login.slice(0, 1)}***`) : '',
      hasPassword: Boolean(credentials.password || credentials.token),
      hasToken: Boolean(credentials.token),
      endpoint,
      simNumber: credentials.simNumber !== undefined ? Number(credentials.simNumber) : 1,
      mode: credentials.mode || (endpoint.includes('sms-gate.app') ? 'cloud' : 'custom'),
      isEncrypted,
      pinnedFingerprint: credentials.pinnedFingerprint ? String(credentials.pinnedFingerprint).trim() : '',
      pinnedKeyVersion: parsedKeyVer,
      keyVersion: parsedKeyVer,
      hasPublicKey: Boolean(credentials.publicKey),
    };
  } else if (this.driver === 'smtp') {
    const user = credentials.smtpUser ? String(credentials.smtpUser) : '';
    this.configSummary = {
      smtpHost: credentials.smtpHost || '',
      smtpPort: Number(credentials.smtpPort) || 587,
      secure: Boolean(credentials.secure),
      smtpUserMasked: user ? (user.includes('@') ? `${user.slice(0, 2)}***@${user.split('@')[1]}` : `${user.slice(0, 2)}***`) : '',
      senderAddress: credentials.senderAddress || '',
      senderName: credentials.senderName || '',
      hasPassword: Boolean(credentials.smtpPass),
    };
  }
};

/**
 * Decrypts and returns the credentials object.
 * Throws if encrypted credentials are missing or corrupted.
 * @returns {object}
 */
notificationProviderSchema.methods.getDecryptedCredentials = function () {
  if (!this.encryptedCredentials) {
    throw new Error('No encrypted credentials found on provider instance. Ensure you selected "+encryptedCredentials".');
  }

  return decrypt(this.encryptedCredentials, true);
};

/**
 * Checks if provider has quota available today.
 * @returns {boolean}
 */
notificationProviderSchema.methods.hasQuotaAvailable = function () {
  const now = new Date();
  if (this.quotaResetAt && now >= this.quotaResetAt) {
    return true; // Quota reset due
  }
  return this.sentToday < this.dailyLimit;
};

const NotificationProvider = mongoose.model('NotificationProvider', notificationProviderSchema);

export default NotificationProvider;
