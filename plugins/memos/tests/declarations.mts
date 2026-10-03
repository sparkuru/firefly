import { createPublicExport, decodePublicMemosExport, digestForExport, serializePublicExport, type PublicMemo, type PublicMemosExport } from '../public.mjs';
import { parseMemosActivation, parseMemosConfig, parseMemosPublicConfig, resolveMemosConfigPath, type MemosPublicConfig, type MemosSmtpConfig } from '../config.mjs';
const memo: PublicMemo = { id: 'm_aaa', displayName: 'Reader', body: 'Text', createdAt: '2026-09-30T00:00:00.000Z' };
const payload = { schemaVersion: 1 as const, sourceRevision: 'revision', generatedAt: memo.createdAt, tombstoneEpoch: 0, memos: [memo] };
const exported: PublicMemosExport = createPublicExport(payload);
const serialized: string = serializePublicExport(exported);
const decoded: PublicMemosExport = decodePublicMemosExport(new TextEncoder().encode(serialized));
const digest: string = digestForExport(payload);
const projected: MemosPublicConfig = parseMemosPublicConfig({});
const path: string = resolveMemosConfigPath(parseMemosActivation().configPath);
const references: Readonly<{ adminToken?: string }> = parseMemosConfig().runtime.secretEnv;
const smtp: MemosSmtpConfig | null = parseMemosConfig().runtime.smtp;
const encryptionReference: string | undefined = parseMemosConfig().runtime.secretEnv.encryptionKey;
const encryptionKeyId: string = parseMemosConfig().runtime.encryptionKeyId;
if (smtp) {
  // @ts-expect-error SMTP configuration is immutable.
  smtp.secure = true;
}
// @ts-expect-error Decoded public records are immutable.
decoded.memos[0].body = 'changed';
// @ts-expect-error A complete export requires its digest.
const missingDigest: PublicMemosExport = payload;
// @ts-expect-error Runtime secret references are absent from the public projection.
projected.secretEnv;
void [digest, path, references, missingDigest, smtp, encryptionReference, encryptionKeyId];
