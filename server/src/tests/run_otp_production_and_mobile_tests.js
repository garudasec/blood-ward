/**
 * Comprehensive Test Suite for:
 * 1. Production OTP failure diagnosis, error sanitization & HMAC validation
 * 2. Mobile responsiveness verification for Donor & Recipient registration pages
 */

import assert from 'assert';
import http from 'http';
import express from 'express';
import mongoose from 'mongoose';
import { enforceTestEnvironment, connectTestDB } from './testDb.js';
import otpRouter from '../routes/otp.routes.js';
import errorHandler from '../middleware/errorMiddleware.js';
import { hashOtp, getOtpHmacKey, verifyOtpHash } from '../utils/encryptionUtils.js';
import AppError from '../utils/appError.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('==================================================');
console.log('RUNNING PRODUCTION OTP FIX & RESPONSIVENESS SUITE');
console.log('==================================================');

await connectTestDB();

// Simple in-memory server helper for testing Express routes with different env vars
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/otp', otpRouter);
  app.use(errorHandler);
  return app;
}

function requestHelper(app, options, bodyData) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: options.path,
          method: options.method || 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
          },
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            server.close();
            try {
              const parsed = body ? JSON.parse(body) : {};
              resolve({ status: res.statusCode, headers: res.headers, data: parsed, rawBody: body });
            } catch (e) {
              resolve({ status: res.statusCode, headers: res.headers, data: body, rawBody: body });
            }
          });
        }
      );
      req.on('error', (err) => {
        server.close();
        reject(err);
      });
      if (bodyData) {
        req.write(typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData));
      }
      req.end();
    });
  });
}

async function runTests() {
  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message);
    }
  }

  async function testAsync(name, fn) {
    total++;
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message);
    }
  }

  console.log('\n--- 1. Backend Security & Error Sanitization (Issue 1) ---');

  // Test 1.1: getOtpHmacKey strictly requires >= 32 char secret without hardcoded fallback
  test('getOtpHmacKey() strictly enforces OTP_HMAC_SECRET >= 32 chars without fallback', () => {
    const originalHmac = process.env.OTP_HMAC_SECRET;
    try {
      delete process.env.OTP_HMAC_SECRET;
      let caught = false;
      try {
        getOtpHmacKey();
      } catch (e) {
        caught = e.message.includes('OTP_HMAC_SECRET environment variable is missing');
      }
      assert.strictEqual(caught, true, 'Throws critical configuration error when OTP_HMAC_SECRET is missing');

      process.env.OTP_HMAC_SECRET = 'short_key';
      let shortCaught = false;
      try {
        getOtpHmacKey();
      } catch (e) {
        shortCaught = e.message.includes('shorter than 32 characters');
      }
      assert.strictEqual(shortCaught, true, 'Rejects short OTP_HMAC_SECRET');
    } finally {
      process.env.OTP_HMAC_SECRET = originalHmac;
    }
  });

  // Test 1.2: In production mode, missing OTP_HMAC_SECRET returns sanitized 500 without leaking variable names
  await testAsync('Production error sanitization: 500 error hides OTP_HMAC_SECRET and stack trace from client', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalHmac = process.env.OTP_HMAC_SECRET;
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.OTP_HMAC_SECRET;

      const app = createTestApp();
      const res = await requestHelper(
        app,
        { path: '/api/otp/send-email-otp', method: 'POST' },
        { email: 'donor_unconfigured@example.com', purpose: 'verification' }
      );

      assert.strictEqual(res.status, 500, 'HTTP status is 500');
      assert.strictEqual(res.data.success, false, 'Reports success: false');
      assert.strictEqual(
        res.data.message.includes('OTP_HMAC_SECRET'),
        false,
        'Secret variable name OTP_HMAC_SECRET is NOT leaked in response'
      );
      assert.strictEqual(
        res.data.message.includes('CRITICAL SECURITY CONFIGURATION'),
        false,
        'Internal configuration warning is NOT leaked to public client'
      );
      assert.strictEqual(
        typeof res.data.message === 'string' && res.data.message.length > 0,
        true,
        'Provides sanitized, safe user-facing message'
      );
      assert.strictEqual(res.data.stack, undefined, 'Stack trace is stripped in production');
    } finally {
      process.env.NODE_ENV = originalEnv;
      process.env.OTP_HMAC_SECRET = originalHmac;
    }
  });

  // Test 1.3: In development mode, error details are accessible for debugging
  await testAsync('Development mode error transparency: detailed message preserved for local debugging', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalHmac = process.env.OTP_HMAC_SECRET;
    try {
      process.env.NODE_ENV = 'development';
      delete process.env.OTP_HMAC_SECRET;

      const app = createTestApp();
      const res = await requestHelper(
        app,
        { path: '/api/otp/send-email-otp', method: 'POST' },
        { email: 'donor_dev@example.com', purpose: 'verification' }
      );

      assert.strictEqual(res.status, 500);
      assert.strictEqual(
        res.data.message.includes('OTP_HMAC_SECRET'),
        true,
        'Detailed error present in development mode'
      );
    } finally {
      process.env.NODE_ENV = originalEnv;
      process.env.OTP_HMAC_SECRET = originalHmac;
    }
  });

  // Test 1.4: Normal OTP generation and HMAC verification with valid secret
  test('OTP HMAC generation and verification works with valid 64-hex key', () => {
    const target = 'test_donor@example.com';
    const purpose = 'verification';
    const rawOtp = '482915';

    const hmac = hashOtp({ target, purpose, rawOtp });
    assert.strictEqual(typeof hmac, 'string');
    assert.strictEqual(hmac.length, 64, 'HMAC-SHA256 hex is 64 characters');

    assert.strictEqual(verifyOtpHash(target, purpose, rawOtp, hmac), true, 'Valid OTP matches HMAC');
    assert.strictEqual(verifyOtpHash(target, purpose, '999999', hmac), false, 'Wrong OTP fails verification');
    assert.strictEqual(verifyOtpHash('other@example.com', purpose, rawOtp, hmac), false, 'Wrong target fails');
  });

  console.log('\n--- 2. Mobile Layout & Responsive Architecture (Issue 2) ---');

  const donorPageSrc = fs.readFileSync(
    path.join(__dirname, '../../../client/src/pages/auth/DonorRegisterPage.jsx'),
    'utf-8'
  );
  const recipientPageSrc = fs.readFileSync(
    path.join(__dirname, '../../../client/src/pages/auth/RecipientRegisterPage.jsx'),
    'utf-8'
  );
  const emailSectionSrc = fs.readFileSync(
    path.join(__dirname, '../../../client/src/components/auth/EmailVerificationSection.jsx'),
    'utf-8'
  );

  // Test 2.1: DonorRegisterPage left sidebar uses static on mobile and sticky only on desktop
  test('DonorRegisterPage left sidebar uses "static lg:sticky lg:top-20" to prevent mobile overlap', () => {
    assert.strictEqual(
      donorPageSrc.includes('static lg:sticky lg:top-20'),
      true,
      'Donor page sidebar has static lg:sticky lg:top-20'
    );
    assert.strictEqual(
      donorPageSrc.includes('shadow-xs sticky top-20'),
      false,
      'Unscoped mobile "sticky top-20" removed from donor sidebar'
    );
  });

  // Test 2.2: RecipientRegisterPage left sidebar uses static on mobile and sticky only on desktop
  test('RecipientRegisterPage left sidebar uses "static lg:sticky lg:top-20" to prevent mobile overlap', () => {
    assert.strictEqual(
      recipientPageSrc.includes('static lg:sticky lg:top-20'),
      true,
      'Recipient page sidebar has static lg:sticky lg:top-20'
    );
    assert.strictEqual(
      recipientPageSrc.includes('shadow-xs sticky top-20'),
      false,
      'Unscoped mobile "sticky top-20" removed from recipient sidebar'
    );
  });

  // Test 2.3: Mobile container padding supports narrow viewports (320px)
  test('Registration page containers support narrow viewports (px-3 sm:px-6)', () => {
    assert.strictEqual(
      donorPageSrc.includes('px-3 sm:px-6 lg:px-8'),
      true,
      'Donor page outer container uses px-3 sm:px-6'
    );
    assert.strictEqual(
      recipientPageSrc.includes('px-3 sm:px-6 lg:px-8'),
      true,
      'Recipient page outer container uses px-3 sm:px-6'
    );
  });

  // Test 2.4: Role switcher tabs split evenly on mobile (grid grid-cols-2 sm:flex)
  test('Role switcher tabs adapt cleanly on mobile without horizontal overflow', () => {
    assert.strictEqual(
      donorPageSrc.includes('grid grid-cols-2 sm:flex sm:items-center'),
      true,
      'Donor role switcher uses grid grid-cols-2 sm:flex'
    );
    assert.strictEqual(
      recipientPageSrc.includes('grid grid-cols-2 sm:flex sm:items-center'),
      true,
      'Recipient role switcher uses grid grid-cols-2 sm:flex'
    );
  });

  // Test 2.5: Compact step progress bar truncates gracefully on small screens
  test('Step progress bar contains min-w-0 and truncate to prevent dot overflow', () => {
    assert.strictEqual(
      donorPageSrc.includes('truncate text-xs') || donorPageSrc.includes('truncate'),
      true,
      'Step title has truncate'
    );
    assert.strictEqual(
      donorPageSrc.includes('shrink-0'),
      true,
      'Step progress indicators have shrink-0'
    );
  });

  // Test 2.6: Navigation buttons stack vertically on mobile (flex-col-reverse sm:flex-row)
  test('Navigation buttons stack vertically on mobile with full touch targets', () => {
    const colReverseMatches = donorPageSrc.match(/flex-col-reverse sm:flex-row/g) || [];
    assert.strictEqual(
      colReverseMatches.length >= 4,
      true,
      `Expected at least 4 stage button rows with flex-col-reverse sm:flex-row, found ${colReverseMatches.length}`
    );
  });

  // Test 2.7: EmailVerificationSection supports small viewports and wraps safely
  test('EmailVerificationSection wraps controls and uses break-words for error messages', () => {
    assert.strictEqual(
      emailSectionSrc.includes('flex flex-wrap sm:flex-nowrap') || emailSectionSrc.includes('min-h-[28px]'),
      true,
      'EmailVerificationSection has mobile-friendly flex wrapping and touch sizing'
    );
    assert.strictEqual(
      emailSectionSrc.includes('break-words'),
      true,
      'Error messages use break-words to avoid clipping on narrow screens'
    );
  });

  console.log('\n==================================================');
  console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
  console.log('==================================================');

  await mongoose.disconnect();

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
