import crypto from 'crypto';

/**
 * Validates and retrieves the 32-byte encryption key from ENCRYPTION_SECRET.
 * Refuses to use any hardcoded or insecure fallback.
 * @returns {Buffer} 32-byte buffer key
 */
export function getEncryptionKey() {
  const secret = process.env.ENCRYPTION_SECRET;

  if (!secret || typeof secret !== 'string' || secret.trim().length < 32) {
    throw new Error(
      'CRITICAL SECURITY CONFIGURATION: ENCRYPTION_SECRET environment variable is missing or shorter than 32 characters. ' +
      'Refusing to operate with an insecure or hardcoded key.'
    );
  }

  // Derive a consistent 32-byte (256-bit) key using SHA-256
  return crypto.createHash('sha256').update(secret.trim()).digest();
}

/**
 * Encrypts arbitrary text or serialized data using AES-256-GCM.
 * @param {string|object} plaintext Text or object to encrypt
 * @returns {string} Colon-delimited format: "ivHex:authTagHex:ciphertextHex"
 */
export function encrypt(plaintext) {
  if (plaintext === null || plaintext === undefined) {
    throw new Error('Encryption payload cannot be null or undefined.');
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // Standard 96-bit IV for AES-GCM

  const textToEncrypt = typeof plaintext === 'object' ? JSON.stringify(plaintext) : String(plaintext);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(textToEncrypt, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted payload.
 * Verifies authenticity tag; throws on tampering or corruption.
 * @param {string} encryptedString "ivHex:authTagHex:ciphertextHex"
 * @param {boolean} parseJson If true, attempts to parse result as JSON
 * @returns {string|object} Decrypted plaintext string or parsed object
 */
export function decrypt(encryptedString, parseJson = false) {
  if (!encryptedString || typeof encryptedString !== 'string') {
    throw new Error('Invalid encrypted payload: must be a non-empty string.');
  }

  const parts = encryptedString.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format: expected "iv:authTag:ciphertext".');
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;

  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error('Invalid encrypted payload: missing IV, auth tag, or ciphertext.');
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  if (iv.length !== 12) {
    throw new Error('Invalid IV length: expected 12 bytes.');
  }
  if (authTag.length !== 16) {
    throw new Error('Invalid authentication tag length: expected 16 bytes.');
  }

  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    if (parseJson) {
      try {
        return JSON.parse(decrypted);
      } catch (jsonErr) {
        return decrypted;
      }
    }

    return decrypted;
  } catch (err) {
    throw new Error(`Decryption failed: integrity verification failed or payload corrupted. Details: ${err.message}`);
  }
}

/**
 * Masks a phone number for logs and previews (e.g., "+91 98*** ***12").
 * @param {string} phone
 * @returns {string} Masked phone number
 */
export function maskPhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return '';
  const cleaned = phone.trim();
  if (cleaned.length <= 4) return '****';
  const prefix = cleaned.slice(0, cleaned.length > 7 ? 5 : 2);
  const suffix = cleaned.slice(-2);
  return `${prefix}*** ***${suffix}`;
}

/**
 * Masks an email address for logs and previews (e.g., "u***r@example.com").
 * @param {string} email
 * @returns {string} Masked email
 */
export function maskEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const cleaned = email.trim();
  const atIndex = cleaned.indexOf('@');
  if (atIndex <= 1) return `***${cleaned.slice(atIndex)}`;
  const local = cleaned.slice(0, atIndex);
  const domain = cleaned.slice(atIndex);
  return `${local[0]}***${local[local.length - 1]}${domain}`;
}
