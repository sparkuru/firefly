import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { ValidationError } from './errors.js';

const AES_ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;

export type Secret = string | Uint8Array;

export function createOpaqueToken(prefix: 'v_' | 'k_'): string {
  return `${prefix}${randomBytes(32).toString('base64url')}`;
}

export function hashToken(token: string, secret: Secret): string {
  if (token.length === 0) {
    throw new ValidationError('token cannot be empty.');
  }
  return createHmac('sha256', toSecretBuffer(secret)).update(token, 'utf8').digest('hex');
}

export function fingerprint(value: string, secret: Secret): string {
  return createHmac('sha256', toSecretBuffer(secret)).update(value, 'utf8').digest('hex');
}

export function constantTimeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export class EmailCipher {
  private readonly key: Buffer;

  constructor(key: Uint8Array) {
    if (key.byteLength !== KEY_BYTES) {
      throw new ValidationError('email encryption key must contain exactly 32 bytes.', 'invalid_secret');
    }
    this.key = Buffer.from(key);
  }

  static random(): EmailCipher {
    return new EmailCipher(randomBytes(KEY_BYTES));
  }

  static fromEnvironment(name = 'COMMENTS_EMAIL_KEY'): EmailCipher {
    const value = process.env[name];
    if (!value) {
      throw new ValidationError(`${name} must be provided at runtime.`, 'missing_secret');
    }
    const key = decodeSecret(value);
    return new EmailCipher(key);
  }

  encrypt(email: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(AES_ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(email, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return ['v1', iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.');
  }

  decrypt(value: string): string {
    const [version, ivEncoded, tagEncoded, ciphertextEncoded] = value.split('.');
    if (version !== 'v1' || !ivEncoded || !tagEncoded || !ciphertextEncoded) {
      throw new ValidationError('encrypted email has an unsupported format.', 'invalid_ciphertext');
    }
    try {
      const iv = Buffer.from(ivEncoded, 'base64url');
      const tag = Buffer.from(tagEncoded, 'base64url');
      const ciphertext = Buffer.from(ciphertextEncoded, 'base64url');
      if (iv.toString('base64url') !== ivEncoded || tag.toString('base64url') !== tagEncoded || ciphertext.toString('base64url') !== ciphertextEncoded || iv.byteLength !== IV_BYTES || tag.byteLength !== 16) {
        throw new Error('non-canonical ciphertext');
      }
      const decipher = createDecipheriv(AES_ALGORITHM, this.key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    } catch {
      throw new ValidationError('encrypted email could not be authenticated.', 'invalid_ciphertext');
    }
  }
}

function toSecretBuffer(secret: Secret): Buffer {
  const buffer = typeof secret === 'string' ? Buffer.from(secret, 'utf8') : Buffer.from(secret);
  if (buffer.length < 16) {
    throw new ValidationError('token secret must contain at least 16 bytes.', 'invalid_secret');
  }
  return buffer;
}

function decodeSecret(value: string): Buffer {
  const normalized = value.trim();
  if (/^[0-9a-f]{64}$/iu.test(normalized)) {
    return Buffer.from(normalized, 'hex');
  }
  try {
    const decoded = Buffer.from(normalized, 'base64url');
    if (decoded.length === KEY_BYTES) {
      return decoded;
    }
  } catch {
    // The explicit error below avoids exposing parsing details.
  }
  throw new ValidationError('email encryption key must be 64 hex or 32 base64url bytes.', 'invalid_secret');
}
