import nodemailer from 'nodemailer';
import NotificationProvider from '../models/notificationProvider.model.js';
import { notificationManager } from '../services/notification/notificationManager.js';

/**
 * Check if outbound SMTP configuration is defined in environment variables
 */
export const isEmailConfigured = () => {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
};

/**
 * Checks whether any email delivery channel (database provider or environment SMTP) is available
 */
export const isAnyEmailServiceAvailable = async () => {
  if (isEmailConfigured()) {
    return true;
  }
  try {
    const hasDbProvider = await NotificationProvider.exists({
      providerType: 'email',
      isEnabled: true,
      isHealthy: true,
    });
    return Boolean(hasDbProvider);
  } catch (err) {
    return false;
  }
};

/**
 * Creates and returns configured nodemailer transport instance for environment fallback
 */
export const getEmailTransporter = () => {
  if (!isEmailConfigured()) {
    return null;
  }

  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = port === 465;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

/**
 * Dispatches a password reset email to the recipient.
 * Routes through the notification manager if configured in database,
 * or seamlessly falls back to default environment SMTP settings.
 *
 * @param {Object} options
 * @param {string} options.to Recipient email address
 * @param {string} options.userName Recipient full name
 * @param {string} options.resetUrl Fully qualified password reset link
 */
export const sendPasswordResetEmail = async ({ to, userName, resetUrl }) => {
  const subject = 'BloodWard — Password Reset Request';
  const textBody = `Hello ${userName || 'User'},\n\nYou recently requested to reset your password for your BloodWard account. Please use the following link to set a new password:\n\n${resetUrl}\n\nThis link will expire in 15 minutes.\n\nIf you did not request this password reset, please ignore this email or contact support if you suspect unauthorized activity.\n\nBest regards,\nThe BloodWard Team`;
  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #1e293b; margin-top: 0;">Password Reset Request</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">Hello ${userName || 'User'},</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">You recently requested to reset your password for your BloodWard account. Click the button below to choose a new password:</p>
      <div style="margin: 28px 0; text-align: center;">
        <a href="${resetUrl}" style="background-color: #A61B2B; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Reset Password</a>
      </div>
      <p style="color: #64748b; font-size: 12px; line-height: 1.5;">This link will expire in <strong>15 minutes</strong>. If you did not make this request, you can safely ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 11px; margin-bottom: 0;">BloodWard Healthcare Network • Secure Automated Communication</p>
    </div>
  `;

  // 1. Check if database email providers are available
  try {
    const hasDbEmailProvider = await NotificationProvider.exists({
      providerType: 'email',
      isEnabled: true,
      isHealthy: true,
    });

    if (hasDbEmailProvider) {
      const result = await notificationManager.sendEmail({
        to,
        subject,
        text: textBody,
        html: htmlBody,
        purpose: 'password_reset',
        metadata: { userName },
      });

      if (result.success) {
        return {
          sent: true,
          messageId: result.messageId,
          providerName: result.providerName,
        };
      }
    }
  } catch (dbErr) {
    // If DB check fails, continue to environment fallback
  }

  // 2. Fallback to environment variables
  if (!isEmailConfigured()) {
    return {
      sent: false,
      reason: 'SMTP configuration missing in environment variables (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)',
    };
  }

  try {
    const transporter = getEmailTransporter();
    const fromAddress = process.env.EMAIL_FROM || 'BloodWard Security <no-reply@bloodward.com>';

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text: textBody,
      html: htmlBody,
    });

    return {
      sent: true,
      messageId: info.messageId,
    };
  } catch (err) {
    return {
      sent: false,
      reason: `Email transport failed: ${err.message}`,
    };
  }
};
