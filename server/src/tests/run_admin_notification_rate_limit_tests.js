import mongoose from 'mongoose';
import express from 'express';
import jwt from 'jsonwebtoken';
import { connectTestDB } from './testDb.js';
import User from '../models/user.model.js';
import NotificationProvider from '../models/notificationProvider.model.js';
import RateLimitHit from '../models/rateLimit.model.js';
import {
  adminProviderTestLimiter,
  ipProviderTestLimiter,
  unauthenticatedProviderTestLimiter,
  providerTestLimiter,
  resetProviderTestStores,
  MongoRateLimitStore,
} from '../middleware/rateLimiter.js';
import { testProvider } from '../controllers/adminNotificationController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    passed++;
    console.log(`  [✅ PASS] ${message}`);
  } else {
    console.error(`  [❌ FAIL] ${message}`);
  }
}

function createMockReqRes({
  body = {},
  params = {},
  query = {},
  user = null,
  ip = '198.51.100.99',
  headers = {},
  onFinish = null,
} = {}) {
  const reqHeaders = {};
  for (const [k, v] of Object.entries(headers)) {
    reqHeaders[k.toLowerCase()] = v;
  }

  const req = {
    body,
    params,
    query,
    user,
    ip,
    headers: reqHeaders,
    cookies: {},
    app: {
      get: (key) => (key === 'trust proxy' ? false : null),
    },
    get(name) {
      return reqHeaders[name.toLowerCase()] || null;
    },
  };

  let statusCode = 200;
  let responseData = null;
  const resHeaders = {};
  let finishCallback = onFinish;

  const res = {
    writableEnded: false,
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      this.writableEnded = true;
      if (finishCallback) finishCallback();
      return this;
    },
    send(data) {
      try {
        responseData = typeof data === 'string' ? JSON.parse(data) : data;
      } catch (e) {
        responseData = data;
      }
      this.writableEnded = true;
      if (finishCallback) finishCallback();
      return this;
    },
    setHeader(name, value) {
      resHeaders[name.toLowerCase()] = String(value);
      return this;
    },
    getHeader(name) {
      return resHeaders[name.toLowerCase()] || null;
    },
    get(name) {
      return resHeaders[name.toLowerCase()] || null;
    },
    getStatusCode() {
      return statusCode;
    },
    getResponse() {
      return responseData;
    },
  };

  let errorRaised = null;
  const next = (err) => {
    errorRaised = err;
    if (finishCallback) finishCallback();
  };

  return {
    req,
    res,
    next,
    setOnFinish: (cb) => { finishCallback = cb; },
    getStatus: () => statusCode,
    getResponse: () => responseData,
    getHeader: (name) => res.getHeader(name),
    getError: () => errorRaised,
  };
}

async function executeMiddleware(middleware, mockCtx) {
  return new Promise((resolve) => {
    let finished = false;
    const done = () => {
      if (!finished) {
        finished = true;
        resolve();
      }
    };

    mockCtx.setOnFinish(done);

    middleware(mockCtx.req, mockCtx.res, (err) => {
      if (err) mockCtx.res.error = err;
      done();
    });
  });
}

async function runTests() {
  console.log('==================================================');
  console.log('RUNNING ADMIN NOTIFICATION PROVIDER TEST RATE LIMIT TESTS');
  console.log('==================================================');

  await connectTestDB();
  await NotificationProvider.deleteMany({});
  await User.deleteMany({ email: /@ratelimit-test\.com$/ });

  // Create 3 admin users for multi-admin and shared-IP tests
  const adminA = await User.create({
    fullName: 'Admin Alice',
    email: 'alice@ratelimit-test.com',
    password: 'Password123!',
    phone: '9876543201',
    role: 'admin',
    isEmailVerified: true,
    isPhoneVerified: true,
  });

  const adminB = await User.create({
    fullName: 'Admin Bob',
    email: 'bob@ratelimit-test.com',
    password: 'Password123!',
    phone: '9876543202',
    role: 'admin',
    isEmailVerified: true,
    isPhoneVerified: true,
  });

  const adminC = await User.create({
    fullName: 'Admin Charlie',
    email: 'charlie@ratelimit-test.com',
    password: 'Password123!',
    phone: '9876543203',
    role: 'admin',
    isEmailVerified: true,
    isPhoneVerified: true,
  });

  const donorUser = await User.create({
    fullName: 'Donor Dan',
    email: 'dan@ratelimit-test.com',
    password: 'Password123!',
    phone: '9876543204',
    role: 'donor',
    bloodType: 'A+',
    isEmailVerified: true,
    isPhoneVerified: true,
  });

  // Enable test mode for rate limiters
  process.env.TEST_RATE_LIMITER = 'true';

  try {
    // =========================================================================
    // Test 1: Authenticated Administrator Limit (20 requests per 10 minutes)
    // =========================================================================
    console.log('\n--- Test 1: Authenticated Admin Limit (20 req / 10 min) ---');
    await resetProviderTestStores();

    const sharedIp1 = '198.51.100.10';
    let adminAAllowedCount = 0;
    let adminABlockedStatus = 0;
    let adminABlockedData = null;
    let adminARetryAfter = null;

    // Admin A sends 20 requests -> all 20 must pass
    for (let i = 1; i <= 20; i++) {
      const mockCtx = createMockReqRes({ user: adminA, ip: sharedIp1 });
      await executeMiddleware(providerTestLimiter, mockCtx);
      if (mockCtx.getStatus() === 200) {
        adminAAllowedCount++;
      }
    }

    assert(adminAAllowedCount === 20, 'Admin A: First 20 requests within 10 minutes are permitted');

    // Admin A sends 21st request -> must be blocked with HTTP 429
    const mockCtx21 = createMockReqRes({ user: adminA, ip: sharedIp1 });
    await executeMiddleware(providerTestLimiter, mockCtx21);
    adminABlockedStatus = mockCtx21.getStatus();
    adminABlockedData = mockCtx21.getResponse();
    adminARetryAfter = mockCtx21.getHeader('Retry-After');

    assert(adminABlockedStatus === 429, 'Admin A: 21st request is blocked with HTTP 429');
    assert(adminABlockedData?.success === false, 'Blocked response contains success: false');
    assert(adminABlockedData?.errorCode === 'ADMIN_RATE_LIMIT_EXCEEDED', 'Returns errorCode: ADMIN_RATE_LIMIT_EXCEEDED');
    assert(Boolean(adminARetryAfter), 'Response includes Retry-After header');
    assert(Number(adminARetryAfter) > 0 && Number(adminARetryAfter) <= 600, 'Retry-After is valid positive integer <= 600');
    assert(adminABlockedData?.retryAfter === Number(adminARetryAfter), 'Response JSON retryAfter matches Retry-After header');

    // =========================================================================
    // Test 2: Shared-IP Isolation (Admin A does not exhaust Admin B's quota)
    // =========================================================================
    console.log('\n--- Test 2: Shared-IP Isolation (Admin A vs Admin B) ---');
    // Admin A is currently exhausted (21 requests sent from sharedIp1)
    // Admin B is on the SAME IP (sharedIp1). Admin B must still have their full quota!
    let adminBAllowedCount = 0;
    for (let i = 1; i <= 20; i++) {
      const mockCtxB = createMockReqRes({ user: adminB, ip: sharedIp1 });
      await executeMiddleware(providerTestLimiter, mockCtxB);
      if (mockCtxB.getStatus() === 200) {
        adminBAllowedCount++;
      }
    }

    assert(adminBAllowedCount === 20, 'Admin B on same public IP can make 20 requests without interference from Admin A');

    // =========================================================================
    // Test 3: Secondary IP-Level Limit (40 requests per 10 minutes)
    // =========================================================================
    console.log('\n--- Test 3: Secondary IP-Level Limit (40 req / 10 min) ---');
    // On sharedIp1: Admin A made 20 requests, Admin B made 20 requests. Total on IP = 40!
    // Admin C on sharedIp1 now tries to make a request (41st request from sharedIp1)
    const mockCtxC41 = createMockReqRes({ user: adminC, ip: sharedIp1 });
    await executeMiddleware(providerTestLimiter, mockCtxC41);

    assert(mockCtxC41.getStatus() === 429, '41st request on shared IP is blocked by secondary IP-level limit with HTTP 429');
    assert(mockCtxC41.getResponse()?.errorCode === 'IP_RATE_LIMIT_EXCEEDED', 'Returns errorCode: IP_RATE_LIMIT_EXCEEDED');
    assert(Boolean(mockCtxC41.getHeader('Retry-After')), 'Secondary IP limit returns Retry-After header');

    // =========================================================================
    // Test 4: Server-Side User ID Keying (Header spoofing protection)
    // =========================================================================
    console.log('\n--- Test 4: Server-Side User ID Keying (Cannot bypass via headers) ---');
    await resetProviderTestStores();

    // Admin A exhausts quota on fresh IP
    const testIp2 = '198.51.100.20';
    for (let i = 1; i <= 20; i++) {
      const mockCtx = createMockReqRes({ user: adminA, ip: testIp2 });
      await executeMiddleware(providerTestLimiter, mockCtx);
    }

    // Admin A attempts to bypass by supplying spoofed headers
    const spoofedCtx = createMockReqRes({
      user: adminA,
      ip: testIp2,
      headers: {
        'x-forwarded-for': '203.0.113.199, 10.0.0.1',
        'x-real-ip': '203.0.113.199',
        'x-user-id': 'different_admin_id',
        'x-admin-id': 'admin_b_spoofed',
      },
    });

    await executeMiddleware(providerTestLimiter, spoofedCtx);
    assert(spoofedCtx.getStatus() === 429, 'Admin A cannot bypass rate limiting using spoofed X-Forwarded-For or X-User-Id headers');
    assert(spoofedCtx.getResponse()?.errorCode === 'ADMIN_RATE_LIMIT_EXCEEDED', 'Confirmed keyed by server-side user ID');

    // =========================================================================
    // Test 5: Strict IP-Level Limit for Unauthenticated Requests (5 req / 10 min)
    // =========================================================================
    console.log('\n--- Test 5: Unauthenticated Requests Strict IP Limit ---');
    await resetProviderTestStores();

    const unauthIp = '198.51.100.30';
    let unauthAllowed = 0;

    // Send 5 unauthenticated requests
    for (let i = 1; i <= 5; i++) {
      const mockCtx = createMockReqRes({ user: null, ip: unauthIp });
      await executeMiddleware(providerTestLimiter, mockCtx);
      if (mockCtx.getStatus() === 200) {
        unauthAllowed++;
      }
    }

    assert(unauthAllowed === 5, 'Unauthenticated requests: First 5 requests pass unauthenticated rate limit');

    // 6th unauthenticated request must be blocked with HTTP 429
    const mockCtxUnauth6 = createMockReqRes({ user: null, ip: unauthIp });
    await executeMiddleware(providerTestLimiter, mockCtxUnauth6);

    assert(mockCtxUnauth6.getStatus() === 429, 'Unauthenticated: 6th request triggers HTTP 429');
    assert(mockCtxUnauth6.getResponse()?.errorCode === 'UNAUTHENTICATED_RATE_LIMIT_EXCEEDED', 'Returns errorCode: UNAUTHENTICATED_RATE_LIMIT_EXCEEDED');
    assert(Boolean(mockCtxUnauth6.getHeader('Retry-After')), 'Unauthenticated 429 includes Retry-After header');

    // =========================================================================
    // Test 6: Failed Provider Tests Count Toward Applicable Limits
    // =========================================================================
    console.log('\n--- Test 6: Failed Provider Tests Count Toward Limits ---');
    await resetProviderTestStores();

    const testIp3 = '198.51.100.40';
    // Admin C makes 20 test attempts that fail (e.g. invalid provider ID or invalid params)
    for (let i = 1; i <= 20; i++) {
      const mockCtx = createMockReqRes({
        user: adminC,
        ip: testIp3,
        params: { id: new mongoose.Types.ObjectId().toString() }, // Non-existent provider
      });

      // Pass through rate limiter first
      await executeMiddleware(providerTestLimiter, mockCtx);
      // Even if downstream handler returns 400/404, rate limiter already counted it
    }

    // 21st attempt from Admin C is blocked by rate limiter
    const mockCtx21Failed = createMockReqRes({ user: adminC, ip: testIp3 });
    await executeMiddleware(providerTestLimiter, mockCtx21Failed);

    assert(mockCtx21Failed.getStatus() === 429, 'Failed provider tests consume quota; 21st failed attempt is blocked with HTTP 429');
    assert(mockCtx21Failed.getResponse()?.errorCode === 'ADMIN_RATE_LIMIT_EXCEEDED', 'Rate limiter blocked before reaching handler');

    // =========================================================================
    // Test 7: Accurate Retry-After Value Verification
    // =========================================================================
    console.log('\n--- Test 7: Accurate Retry-After Header ---');
    const retryHeaderVal = mockCtx21Failed.getHeader('Retry-After');
    const retryParsed = parseInt(retryHeaderVal, 10);
    assert(!isNaN(retryParsed), 'Retry-After is a valid numeric string');
    assert(retryParsed > 0, 'Retry-After value is strictly greater than 0');
    assert(retryParsed <= 600, 'Retry-After value is within 10-minute window (<= 600 seconds)');
    assert(mockCtx21Failed.getResponse()?.retryAfter === retryParsed, 'Response JSON body matches Retry-After header value');

    // =========================================================================
    // Test 8: Cooldown / Store Reset Restores Quota
    // =========================================================================
    console.log('\n--- Test 8: Cooldown / Window Reset Restores Quota ---');
    // Admin C was blocked in Test 6. Reset store (simulating 10-minute cooldown expiry)
    await resetProviderTestStores();

    const mockCtxAfterReset = createMockReqRes({ user: adminC, ip: testIp3 });
    await executeMiddleware(providerTestLimiter, mockCtxAfterReset);

    assert(mockCtxAfterReset.getStatus() === 200, 'After cooldown window reset, Admin C requests succeed again (HTTP 200)');

    // =========================================================================
    // Test 9: Security Protections & RBAC Preservation
    // =========================================================================
    console.log('\n--- Test 9: Security Protections & RBAC Preservation ---');
    // Donor user role cannot bypass admin restriction
    const donorCtx = createMockReqRes({ user: donorUser });
    const rbacMiddleware = restrictTo('admin');
    let rbacError = null;

    rbacMiddleware(donorCtx.req, donorCtx.res, (err) => {
      rbacError = err;
    });

    assert(Boolean(rbacError), 'Non-admin user (donor) is blocked by RBAC');
    assert(rbacError?.statusCode === 403, 'RBAC returns HTTP 403 Forbidden for non-admin');

    // =========================================================================
    // Test 10: Render Trusted Proxy Configuration & Client Header Spoofing Protection
    // =========================================================================
    console.log('\n--- Test 10: Render Trusted Proxy & Header Spoofing Protection ---');
    await resetProviderTestStores();

    // 10.1: Express instance configured for Render (trust proxy: 1)
    const renderApp = express();
    renderApp.set('trust proxy', 1);

    renderApp.get('/api/test-proxy-ip', (req, res) => {
      res.json({ ip: req.ip });
    });

    const renderServer = renderApp.listen(0);
    const renderPort = renderServer.address().port;

    try {
      // In Render topology: Client (198.51.100.99) sends to Render Proxy.
      // If attacker prepends a spoofed IP, Render Proxy appends the real client IP: "spoofed_ip, 198.51.100.99"
      const resSpoofed = await fetch(`http://127.0.0.1:${renderPort}/api/test-proxy-ip`, {
        headers: {
          'x-forwarded-for': '203.0.113.195, 198.51.100.99',
        },
      });
      const dataSpoofed = await resSpoofed.json();

      assert(
        dataSpoofed.ip === '198.51.100.99',
        'Render proxy (trust proxy: 1) takes real client IP (198.51.100.99) and rejects spoofed IP (203.0.113.195)'
      );

      // Verify attacker varying prepended spoofed IPs cannot bypass IP rate limit
      let spoofBypassAttempts = 0;
      const attackerRealIp = '198.51.100.77';

      // Send 40 requests through the secondary IP limiter with different spoofed IPs prepended
      for (let i = 1; i <= 40; i++) {
        const mockCtx = createMockReqRes({
          user: adminA,
          ip: attackerRealIp,
          headers: {
            'x-forwarded-for': `10.${i}.0.1, ${attackerRealIp}`,
          },
        });
        await executeMiddleware(ipProviderTestLimiter, mockCtx);
        if (mockCtx.getStatus() === 200) spoofBypassAttempts++;
      }

      assert(spoofBypassAttempts === 40, 'First 40 requests from attacker real IP are counted in IP bucket');

      // 41st request with yet another spoofed IP prepended
      const mockCtx41Spoofed = createMockReqRes({
        user: adminA,
        ip: attackerRealIp,
        headers: {
          'x-forwarded-for': `10.99.0.1, ${attackerRealIp}`,
        },
      });
      await executeMiddleware(ipProviderTestLimiter, mockCtx41Spoofed);

      assert(
        mockCtx41Spoofed.getStatus() === 429,
        '41st request with new spoofed header is blocked with HTTP 429; spoofed headers cannot bypass rate limit'
      );
    } finally {
      renderServer.close();
    }

    // 10.2: Express instance configured for Local Development (trust proxy: false)
    const localDevApp = express();
    localDevApp.set('trust proxy', false);

    localDevApp.get('/api/test-local-ip', (req, res) => {
      res.json({ ip: req.ip });
    });

    const localServer = localDevApp.listen(0);
    const localPort = localServer.address().port;

    try {
      const resLocal = await fetch(`http://127.0.0.1:${localPort}/api/test-local-ip`, {
        headers: {
          'x-forwarded-for': '203.0.113.195',
        },
      });
      const dataLocal = await resLocal.json();

      assert(
        dataLocal.ip === '127.0.0.1' || dataLocal.ip === '::1' || dataLocal.ip === '::ffff:127.0.0.1',
        'Local development (trust proxy: false) ignores X-Forwarded-For entirely and resolves direct socket IP'
      );
    } finally {
      localServer.close();
    }

    // =========================================================================
    // Test 11: Multi-Instance Rate-Limit Storage & Atomic DB Synchronization
    // =========================================================================
    console.log('\n--- Test 11: Multi-Instance Rate-Limit Storage & Synchronization ---');
    await resetProviderTestStores();

    // 11.1: Verify RateLimitHit documents exist in MongoDB
    const testAdminId = adminA._id.toString();

    // Simulate two distinct server instances sharing the same database: Instance 1 and Instance 2
    const instance1AdminStore = new MongoRateLimitStore({ prefix: 'admin_test:', windowMs: 10 * 60 * 1000 });
    const instance2AdminStore = new MongoRateLimitStore({ prefix: 'admin_test:', windowMs: 10 * 60 * 1000 });

    // Alternating requests across Instance 1 and Instance 2:
    // 10 requests to Instance 1, 10 requests to Instance 2 = 20 total
    let instance1Hits = 0;
    let instance2Hits = 0;

    for (let i = 1; i <= 10; i++) {
      const res1 = await instance1AdminStore.increment(`admin:${testAdminId}`);
      if (res1.totalHits === i * 2 - 1) instance1Hits++;

      const res2 = await instance2AdminStore.increment(`admin:${testAdminId}`);
      if (res2.totalHits === i * 2) instance2Hits++;
    }

    assert(instance1Hits === 10 && instance2Hits === 10, 'Instance 1 and Instance 2 atomically share and synchronize counter up to 20 hits');

    // 21st request to Instance 1 shows totalHits = 21
    const res21 = await instance1AdminStore.increment(`admin:${testAdminId}`);
    assert(res21.totalHits === 21, '21st hit across instances atomically increments shared counter to 21');

    // Check directly in MongoDB collection
    const dbDoc = await RateLimitHit.findOne({ key: `admin_test:admin:${testAdminId}` });
    assert(Boolean(dbDoc), 'Rate-limit document exists in MongoDB rate_limit_hits collection');
    assert(dbDoc.totalHits === 21, 'MongoDB document stores exact atomic totalHits count across instances');
    assert(dbDoc.resetTime > new Date(), 'MongoDB document stores future resetTime window');

    // 11.2: Verify TTL Index is defined on resetTime
    const indexes = await RateLimitHit.collection.getIndexes();
    const hasResetTimeIndex = Boolean(indexes.resetTime_1);
    assert(hasResetTimeIndex, 'RateLimitHit collection has index on resetTime for TTL expiration');

    // 11.3: Verify all 3 buckets have isolated namespaces in MongoDB
    await instance1AdminStore.increment('sample_admin_key');
    const ipStore = new MongoRateLimitStore({ prefix: 'ip_test:', windowMs: 10 * 60 * 1000 });
    const unauthStore = new MongoRateLimitStore({ prefix: 'unauth_test:', windowMs: 10 * 60 * 1000 });

    await ipStore.increment('198.51.100.99');
    await unauthStore.increment('198.51.100.99');

    const adminDoc = await RateLimitHit.findOne({ key: 'admin_test:sample_admin_key' });
    const ipDoc = await RateLimitHit.findOne({ key: 'ip_test:198.51.100.99' });
    const unauthDoc = await RateLimitHit.findOne({ key: 'unauth_test:198.51.100.99' });

    assert(Boolean(adminDoc), 'Admin bucket persists under admin_test: prefix');
    assert(Boolean(ipDoc), 'IP bucket persists under ip_test: prefix');
    assert(Boolean(unauthDoc), 'Unauthenticated bucket persists under unauth_test: prefix');
    assert(ipDoc.totalHits === 1 && unauthDoc.totalHits === 1, 'IP bucket and unauthenticated IP bucket maintain isolated counters in MongoDB');
  } finally {
    delete process.env.TEST_RATE_LIMITER;
  }

  await User.deleteMany({ email: /@ratelimit-test\.com$/ });
  await NotificationProvider.deleteMany({});
  await mongoose.disconnect();

  console.log('\n==================================================');
  console.log(`FINAL RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log('==================================================');

  process.exit(passed === total ? 0 : 1);
}

runTests().catch(async (err) => {
  console.error('Rate Limit Test Suite Failure:', err);
  try {
    await mongoose.disconnect();
  } catch (e) {}
  process.exit(1);
});
