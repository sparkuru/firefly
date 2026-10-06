import { createPublicExport, decodePublicMemosExport, digestForExport, serializePublicExport, type PublicMemo, type PublicMemosExport } from '../public.mjs';
import { parseMemosActivation, parseMemosConfig, parseMemosPublicConfig, resolveMemosConfigPath, type MemosPublicConfig } from '../config.mjs';
const memo: PublicMemo = { id: 'm_aaa', displayName: 'Reader', body: 'Text', createdAt: '2026-09-30T00:00:00.000Z' };
const payload = { schemaVersion: 2 as const, bodyFormat: 'markdown' as const, sourceRevision: 'revision', generatedAt: memo.createdAt, tombstoneEpoch: 0, memos: [memo] };
const exported: PublicMemosExport = createPublicExport(payload);
const serialized: string = serializePublicExport(exported);
const decoded: PublicMemosExport = decodePublicMemosExport(new TextEncoder().encode(serialized));
const digest: string = digestForExport(payload);
const projected: MemosPublicConfig = parseMemosPublicConfig({});
const path: string = resolveMemosConfigPath(parseMemosActivation().configPath);
const route: '/memos/' = parseMemosConfig().public.route;
// @ts-expect-error Static discovery has no runtime configuration.
parseMemosConfig().runtime;
// @ts-expect-error Decoded public records are immutable.
decoded.memos[0].body = 'changed';
// @ts-expect-error A complete export requires its digest.
const missingDigest: PublicMemosExport = payload;
// @ts-expect-error Runtime secret references are absent from the public projection.
projected.secretEnv;
void [digest, path, route, missingDigest];
