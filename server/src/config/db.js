import dns from 'dns';
import mongoose from 'mongoose';

dns.setServers(['1.1.1.1', '8.8.8.8']);

/**
 * Safely extracts the database name from a MongoDB connection URI.
 * Never logs or exposes credentials.
 */
export function getDatabaseNameFromUri(uri) {
  if (!uri || typeof uri !== 'string') return null;
  const match = uri.match(/\/([^/?#]+)(\?|$)/);
  return match ? match[1] : null;
}

/**
 * Hard safety guard that prevents running automated tests or local development
 * against the production 'bloodward' database.
 * Aborts startup unless the target database is exactly 'bloodward_test'.
 */
export function validateDatabaseSafety(uri, isTest = false) {
  if (!uri) {
    if (isTest) {
      throw new Error(
        'SAFETY GUARD ACTIVATED: MONGODB_TEST_URI is required to run automated tests.\n' +
        'Automated tests must run against an isolated test database (e.g. bloodward_test).\n' +
        'Refusing to run tests against the production database.'
      );
    }
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  const dbName = getDatabaseNameFromUri(uri);
  if (!dbName) {
    throw new Error(
      'SAFETY GUARD ACTIVATED: Invalid database URI structure. Unable to verify database name.'
    );
  }

  if (isTest) {
    if (dbName.toLowerCase() === 'bloodward') {
      throw new Error(
        `SAFETY GUARD ACTIVATED: Refusing to execute tests against production database '${dbName}'.\n` +
        `Automated tests must run against a dedicated test database (e.g. 'bloodward_test').`
      );
    }
  }

  const isProduction = process.env.NODE_ENV === 'production';

  // For all non-production environments (test, local development, etc.):
  // Strictly enforce that the target database is exactly 'bloodward_test'.
  if (!isProduction) {
    if (dbName.toLowerCase() !== 'bloodward_test') {
      throw new Error(
        `FATAL DATABASE SAFETY VIOLATION: Refusing to connect to database '${dbName}'.\n` +
        `Local development and testing must exclusively connect to 'bloodward_test'.\n` +
        `Target database must be exactly 'bloodward_test'. Startup aborted.`
      );
    }
  } else {
    // In production, ensure we don't accidentally connect to the test database
    if (dbName.toLowerCase() === 'bloodward_test') {
      throw new Error(
        `SAFETY GUARD ACTIVATED: Production environment cannot connect to test database '${dbName}'.`
      );
    }
  }

  return dbName;
}

const connectDB = async () => {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    const isTest = process.env.NODE_ENV === 'test';
    let mongoUri;

    if (!isProduction) {
      // For local development and testing, prioritize MONGODB_TEST_URI, or MONGODB_URI if pointing to bloodward_test
      mongoUri = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI;
      validateDatabaseSafety(mongoUri, isTest);
    } else {
      mongoUri = process.env.MONGODB_URI;
      validateDatabaseSafety(mongoUri, false);
    }

    let conn;
    try {
      conn = await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 20000, connectTimeoutMS: 10000 });
    } catch (connectErr) {
      const match = mongoUri.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@/);
      if (match) {
        const [, user, pass] = match;
        const targetDb = getDatabaseNameFromUri(mongoUri);
        const directUri = `mongodb://${user}:${pass}@ac-tbfdysc-shard-00-00.frj09tc.mongodb.net:27017,ac-tbfdysc-shard-00-01.frj09tc.mongodb.net:27017,ac-tbfdysc-shard-00-02.frj09tc.mongodb.net:27017/${targetDb}?ssl=true&replicaSet=atlas-qw3adr-shard-0&authSource=admin`;
        validateDatabaseSafety(directUri, isTest);
        conn = await mongoose.connect(directUri, { serverSelectionTimeoutMS: 20000, connectTimeoutMS: 10000 });
      } else {
        throw connectErr;
      }
    }
    const dbName = conn.connection.name || getDatabaseNameFromUri(mongoUri);
    console.log(`MongoDB connected successfully [DB: ${dbName}]: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('Failed to connect to MongoDB: ' + error.message);
    process.exit(1);
  }
};

export default connectDB;
