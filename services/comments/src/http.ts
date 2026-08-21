import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { URL } from 'node:url';

import { CommentService } from './service.js';
import { CommentServiceError, UnauthorizedError, ValidationError } from './errors.js';
import { MAX_REQUEST_BYTES, type SubmissionInput } from './types.js';

export interface CommentHttpOptions {
  allowedOrigins?: ReadonlySet<string>;
  adminToken?: string;
  maxBodyBytes?: number;
}

export function createCommentHttpServer(service: CommentService, options: CommentHttpOptions = {}): Server {
  const allowedOrigins = options.allowedOrigins ?? new Set<string>();
  const maxBodyBytes = options.maxBodyBytes ?? MAX_REQUEST_BYTES;
  return createServer((request, response) => {
    void handleRequest(service, request, response, { ...options, allowedOrigins, maxBodyBytes }).catch((error: unknown) => {
      if (!response.headersSent) {
        sendError(response, error);
      } else {
        response.destroy();
      }
    });
  });
}

export async function listenCommentHttpServer(server: Server, port: number, host = '127.0.0.1'): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error): void => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = (): void => {
      server.off('error', onError);
      resolve();
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, host);
  });
}

async function handleRequest(service: CommentService, request: IncomingMessage, response: ServerResponse, options: Required<Pick<CommentHttpOptions, 'maxBodyBytes'>> & Pick<CommentHttpOptions, 'adminToken'> & { allowedOrigins: ReadonlySet<string> }): Promise<void> {
  const requestUrl = new URL(request.url ?? '/', 'http://comments.invalid');
  const origin = typeof request.headers.origin === 'string' ? request.headers.origin : undefined;
  applyCors(response, origin, options.allowedOrigins);
  if (request.method === 'OPTIONS') {
    if (origin && !options.allowedOrigins.has(origin)) {
      throw new CommentServiceError('forbidden', 'origin is not allowed.', 403);
    }
    response.statusCode = 204;
    response.end();
    return;
  }
  if (requestUrl.pathname === '/healthz' && request.method === 'GET') {
    sendJson(response, 200, { ok: true, status: 'ok' });
    return;
  }
  if (requestUrl.pathname === '/v1/submissions' && request.method === 'POST') {
    const body = await readSubmission(request, options.maxBodyBytes);
    await service.submit(body, {
      origin,
      ip: request.socket.remoteAddress,
      userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : undefined
    });
    sendJson(response, 202, { ok: true, message: 'Check your email to continue.' });
    return;
  }
  const verifyMatch = requestUrl.pathname.match(/^\/v1\/verify\/([^/]+)$/u);
  if (verifyMatch && request.method === 'GET') {
    const token = decodePathToken(verifyMatch[1]);
    service.verify(token);
    sendHtml(response, 200, '<!doctype html><meta charset="utf-8"><title>Verification complete</title><p>Your comment is waiting for moderation.</p>');
    return;
  }
  const controlMatch = requestUrl.pathname.match(/^\/v1\/control\/([^/]+)$/u);
  if (controlMatch && request.method === 'GET') {
    const summary = service.inspectControlToken(decodePathToken(controlMatch[1]));
    sendJson(response, 200, { ok: true, publicId: summary.publicId, postPath: summary.postPath, status: summary.status, canRequestDeletion: summary.canRequestDeletion });
    return;
  }
  const controlDeleteMatch = requestUrl.pathname.match(/^\/v1\/control\/([^/]+)\/delete$/u);
  if (controlDeleteMatch && request.method === 'POST') {
    const summary = service.requestDeletion(decodePathToken(controlDeleteMatch[1]));
    sendJson(response, 202, { ok: true, publicId: summary.publicId, status: summary.status });
    return;
  }
  if (requestUrl.pathname.startsWith('/v1/admin/')) {
    assertAdmin(request, options.adminToken);
    await handleAdmin(service, request, response, requestUrl);
    return;
  }
  throw new CommentServiceError('not_found', 'not found.', 404);
}

async function handleAdmin(service: CommentService, request: IncomingMessage, response: ServerResponse, requestUrl: URL): Promise<void> {
  if (requestUrl.pathname === '/v1/admin/comments' && request.method === 'GET') {
    sendJson(response, 200, { comments: service.listQueue() });
    return;
  }
  if (requestUrl.pathname === '/v1/admin/export' && request.method === 'GET') {
    const sourceRevision = requestUrl.searchParams.get('sourceRevision') ?? undefined;
    const generatedAt = requestUrl.searchParams.get('generatedAt') ?? undefined;
    sendJson(response, 200, await service.exportPublic({ sourceRevision, generatedAt }));
    return;
  }
  const moderationMatch = requestUrl.pathname.match(/^\/v1\/admin\/comments\/([^/]+)\/(approve|reject|quarantine|spam|delete)$/u);
  if (moderationMatch && request.method === 'POST') {
    const actionId = request.headers['idempotency-key'];
    const result = await service.moderate(decodePathToken(moderationMatch[1]), moderationMatch[2] as 'approve' | 'reject' | 'quarantine' | 'spam' | 'delete', typeof actionId === 'string' ? actionId : undefined);
    sendJson(response, 200, { ok: true, id: result.publicId, status: result.status });
    return;
  }
  throw new CommentServiceError('not_found', 'not found.', 404);
}

async function readSubmission(request: IncomingMessage, maxBytes: number): Promise<SubmissionInput> {
  const contentType = typeof request.headers['content-type'] === 'string' ? request.headers['content-type'].split(';', 1)[0]!.trim().toLowerCase() : '';
  const raw = await readBody(request, maxBytes);
  if (contentType === 'application/json') {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new ValidationError('request body must be valid JSON.');
    }
    if (!isRecord(parsed)) {
      throw new ValidationError('request body must be an object.');
    }
    return parsed as unknown as SubmissionInput;
  }
  if (contentType === 'application/x-www-form-urlencoded') {
    const params = new URLSearchParams(raw);
    const values: Record<string, string> = {};
    for (const [key, value] of params) {
      if (key in values) {
        throw new ValidationError(`duplicate form field: ${key}`);
      }
      values[key] = value;
    }
    if (values.notifyReplies !== undefined) {
      if (values.notifyReplies !== 'true' && values.notifyReplies !== 'false') {
        throw new ValidationError('notifyReplies must be true or false.');
      }
      return { ...values, notifyReplies: values.notifyReplies === 'true' } as unknown as SubmissionInput;
    }
    return values as unknown as SubmissionInput;
  }
  throw new ValidationError('content-type must be application/json or application/x-www-form-urlencoded.');
}

async function readBody(request: IncomingMessage, maxBytes: number): Promise<string> {
  const contentLength = Number(request.headers['content-length'] ?? 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new CommentServiceError('request_too_large', 'request body is too large.', 413);
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > maxBytes) {
      throw new CommentServiceError('request_too_large', 'request body is too large.', 413);
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function assertAdmin(request: IncomingMessage, adminToken: string | undefined): void {
  if (!adminToken) {
    throw new CommentServiceError('not_found', 'not found.', 404);
  }
  const authorization = request.headers.authorization;
  if (authorization !== `Bearer ${adminToken}`) {
    throw new UnauthorizedError();
  }
}

function applyCors(response: ServerResponse, origin: string | undefined, allowedOrigins: ReadonlySet<string>): void {
  if (origin && allowedOrigins.has(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
    response.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Idempotency-Key');
  }
}

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  const body = JSON.stringify(value);
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(body);
}

function sendHtml(response: ServerResponse, status: number, value: string): void {
  response.statusCode = status;
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(value);
}

function sendError(response: ServerResponse, error: unknown): void {
  if (error instanceof CommentServiceError) {
    if (error instanceof UnauthorizedError) {
      response.setHeader('WWW-Authenticate', 'Bearer');
    }
    if (error.code === 'rate_limited' && 'retryAfterSeconds' in error) {
      response.setHeader('Retry-After', String(error.retryAfterSeconds));
    }
    sendJson(response, error.statusCode, { ok: false, error: error.code, message: error.message });
    return;
  }
  sendJson(response, 500, { ok: false, error: 'internal_error', message: 'The request could not be completed.' });
}

function decodePathToken(value: string | undefined): string {
  if (!value) {
    throw new ValidationError('token is required.');
  }
  try {
    return decodeURIComponent(value);
  } catch {
    throw new ValidationError('token is malformed.');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
