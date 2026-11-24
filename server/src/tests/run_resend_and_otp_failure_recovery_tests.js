import './testDb.js';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

import connectDB from '../config/db.js';
import User from '../models/user.model.js';
import Otp from '../models/otp.model.js';
import OtpThrottle from '../models/otpThrottle.model.js';
import NotificationProvider from '../models/notificationProvider.model.js';
import NotificationLog from '../models/notificationLog.model.js';
import { ResendEmailProvider } from '../services/notification/resendEmailProvider.js';
import { SmtpEmailProvider } from '../services/notification/smtpEmailProvider.js';
import notificationManager from '../services/notification/notificationManager.js';
import { generateAndSendOtp, verifyOtp, checkAndRecordTargetRateLimit } from '../services/otpService.js';

import authRouter from '../routes/auth.routes.js';
import otpRouter from '../routes/otp.routes.js';
import adminRouter from '../routes/admin.routes.js';
import notFoundHandler from '../middleware/notFoundMiddleware.js';
import errorHandler from '../middleware/errorMiddleware.js';
import sanitizeMiddleware from '../middleware/sanitizeMiddleware.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(helmet());
app.use(sanitizeMiddleware);
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

app.use('/api/auth', authRouter);
app.use('/api/otp', otpRouter);
app.use('/api/admin', adminRouter);
app.use(notFoundHandler);
app.use(errorHandler);

let server;
let baseUrl;
let passed = 0;
let failed = 0;

const signToken = (id, role = 'admin') =>
  jwt.sign({ id, role, tokenVersion: 0 }, process.env.JWT_SECRET || 'test_jwt_secret_32_characters_long_min', {
    expiresIn: '1d',
  });

function assert(condition, message) {
  if (condition) {
    console.log(`[✅ PASS] ${message}`);
    passed++;
  } else {
    console.error(`[❌ FAIL] ${message}`);
    failed++;
  }
}

async function request(endpoint, options = {}) {
  const url = `${baseUrl}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  let data = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = text;
  }
  return { status: res.status, headers: res.headers, data };
}

async function runTests() {
  console.log('========================================================================');
  console.log('   BloodWard — Resend Email Delivery & OTP Failure Recovery Tests');
  console.log('========================================================================\n');

  // Active mock dispatcher for all ResendEmailProvider instances
  let currentMockFetch = null;
  let totalMockCalls = 0;

  ResendEmailProvider.mockFetch = async (url, opts) => {
    totalMockCalls++;
    if (currentMockFetch) {
      return currentMockFetch(url, opts);
    }
    // Default safe mock responses
    if (url.includes('/emails')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: `mock_email_${Date.now()}` }),
      };
    }
    if (url.includes('/api-keys')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: [{ id: 'mock_key_default' }] }),
      };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  };

  try {
    await connectDB();
    console.log('[Setup] Database connection verified.');

    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
    console.log(`[Setup] Ephemeral test server active at ${baseUrl}.\n`);

    // =======================================================================
    // SECTION 1: ResendEmailProvider Unit Tests
    // =======================================================================
    console.log('--- Section 1: ResendEmailProvider Unit Tests ---');

    // 1.1 Constructor validation
    let threwConstructor = false;
    try {
      new ResendEmailProvider({});
    } catch (err) {
      threwConstructor = true;
      assert(err.message.includes('API key is required'), 'ResendEmailProvider throws when apiKey is missing');
    }
    assert(threwConstructor, 'ResendEmailProvider rejects empty constructor');

    // 1.1b Test Safety Guard: Live calls forbidden without mock in test mode
    const savedMockFetch = ResendEmailProvider.mockFetch;
    ResendEmailProvider.mockFetch = null;
    let threwSafetyGuard = false;
    try {
      new ResendEmailProvider({ apiKey: 're_test_dummy' });
    } catch (err) {
      threwSafetyGuard = true;
      assert(err.message.includes('TEST SAFETY GUARD'), 'Safety guard blocks unmocked ResendEmailProvider in test environment');
    }
    assert(threwSafetyGuard, 'Live HTTP requests to Resend API are strictly forbidden in test environment');
    ResendEmailProvider.mockFetch = savedMockFetch;

    // 1.2 Formatted From Address
    const providerWithCustomSender = new ResendEmailProvider({
      apiKey: 're_test_key_123',
      senderAddress: 'notifications@bloodward.org',
      senderName: 'BloodWard Healthcare',
      fetchOverride: async () => ({ ok: true, json: async () => ({ data: [] }) }),
    });
    assert(
      providerWithCustomSender.getFormattedFrom() === 'BloodWard Healthcare <notifications@bloodward.org>',
      'ResendEmailProvider formats sender display name and email address'
    );

    // 1.3 Verify Connection — Success (200 OK)
    const mockSuccessFetch = async (url, opts) => {
      assert(opts.headers.Authorization === 'Bearer re_test_key_123', 'Resend uses Bearer authorization header');
      return { ok: true, status: 200, json: async () => ({ data: [{ id: 'key_1' }] }) };
    };
    const pSuccess = new ResendEmailProvider({
      apiKey: 're_test_key_123',
      fetchOverride: mockSuccessFetch,
    });
    const verifySuccessRes = await pSuccess.verifyConnection();
    assert(verifySuccessRes.success === true, 'verifyConnection returns success: true on 200 OK');

    // 1.4 Verify Connection — 401 Unauthorized
    const mockAuthFailFetch = async () => ({
      ok: false,
      status: 401,
      json: async () => ({ message: 'API key is invalid' }),
    });
    const pAuthFail = new ResendEmailProvider({
      apiKey: 're_invalid_key',
      fetchOverride: mockAuthFailFetch,
    });
    const verifyAuthFailRes = await pAuthFail.verifyConnection();
    assert(verifyAuthFailRes.success === false, 'verifyConnection returns success: false on 401');
    assert(verifyAuthFailRes.errorCode === 'AUTH_FAILURE', 'verifyConnection maps 401 to AUTH_FAILURE');

    // 1.5 Send Mail — Success (200 OK)
    const mockSendSuccessFetch = async (url, opts) => {
      const body = JSON.parse(opts.body);
      assert(body.to[0] === 'donor@example.com', 'sendMail normalizes recipient to array');
      assert(body.subject === 'Test Subject', 'sendMail passes subject');
      assert(body.html === '<p>Test</p>', 'sendMail passes html');
      return { ok: true, status: 200, json: async () => ({ id: 'email_resend_xyz123' }) };
    };
    const pSendSuccess = new ResendEmailProvider({
      apiKey: 're_test_key_123',
      fetchOverride: mockSendSuccessFetch,
    });
    const sendSuccessRes = await pSendSuccess.sendMail({
      to: 'donor@example.com',
      subject: 'Test Subject',
      html: '<p>Test</p>',
    });
    assert(sendSuccessRes.success === true, 'sendMail returns success: true on 200 OK');
    assert(sendSuccessRes.messageId === 'email_resend_xyz123', 'sendMail captures Resend messageId');

    // 1.6 Send Mail — 403 Unverified Sender
    const mockUnverifiedFetch = async () => ({
      ok: false,
      status: 403,
      json: async () => ({ message: 'Domain not verified. You can only send to onboarding@resend.dev' }),
    });
    const pUnverified = new ResendEmailProvider({
      apiKey: 're_test_key_123',
      fetchOverride: mockUnverifiedFetch,
    });
    const unverifiedRes = await pUnverified.sendMail({
      to: 'other@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
    });
    assert(unverifiedRes.success === false, 'sendMail returns success: false on 403');
    assert(unverifiedRes.errorCode === 'UNVERIFIED_SENDER', 'sendMail maps 403 to UNVERIFIED_SENDER');
    assert(unverifiedRes.isUncertain === false, 'Unverified sender is a definite failure (isUncertain: false)');

    // 1.7 Send Mail — 429 Rate Limit
    const mockRateLimitFetch = async () => ({
      ok: false,
      status: 429,
      json: async () => ({ message: 'Too many requests' }),
    });
    const pRateLimit = new ResendEmailProvider({
      apiKey: 're_test_key_123',
      fetchOverride: mockRateLimitFetch,
    });
    const rateLimitRes = await pRateLimit.sendMail({
      to: 'donor@example.com',
      subject: 'Test',
      text: 'Test',
    });
    assert(rateLimitRes.success === false, 'sendMail returns success: false on 429');
    assert(rateLimitRes.errorCode === 'RATE_LIMIT', 'sendMail maps 429 to RATE_LIMIT');

    // 1.8 Send Mail — Timeout (TimeoutError / AbortError -> isUncertain: true)
    const mockTimeoutFetch = async () => {
      const err = new Error('The operation was aborted due to timeout');
      err.name = 'TimeoutError';
      throw err;
    };
    const pTimeout = new ResendEmailProvider({
      apiKey: 're_test_key_123',
      fetchOverride: mockTimeoutFetch,
    });
    const timeoutRes = await pTimeout.sendMail({
      to: 'donor@example.com',
      subject: 'Test',
      text: 'Test',
    });
    assert(timeoutRes.success === false, 'sendMail returns success: false on timeout');
    assert(timeoutRes.errorCode === 'TIMEOUT', 'sendMail maps TimeoutError to TIMEOUT');
    assert(timeoutRes.isUncertain === true, 'sendMail sets isUncertain: true on timeout');

    // 1.9 Send Mail — Network Error (TypeError -> isUncertain: true)
    const mockNetworkFetch = async () => {
      const err = new TypeError('fetch failed: connection reset by peer');
      throw err;
    };
    const pNetwork = new ResendEmailProvider({
      apiKey: 're_test_key_123',
      fetchOverride: mockNetworkFetch,
    });
    const networkRes = await pNetwork.sendMail({
      to: 'donor@example.com',
      subject: 'Test',
      text: 'Test',
    });
    assert(networkRes.success === false, 'sendMail returns success: false on network error');
    assert(networkRes.errorCode === 'NETWORK_ERROR', 'sendMail maps TypeError to NETWORK_ERROR');
    assert(networkRes.isUncertain === true, 'Generic fetch/network error is treated conservatively as isUncertain: true');

    // 1.10 Send Mail — Missing or invalid message ID on 200 OK
    const mockMissingIdFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
    const pMissingId = new ResendEmailProvider({
      apiKey: 're_test_key_123',
      fetchOverride: mockMissingIdFetch,
    });
    const missingIdRes = await pMissingId.sendMail({
      to: 'donor@example.com',
      subject: 'Test',
      text: 'Test',
    });
    assert(missingIdRes.success === false, 'sendMail returns success: false on missing messageId in 200 response');
    assert(missingIdRes.errorCode === 'INVALID_PROVIDER_RESPONSE', 'sendMail sets errorCode INVALID_PROVIDER_RESPONSE');
    assert(missingIdRes.isUncertain === true, 'Missing ID on 200 OK is marked isUncertain: true');

    // 1.11 Send Mail — 500 Server Error
    const mock500Fetch = async () => ({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Internal Server Error' }),
    });
    const p500 = new ResendEmailProvider({
      apiKey: 're_test_key_123',
      fetchOverride: mock500Fetch,
    });
    const error500Res = await p500.sendMail({
      to: 'donor@example.com',
      subject: 'Test',
      text: 'Test',
    });
    assert(error500Res.success === false, 'sendMail returns success: false on HTTP 500');
    assert(error500Res.errorCode === 'DISPATCH_ERROR', 'sendMail sets errorCode DISPATCH_ERROR on HTTP 500');
    assert(error500Res.isUncertain === true, 'HTTP 5xx is treated conservatively as isUncertain: true');

    // 1.12 Send Mail — 403 API Key / Restricted Permissions (AUTH_FAILURE)
    const mock403KeyFetch = async () => ({
      ok: false,
      status: 403,
      json: async () => ({ message: 'Restricted API key does not have permission to send' }),
    });
    const p403Key = new ResendEmailProvider({
      apiKey: 're_test_key_123',
      fetchOverride: mock403KeyFetch,
    });
    const key403Res = await p403Key.sendMail({
      to: 'donor@example.com',
      subject: 'Test',
      text: 'Test',
    });
    assert(key403Res.success === false, 'sendMail returns success: false on 403 key error');
    assert(key403Res.errorCode === 'AUTH_FAILURE', '403 with permission/key message mapped to AUTH_FAILURE');
    assert(key403Res.isUncertain === false, '403 key error is not uncertain');

    // 1.13 Send Mail — 403 Generic Forbidden (FORBIDDEN)
    const mock403GenericFetch = async () => ({
      ok: false,
      status: 403,
      json: async () => ({ message: 'Access denied to this resource' }),
    });
    const p403Generic = new ResendEmailProvider({
      apiKey: 're_test_key_123',
      fetchOverride: mock403GenericFetch,
    });
    const generic403Res = await p403Generic.sendMail({
      to: 'donor@example.com',
      subject: 'Test',
      text: 'Test',
    });
    assert(generic403Res.success === false, 'sendMail returns success: false on 403 generic');
    assert(generic403Res.errorCode === 'FORBIDDEN', '403 without specific sender keywords mapped to FORBIDDEN');
    assert(generic403Res.isUncertain === false, '403 generic error is not uncertain');

    // 1.14 Verify Connection — 403 classification
    const pVerify403Key = new ResendEmailProvider({
      apiKey: 're_test_key_123',
      fetchOverride: async () => ({
        ok: false,
        status: 403,
        json: async () => ({ message: 'Token restricted by organization policy' }),
      }),
    });
    const verify403KeyRes = await pVerify403Key.verifyConnection();
    assert(verify403KeyRes.errorCode === 'AUTH_FAILURE', 'verifyConnection maps 403 restricted token to AUTH_FAILURE');

    const pVerify403Sender = new ResendEmailProvider({
      apiKey: 're_test_key_123',
      fetchOverride: async () => ({
        ok: false,
        status: 403,
        json: async () => ({ message: 'Sender domain not verified' }),
      }),
    });
    const verify403SenderRes = await pVerify403Sender.verifyConnection();
    assert(verify403SenderRes.errorCode === 'UNVERIFIED_SENDER', 'verifyConnection maps 403 sender domain to UNVERIFIED_SENDER');

    const pVerify403Gen = new ResendEmailProvider({
      apiKey: 're_test_key_123',
      fetchOverride: async () => ({
        ok: false,
        status: 403,
        json: async () => ({ message: 'Access forbidden' }),
      }),
    });
    const verify403GenRes = await pVerify403Gen.verifyConnection();
    assert(verify403GenRes.errorCode === 'FORBIDDEN', 'verifyConnection maps generic 403 to FORBIDDEN');

    // =======================================================================
    // SECTION 2: NotificationProvider Model with Resend Driver
    // =======================================================================
    console.log('\n--- Section 2: NotificationProvider Model with Resend Driver ---');

    // 2.1 Rejection of invalid driver for email
    let threwInvalidDriver = false;
    try {
      const invalidProv = new NotificationProvider({
        name: 'Invalid Driver Provider',
        providerType: 'email',
        driver: 'textbee',
      });
      await invalidProv.validate();
    } catch (err) {
      threwInvalidDriver = true;
      assert(err.message.includes('Invalid driver'), 'NotificationProvider rejects invalid email driver');
    }
    assert(threwInvalidDriver, 'Driver validation enforced');

    // 2.2 Create Resend provider and verify encryption + safe configSummary
    await NotificationProvider.deleteMany({ name: /Resend Test/i });

    const resendProvider = new NotificationProvider({
      name: 'Resend Test Primary',
      providerType: 'email',
      driver: 'resend',
      priority: 1,
      dailyLimit: 200,
    });
    resendProvider.setCredentials({
      apiKey: 're_abcdef1234567890xyz',
      senderAddress: 'onboarding@resend.dev',
      senderName: 'BloodWard Network',
    });
    await resendProvider.save();

    assert(Boolean(resendProvider._id), 'Resend NotificationProvider persisted successfully');
    assert(Boolean(resendProvider.encryptedCredentials), 'Credentials stored as AES-256-GCM encrypted payload');
    assert(resendProvider.configSummary?.apiKeyMasked === 're_abcd...0xyz', 'configSummary masks Resend API key safely');
    assert(resendProvider.configSummary?.hasApiKey === true, 'configSummary sets hasApiKey flag');
    assert(resendProvider.configSummary?.senderAddress === 'onboarding@resend.dev', 'configSummary includes senderAddress');

    // 2.3 Verify credential decryption
    const loadedProvider = await NotificationProvider.findById(resendProvider._id).select('+encryptedCredentials');
    const decryptedCreds = loadedProvider.getDecryptedCredentials();
    assert(decryptedCreds.apiKey === 're_abcdef1234567890xyz', 'getDecryptedCredentials restores raw API key accurately');

    // =======================================================================
    // SECTION 3: NotificationManager Priority Failover & Env Fallback
    // =======================================================================
    console.log('\n--- Section 3: NotificationManager Priority Failover & Env Fallback ---');

    await NotificationProvider.deleteMany({});

    // 3.1 Primary database provider UNCERTAIN failure (500) STOPS failover immediately
    // and does NOT refund quota
    const provUncertain = new NotificationProvider({
      name: 'Resend Primary (Uncertain 500)',
      providerType: 'email',
      driver: 'resend',
      priority: 1,
      dailyLimit: 50,
    });
    provUncertain.setCredentials({ apiKey: 're_key_uncertain' });
    await provUncertain.save();

    const provBackup = new NotificationProvider({
      name: 'Resend Backup (Healthy)',
      providerType: 'email',
      driver: 'resend',
      priority: 2,
      dailyLimit: 50,
    });
    provBackup.setCredentials({ apiKey: 're_key_backup' });
    await provBackup.save();

    const testDriverFactoryUncertain = (providerDoc, credentials) => {
      if (providerDoc.name.includes('Uncertain')) {
        return new ResendEmailProvider({
          apiKey: credentials.apiKey,
          fetchOverride: async () => ({
            ok: false,
            status: 500,
            json: async () => ({ message: 'Resend server maintenance' }),
          }),
        });
      }
      return new ResendEmailProvider({
        apiKey: credentials.apiKey,
        fetchOverride: async () => ({
          ok: true,
          status: 200,
          json: async () => ({ id: 'email_failover_success_should_not_be_called' }),
        }),
      });
    };

    const uncertainResult = await notificationManager.sendEmail({
      to: 'recipient@testuncertain.org',
      subject: 'Uncertain Verification',
      text: 'Testing halt on uncertain failure',
      driverFactory: testDriverFactoryUncertain,
    });

    assert(uncertainResult.success === false, 'NotificationManager halts on uncertain failure (success: false)');
    assert(uncertainResult.isUncertain === true, 'Result retains isUncertain: true');
    assert(uncertainResult.providerName === 'Resend Primary (Uncertain 500)', 'Returns uncertain primary provider info without failing over');

    // Verify Primary provider quota was NOT refunded (sentToday remains 1)
    const dbProvUncertain = await NotificationProvider.findById(provUncertain._id);
    assert(dbProvUncertain.sentToday === 1, 'Provider quota is NOT refunded for uncertain delivery');

    // Verify Backup provider was NOT called (sentToday remains 0)
    const dbProvBackup1 = await NotificationProvider.findById(provBackup._id);
    assert(dbProvBackup1.sentToday === 0, 'Backup provider was never called when primary failure was uncertain');

    // 3.1b Primary database provider DEFINITE failure (401) DOES failover to secondary provider
    // and DOES refund quota
    await NotificationProvider.deleteMany({});

    const provDefiniteFail = new NotificationProvider({
      name: 'Resend Primary (Definite 401)',
      providerType: 'email',
      driver: 'resend',
      priority: 1,
      dailyLimit: 50,
    });
    provDefiniteFail.setCredentials({ apiKey: 're_key_definite' });
    await provDefiniteFail.save();

    const provBackup2 = new NotificationProvider({
      name: 'Resend Backup (Healthy 2)',
      providerType: 'email',
      driver: 'resend',
      priority: 2,
      dailyLimit: 50,
    });
    provBackup2.setCredentials({ apiKey: 're_key_backup2' });
    await provBackup2.save();

    const testDriverFactoryDefinite = (providerDoc, credentials) => {
      if (providerDoc.name.includes('Definite')) {
        return new ResendEmailProvider({
          apiKey: credentials.apiKey,
          fetchOverride: async () => ({
            ok: false,
            status: 401,
            json: async () => ({ message: 'API key is invalid' }),
          }),
        });
      }
      return new ResendEmailProvider({
        apiKey: credentials.apiKey,
        fetchOverride: async () => ({
          ok: true,
          status: 200,
          json: async () => ({ id: 'email_failover_success_123' }),
        }),
      });
    };

    const failoverResult = await notificationManager.sendEmail({
      to: 'recipient@testfailover.org',
      subject: 'Failover Verification',
      text: 'Testing automated fallback on definite failure',
      driverFactory: testDriverFactoryDefinite,
    });

    assert(failoverResult.success === true, 'NotificationManager succeeds via failover provider on definite failure');
    assert(failoverResult.providerName === 'Resend Backup (Healthy 2)', 'Failover reached priority 2 backup provider');
    assert(failoverResult.messageId === 'email_failover_success_123', 'Backup provider messageId recorded');

    // Verify Primary provider quota was refunded (sentToday is 0)
    const dbProvDefinite = await NotificationProvider.findById(provDefiniteFail._id);
    assert(dbProvDefinite.sentToday === 0, 'Failed primary provider refunded its daily quota on definite failure');
    assert(dbProvDefinite.consecutiveFailures === 1, 'Primary provider recorded consecutive failure');

    // 3.1c Primary database Resend provider GENERIC NETWORK ERROR stops failover immediately
    // and does NOT refund quota
    await NotificationProvider.deleteMany({});

    const provResendNetworkFail = new NotificationProvider({
      name: 'Resend Primary (Network Error)',
      providerType: 'email',
      driver: 'resend',
      priority: 1,
      dailyLimit: 50,
    });
    provResendNetworkFail.setCredentials({ apiKey: 're_key_network_fail' });
    await provResendNetworkFail.save();

    const provBackup3 = new NotificationProvider({
      name: 'Resend Backup (Healthy 3)',
      providerType: 'email',
      driver: 'resend',
      priority: 2,
      dailyLimit: 50,
    });
    provBackup3.setCredentials({ apiKey: 're_key_backup3' });
    await provBackup3.save();

    const testDriverFactoryResendNetwork = (providerDoc, credentials) => {
      if (providerDoc.name.includes('Network Error')) {
        return new ResendEmailProvider({
          apiKey: credentials.apiKey,
          fetchOverride: async () => {
            const err = new TypeError('fetch failed: socket hang up');
            throw err;
          },
        });
      }
      return new ResendEmailProvider({
        apiKey: credentials.apiKey,
        fetchOverride: async () => ({
          ok: true,
          status: 200,
          json: async () => ({ id: 'email_failover_never_called' }),
        }),
      });
    };

    const resendNetworkResult = await notificationManager.sendEmail({
      to: 'recipient@testnetworkfail.org',
      subject: 'Resend Network Failover Test',
      text: 'Testing halt on generic network error',
      driverFactory: testDriverFactoryResendNetwork,
    });

    assert(resendNetworkResult.success === false, 'NotificationManager halts on generic Resend network error (success: false)');
    assert(resendNetworkResult.isUncertain === true, 'Result retains isUncertain: true for generic network error');
    assert(resendNetworkResult.errorCode === 'NETWORK_ERROR', 'ErrorCode is NETWORK_ERROR');
    assert(resendNetworkResult.providerName === 'Resend Primary (Network Error)', 'Returns uncertain primary provider info');

    // Verify Primary provider quota was NOT refunded (sentToday remains 1)
    const dbProvNet = await NotificationProvider.findById(provResendNetworkFail._id);
    assert(dbProvNet.sentToday === 1, 'Provider quota is NOT refunded for generic Resend network error');

    // Verify Backup provider was NOT called (sentToday remains 0)
    const dbProvBackup3 = await NotificationProvider.findById(provBackup3._id);
    assert(dbProvBackup3.sentToday === 0, 'Backup provider was never called when primary had network error');

    // 3.1d Primary database SMTP provider AMBIGUOUS CONNECTION ERROR stops failover immediately
    // and does NOT refund quota
    await NotificationProvider.deleteMany({});

    const provSmtpReset = new NotificationProvider({
      name: 'SMTP Primary (ECONNRESET)',
      providerType: 'email',
      driver: 'smtp',
      priority: 1,
      dailyLimit: 50,
    });
    provSmtpReset.setCredentials({
      smtpHost: 'smtp.testreset.com',
      smtpPort: 587,
      smtpUser: 'user@testreset.com',
      smtpPass: 'pass',
    });
    await provSmtpReset.save();

    const provBackup4 = new NotificationProvider({
      name: 'Resend Backup (Healthy 4)',
      providerType: 'email',
      driver: 'resend',
      priority: 2,
      dailyLimit: 50,
    });
    provBackup4.setCredentials({ apiKey: 're_key_backup4' });
    await provBackup4.save();

    const testDriverFactorySmtpReset = (providerDoc, credentials) => {
      if (providerDoc.name.includes('ECONNRESET')) {
        return new SmtpEmailProvider({
          host: 'smtp.gmail.com',
          port: 587,
          user: 'test@gmail.com',
          pass: 'pass',
          transporterOverride: {
            sendMail: async () => {
              const err = new Error('read ECONNRESET');
              err.code = 'ECONNRESET';
              throw err;
            },
          },
        });
      }
      return new ResendEmailProvider({
        apiKey: credentials.apiKey,
        fetchOverride: async () => ({
          ok: true,
          status: 200,
          json: async () => ({ id: 'email_failover_never_called_2' }),
        }),
      });
    };

    const smtpResetResult = await notificationManager.sendEmail({
      to: 'recipient@testsmtpreset.org',
      subject: 'SMTP Reset Test',
      text: 'Testing halt on SMTP ECONNRESET',
      driverFactory: testDriverFactorySmtpReset,
    });

    assert(smtpResetResult.success === false, 'NotificationManager halts on SMTP ECONNRESET (success: false)');
    assert(smtpResetResult.isUncertain === true, 'Result retains isUncertain: true for SMTP ECONNRESET');
    assert(smtpResetResult.errorCode === 'NETWORK_ERROR', 'ErrorCode is NETWORK_ERROR');
    assert(smtpResetResult.providerName === 'SMTP Primary (ECONNRESET)', 'Returns uncertain primary SMTP provider info');

    // Verify Primary provider quota was NOT refunded (sentToday remains 1)
    const dbProvSmtp = await NotificationProvider.findById(provSmtpReset._id);
    assert(dbProvSmtp.sentToday === 1, 'Provider quota is NOT refunded for SMTP ECONNRESET');

    // Verify Backup provider was NOT called (sentToday remains 0)
    const dbProvBackup4 = await NotificationProvider.findById(provBackup4._id);
    assert(dbProvBackup4.sentToday === 0, 'Backup provider was never called when primary SMTP had ECONNRESET');

    // 3.1e Definite failures (HTTP 422 and HTTP 429) CONTINUE to failover to backup provider
    await NotificationProvider.deleteMany({});

    const prov422 = new NotificationProvider({
      name: 'Resend Primary (Definite 422)',
      providerType: 'email',
      driver: 'resend',
      priority: 1,
      dailyLimit: 50,
    });
    prov422.setCredentials({ apiKey: 're_key_422' });
    await prov422.save();

    const provBackup5 = new NotificationProvider({
      name: 'Resend Backup (Healthy 5)',
      providerType: 'email',
      driver: 'resend',
      priority: 2,
      dailyLimit: 50,
    });
    provBackup5.setCredentials({ apiKey: 're_key_backup5' });
    await provBackup5.save();

    const testDriverFactory422 = (providerDoc, credentials) => {
      if (providerDoc.name.includes('422')) {
        return new ResendEmailProvider({
          apiKey: credentials.apiKey,
          fetchOverride: async () => ({
            ok: false,
            status: 422,
            json: async () => ({ message: 'Invalid payload parameters' }),
          }),
        });
      }
      return new ResendEmailProvider({
        apiKey: credentials.apiKey,
        fetchOverride: async () => ({
          ok: true,
          status: 200,
          json: async () => ({ id: 'email_422_failover_success_999' }),
        }),
      });
    };

    const failover422Result = await notificationManager.sendEmail({
      to: 'recipient@test422failover.org',
      subject: '422 Failover Test',
      text: 'Testing failover on definite 422',
      driverFactory: testDriverFactory422,
    });

    assert(failover422Result.success === true, 'HTTP 422 definite failure successfully triggers failover to backup provider');
    assert(failover422Result.providerName === 'Resend Backup (Healthy 5)', 'Backup provider reached');
    const dbProv422 = await NotificationProvider.findById(prov422._id);
    assert(dbProv422.sentToday === 0, 'Failed 422 primary provider refunded its daily quota');

    // 3.2 Environment variable Resend fallback when no database providers exist
    await NotificationProvider.deleteMany({});
    process.env.RESEND_API_KEY = 're_env_test_mock_key';
    process.env.RESEND_FROM = 'BloodWard Security <security@bloodward.test>';

    currentMockFetch = async (url, opts) => {
      const body = JSON.parse(opts.body);
      assert(body.from === 'BloodWard Security <security@bloodward.test>', 'Environment fallback preserves configured RESEND_FROM sender');
      return { ok: true, status: 200, json: async () => ({ id: 'resend_env_fallback_id_111' }) };
    };

    const envFallbackResult = await notificationManager.sendEmail({
      to: 'env.recipient@bloodward.test',
      subject: 'Env Fallback Test',
      text: 'Testing env fallback',
    });

    assert(envFallbackResult.success === true, 'NotificationManager succeeds via environment RESEND_API_KEY');
    assert(envFallbackResult.providerName === 'Environment Resend API', 'Identified as Environment Resend API provider');
    assert(envFallbackResult.messageId === 'resend_env_fallback_id_111', 'Captured environment dispatch messageId');

    // 3.3 Environment variable Resend failure propagation
    currentMockFetch = async () => ({
      ok: false,
      status: 403,
      json: async () => ({ message: 'Domain not verified in Resend' }),
    });

    const envFailResult = await notificationManager.sendEmail({
      to: 'env.fail@bloodward.test',
      subject: 'Env Fallback Failure',
      text: 'Testing failure propagation',
    });

    assert(envFailResult.success === false, 'Failed environment Resend request returns success: false');
    assert(envFailResult.errorCode === 'UNVERIFIED_SENDER', 'Propagates errorCode UNVERIFIED_SENDER from environment Resend');
    assert(envFailResult.isUncertain === false, 'Preserves isUncertain: false');

    // 3.4 Environment Resend uncertain failure (HTTP 500) STOPS failover immediately
    currentMockFetch = async () => ({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Resend internal outage' }),
    });

    const env500Result = await notificationManager.sendEmail({
      to: 'env.500@bloodward.test',
      subject: 'Env 500 Test',
      text: 'Testing uncertain env failure',
    });

    assert(env500Result.success === false, 'Environment Resend 500 returns success: false');
    assert(env500Result.errorCode === 'DISPATCH_ERROR', 'ErrorCode is DISPATCH_ERROR');
    assert(env500Result.isUncertain === true, 'Environment Resend 500 is marked isUncertain: true');

    // 3.5 Environment Resend timeout exception STOPS failover immediately with isUncertain: true
    currentMockFetch = async () => {
      const err = new Error('Gateway timeout from upstream network');
      err.name = 'TimeoutError';
      throw err;
    };

    const envTimeoutResult = await notificationManager.sendEmail({
      to: 'env.timeout@bloodward.test',
      subject: 'Env Timeout Test',
      text: 'Testing uncertain timeout failure',
    });

    assert(envTimeoutResult.success === false, 'Environment Resend timeout returns success: false');
    assert(envTimeoutResult.errorCode === 'TIMEOUT', 'ErrorCode is TIMEOUT');
    assert(envTimeoutResult.isUncertain === true, 'Environment Resend timeout is marked isUncertain: true');

    // Clean up environment fallback variables
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM;
    currentMockFetch = null;

    // =======================================================================
    // SECTION 4: Priority 2 — OTP Failure-State Correction & Cooldown
    // =======================================================================
    console.log('\n--- Section 4: Priority 2 — OTP Failure-State Correction & Cooldown ---');

    await Otp.deleteMany({});
    await OtpThrottle.deleteMany({});
    await NotificationProvider.deleteMany({});

    // 4.1 Definite failure deletes the Otp document immediately
    // Setup a database provider that fails with 401 AUTH_FAILURE via currentMockFetch
    const failingAuthProv = new NotificationProvider({
      name: 'Failing Auth Provider',
      providerType: 'email',
      driver: 'resend',
      priority: 1,
      dailyLimit: 10,
    });
    failingAuthProv.setCredentials({ apiKey: 're_bad_auth_key' });
    await failingAuthProv.save();

    currentMockFetch = async () => ({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Invalid API key' }),
    });

    const targetEmail = 'patient.donor@bloodward-recovery-test.com';

    // Dispatch OTP (will fail definitely with AUTH_FAILURE)
    const otpFailResult = await generateAndSendOtp({
      target: targetEmail,
      targetType: 'email',
      purpose: 'verification',
      skipTestOtpFallback: true,
    });

    assert(otpFailResult.success === false, 'generateAndSendOtp reports failure when email dispatch fails');
    assert(otpFailResult.errorCode === 'AUTH_FAILURE', 'Error code AUTH_FAILURE propagated');

    // Check MongoDB: The Otp document MUST NOT exist (it was cleaned up)
    const orphanedOtp = await Otp.findOne({ target: targetEmail });
    assert(orphanedOtp === null, 'CRITICAL FIX: Orphaned OTP record deleted after definite delivery failure');

    // 4.2 Immediate retry is NOT locked into a 60-second cooldown!
    // Reset provider health and configure mock to return 200 OK
    await NotificationProvider.updateMany({}, { $set: { isHealthy: true, sentToday: 0, consecutiveFailures: 0 } });
    currentMockFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ id: 'email_recovered_456' }),
    });

    const immediateRetryResult = await generateAndSendOtp({
      target: targetEmail,
      targetType: 'email',
      purpose: 'verification',
      skipTestOtpFallback: true,
    });

    assert(immediateRetryResult.success === true, 'Immediate subsequent OTP request succeeds without 60s false cooldown');
    assert(!immediateRetryResult.inCooldown, 'User is not blocked by cooldown for a previous failed delivery');

    // Verify healthy OTP is now properly saved in MongoDB
    const validSavedOtp = await Otp.findOne({ target: targetEmail, isUsed: false });
    assert(validSavedOtp !== null, 'Valid OTP record saved in MongoDB after successful delivery');

    // 4.3 Active OTP cooldown IS enforced for successful deliveries
    const secondCall = await generateAndSendOtp({
      target: targetEmail,
      targetType: 'email',
      purpose: 'verification',
      skipTestOtpFallback: true,
    });
    assert(secondCall.success === false, 'Second request within 60s cooldown is rejected');
    assert(secondCall.inCooldown === true, 'inCooldown flag set to true');
    assert(typeof secondCall.remainingSeconds === 'number' && secondCall.remainingSeconds > 0, 'remainingSeconds returned');

    // 4.4 Ambiguous Timeout Preserves Otp Document for Safety
    await Otp.deleteMany({});
    await NotificationProvider.updateMany({}, { $set: { isHealthy: true, sentToday: 0, consecutiveFailures: 0 } });

    currentMockFetch = async () => {
      const err = new Error('The operation was aborted due to timeout');
      err.name = 'TimeoutError';
      throw err;
    };

    const timeoutTarget = 'timeout.donor@bloodward-recovery-test.com';
    const otpTimeoutResult = await generateAndSendOtp({
      target: timeoutTarget,
      targetType: 'email',
      purpose: 'verification',
      skipTestOtpFallback: true,
    });

    assert(otpTimeoutResult.success === false, 'generateAndSendOtp reports failure on timeout');
    assert(otpTimeoutResult.isUncertain === true, 'Timeout flagged as isUncertain: true');

    const preservedTimeoutOtp = await Otp.findOne({ target: timeoutTarget });
    assert(preservedTimeoutOtp !== null, 'Ambiguous timeout retains OTP record in database for recipient safety');

    currentMockFetch = null;

    // =======================================================================
    // SECTION 5: Priority 3 — OTP HTTP Status Codes & Headers
    // =======================================================================
    console.log('\n--- Section 5: Priority 3 — OTP HTTP Status Codes & Headers ---');

    await Otp.deleteMany({});
    await OtpThrottle.deleteMany({});
    await NotificationProvider.deleteMany({});

    // 5.1 Provider Infrastructure Failure -> HTTP 503 Service Unavailable
    const provUnhealthy = new NotificationProvider({
      name: 'Unhealthy Provider',
      providerType: 'email',
      driver: 'resend',
      isEnabled: true,
      priority: 1,
    });
    provUnhealthy.setCredentials({ apiKey: 're_test_key' });
    await provUnhealthy.save();

    currentMockFetch = async () => ({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Invalid API key' }),
    });

    const res503 = await request('/api/otp/send-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email: 'donor.503@example.com', purpose: 'verification' }),
    });

    assert(res503.status === 503, 'Infrastructure/provider failure returns HTTP 503 (not HTTP 400)');
    assert(res503.data.errorCode === 'AUTH_FAILURE', '503 response includes specific errorCode');

    // 5.2 Provider Timeout -> HTTP 504 Gateway Timeout
    await NotificationProvider.updateMany({}, { $set: { isHealthy: true, sentToday: 0, consecutiveFailures: 0 } });
    currentMockFetch = async () => {
      const err = new Error('Timeout');
      err.name = 'TimeoutError';
      throw err;
    };

    const res504 = await request('/api/otp/send-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email: 'donor.504@example.com', purpose: 'verification' }),
    });

    assert(res504.status === 504, 'Provider timeout returns HTTP 504 Gateway Timeout');
    assert(res504.data.errorCode === 'TIMEOUT', '504 response includes TIMEOUT errorCode');

    // 5.3 Cooldown Active -> HTTP 429 with accurate Retry-After header
    await Otp.deleteMany({});
    const now = new Date();
    const activeTestOtp = new Otp({
      target: 'cooldown.user@example.com',
      targetType: 'email',
      purpose: 'verification',
      otpHash: 'dummy_hash',
      expiresAt: new Date(now.getTime() + 600000),
      resendAvailableAt: new Date(now.getTime() + 45000), // 45 seconds remaining
      attempts: 0,
      isUsed: false,
    });
    await activeTestOtp.save();

    const res429 = await request('/api/otp/send-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email: 'cooldown.user@example.com', purpose: 'verification' }),
    });

    assert(res429.status === 429, 'Cooldown active returns HTTP 429');
    const retryAfterHeader = res429.headers.get('retry-after');
    assert(Boolean(retryAfterHeader), 'HTTP 429 response includes Retry-After header');
    assert(Number(retryAfterHeader) > 0 && Number(retryAfterHeader) <= 45, 'Retry-After reflects accurate remaining cooldown seconds');

    // 5.4 Rolling Hour Rate Limit -> HTTP 429 with Retry-After: 3600
    await Otp.deleteMany({});
    await OtpThrottle.deleteMany({});
    const rateLimitTarget = 'ratelimit.user@example.com';

    // Simulate 5 existing requests in the past hour
    const pastRequests = [
      new Date(now.getTime() - 10000),
      new Date(now.getTime() - 20000),
      new Date(now.getTime() - 30000),
      new Date(now.getTime() - 40000),
      new Date(now.getTime() - 50000),
    ];
    await OtpThrottle.create({
      key: `throttle:email:${rateLimitTarget}`,
      target: rateLimitTarget,
      targetType: 'email',
      requests: pastRequests,
      updatedAt: now,
    });

    const resHourlyLimit = await request('/api/otp/send-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email: rateLimitTarget, purpose: 'verification' }),
    });

    assert(resHourlyLimit.status === 429, 'Rolling hour rate limit exceeded returns HTTP 429');
    assert(resHourlyLimit.data.errorCode === 'RATE_LIMIT_EXCEEDED', 'Returns RATE_LIMIT_EXCEEDED code');
    assert(resHourlyLimit.headers.get('retry-after') === '3600', 'Hourly rate limit sets Retry-After: 3600');

    // 5.5 Invalid Client Request -> HTTP 400 Bad Request
    const res400InvalidEmail = await request('/api/otp/send-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email: 'not-an-email', purpose: 'verification' }),
    });
    assert(res400InvalidEmail.status === 400, 'Invalid email syntax returns HTTP 400');

    currentMockFetch = null;

    // =======================================================================
    // SECTION 6: Admin Controller Notification Provider Endpoints (Resend)
    // =======================================================================
    console.log('\n--- Section 6: Admin Controller Operations with Resend ---');

    await User.deleteMany({ email: 'admin.resend@bloodward.test' });
    const adminUser = new User({
      fullName: 'System Administrator',
      email: 'admin.resend@bloodward.test',
      phone: '+15551234567',
      password: 'StrongAdminPassword123!',
      role: 'admin',
      isEmailVerified: true,
      bloodType: 'O+',
    });
    await adminUser.save();
    const adminToken = signToken(adminUser._id, 'admin');

    // 6.1 Create Resend Provider via Admin API
    const createRes = await request('/api/admin/notification-providers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Resend Production API',
        providerType: 'email',
        driver: 'resend',
        priority: 1,
        dailyLimit: 300,
        credentials: {
          apiKey: 're_live_api_token_999888',
          senderAddress: 'onboarding@resend.dev',
          senderName: 'BloodWard Alert',
        },
      }),
    });

    assert(createRes.status === 201, 'Admin can create Resend notification provider (HTTP 201)');
    assert(createRes.data.data.driver === 'resend', 'Created provider has driver: resend');
    assert(createRes.data.data.configSummary?.hasApiKey === true, 'configSummary hasApiKey is true');
    assert(createRes.data.data.configSummary?.apiKeyMasked === 're_live...9888', 'configSummary masks API key');
    assert(!createRes.data.data.encryptedCredentials, 'Encrypted credentials are never exposed in API response');

    const adminProvId = createRes.data.data._id;

    // 6.2 Update Resend Provider
    const updateRes = await request(`/api/admin/notification-providers/${adminProvId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        priority: 2,
        dailyLimit: 500,
        credentials: {
          apiKey: 're_updated_key_111222',
        },
      }),
    });

    assert(updateRes.status === 200, 'Admin can update Resend provider (HTTP 200)');
    assert(updateRes.data.data.priority === 2, 'Provider priority updated');
    assert(updateRes.data.data.configSummary?.apiKeyMasked === 're_upda...1222', 'Updated API key is masked');

    // 6.2b Preserve existing credentials when admin leaves API key blank
    const blankKeyUpdateRes = await request(`/api/admin/notification-providers/${adminProvId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        credentials: {
          senderAddress: 'notifications.updated@bloodward.test',
          apiKey: '', // blank
        },
      }),
    });
    assert(blankKeyUpdateRes.status === 200, 'Admin can update provider with blank API key (HTTP 200)');
    assert(blankKeyUpdateRes.data.data.configSummary?.senderAddress === 'notifications.updated@bloodward.test', 'Sender address updated');
    assert(blankKeyUpdateRes.data.data.configSummary?.hasApiKey === true, 'Existing API key preserved when left blank');

    const provAfterBlank = await NotificationProvider.findById(adminProvId).select('+encryptedCredentials');
    const decryptedAfterBlank = provAfterBlank.getDecryptedCredentials();
    assert(decryptedAfterBlank.apiKey === 're_updated_key_111222', 'Decrypted API key matches previously saved key after blank update');

    // 6.2c Abort update and preserve existing credentials when decryption fails
    // Intentionally corrupt encryptedCredentials in MongoDB
    const originalEncrypted = 'original_encrypted_payload_sentinel';
    await NotificationProvider.updateOne(
      { _id: adminProvId },
      { $set: { encryptedCredentials: originalEncrypted } }
    );

    const corruptUpdateRes = await request(`/api/admin/notification-providers/${adminProvId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Attempted Malicious Overwrite',
        credentials: {
          senderAddress: 'corrupted@bloodward.test',
        },
      }),
    });

    assert(corruptUpdateRes.status === 500, 'Update returns HTTP 500 when existing credentials cannot be decrypted');
    assert(
      corruptUpdateRes.data.message.includes('Failed to decrypt existing provider credentials'),
      'Returns descriptive safe error message without leaking sensitive crypto data'
    );
    assert(!corruptUpdateRes.data.credentials, 'No credentials returned in error response');

    // Verify database record: encryptedCredentials MUST NOT be overwritten or corrupted
    const provAfterFailedDecrypt = await NotificationProvider.findById(adminProvId).select('+encryptedCredentials');
    assert(
      provAfterFailedDecrypt.encryptedCredentials === originalEncrypted,
      'SECURITY GUARD: Decryption failure strictly prevents overwriting existing encrypted credentials'
    );
    assert(
      provAfterFailedDecrypt.name !== 'Attempted Malicious Overwrite',
      'Operation aborted before modifying provider attributes'
    );

    // Restore valid provider for subsequent connectivity and live test checks
    const validRestored = new NotificationProvider({
      name: 'Resend Test Admin Restored',
      providerType: 'email',
      driver: 'resend',
      priority: 1,
      dailyLimit: 300,
    });
    validRestored.setCredentials({
      apiKey: 're_live_api_token_restored',
      senderAddress: 'onboarding@resend.dev',
      senderName: 'BloodWard Alert',
    });
    await validRestored.save();
    const activeTestProvId = validRestored._id;

    // 6.3 Test Provider Connectivity (Mocked)
    currentMockFetch = async (url) => {
      assert(url.includes('/api-keys'), 'Admin connectivity check queries /api-keys endpoint');
      return { ok: true, status: 200, json: async () => ({ data: [{ id: 'key_admin_test' }] }) };
    };

    const testRes = await request(`/api/admin/notification-providers/${activeTestProvId}/test`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({}),
    });

    assert(testRes.status === 200, 'Admin test provider connectivity check succeeds (HTTP 200)');
    assert(testRes.data.data.deliveryStatus === 'Connection Verified', 'Status is Connection Verified');

    // 6.4 Test Live Email Dispatch (Mocked)
    currentMockFetch = async (url, opts) => {
      assert(url.includes('/emails'), 'Admin live test queries /emails endpoint');
      const body = JSON.parse(opts.body);
      assert(body.to[0] === 'qa@bloodward.test', 'Admin live test delivers to specified test recipient');
      return { ok: true, status: 200, json: async () => ({ id: 'resend_live_mock_777' }) };
    };

    const testLiveRes = await request(`/api/admin/notification-providers/${activeTestProvId}/test`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ testRecipient: 'qa@bloodward.test' }),
    });

    assert(testLiveRes.status === 200, 'Admin live test email dispatch succeeds (HTTP 200)');
    assert(testLiveRes.data.data.authoritativeDeliveryConfirmed === true, 'authoritativeDeliveryConfirmed is true');
    assert(testLiveRes.data.data.messageId === 'resend_live_mock_777', 'Captured live test messageId');

    currentMockFetch = null;

    // =======================================================================
    // SECTION 7: SMTP Regression Verification
    // =======================================================================
    console.log('\n--- Section 7: SMTP Regression Verification ---');

    // 7.1 Verify SMTP provider still functions as expected
    const mockTransporter = {
      verify: async () => true,
      sendMail: async () => ({ messageId: 'smtp_mock_legacy_999' }),
    };

    const smtpProv = new SmtpEmailProvider({
      host: 'smtp.gmail.com',
      port: 587,
      user: 'test@gmail.com',
      pass: 'app_password_123',
      transporterOverride: mockTransporter,
    });

    const smtpVerify = await smtpProv.verifyConnection();
    assert(smtpVerify.success === true, 'SmtpEmailProvider verifyConnection still succeeds');

    const smtpSend = await smtpProv.sendMail({
      to: 'recipient@bloodward.test',
      subject: 'SMTP Regression Test',
      text: 'SMTP regression plaintext',
    });
    assert(smtpSend.success === true, 'SmtpEmailProvider sendMail still succeeds');
    assert(smtpSend.messageId === 'smtp_mock_legacy_999', 'SmtpEmailProvider messageId captured');

    // 7.2 Verify SSRF guard still blocks private IP addresses in SMTP
    let smtpSsrfBlocked = false;
    try {
      new SmtpEmailProvider({
        host: '127.0.0.1',
        port: 587,
        user: 'test@gmail.com',
        pass: 'pass',
      });
    } catch (err) {
      smtpSsrfBlocked = true;
      assert(err.message.includes('SSRF Protection'), 'SmtpEmailProvider SSRF guard continues to block loopback IP');
    }
    assert(smtpSsrfBlocked, 'SSRF protection is maintained');

    // 7.3 SmtpEmailProvider ambiguous connection error classification (ECONNRESET, EPIPE, socket hang up)
    const mockResetTransporter = {
      sendMail: async () => {
        const err = new Error('read ECONNRESET');
        err.code = 'ECONNRESET';
        throw err;
      },
    };
    const smtpResetProv = new SmtpEmailProvider({
      host: 'smtp.gmail.com',
      port: 587,
      user: 'test@gmail.com',
      pass: 'pass',
      transporterOverride: mockResetTransporter,
    });
    const smtpSec7ResetResult = await smtpResetProv.sendMail({
      to: 'reset@bloodward.test',
      subject: 'Reset test',
      text: 'body',
    });
    assert(smtpSec7ResetResult.success === false, 'SMTP ECONNRESET returns success: false');
    assert(smtpSec7ResetResult.errorCode === 'NETWORK_ERROR', 'SMTP ECONNRESET mapped to NETWORK_ERROR');
    assert(smtpSec7ResetResult.isUncertain === true, 'SMTP ECONNRESET is classified as isUncertain: true');

    // 7.4 SmtpEmailProvider socket hang up classification
    const mockHangupTransporter = {
      sendMail: async () => {
        const err = new Error('socket hang up');
        throw err;
      },
    };
    const smtpHangupProv = new SmtpEmailProvider({
      host: 'smtp.gmail.com',
      port: 587,
      user: 'test@gmail.com',
      pass: 'pass',
      transporterOverride: mockHangupTransporter,
    });
    const smtpHangupResult = await smtpHangupProv.sendMail({
      to: 'hangup@bloodward.test',
      subject: 'Hangup test',
      text: 'body',
    });
    assert(smtpHangupResult.success === false, 'SMTP socket hang up returns success: false');
    assert(smtpHangupResult.errorCode === 'NETWORK_ERROR', 'SMTP socket hang up mapped to NETWORK_ERROR');
    assert(smtpHangupResult.isUncertain === true, 'SMTP socket hang up is classified as isUncertain: true');

    // 7.5 SmtpEmailProvider definite network error (ECONNREFUSED -> isUncertain: false)
    const mockRefusedTransporter = {
      sendMail: async () => {
        const err = new Error('connect ECONNREFUSED 192.0.2.1:587');
        err.code = 'ECONNREFUSED';
        throw err;
      },
    };
    const smtpRefusedProv = new SmtpEmailProvider({
      host: 'smtp.gmail.com',
      port: 587,
      user: 'test@gmail.com',
      pass: 'pass',
      transporterOverride: mockRefusedTransporter,
    });
    const smtpRefusedResult = await smtpRefusedProv.sendMail({
      to: 'refused@bloodward.test',
      subject: 'Refused test',
      text: 'body',
    });
    assert(smtpRefusedResult.success === false, 'SMTP ECONNREFUSED returns success: false');
    assert(smtpRefusedResult.errorCode === 'NETWORK_ERROR', 'SMTP ECONNREFUSED mapped to NETWORK_ERROR');
    assert(smtpRefusedResult.isUncertain === false, 'SMTP ECONNREFUSED is definite failure (isUncertain: false)');

    // Verify mock transport usage: zero real network requests
    assert(totalMockCalls > 0, `All Resend HTTP operations used mock transport (${totalMockCalls} total mock calls intercepted)`);

  } catch (err) {
    console.error('[CRITICAL TEST RUNNER EXCEPTION]', err);
    failed++;
  } finally {
    ResendEmailProvider.mockFetch = null;
    if (server) {
      server.close();
    }
    try {
      await NotificationProvider.deleteMany({});
      await Otp.deleteMany({});
      await OtpThrottle.deleteMany({});
    } catch (cleanupErr) {
      // ignore
    }
    await mongoose.disconnect();
    console.log('\n========================================================================');
    console.log(`FINAL RESULTS: ${passed}/${passed + failed} PASSED`);
    console.log('========================================================================\n');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
