import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { configContract } from '../src/contract.js';
import { MemoCrypto } from '../src/crypto.js';
import { MemoRepository } from '../src/repository.js';
import { MemoService } from '../src/service.js';
import type { MailMessage } from '../src/types.js';

export const origin = 'https://example.com';
export const adminToken = 'owner-only-test-credential-0123456789';
export const input = { displayName: 'Reader', email: 'reader@example.com', body: 'A memo <script>literal</script>', consentVersion: 'memos-v1', consent: 'accepted' };
export const crypto = new MemoCrypto(Buffer.alloc(32, 1), Buffer.alloc(32, 2), 'test');
export const plugin = configContract.parseMemosConfig({ public: { writeOrigin: origin }, runtime: { allowedOrigins: [origin], publicOrigin: origin } });
export function fixture(options: { fail?: string } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'memos-test-'));
  const database = path.join(root, 'memos.sqlite');
  let now = Date.parse('2026-10-03T00:00:00.000Z');
  let stage = options.fail ?? '';
  let repository = new MemoRepository(database, crypto, { now: () => now, fault: (value) => { if (value === stage) throw new Error('injected-failure'); } });
  const messages: MailMessage[] = [];
  let failDelivery = false;
  const transport = { async deliver(message: MailMessage) { if (failDelivery) throw new Error('private-transport-transcript'); messages.push(message); } };
  const makeService = () => new MemoService(repository, plugin, transport);
  let service = makeService();
  return {
    root, database, messages,
    get repository() { return repository; }, get service() { return service; }, get now() { return now; },
    advance(milliseconds: number) { now += milliseconds; },
    fault(value: string) { stage = value; }, deliveryFails(value: boolean) { failDelivery = value; },
    reopen() { repository.close(); repository = new MemoRepository(database, crypto, { now: () => now }); service = makeService(); },
    close() { repository.close(); fs.rmSync(root, { recursive: true, force: true }); },
    submit(value: unknown = input, address = '192.0.2.1') {
      const existing = new Set(repository.list(100).submissions.map((row) => row.id));
      service.submit(value, origin, address);
      return repository.list(100).submissions.find((row) => !existing.has(row.id))?.id ?? [...existing][0]!;
    },
    token(id: string) {
      const row = repository.database.prepare('SELECT payload_cipher FROM outbox WHERE id = ?').get(id)!;
      return (JSON.parse(crypto.decrypt('outbox', id, row.payload_cipher as string)) as { token: string }).token;
    }
  };
}
