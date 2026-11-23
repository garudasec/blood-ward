import dns from 'dns';
dns.setServers(['1.1.1.1', '8.8.8.8']);
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { getDatabaseNameFromUri, validateDatabaseSafety } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');

// Ensure server/.env is loaded
dotenv.config({ path: envPath });

/**
 * Returns the validated test database URI.
 * Throws a descriptive error if missing or if pointing to production.
 */
export function getTestMongoUri() {
  const testUri = process.env.MONGODB_TEST_URI;
  if (!testUri) {
    throw new Error(
      'SAFETY GUARD ACTIVATED: MONGODB_TEST_URI is required to run automated tests.\n' +
      'Refusing to silently fall back to MONGODB_URI.\n' +
      'Automated tests must run against an isolated test database (e.g. bloodward_test).\n' +
      'Please define MONGODB_TEST_URI in server/.env.'
    );
  }

  validateDatabaseSafety(testUri, true);
  return testUri;
}

/**
 * Enforces test environment variables and intercepts mongoose.connect to prevent
 * accidental connection to production under any circumstance.
 */
export function enforceTestEnvironment() {
  process.env.NODE_ENV = 'test';
  if (!process.env.ENCRYPTION_SECRET) {
    process.env.ENCRYPTION_SECRET = 'e4d7a8c39f15024b8932c0d9a6e11894a73b2210fe58679124ab8312d90ef014';
  }
  if (!process.env.OTP_HMAC_SECRET) {
    process.env.OTP_HMAC_SECRET = 'f7c2b5e19a4d830628e94a1d7f502c3b8e9142f703a65c9182d4b70e13589cf2';
  }
  const testUri = getTestMongoUri();

  // Redirect MONGODB_URI to testUri so any legacy code reading MONGODB_URI connects to test DB
  process.env.MONGODB_URI = testUri;

  // Intercept mongoose.connect to guard every call
  if (!mongoose._isSafetyGuardInstalled) {
    const rawConnect = mongoose.connect.bind(mongoose);
    mongoose.connect = async function (uri, ...rest) {
      let targetUri = testUri;
      if (uri) {
        const db = getDatabaseNameFromUri(uri);
        if (db && db.toLowerCase() === 'bloodward_test') {
          targetUri = uri;
        }
      }
      validateDatabaseSafety(targetUri, true);
      try {
        return await rawConnect(targetUri, { serverSelectionTimeoutMS: 20000, connectTimeoutMS: 10000, ...rest[0] });
      } catch (err) {
        const match = targetUri.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@/);
        if (match) {
          const [, user, pass] = match;
          const directUri = `mongodb://${user}:${pass}@ac-tbfdysc-shard-00-00.frj09tc.mongodb.net:27017,ac-tbfdysc-shard-00-01.frj09tc.mongodb.net:27017,ac-tbfdysc-shard-00-02.frj09tc.mongodb.net:27017/bloodward_test?ssl=true&replicaSet=atlas-qw3adr-shard-0&authSource=admin`;
          validateDatabaseSafety(directUri, true);
          return await rawConnect(directUri, { serverSelectionTimeoutMS: 20000, connectTimeoutMS: 10000, ...rest[0] });
        }
        throw err;
      }
    };
    mongoose._isSafetyGuardInstalled = true;
  }

  return testUri;
}

/**
 * Connects directly to the dedicated test database with safety verification.
 */
export async function connectTestDB() {
  const testUri = enforceTestEnvironment();
  const conn = await mongoose.connect(testUri);
  const dbName = conn.connection.name || getDatabaseNameFromUri(testUri);
  console.log(`[TEST DB] Connected safely to isolated test database: ${dbName}`);
  return conn;
}

/**
 * Pre-seeds a verified, unconsumed registration OTP record for an email.
 * Used by existing test suites that test domain logic (e.g. DOB, gender, geo-distance)
 * to legitimately satisfy mandatory registration email verification.
 */
export async function seedVerifiedEmailOtp(email) {
  const Otp = mongoose.models.Otp || (await import('../models/otp.model.js')).default;
  const normalized = email.toLowerCase().trim();
  const now = new Date();
  await Otp.deleteMany({ target: normalized, purpose: 'verification' });
  return Otp.create({
    target: normalized,
    targetType: 'email',
    purpose: 'verification',
    otpHash: 'test_preseeded_hash_verified',
    isUsed: true,
    isVerified: true,
    verifiedAt: now,
    usedAt: now,
    resendAvailableAt: now,
    expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
  });
}

// Automatically enforce test environment when testDb.js is imported
enforceTestEnvironment();
