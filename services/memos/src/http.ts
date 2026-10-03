import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { authenticated } from './crypto.js';
import { publicContract } from './contract.js';
import { MemoService } from './service.js';
import { MAX_REQUEST_BYTES, ServiceError, type Action } from './types.js';

const messages: Readonly<Record<string, string>> = {
  accepted: 'If your submission is accepted, a verification email will arrive. It remains private until verification and owner approval.',
  verified: 'Your mailbox is verified. Your memo is waiting for owner review.',
  invalid_token: 'This verification link is invalid or unavailable.',
  invalid_input: 'Please check the submitted fields.',
  unauthorized: 'Authentication required.', origin_denied: 'Submission origin is not allowed.',
  too_large: 'The submitted request is too large.', unsupported_type: 'Unsupported request format.',
  rate_limited: 'Please try again later.', not_found: 'Resource unavailable.',
  invalid_transition: 'This operation is unavailable for the current state.'
};
function headers(response: ServerResponse): void {
  response.setHeader('Cache-Control', 'no-store'); response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
}
function json(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); response.end(JSON.stringify(value));
}
function result(response: ServerResponse, status: number, code: string, html: boolean): void {
  const message = messages[code] ?? 'The service is unavailable. Please try again later.';
  if (html) {
    response.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Firefly memos</title><body><main><h1>Firefly memos</h1><p>${message}</p><a href="/memos/">Return to memos</a></main></body></html>`);
  } else json(response, status, { status: code, message });
}
async function parseBody(request: IncomingMessage): Promise<unknown> {
  const type = request.headers['content-type']?.split(';')[0]?.trim().toLowerCase();
  if (type !== 'application/json' && type !== 'application/x-www-form-urlencoded') throw new ServiceError(415, 'unsupported_type');
  const chunks: Buffer[] = []; let bytes = 0;
  const declared = request.headers['content-length'];
  if (declared && Number(declared) > MAX_REQUEST_BYTES) { request.resume(); throw new ServiceError(413, 'too_large'); }
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > MAX_REQUEST_BYTES) { request.resume(); throw new ServiceError(413, 'too_large'); }
    chunks.push(buffer);
  }
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
    if (type === 'application/json') return JSON.parse(text) as unknown;
    // URLSearchParams repairs malformed escapes/UTF-8; decode each field strictly.
    const fields: Record<string, string> = Object.create(null) as Record<string, string>;
    for (const pair of text.split('&')) {
      if (!pair) throw new Error();
      const equals = pair.indexOf('=');
      if (equals < 0) throw new Error();
      const decode = (value: string): string => decodeURIComponent(value.replace(/\+/gu, ' '));
      const key = decode(pair.slice(0, equals)); const value = decode(pair.slice(equals + 1));
      if (Object.hasOwn(fields, key)) throw new Error();
      fields[key] = value;
    }
    return fields;
  } catch { throw new ServiceError(400, 'invalid_input'); }
}
export function createMemoServer(service: MemoService, adminHash: Buffer, diagnostic: (code: string) => void = () => {}): Server {
  return createServer((request, response) => {
    headers(response);
    const form = request.headers['content-type']?.split(';')[0]?.trim().toLowerCase() === 'application/x-www-form-urlencoded';
    let verification = false;
    const handle = async (): Promise<void> => {
      const url = new URL(request.url ?? '/', 'http://private.invalid');
      if (url.pathname === '/healthz' && request.method === 'GET') { json(response, 200, { status: 'ok' }); return; }
      if (url.pathname === '/readyz' && request.method === 'GET') { const ready = service.ready(); json(response, ready ? 200 : 503, { status: ready ? 'ready' : 'unavailable' }); return; }
      if (url.pathname === '/v1/memos/submissions' && request.method === 'POST') {
        // Reject origin/availability before consuming attacker-controlled input.
        if (!request.headers.origin || !service.config.runtime.allowedOrigins.includes(request.headers.origin)) throw new ServiceError(403, 'origin_denied');
        service.submit(await parseBody(request), request.headers.origin, request.socket.remoteAddress ?? 'unknown');
        result(response, 202, 'accepted', form); return;
      }
      if (url.pathname.startsWith('/v1/memos/verify/') && request.method === 'GET') {
        verification = true;
        if (url.search) throw new ServiceError(400, 'invalid_token');
        service.repository.verify(url.pathname.slice('/v1/memos/verify/'.length));
        result(response, 200, 'verified', true); return;
      }
      if (url.pathname.startsWith('/v1/memos/admin/')) {
        if (!authenticated(request.headers.authorization, adminHash)) throw new ServiceError(401, 'unauthorized');
        if (url.pathname === '/v1/memos/admin/submissions' && request.method === 'GET') {
          if ([...url.searchParams.keys()].some((key) => !['limit', 'cursor'].includes(key)) || url.searchParams.getAll('limit').length > 1 || url.searchParams.getAll('cursor').length > 1) throw new ServiceError(400, 'invalid_input');
          const limit = url.searchParams.has('limit') ? Number(url.searchParams.get('limit')) : 50;
          json(response, 200, service.repository.list(limit, url.searchParams.get('cursor') ?? undefined)); return;
        }
        if (url.pathname === '/v1/memos/admin/export' && request.method === 'GET' && !url.search) {
          response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }); response.end(publicContract.serializePublicExport(service.repository.export())); return;
        }
        const match = /^\/v1\/memos\/admin\/submissions\/(m_[A-Za-z0-9_-]{3,128})\/(approve|reject|delete)$/u.exec(url.pathname);
        if (match && request.method === 'POST' && !url.search) { service.repository.moderate(match[1]!, match[2]! as Action); json(response, 200, { status: 'ok' }); return; }
      }
      throw new ServiceError(404, 'not_found');
    };
    void handle().catch((error: unknown) => {
      const status = error instanceof ServiceError ? error.status : 500;
      const code = error instanceof ServiceError ? error.code : 'internal_error';
      diagnostic(code);
      if (!response.headersSent) result(response, status, code, verification || form);
      else response.end();
    });
  });
}
