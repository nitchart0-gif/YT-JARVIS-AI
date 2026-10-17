import crypto from 'node:crypto';

// AES-256-GCM requires a 32-byte (256-bit) key
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

// Derive master encryption key from environment variable or securely generated ephemeral key
let masterKeyBuffer: Buffer;
export let isEphemeralKey = false;

if (process.env.PORTAL_ENCRYPTION_SECRET && process.env.PORTAL_ENCRYPTION_SECRET.trim().length >= 16) {
  // Hash the secret to ensure standard 32 bytes key length
  masterKeyBuffer = crypto.createHash('sha256').update(process.env.PORTAL_ENCRYPTION_SECRET).digest();
} else {
  // Generate a cryptographically secure 32-byte key for this server instance
  masterKeyBuffer = crypto.randomBytes(32);
  isEphemeralKey = true;
}

export interface EncryptedPayload {
  iv: string; // hex
  authTag: string; // hex
  cipherText: string; // hex
}

/**
 * Encrypt plain text using AES-256-GCM
 */
export function encryptValue(plainText: string): EncryptedPayload {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, masterKeyBuffer, iv);
  let cipherText = cipher.update(plainText, 'utf8', 'hex');
  cipherText += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    cipherText,
  };
}

/**
 * Decrypt AES-256-GCM payload
 */
export function decryptValue(payload: EncryptedPayload): string {
  const iv = Buffer.from(payload.iv, 'hex');
  const authTag = Buffer.from(payload.authTag, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, masterKeyBuffer, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(payload.cipherText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Creates a safe masked string for display (e.g. AIzaSy...***...8xQ9).
 * Never exposes the full key.
 */
export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return '••••••••';
  const prefix = key.slice(0, 6);
  const suffix = key.slice(-4);
  return `${prefix}••••••••••••${suffix}`;
}

/**
 * Sanitizes any string to prevent leaking API keys or secrets in logs
 */
export function sanitizeLog(message: string, secret?: string): string {
  if (!secret) return message;
  return message.replaceAll(secret, '[REDACTED_SECRET]');
}
