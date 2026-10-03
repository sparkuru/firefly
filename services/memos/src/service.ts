import { normalizeSubmission } from './validation.js';
import { MemoRepository } from './repository.js';
import { ServiceError, type DeliveryTransport, type MailMessage } from './types.js';
import type { MemosConfig } from '../../../plugins/memos/config.mjs';

export class MemoService {
  constructor(readonly repository: MemoRepository, readonly config: MemosConfig, readonly transport: DeliveryTransport | null) {}
  ready(): boolean { return this.repository.ready() && this.transport !== null && this.config.runtime.publicOrigin !== null && this.config.runtime.allowedOrigins.length > 0; }
  submit(input: unknown, origin: string | undefined, address: string): void {
    if (!origin || !this.config.runtime.allowedOrigins.includes(origin)) throw new ServiceError(403, 'origin_denied');
    if (!this.ready()) throw new ServiceError(503, 'service_unavailable');
    this.repository.accept(normalizeSubmission(input, this.config.public.consentVersion), address);
  }
  async deliver(limit = 100): Promise<{ delivered: number; failed: number }> {
    if (!this.transport || !this.config.runtime.publicOrigin) throw new ServiceError(503, 'delivery_unavailable');
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new ServiceError(400, 'invalid_input');
    this.repository.maintain();
    const result = { delivered: 0, failed: 0 };
    for (let index = 0; index < limit; index += 1) {
      const claim = this.repository.claim();
      if (!claim) break;
      let delivered = false;
      try {
        const raw: unknown = JSON.parse(this.repository.crypto.decrypt('outbox', claim.id, claim.payload));
        if (!raw || typeof raw !== 'object') throw new Error();
        const payload = raw as Record<string, unknown>;
        if (Object.keys(payload).sort().join(',') !== 'to,token' || typeof payload.to !== 'string' || typeof payload.token !== 'string') throw new Error();
        const message: MailMessage = { id: claim.id, to: payload.to, token: payload.token, publicOrigin: this.config.runtime.publicOrigin };
        await this.transport.deliver(message);
        delivered = true;
      } catch { /* Only bounded delivery status is persisted, never transport errors. */ }
      this.repository.finishMail(claim, delivered);
      result[delivered ? 'delivered' : 'failed'] += 1;
    }
    return result;
  }
}
