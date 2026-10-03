import { publicContract } from './contract.js';
import { ServiceError, type Submission } from './types.js';

export function normalizeEmail(value: unknown): string {
  if (typeof value !== 'string') throw new ServiceError(400, 'invalid_input');
  const email = value.trim().normalize('NFC').toLowerCase();
  const [local, domain, extra] = email.split('@');
  if (Buffer.byteLength(email) > 320 || !local || local.length > 64 || !domain || domain.length > 253 || extra !== undefined || !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/u.test(local) || !/^(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/u.test(domain)) throw new ServiceError(400, 'invalid_input');
  return email;
}
export function normalizeSubmission(value: unknown, consentVersion: string): Submission {
  try {
    if (!value || typeof value !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new Error();
    const keys = ['displayName', 'email', 'body', 'consentVersion', 'consent', 'honeypot'];
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== 'string' || !keys.includes(key) || !Object.hasOwn(Object.getOwnPropertyDescriptor(value, key)!, 'value')) throw new Error();
    }
    const input = value as Record<string, unknown>;
    if (input.consent !== 'accepted' || input.consentVersion !== consentVersion || (input.honeypot !== undefined && input.honeypot !== '')) throw new Error();
    return { displayName: publicContract.normalizeDisplayName(input.displayName), body: publicContract.normalizeBody(input.body), email: normalizeEmail(input.email), consentVersion };
  } catch { throw new ServiceError(400, 'invalid_input'); }
}
export function requireId(id: string): string {
  try { return publicContract.normalizePublicId(id); } catch { throw new ServiceError(400, 'invalid_input'); }
}
