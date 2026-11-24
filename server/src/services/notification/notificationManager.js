import NotificationProvider from '../../models/notificationProvider.model.js';
import NotificationLog from '../../models/notificationLog.model.js';
import { maskEmail } from '../../utils/encryptionUtils.js';
import { isEmailConfigured, getEmailTransporter } from '../../utils/emailService.js';
import { SmtpEmailProvider } from './smtpEmailProvider.js';
import { ResendEmailProvider } from './resendEmailProvider.js';

/**
 * Calculates the next UTC midnight timestamp for accurate daily quota resets.
 * @param {Date} [now]
 * @returns {Date}
 */
export function getNextUtcMidnight(now = new Date()) {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return next;
}

/**
 * Ensures quota is reset atomically if UTC midnight has arrived.
 * @param {object} provider
 * @param {Date} [now]
 */
export async function resetQuotaIfDue(provider, now = new Date()) {
  if (provider.quotaResetAt && now >= new Date(provider.quotaResetAt)) {
    await NotificationProvider.updateOne(
      { _id: provider._id, quotaResetAt: { $lte: now } },
      {
        $set: {
          sentToday: 0,
          quotaResetAt: getNextUtcMidnight(now),
        },
      }
    );
  }
}

/**
 * Unified Notification Manager.
 * Orchestrates Email channel with priority-based failover, quota management, and audit logging.
 * (SMS delivery infrastructure has been decommissioned in favor of email verification).
 */
class NotificationManager {
  /**
   * Dispatches an Email message via SMTP provider pool with fallback to env-configured SMTP.
   * @param {object} params
   * @param {string} params.to Recipient email address
   * @param {string} params.subject Email subject
   * @param {string} [params.text] Plaintext message
   * @param {string} [params.html] HTML message
   * @param {string} [params.from] Custom sender address
   * @param {string} [params.purpose='notification']
   * @param {object} [params.metadata={}]
   * @param {Function} [params.driverFactory] Optional factory for testing/mocking
   * @returns {Promise<{ success: boolean, providerId?: string, providerName?: string, messageId?: string, error?: string, errorCode?: string }>}
   */
  async sendEmail({
    to,
    subject,
    text,
    html,
    from,
    purpose = 'notification',
    metadata = {},
    driverFactory,
  }) {
    const maskedRecipient = maskEmail(to);
    const now = new Date();

    // 1. Fetch enabled Email providers sorted by priority ASC
    const candidateProviders = await NotificationProvider.find({
      providerType: 'email',
      isEnabled: true,
    }).sort({ priority: 1, createdAt: 1 });

    let attemptsCount = 0;
    let lastError = null;

    // 2. Iterate through configured database SMTP providers
    if (candidateProviders && candidateProviders.length > 0) {
      for (const candidate of candidateProviders) {
        attemptsCount++;

        // Check if daily quota reset is due
        await resetQuotaIfDue(candidate, now);

        // Concurrency-safe quota reservation
        const reservedProvider = await NotificationProvider.findOneAndUpdate(
          {
            _id: candidate._id,
            isEnabled: true,
            isHealthy: true,
            sentToday: { $lt: candidate.dailyLimit },
          },
          {
            $inc: { sentToday: 1 },
            $set: { lastUsedAt: new Date() },
          },
          {
            returnDocument: 'after',
            select: '+encryptedCredentials',
          }
        );

        if (!reservedProvider) {
          const current = await NotificationProvider.findById(candidate._id);
          if (current && current.sentToday >= current.dailyLimit) {
            lastError = {
              errorCode: 'QUOTA_EXHAUSTED',
              error: `Email provider "${candidate.name}" daily quota exhausted (${current.sentToday}/${current.dailyLimit}).`,
            };
          } else {
            lastError = {
              errorCode: 'PROVIDER_UNHEALTHY',
              error: `Email provider "${candidate.name}" is currently marked unhealthy.`,
            };
          }
          continue; // Failover to next priority SMTP account
        }

        // Decrypt credentials
        let credentials;
        try {
          credentials = reservedProvider.getDecryptedCredentials();
        } catch (decryptErr) {
          await NotificationProvider.updateOne({ _id: candidate._id }, { $inc: { sentToday: -1 } });
          lastError = {
            errorCode: 'DECRYPT_FAILURE',
            error: `Failed to decrypt credentials for provider "${candidate.name}": ${decryptErr.message}`,
          };
          continue;
        }

        // Instantiate Email driver (Resend HTTPS API or standard SMTP)
        let providerDriver;
        try {
          if (driverFactory) {
            providerDriver = driverFactory(reservedProvider, credentials);
          } else if (reservedProvider.driver === 'resend') {
            providerDriver = new ResendEmailProvider({
              apiKey: credentials.apiKey,
              senderAddress: credentials.senderAddress || from,
              senderName: credentials.senderName,
            });
          } else {
            providerDriver = new SmtpEmailProvider({
              host: credentials.smtpHost,
              port: credentials.smtpPort,
              user: credentials.smtpUser,
              pass: credentials.smtpPass,
              senderAddress: credentials.senderAddress || from,
            });
          }
        } catch (driverInitErr) {
          await NotificationProvider.updateOne({ _id: candidate._id }, { $inc: { sentToday: -1 } });
          lastError = {
            errorCode: 'CONFIG_ERROR',
            error: `Failed to initialize driver for provider "${candidate.name}": ${driverInitErr.message}`,
            isUncertain: false,
          };
          continue;
        }

        // Dispatch email
        const result = await providerDriver.sendMail({
          to,
          subject,
          text,
          html,
          from: from || credentials.senderAddress,
        });

        if (result.success) {
          // Success
          await NotificationProvider.updateOne(
            { _id: candidate._id },
            {
              $set: {
                consecutiveFailures: 0,
                isHealthy: true,
                lastFailureReason: '',
              },
            }
          );

          await NotificationLog.recordLog({
            channel: 'email',
            providerId: candidate._id,
            providerName: candidate.name,
            driver: candidate.driver,
            purpose,
            recipientMasked: maskedRecipient,
            status: attemptsCount > 1 ? 'fallback_triggered' : 'delivered',
            metadata: {
              ...metadata,
              messageId: result.messageId,
              attempts: attemptsCount,
            },
          });

          return {
            success: true,
            providerId: String(candidate._id),
            providerName: candidate.name,
            messageId: result.messageId,
          };
        }

        // Failure
        lastError = result;

        // Refund quota only if delivery definitely failed (never for uncertain outcomes)
        if (!result.isUncertain) {
          await NotificationProvider.updateOne({ _id: candidate._id }, { $inc: { sentToday: -1 } });
        }

        const isAuthError = result.errorCode === 'AUTH_FAILURE';
        await NotificationProvider.updateOne(
          { _id: candidate._id },
          {
            $inc: { consecutiveFailures: 1 },
            $set: {
              isHealthy: !isAuthError,
              lastFailureReason: result.error || 'Email dispatch failed',
              lastHealthCheckAt: new Date(),
            },
          }
        );

        await NotificationLog.recordLog({
          channel: 'email',
          providerId: candidate._id,
          providerName: candidate.name,
          driver: candidate.driver,
          purpose,
          recipientMasked: maskedRecipient,
          status: 'failed',
          errorDetails: `Provider "${candidate.name}" failed: ${result.error}`,
          metadata: {
            ...metadata,
            errorCode: result.errorCode,
            attempt: attemptsCount,
            isUncertain: Boolean(result.isUncertain),
          },
        });

        // Critical safety rule: If delivery is uncertain, halt failover immediately!
        // Do not attempt next database provider, and do not attempt environment fallback.
        if (result.isUncertain) {
          return {
            success: false,
            providerId: String(candidate._id),
            providerName: candidate.name,
            errorCode: result.errorCode,
            error: result.error,
            isUncertain: true,
          };
        }

        // Loop continues ONLY for definite failures (!result.isUncertain)
      }
    }

    // 3. Fallback to environment Resend or environment SMTP if database providers were not configured or all failed
    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim()) {
      if (process.env.NODE_ENV === 'test' && !ResendEmailProvider.mockFetch && !driverFactory) {
        // Skip unmocked live environment Resend in test environment to avoid test safety guard exceptions
      } else {
        try {
          const defaultSender =
            process.env.RESEND_FROM ||
            process.env.EMAIL_FROM ||
            from ||
            'BloodWard <onboarding@resend.dev>';

          const envResend = driverFactory
            ? driverFactory(
                { driver: 'resend', name: 'Environment Resend API' },
                {
                  apiKey: process.env.RESEND_API_KEY,
                  senderAddress: defaultSender,
                  senderName: process.env.RESEND_SENDER_NAME,
                }
              )
            : new ResendEmailProvider({
                apiKey: process.env.RESEND_API_KEY,
                senderAddress: defaultSender,
                senderName: process.env.RESEND_SENDER_NAME || 'BloodWard Network',
              });

          const resendResult = await envResend.sendMail({
            to,
            subject,
            text,
            html,
            from: from || defaultSender,
          });

          if (resendResult.success) {
            await NotificationLog.recordLog({
              channel: 'email',
              driver: 'resend',
              providerName: 'Environment Resend API',
              purpose,
              recipientMasked: maskedRecipient,
              status: candidateProviders?.length > 0 ? 'fallback_triggered' : 'delivered',
              metadata: {
                ...metadata,
                fallbackToEnv: true,
                messageId: resendResult.messageId,
              },
            });

            return {
              success: true,
              providerName: 'Environment Resend API',
              messageId: resendResult.messageId,
            };
          }

          lastError = resendResult;

          // If environment Resend failed with uncertain outcome, halt immediately; do not fall back to SMTP
          if (resendResult.isUncertain) {
            await NotificationLog.recordLog({
              channel: 'email',
              driver: 'resend',
              providerName: 'Environment Resend API',
              purpose,
              recipientMasked: maskedRecipient,
              status: 'failed',
              errorDetails: `Environment Resend failed: ${resendResult.error}`,
              metadata: {
                ...metadata,
                errorCode: resendResult.errorCode,
                fallbackToEnv: true,
                isUncertain: true,
              },
            });

            return {
              success: false,
              providerName: 'Environment Resend API',
              errorCode: resendResult.errorCode,
              error: resendResult.error,
              isUncertain: true,
            };
          }
        } catch (resendEnvErr) {
          const isTimeout =
            resendEnvErr.name === 'TimeoutError' ||
            resendEnvErr.name === 'AbortError' ||
            resendEnvErr.code === 'ETIMEDOUT' ||
            resendEnvErr.code === 'ESOCKETTIMEDOUT' ||
            resendEnvErr.message?.toLowerCase().includes('timeout');

          lastError = {
            errorCode: isTimeout ? 'TIMEOUT' : 'ENV_RESEND_ERROR',
            error: `Default environment Resend dispatch failed: ${resendEnvErr.message}`,
            isUncertain: true, // Fetch/network exceptions after dispatch begins are treated conservatively as uncertain
          };

          await NotificationLog.recordLog({
            channel: 'email',
            driver: 'resend',
            providerName: 'Environment Resend API',
            purpose,
            recipientMasked: maskedRecipient,
            status: 'failed',
            errorDetails: lastError.error,
            metadata: {
              ...metadata,
              errorCode: lastError.errorCode,
              fallbackToEnv: true,
              isUncertain: true,
            },
          });

          return {
            success: false,
            providerName: 'Environment Resend API',
            errorCode: lastError.errorCode,
            error: lastError.error,
            isUncertain: true,
          };
        }
      }
    }

    if (isEmailConfigured()) {
      try {
        const transporter = getEmailTransporter();
        const fromAddress = from || process.env.EMAIL_FROM || 'BloodWard Security <no-reply@bloodward.com>';

        const info = await transporter.sendMail({
          from: fromAddress,
          to: to.trim().toLowerCase(),
          subject: subject.trim(),
          text,
          html,
        });

        await NotificationLog.recordLog({
          channel: 'email',
          driver: 'smtp',
          providerName: 'Default Environment SMTP',
          purpose,
          recipientMasked: maskedRecipient,
          status: candidateProviders?.length > 0 ? 'fallback_triggered' : 'delivered',
          metadata: {
            ...metadata,
            fallbackToEnv: true,
            messageId: info.messageId,
          },
        });

        return {
          success: true,
          providerName: 'Default Environment SMTP',
          messageId: info.messageId,
        };
      } catch (envErr) {
        const codeString = String(envErr.code || '');
        const messageString = String(envErr.message || '').toLowerCase();
        const isTimeout =
          codeString.includes('ETIMEDOUT') ||
          codeString.includes('ESOCKETTIMEDOUT') ||
          messageString.includes('timeout') ||
          messageString.includes('timed out');

        const isAmbiguousConnection =
          codeString.includes('ECONNRESET') ||
          codeString.includes('EPIPE') ||
          messageString.includes('socket hang up') ||
          messageString.includes('socket closed') ||
          messageString.includes('connection reset') ||
          messageString.includes('broken pipe');

        const isUncertain = isTimeout || isAmbiguousConnection;

        lastError = {
          errorCode: isTimeout ? 'TIMEOUT' : (isAmbiguousConnection ? 'NETWORK_ERROR' : 'ENV_SMTP_ERROR'),
          error: `Default environment SMTP dispatch failed: ${envErr.message}`,
          isUncertain,
        };

        if (isUncertain) {
          await NotificationLog.recordLog({
            channel: 'email',
            driver: 'smtp',
            providerName: 'Default Environment SMTP',
            purpose,
            recipientMasked: maskedRecipient,
            status: 'failed',
            errorDetails: lastError.error,
            metadata: {
              ...metadata,
              errorCode: lastError.errorCode,
              fallbackToEnv: true,
              isUncertain: true,
            },
          });

          return {
            success: false,
            providerName: 'Default Environment SMTP',
            errorCode: lastError.errorCode,
            error: lastError.error,
            isUncertain: true,
          };
        }
      }
    }

    // 4. All email dispatch attempts exhausted
    const finalError = lastError || {
      errorCode: 'NO_EMAIL_PROVIDER_CONFIGURED',
      error: 'No active email providers configured or available.',
    };

    await NotificationLog.recordLog({
      channel: 'email',
      driver: 'none',
      purpose,
      recipientMasked: maskedRecipient,
      status: 'failed',
      errorDetails: finalError.error,
      metadata,
    });

    return {
      success: false,
      errorCode: finalError.errorCode,
      error: finalError.error,
      isUncertain: Boolean(finalError.isUncertain),
    };
  }
}

export const notificationManager = new NotificationManager();
export default notificationManager;
