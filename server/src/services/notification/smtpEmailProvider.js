import nodemailer from 'nodemailer';
import net from 'net';
import { ALLOWED_SMTP_PORTS, createSecureLookup, isPrivateOrReservedIp } from '../../utils/ssrfGuard.js';

/**
 * Encapsulated SMTP Email Provider for Gmail and standard SMTP servers.
 * Supports Gmail App Passwords and standard TLS/STARTTLS configurations.
 */
export class SmtpEmailProvider {
  static mockTransporter = null;

  /**
   * @param {object} options
   * @param {string} options.host SMTP host (e.g. smtp.gmail.com)
   * @param {number} [options.port] SMTP port (default: 587)
   * @param {string} options.user SMTP username / email
   * @param {string} options.pass SMTP password / App password
   * @param {string} [options.senderAddress] Outbound From address
   * @param {boolean} [options.secure] True for 465 (SSL), false for 587 (TLS/STARTTLS)
   * @param {object} [options.transporterOverride] For testing / mocking
   */
  constructor(options = {}) {
    if (!options.host) {
      throw new Error('SMTP host is required.');
    }
    if (!options.user) {
      throw new Error('SMTP username/email is required.');
    }
    if (!options.pass) {
      throw new Error('SMTP password is required.');
    }

    this.host = String(options.host).trim();
    this.port = Number(options.port) || 587;

    // F-01: Port restriction validation
    if (!ALLOWED_SMTP_PORTS.includes(this.port)) {
      throw new Error(`Disallowed SMTP port ${this.port}. Allowed ports are: ${ALLOWED_SMTP_PORTS.join(', ')}.`);
    }

    // F-01: Rejection of private/loopback/reserved literal IP addresses
    if (net.isIP(this.host) && isPrivateOrReservedIp(this.host)) {
      throw new Error(`SSRF Protection: SMTP host "${this.host}" points to a private, loopback, or reserved IP address.`);
    }

    this.user = options.user;
    this.pass = options.pass;
    this.senderAddress = options.senderAddress || `BloodWard <${options.user}>`;
    this.secure = options.secure !== undefined ? Boolean(options.secure) : this.port === 465;

    // Use override if provided (useful for tests)
    this.transporter =
      options.transporterOverride ||
      SmtpEmailProvider.mockTransporter ||
      nodemailer.createTransport({
        host: this.host,
        port: this.port,
        secure: this.secure,
        auth: {
          user: this.user,
          pass: this.pass,
        },
        lookup: options.lookup || createSecureLookup(),
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });
  }

  /**
   * Verifies SMTP connection and authentication credentials
   * @returns {Promise<{ success: boolean, error?: string, errorCode?: string }>}
   */
  async verifyConnection() {
    try {
      await this.transporter.verify();
      return { success: true };
    } catch (err) {
      const code = err.responseCode || err.code;
      let errorCode = 'NETWORK_ERROR';

      if (err.code === 'ERR_SSRF_BLOCKED' || err.message?.includes('SSRF')) {
        errorCode = 'SSRF_BLOCKED';
      } else if (code === 535 || err.message?.includes('Invalid login') || err.message?.includes('Username and Password not accepted')) {
        errorCode = 'AUTH_FAILURE';
      }

      return {
        success: false,
        errorCode,
        error: `SMTP connection verification failed: ${err.message}`,
      };
    }
  }

  /**
   * Dispatches an email message
   * @param {object} params
   * @param {string} params.to Recipient email address
   * @param {string} params.subject Email subject line
   * @param {string} [params.text] Plaintext message
   * @param {string} [params.html] HTML message
   * @param {string} [params.from] Optional custom sender address
   * @returns {Promise<{ success: boolean, messageId?: string, error?: string, errorCode?: string }>}
   */
  async sendMail({ to, subject, text, html, from }) {
    if (!to || typeof to !== 'string' || !to.includes('@')) {
      return {
        success: false,
        errorCode: 'INVALID_RECIPIENT',
        error: 'Invalid recipient email address.',
      };
    }

    if (!subject || typeof subject !== 'string') {
      return {
        success: false,
        errorCode: 'EMPTY_SUBJECT',
        error: 'Email subject is required.',
      };
    }

    if (!text && !html) {
      return {
        success: false,
        errorCode: 'EMPTY_BODY',
        error: 'Email body (text or html) is required.',
      };
    }

    const mailOptions = {
      from: from || this.senderAddress,
      to: to.trim().toLowerCase(),
      subject: subject.trim(),
      text,
      html,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      return {
        success: true,
        messageId: info.messageId || `smtp_${Date.now()}`,
      };
    } catch (err) {
      const responseCode = err.responseCode || (typeof err.code === 'number' ? err.code : null);
      const codeString = String(err.code || '');
      let errorCode = 'DISPATCH_ERROR';
      let isUncertain = false;

      if (err.code === 'ERR_SSRF_BLOCKED' || err.message?.includes('SSRF')) {
        errorCode = 'SSRF_BLOCKED';
      } else if (responseCode === 535 || err.message?.includes('Invalid login') || err.message?.includes('Username and Password not accepted')) {
        errorCode = 'AUTH_FAILURE';
      } else if (responseCode === 421 || responseCode === 450 || responseCode === 451) {
        errorCode = 'RATE_LIMIT';
      } else if (codeString.includes('ETIMEDOUT') || err.message?.includes('timed out')) {
        errorCode = 'TIMEOUT';
        isUncertain = true; // Email might have been received before timeout
      } else if (codeString.includes('ECONNREFUSED') || codeString.includes('ENOTFOUND')) {
        errorCode = 'NETWORK_ERROR';
      }

      return {
        success: false,
        errorCode,
        isUncertain,
        error: `SMTP dispatch failed [${errorCode}]: ${err.message}`,
      };
    }
  }
}
