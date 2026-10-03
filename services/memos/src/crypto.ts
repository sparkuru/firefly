import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { ServiceError } from './types.js';

export function decodeKey(value: string | undefined): Buffer {
  if (!value || !/^[a-f0-9]{64}$/u.test(value)) throw new ServiceError(503, 'invalid_secret');
  return Buffer.from(value, 'hex');
}
export function credentialHash(value: string): Buffer { return createHash('sha256').update(value).digest(); }
export function authenticated(value: string | undefined, expected: Buffer): boolean {
  return typeof value === 'string' && /^Bearer [^\s]{32,512}$/u.test(value) && timingSafeEqual(credentialHash(value.slice(7)), expected);
}
export class MemoCrypto {
  constructor(private readonly encryptionKey: Buffer, private readonly tokenKey: Buffer, readonly keyId: string) {
    if (encryptionKey.length !== 32 || tokenKey.length !== 32 || !/^[A-Za-z0-9_-]{1,64}$/u.test(keyId)) throw new ServiceError(503, 'invalid_secret');
  }
  token(): string { return randomBytes(32).toString('base64url'); }
  hash(purpose: string, input: string): string { return createHmac('sha256', this.tokenKey).update(`${purpose}\0${input}`).digest('hex'); }
  encrypt(purpose: string, id: string, value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    cipher.setAAD(Buffer.from(`memos:v1:${this.keyId}:${purpose}:${id}`));
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return JSON.stringify({ version: 1, keyId: this.keyId, iv: iv.toString('base64url'), tag: cipher.getAuthTag().toString('base64url'), ciphertext: ciphertext.toString('base64url') });
  }
  decrypt(purpose: string, id: string, value: string): string {
    try {
      const envelope = JSON.parse(value) as Record<string, unknown>;
      if (Object.keys(envelope).sort().join(',') !== 'ciphertext,iv,keyId,tag,version' || envelope.version !== 1 || envelope.keyId !== this.keyId) throw new Error();
      const part = (key: string, length?: number): Buffer => {
        const text = envelope[key];
        if (typeof text !== 'string' || !/^[A-Za-z0-9_-]*$/u.test(text)) throw new Error();
        const bytes = Buffer.from(text, 'base64url');
        if (bytes.toString('base64url') !== text || (length !== undefined && bytes.length !== length)) throw new Error();
        return bytes;
      };
      const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, part('iv', 12));
      decipher.setAAD(Buffer.from(`memos:v1:${this.keyId}:${purpose}:${id}`));
      decipher.setAuthTag(part('tag', 16));
      return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat([decipher.update(part('ciphertext')), decipher.final()]));
    } catch { throw new ServiceError(503, 'crypto_unavailable'); }
  }
}
