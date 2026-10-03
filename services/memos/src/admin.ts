import { pathToFileURL } from 'node:url';
import { loadSecrets } from './config.js';
import { publicContract } from './contract.js';
import { ServiceError } from './types.js';
import { requireId } from './validation.js';
import type { ModerationMemo, State } from './types.js';

function exact(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join(',') !== [...keys].sort().join(',')) throw new Error();
  return value as Record<string, unknown>;
}
function cursor(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,256}$/u.test(value)) throw new Error();
  const id = Buffer.from(value, 'base64url').toString('utf8');
  if (Buffer.from(id).toString('base64url') !== value) throw new Error();
  requireId(id);
  return value;
}
function listResponse(value: unknown): { submissions: ModerationMemo[]; nextCursor: string | null } {
  const page = exact(value, ['submissions', 'nextCursor']);
  if (!Array.isArray(page.submissions) || page.submissions.length > 100) throw new Error();
  const submissions = page.submissions.map((value: unknown): ModerationMemo => {
    const row = exact(value, ['id', 'displayName', 'body', 'createdAt', 'state', 'verifiedAt']);
    if (typeof row.state !== 'string' || !['unverified', 'expired', 'pending', 'approved', 'rejected', 'deleted'].includes(row.state)) throw new Error();
    const deleted = row.state === 'deleted';
    if (deleted && (row.displayName !== '' || row.body !== '' || row.verifiedAt !== null)) throw new Error();
    const memo = publicContract.validatePublicMemo({ id: row.id, displayName: deleted ? 'Deleted' : row.displayName, body: deleted ? 'Deleted' : row.body, createdAt: row.createdAt });
    const verifiedAt = row.verifiedAt === null ? null : publicContract.validatePublicMemo({ ...memo, createdAt: row.verifiedAt }).createdAt;
    if ((['pending', 'approved'].includes(row.state) && verifiedAt === null) || (['unverified', 'expired'].includes(row.state) && verifiedAt !== null)) throw new Error();
    return { id: memo.id, displayName: deleted ? '' : memo.displayName, body: deleted ? '' : memo.body, createdAt: memo.createdAt, state: row.state as State, verifiedAt };
  });
  if (submissions.some((row, index) => index > 0 && submissions[index - 1]!.id >= row.id)) throw new Error();
  const nextCursor = page.nextCursor === null ? null : cursor(page.nextCursor);
  if (nextCursor !== null && (!submissions.length || Buffer.from(submissions[submissions.length - 1]!.id).toString('base64url') !== nextCursor)) throw new Error();
  return { submissions, nextCursor };
}
async function responseText(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) throw new Error();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > maxBytes) throw new Error();
      chunks.push(chunk.value);
    }
    return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
  } finally { await reader.cancel(); reader.releaseLock(); }
}

export interface AdminOptions { readonly origin: string; readonly token: string; readonly fetch?: typeof fetch }
export async function adminRequest(args: readonly string[], options: AdminOptions): Promise<string> {
  const endpoint = new URL(options.origin);
  if ((endpoint.protocol !== 'https:' && !(endpoint.protocol === 'http:' && ['127.0.0.1', '[::1]'].includes(endpoint.hostname))) || endpoint.origin !== options.origin || endpoint.username || endpoint.password || !/^[^\s]{32,512}$/u.test(options.token)) throw new ServiceError(503, 'invalid_admin_config');
  const [action, operand, extra] = args;
  let route: string;
  let method = 'GET';
  if (action === 'list') {
    if (extra !== undefined || (operand !== undefined && !/^[A-Za-z0-9_-]{1,256}$/u.test(operand))) throw new ServiceError(400, 'invalid_arguments');
    route = `/v1/memos/admin/submissions${operand ? `?cursor=${operand}` : ''}`;
  } else if (action === 'export' && operand === undefined) route = '/v1/memos/admin/export';
  else if (['approve', 'reject', 'delete'].includes(action ?? '') && operand !== undefined && extra === undefined) {
    requireId(operand); route = `/v1/memos/admin/submissions/${operand}/${action}`; method = 'POST';
  } else throw new ServiceError(400, 'invalid_arguments');
  const response = await (options.fetch ?? fetch)(new URL(route, endpoint), { method, headers: { Authorization: `Bearer ${options.token}` }, redirect: 'manual', signal: AbortSignal.timeout(10000) });
  if (!response.ok || response.status >= 300) throw new ServiceError(response.status, 'admin_request_failed');
  try {
    // Bound raw bytes as well as DTO cardinality, including JSON escape overhead.
    const text = await responseText(response, action === 'export' ? 64 * 1024 * 1024 : action === 'list' ? 8 * 1024 * 1024 : 1024);
    if (action === 'export') return publicContract.serializePublicExport(publicContract.decodePublicMemosExport(text));
    const value: unknown = JSON.parse(text);
    if (action === 'list') return `${JSON.stringify(listResponse(value))}\n`;
    if (exact(value, ['status']).status !== 'ok') throw new Error();
    return '{"status":"ok"}\n';
  } catch { throw new ServiceError(503, 'invalid_admin_response'); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const secrets = loadSecrets(process.env);
    const origin = process.env.MEMOS_ADMIN_ORIGIN ?? 'http://127.0.0.1:8788';
    const token = secrets.MEMOS_ADMIN_TOKEN;
    if (!token) throw new ServiceError(401, 'unauthorized');
    process.stdout.write(await adminRequest(process.argv.slice(2), { origin, token }));
  } catch { process.stderr.write('memos:admin_failed (usage: list [cursor] | approve/reject/delete <id> | export)\n'); process.exitCode = 1; }
}
