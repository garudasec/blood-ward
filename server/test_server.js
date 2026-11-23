import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDatabaseNameFromUri, validateDatabaseSafety } from './src/config/db.js';
import { enforceTestEnvironment, getTestMongoUri } from './src/tests/testDb.js';

dotenv.config();

console.log('=== BLOODWARD TEST SERVER PRE-FLIGHT VERIFICATION ===');

// 1. Inspect the effective MongoDB test URI
const testUri = getTestMongoUri();
const dbName = getDatabaseNameFromUri(testUri);

console.log('Effective Target DB Name:', dbName);

// 2 & 3. Abort if the database name is not exactly bloodward_test
if (dbName !== 'bloodward_test') {
  console.error(`FATAL SAFETY VIOLATION: Database name is '${dbName}', expected exactly 'bloodward_test'. Aborting.`);
  process.exit(1);
}

// 4. Verify production database guard is active
let guardTriggered = false;
try {
  validateDatabaseSafety('mongodb+srv://fake:secret@cluster0.fake.mongodb.net/bloodward?retryWrites=true&w=majority', true);
} catch (e) {
  if (e.message.includes("Refusing to execute tests against production database 'bloodward'")) {
    guardTriggered = true;
  }
}

if (!guardTriggered) {
  console.error('FATAL SAFETY VIOLATION: Production database safety guard failed to block production URI. Aborting.');
  process.exit(1);
}
console.log('[SAFETY GUARD VERIFIED]: Production database guard is ACTIVE.');

// Enforce test environment
enforceTestEnvironment();

console.log('[ENVIRONMENT ENFORCED]: NODE_ENV=' + process.env.NODE_ENV);
console.log('=== STARTING BLOODWARD BACKEND SERVER ===');

// Import and start server
await import('./server.js');
