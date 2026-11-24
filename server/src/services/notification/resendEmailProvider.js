/**
 * Encapsulated Resend Email Provider using Native HTTPS REST API.
 * Uses Node 24 native fetch and AbortSignal.timeout without external npm dependencies.
 * Dispatches via https://api.resend.com/emails with Bearer API token authentication.
 */
export class ResendEmailProvider {
  /**
   * Static mock fetch handler for automated test isolation.
   * When set, all ResendEmailProvider instances across the process will use this mock
   * instead of making live external HTTP requests.
   */
  static mockFetch = null;

  /**
   * @param {object} options
   * @param {string} options.apiKey Resend API key (e.g. re_123456789)
   * @param {string} [options.senderAddress] Outbound sender email (default: 'BloodWard <onboarding@resend.dev>')
   * @param {string} [options.senderName] Sender display name (default: 'BloodWard Network')
   * @param {string} [options.baseUrl] Resend base API URL (default: 'https://api.resend.com')
   * @param {number} [options.timeoutMs] Network request timeout in milliseconds (default: 10000)
   * @param {Function} [options.fetchOverride] Custom fetch function for mocking/testing
   */
  constructor(options = {}) {
    if (!options.apiKey || typeof options.apiKey !== 'string' || !options.apiKey.trim()) {
      throw new Error('Resend API key is required and must be a non-empty string.');
    }

    this.apiKey = options.apiKey.trim();
    this.senderAddress = options.senderAddress?.trim() || 'onboarding@resend.dev';
    this.senderName = options.senderName?.trim() || 'BloodWard Network';
    this.baseUrl = (options.baseUrl?.trim() || 'https://api.resend.com').replace(/\/+$/, '');
    this.timeoutMs = Number(options.timeoutMs) || 10000;

    this.fetch = options.fetchOverride || ResendEmailProvider.mockFetch;

    if (!this.fetch) {
      if (process.env.NODE_ENV === 'test') {
        throw new Error(
          'TEST SAFETY GUARD: Live HTTP requests to Resend API are strictly forbidden in test environment. ' +
          'Configure ResendEmailProvider.mockFetch or options.fetchOverride.'
        );
      }
      this.fetch = globalThis.fetch;
    }

    if (typeof this.fetch !== 'function') {
      throw new Error('Native fetch API is not available in the current Node environment.');
    }
  }

  /**
   * Helper to format the From address cleanly: "Sender Name <email@domain.com>" or "email@domain.com"
   * @param {string} [fromOverride]
   * @returns {string}
   */
  getFormattedFrom(fromOverride) {
    const rawFrom = (fromOverride && typeof fromOverride === 'string' && fromOverride.trim())
      ? fromOverride.trim()
      : this.senderAddress;

    if (rawFrom && rawFrom.includes('<') && rawFrom.includes('>')) {
      return rawFrom;
    }
    if (this.senderName && rawFrom) {
      return `${this.senderName} <${rawFrom}>`;
    }
    return rawFrom || this.senderAddress;
  }

  /**
   * Verifies the Resend API key by checking key validity against the Resend REST API
   * @returns {Promise<{ success: boolean, error?: string, errorCode?: string }>}
   */
  async verifyConnection() {
    try {
      const response = await this.fetch(`${this.baseUrl}/api-keys`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'User-Agent': 'BloodWard/1.0',
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (response.ok) {
        return { success: true };
      }

      let errorData = null;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = {};
      }

      const errorMessage = errorData?.message || `Resend API returned HTTP ${response.status}`;

      if (response.status === 401) {
        return {
          success: false,
          errorCode: 'AUTH_FAILURE',
          error: `Resend authentication failed: ${errorMessage}`,
        };
      }

      if (response.status === 403) {
        const lowerMsg = errorMessage.toLowerCase();
        let errorCode = 'FORBIDDEN';
        if (
          lowerMsg.includes('sender') ||
          lowerMsg.includes('domain') ||
          lowerMsg.includes('verify') ||
          lowerMsg.includes('unverified') ||
          lowerMsg.includes('from')
        ) {
          errorCode = 'UNVERIFIED_SENDER';
        } else if (
          lowerMsg.includes('key') ||
          lowerMsg.includes('permission') ||
          lowerMsg.includes('restricted') ||
          lowerMsg.includes('token') ||
          lowerMsg.includes('unauthorized') ||
          lowerMsg.includes('auth')
        ) {
          errorCode = 'AUTH_FAILURE';
        }
        return {
          success: false,
          errorCode,
          error: `Resend access forbidden: ${errorMessage}`,
        };
      }

      if (response.status === 429) {
        return {
          success: false,
          errorCode: 'RATE_LIMIT',
          error: `Resend API rate limit exceeded: ${errorMessage}`,
        };
      }

      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        error: `Resend verification failed [HTTP ${response.status}]: ${errorMessage}`,
      };
    } catch (err) {
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        return {
          success: false,
          errorCode: 'TIMEOUT',
          error: `Resend API connection timed out after ${this.timeoutMs}ms.`,
        };
      }

      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        error: `Resend connection failed: ${err.message}`,
      };
    }
  }

  /**
   * Dispatches an email message via Resend POST /emails
   * @param {object} params
   * @param {string} params.to Recipient email address
   * @param {string} params.subject Email subject line
   * @param {string} [params.text] Plaintext message
   * @param {string} [params.html] HTML message
   * @param {string} [params.from] Optional custom sender address
   * @returns {Promise<{ success: boolean, messageId?: string, error?: string, errorCode?: string, isUncertain?: boolean }>}
   */
  async sendMail({ to, subject, text, html, from }) {
    if (!to || typeof to !== 'string' || !to.includes('@')) {
      return {
        success: false,
        errorCode: 'INVALID_RECIPIENT',
        isUncertain: false,
        error: 'Invalid recipient email address.',
      };
    }

    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      return {
        success: false,
        errorCode: 'EMPTY_SUBJECT',
        isUncertain: false,
        error: 'Email subject is required.',
      };
    }

    if (!text && !html) {
      return {
        success: false,
        errorCode: 'EMPTY_BODY',
        isUncertain: false,
        error: 'Email body (text or html) is required.',
      };
    }

    const payload = {
      from: this.getFormattedFrom(from),
      to: [to.trim().toLowerCase()],
      subject: subject.trim(),
    };

    if (html) payload.html = html;
    if (text) payload.text = text;

    try {
      const response = await this.fetch(`${this.baseUrl}/emails`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'BloodWard/1.0',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      let responseData = null;
      try {
        responseData = await response.json();
      } catch (e) {
        responseData = {};
      }

      if (response.ok) {
        const messageId = typeof responseData?.id === 'string' ? responseData.id.trim() : null;
        if (messageId) {
          return {
            success: true,
            messageId,
          };
        }
        return {
          success: false,
          errorCode: 'INVALID_PROVIDER_RESPONSE',
          isUncertain: true,
          error: 'Resend API returned successful HTTP status but missing or invalid message ID.',
        };
      }

      const rawMsg = responseData?.message || responseData?.error || `HTTP ${response.status}`;
      const lowerRawMsg = String(rawMsg).toLowerCase();
      let errorCode = 'DISPATCH_ERROR';
      let isUncertain = false;

      if (response.status === 401) {
        errorCode = 'AUTH_FAILURE';
      } else if (response.status === 403) {
        if (
          lowerRawMsg.includes('sender') ||
          lowerRawMsg.includes('domain') ||
          lowerRawMsg.includes('verify') ||
          lowerRawMsg.includes('unverified') ||
          lowerRawMsg.includes('from')
        ) {
          errorCode = 'UNVERIFIED_SENDER';
        } else if (
          lowerRawMsg.includes('key') ||
          lowerRawMsg.includes('permission') ||
          lowerRawMsg.includes('restricted') ||
          lowerRawMsg.includes('token') ||
          lowerRawMsg.includes('unauthorized') ||
          lowerRawMsg.includes('auth')
        ) {
          errorCode = 'AUTH_FAILURE';
        } else {
          errorCode = 'FORBIDDEN';
        }
      } else if (response.status === 422) {
        errorCode = 'INVALID_REQUEST';
      } else if (response.status === 429) {
        errorCode = 'RATE_LIMIT';
      } else if (response.status >= 500) {
        errorCode = 'DISPATCH_ERROR';
        isUncertain = true;
      }

      return {
        success: false,
        errorCode,
        isUncertain,
        error: `Resend dispatch failed [${errorCode}]: ${rawMsg}`,
      };
    } catch (err) {
      if (
        err.name === 'TimeoutError' ||
        err.name === 'AbortError' ||
        err.code === 'ETIMEDOUT' ||
        err.code === 'ESOCKETTIMEDOUT' ||
        err.message?.toLowerCase().includes('timeout')
      ) {
        return {
          success: false,
          errorCode: 'TIMEOUT',
          isUncertain: true, // The request may have been processed upstream before the timeout
          error: `Resend dispatch timed out after ${this.timeoutMs}ms.`,
        };
      }

      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        isUncertain: true, // Conservative: request may have reached Resend before connection was severed
        error: `Resend network connection failed: ${err.message}`,
      };
    }
  }
}

export default ResendEmailProvider;
