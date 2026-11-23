import NotificationProvider from '../models/notificationProvider.model.js';
import NotificationLog from '../models/notificationLog.model.js';
import AppError from '../utils/appError.js';
import { logAuditEvent } from '../utils/auditLogger.js';
import { SmtpEmailProvider } from '../services/notification/smtpEmailProvider.js';
import { maskEmail } from '../utils/encryptionUtils.js';
import { validateSmtpHostAndPort } from '../utils/ssrfGuard.js';

/**
 * List all configured notification providers
 * @route GET /api/admin/notification-providers
 * @access Admin only
 */
export async function getProviders(req, res, next) {
  try {
    const { providerType } = req.query;
    const filter = {};
    if (providerType && ['sms', 'email'].includes(providerType)) {
      filter.providerType = providerType;
    }

    const providers = await NotificationProvider.find(filter)
      .sort({ providerType: 1, priority: 1, createdAt: 1 });

    res.status(200).json({
      success: true,
      count: providers.length,
      data: providers,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get single provider details
 * @route GET /api/admin/notification-providers/:id
 * @access Admin only
 */
export async function getProviderById(req, res, next) {
  try {
    const provider = await NotificationProvider.findById(req.params.id);
    if (!provider) {
      return next(new AppError('Notification provider not found.', 404));
    }

    res.status(200).json({
      success: true,
      data: provider,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new notification provider with encrypted credentials
 * @route POST /api/admin/notification-providers
 * @access Admin only
 */
export async function createProvider(req, res, next) {
  try {
    const {
      name,
      providerType = 'email',
      driver = 'smtp',
      priority = 1,
      dailyLimit = 500,
      isEnabled = true,
      credentials,
    } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return next(new AppError('Provider name is required.', 400));
    }

    if (providerType === 'sms') {
      return next(new AppError('SMS notification infrastructure has been discontinued. Only email providers are supported.', 400));
    }

    if (providerType !== 'email') {
      return next(new AppError('Provider type must be "email".', 400));
    }

    if (driver !== 'smtp') {
      return next(new AppError('Invalid driver for Email provider. Allowed: "smtp".', 400));
    }

    if (!credentials || typeof credentials !== 'object') {
      return next(new AppError('Provider credentials object is required.', 400));
    }

    if (!credentials.smtpHost || !credentials.smtpUser || !credentials.smtpPass) {
      return next(new AppError('SMTP requires "smtpHost", "smtpUser", and "smtpPass".', 400));
    }

    await validateSmtpHostAndPort(credentials.smtpHost, credentials.smtpPort);

    const provider = new NotificationProvider({
      name: name.trim(),
      providerType: 'email',
      driver: 'smtp',
      priority: Number(priority) || 1,
      dailyLimit: Number(dailyLimit) >= 0 ? Number(dailyLimit) : 500,
      isEnabled: Boolean(isEnabled),
    });

    provider.setCredentials(credentials);
    await provider.save();

    const safeProvider = await NotificationProvider.findById(provider._id);

    await logAuditEvent({
      actor: req.user?._id,
      actorName: req.user?.fullName || 'Admin',
      action: 'CREATE_NOTIFICATION_PROVIDER',
      category: 'ADMIN_ACTION',
      target: provider._id.toString(),
      ipAddress: req.ip,
      severity: 'NORMAL',
      details: {
        providerId: provider._id,
        name: provider.name,
        providerType: provider.providerType,
        driver: provider.driver,
        priority: provider.priority,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Notification provider configured successfully.',
      data: safeProvider,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update an existing notification provider
 * Allows replacing credentials without exposing existing values
 * @route PATCH /api/admin/notification-providers/:id
 * @access Admin only
 */
export async function updateProvider(req, res, next) {
  try {
    const provider = await NotificationProvider.findById(req.params.id).select('+encryptedCredentials');
    if (!provider) {
      return next(new AppError('Notification provider not found.', 404));
    }

    const {
      name,
      priority,
      dailyLimit,
      isEnabled,
      credentials,
    } = req.body;

    if (name !== undefined) {
      if (!name || typeof name !== 'string' || !name.trim()) {
        return next(new AppError('Provider name cannot be empty.', 400));
      }
      provider.name = name.trim();
    }
    if (priority !== undefined) {
      provider.priority = Math.max(1, Number(priority) || 1);
    }
    if (dailyLimit !== undefined) {
      provider.dailyLimit = Math.max(0, Number(dailyLimit) || 0);
    }
    if (isEnabled !== undefined) {
      provider.isEnabled = Boolean(isEnabled);
    }

    // Credential replacement logic
    if (credentials && typeof credentials === 'object') {
      let existingCreds = {};
      try {
        existingCreds = provider.getDecryptedCredentials();
      } catch (err) {
        existingCreds = {};
      }

      const mergedCreds = { ...existingCreds };

      if (credentials.smtpHost !== undefined && String(credentials.smtpHost).trim()) {
        mergedCreds.smtpHost = String(credentials.smtpHost).trim();
      }
      if (credentials.smtpPort !== undefined && credentials.smtpPort) {
        mergedCreds.smtpPort = Number(credentials.smtpPort) || 587;
      }
      if (credentials.secure !== undefined) {
        mergedCreds.secure = Boolean(credentials.secure);
      }
      if (credentials.smtpUser !== undefined && String(credentials.smtpUser).trim()) {
        const trimmedUser = String(credentials.smtpUser).trim();
        if (trimmedUser.includes('*')) {
          return next(new AppError('Masked SMTP username rejected. Provide full username or leave blank to keep existing.', 400));
        }
        mergedCreds.smtpUser = trimmedUser;
      }
      if (credentials.smtpPass !== undefined && String(credentials.smtpPass).trim()) {
        mergedCreds.smtpPass = String(credentials.smtpPass).trim();
      }
      if (credentials.senderAddress !== undefined) {
        mergedCreds.senderAddress = String(credentials.senderAddress).trim();
      }
      if (credentials.senderName !== undefined) {
        mergedCreds.senderName = String(credentials.senderName).trim();
      }

      await validateSmtpHostAndPort(mergedCreds.smtpHost, mergedCreds.smtpPort);
      provider.setCredentials(mergedCreds);
    }

    await provider.save();

    const safeProvider = await NotificationProvider.findById(provider._id);

    await logAuditEvent({
      actor: req.user?._id,
      actorName: req.user?.fullName || 'Admin',
      action: 'UPDATE_NOTIFICATION_PROVIDER',
      category: 'ADMIN_ACTION',
      target: provider._id.toString(),
      ipAddress: req.ip,
      severity: 'NORMAL',
      details: {
        providerId: provider._id,
        name: provider.name,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Provider updated successfully.',
      data: safeProvider,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Toggle provider enabled/disabled state
 * @route PATCH /api/admin/notification-providers/:id/toggle
 * @access Admin only
 */
export async function toggleProviderStatus(req, res, next) {
  try {
    const provider = await NotificationProvider.findById(req.params.id);
    if (!provider) {
      return next(new AppError('Notification provider not found.', 404));
    }

    provider.isEnabled = !provider.isEnabled;
    await provider.save();

    await logAuditEvent({
      actor: req.user?._id,
      actorName: req.user?.fullName || 'Admin',
      action: 'TOGGLE_NOTIFICATION_PROVIDER',
      category: 'ADMIN_ACTION',
      target: provider._id.toString(),
      ipAddress: req.ip,
      severity: 'NORMAL',
      details: {
        providerId: provider._id,
        name: provider.name,
        isEnabled: provider.isEnabled,
      },
    });

    res.status(200).json({
      success: true,
      message: `Provider "${provider.name}" ${provider.isEnabled ? 'enabled' : 'disabled'} successfully.`,
      data: provider,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Reset and recover an unhealthy provider safely
 * @route PATCH /api/admin/notification-providers/:id/recover
 * @access Admin only
 */
export async function recoverProvider(req, res, next) {
  try {
    const provider = await NotificationProvider.findById(req.params.id).select('+encryptedCredentials');
    if (!provider) {
      return next(new AppError('Notification provider not found.', 404));
    }

    let rawCredentials = null;
    try {
      rawCredentials = provider.getDecryptedCredentials();
    } catch (credErr) {
      return next(new AppError(`Failed to decrypt provider credentials: ${credErr.message}`, 500));
    }

    let verificationResult = null;
    try {
      await validateSmtpHostAndPort(rawCredentials.smtpHost, rawCredentials.smtpPort);
      const emailDriver = new SmtpEmailProvider({
        host: rawCredentials.smtpHost,
        port: rawCredentials.smtpPort,
        user: rawCredentials.smtpUser,
        pass: rawCredentials.smtpPass,
        secure: rawCredentials.secure,
        senderAddress: rawCredentials.senderAddress,
      });
      verificationResult = await emailDriver.verifyConnection();
    } catch (validationErr) {
      verificationResult = {
        success: false,
        errorCode: 'SSRF_BLOCKED',
        error: validationErr.message,
      };
    }

    if (!verificationResult?.success) {
      const errorMsg = verificationResult?.error || 'Provider connection verification failed.';
      provider.isHealthy = false;
      provider.lastFailureReason = errorMsg;
      provider.lastHealthCheckAt = new Date();
      await provider.save();

      await logAuditEvent({
        actor: req.user?._id,
        actorName: req.user?.fullName || 'Admin',
        action: 'RECOVER_NOTIFICATION_PROVIDER_FAILED',
        category: 'ADMIN_ACTION',
        target: provider._id.toString(),
        ipAddress: req.ip,
        severity: 'HIGH',
        details: {
          providerId: provider._id,
          name: provider.name,
          error: errorMsg,
        },
      });

      const safeProvider = await NotificationProvider.findById(provider._id);
      return res.status(400).json({
        success: false,
        errorCode: verificationResult?.errorCode || 'RECOVERY_VERIFICATION_FAILED',
        message: `Provider recovery failed: ${errorMsg}`,
        data: safeProvider,
      });
    }

    provider.isHealthy = true;
    provider.consecutiveFailures = 0;
    provider.lastFailureReason = '';
    provider.lastHealthCheckAt = new Date();
    await provider.save();

    await logAuditEvent({
      actor: req.user?._id,
      actorName: req.user?.fullName || 'Admin',
      action: 'RECOVER_NOTIFICATION_PROVIDER',
      category: 'ADMIN_ACTION',
      target: provider._id.toString(),
      ipAddress: req.ip,
      severity: 'NORMAL',
      details: {
        providerId: provider._id,
        name: provider.name,
      },
    });

    const safeProvider = await NotificationProvider.findById(provider._id);

    res.status(200).json({
      success: true,
      message: `Provider "${provider.name}" health verified and recovered successfully.`,
      data: safeProvider,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Test a notification provider with explicit action
 * @route POST /api/admin/notification-providers/:id/test
 * @access Admin only
 */
export async function testProvider(req, res, next) {
  try {
    const provider = await NotificationProvider.findById(req.params.id).select('+encryptedCredentials');
    if (!provider) {
      return next(new AppError('Notification provider not found.', 404));
    }

    const { testRecipient } = req.body;
    let testResult = null;
    let rawCredentials = null;

    try {
      rawCredentials = provider.getDecryptedCredentials();
    } catch (credErr) {
      return next(new AppError(`Failed to decrypt provider credentials: ${credErr.message}`, 500));
    }

    const isLiveDispatch = Boolean(testRecipient && typeof testRecipient === 'string' && testRecipient.trim().length > 0);

    let quotaReserved = false;
    if (isLiveDispatch) {
      const updatedProvider = await NotificationProvider.findOneAndUpdate(
        {
          _id: provider._id,
          sentToday: { $lt: provider.dailyLimit },
        },
        {
          $inc: { sentToday: 1 },
        },
        { returnDocument: 'after' }
      );

      if (!updatedProvider) {
        return res.status(400).json({
          success: false,
          errorCode: 'QUOTA_EXHAUSTED',
          message: `Provider "${provider.name}" has reached its daily limit of ${provider.dailyLimit} messages.`,
        });
      }
      quotaReserved = true;
      provider.sentToday = updatedProvider.sentToday;
    }

    const now = new Date();

    try {
      await validateSmtpHostAndPort(rawCredentials.smtpHost, rawCredentials.smtpPort);
    } catch (validationErr) {
      if (quotaReserved) {
        await NotificationProvider.findByIdAndUpdate(provider._id, { $inc: { sentToday: -1 } });
      }
      return next(validationErr);
    }

    const emailDriver = new SmtpEmailProvider({
      host: rawCredentials.smtpHost,
      port: rawCredentials.smtpPort,
      user: rawCredentials.smtpUser,
      pass: rawCredentials.smtpPass,
      secure: rawCredentials.secure,
      senderAddress: rawCredentials.senderAddress,
    });

    if (isLiveDispatch && testRecipient.includes('@')) {
      testResult = await emailDriver.sendMail({
        to: testRecipient.trim().toLowerCase(),
        subject: 'BloodWard — Notification Provider Test',
        text: `This is a test email dispatched from BloodWard to verify the configuration of provider "${provider.name}".`,
        html: `<p>This is an automated test email confirming provider <strong>${provider.name}</strong> is functional.</p>`,
      });
    } else {
      testResult = await emailDriver.verifyConnection();
    }

    const maskedTarget = isLiveDispatch ? maskEmail(testRecipient) : 'connectivity_check';

    if (testResult?.success) {
      provider.isHealthy = true;
      provider.consecutiveFailures = 0;
      provider.lastFailureReason = '';
      provider.lastHealthCheckAt = now;
      await provider.save();

      const deliveryStatus = isLiveDispatch ? 'Delivery Confirmed' : 'Connection Verified';

      await NotificationLog.recordLog({
        channel: 'email',
        providerId: provider._id,
        providerName: provider.name,
        driver: provider.driver,
        purpose: 'admin_test',
        recipientMasked: maskedTarget,
        status: isLiveDispatch ? 'delivered' : 'accepted',
        metadata: {
          testAction: true,
          adminId: req.user?._id,
          messageId: testResult.messageId || null,
        },
      });

      return res.status(200).json({
        success: true,
        message: isLiveDispatch
          ? `Live test email delivered successfully to ${maskedTarget}.`
          : `Provider "${provider.name}" connectivity verified successfully.`,
        data: {
          isHealthy: true,
          deliveryStatus,
          authoritativeDeliveryConfirmed: Boolean(isLiveDispatch),
          messageId: testResult.messageId || null,
        },
      });
    }

    // Test failed: refund quota
    if (quotaReserved) {
      await NotificationProvider.findByIdAndUpdate(provider._id, {
        $inc: { sentToday: -1 },
      });
      provider.sentToday = Math.max(0, provider.sentToday - 1);
    }

    const errorMsg = testResult?.error || 'Provider connection or delivery test failed.';
    provider.lastFailureReason = errorMsg;
    provider.lastHealthCheckAt = now;
    await provider.save();

    await NotificationLog.recordLog({
      channel: 'email',
      providerId: provider._id,
      providerName: provider.name,
      driver: provider.driver,
      purpose: 'admin_test',
      recipientMasked: maskedTarget,
      status: 'failed',
      errorDetails: errorMsg,
      metadata: {
        testAction: true,
        adminId: req.user?._id,
      },
    });

    return res.status(400).json({
      success: false,
      message: `Provider test failed: ${errorMsg}`,
      errorCode: testResult?.errorCode || 'TEST_FAILED',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a notification provider
 * @route DELETE /api/admin/notification-providers/:id
 * @access Admin only
 */
export async function deleteProvider(req, res, next) {
  try {
    const provider = await NotificationProvider.findById(req.params.id);
    if (!provider) {
      return next(new AppError('Notification provider not found.', 404));
    }

    await NotificationProvider.findByIdAndDelete(req.params.id);

    await logAuditEvent({
      actor: req.user?._id,
      actorName: req.user?.fullName || 'Admin',
      action: 'DELETE_NOTIFICATION_PROVIDER',
      category: 'ADMIN_ACTION',
      target: req.params.id,
      ipAddress: req.ip,
      severity: 'HIGH',
      details: {
        providerId: req.params.id,
        name: provider.name,
        providerType: provider.providerType,
      },
    });

    res.status(200).json({
      success: true,
      message: `Notification provider "${provider.name}" removed successfully.`,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get notification delivery logs with filtering and pagination
 * @route GET /api/admin/notification-logs
 * @access Admin only
 */
export async function getNotificationLogs(req, res, next) {
  try {
    const {
      channel,
      status,
      providerId,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};

    if (channel && ['sms', 'email'].includes(channel)) {
      query.channel = channel;
    }
    if (status && ['delivered', 'accepted', 'sent', 'failed', 'fallback_triggered', 'uncertain'].includes(status)) {
      query.status = status;
    }
    if (providerId) {
      query.providerId = providerId;
    }
    if (search && typeof search === 'string' && search.trim()) {
      const term = search.trim();
      query.$or = [
        { recipientMasked: { $regex: term, $options: 'i' } },
        { purpose: { $regex: term, $options: 'i' } },
        { providerName: { $regex: term, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      NotificationLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      NotificationLog.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
      data: logs,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get aggregated delivery health metrics and channel statistics
 * @route GET /api/admin/notification-stats
 * @access Admin only
 */
export async function getNotificationStats(req, res, next) {
  try {
    const [providers, totalLogs, deliveredLogs, failedLogs] = await Promise.all([
      NotificationProvider.find().select('providerType isEnabled isHealthy sentToday dailyLimit'),
      NotificationLog.countDocuments(),
      NotificationLog.countDocuments({ status: { $in: ['delivered', 'accepted', 'sent'] } }),
      NotificationLog.countDocuments({ status: 'failed' }),
    ]);

    const activeEmail = providers.filter((p) => p.isEnabled && p.providerType === 'email');
    const healthyEmail = activeEmail.filter((p) => p.isHealthy);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalLogs,
          delivered: deliveredLogs,
          failed: failedLogs,
          successRate: totalLogs > 0 ? Math.round((deliveredLogs / totalLogs) * 100) : 100,
        },
        providers: {
          total: providers.length,
          email: {
            configured: providers.filter((p) => p.providerType === 'email').length,
            active: activeEmail.length,
            healthy: healthyEmail.length,
          },
        },
      },
    });
  } catch (error) {
    next(error);
  }
}
