import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';

export const COMMENT_HTTP_METHODS = Object.freeze(['GET', 'POST', 'OPTIONS', 'OTHER'] as const);
export type CommentHttpMethod = (typeof COMMENT_HTTP_METHODS)[number];

export const COMMENT_HTTP_ROUTES = Object.freeze([
  'liveness',
  'readiness',
  'metrics',
  'submission',
  'verification',
  'control',
  'admin_queue',
  'admin_export',
  'admin_moderation',
  'unknown'
] as const);
export type CommentHttpRoute = (typeof COMMENT_HTTP_ROUTES)[number];

export const COMMENT_HTTP_OUTCOMES = Object.freeze(['success', 'failure'] as const);
export type CommentHttpOutcome = (typeof COMMENT_HTTP_OUTCOMES)[number];

export const COMMENT_HTTP_METRIC_NAMES = Object.freeze({
  requestsTotal: 'firefly_comments_http_requests_total',
  requestDurationSecondsSum: 'firefly_comments_http_request_duration_seconds_sum',
  requestDurationSecondsCount: 'firefly_comments_http_request_duration_seconds_count'
} as const);

export interface CommentHttpRequestRecord {
  readonly requestId: string;
  readonly method: CommentHttpMethod;
  readonly route: CommentHttpRoute;
  readonly statusCode: number;
  readonly outcome: CommentHttpOutcome;
  readonly durationMs: number;
}

export interface CommentHttpMetricCounter {
  readonly method: CommentHttpMethod;
  readonly route: CommentHttpRoute;
  readonly statusCode: number;
  readonly outcome: CommentHttpOutcome;
  readonly count: number;
  readonly durationMs: number;
}

export interface CommentHttpRequestRecordInput {
  requestId: string;
  method: string;
  route: string;
  statusCode: number;
  outcome?: string;
  durationMs: number;
}

export type CommentHttpLogger = (record: CommentHttpRequestRecord) => void;
export type CommentHttpRequestIdFactory = () => string;
export type CommentHttpMonotonicNow = () => number;

const METHOD_MAX_LENGTH = 16;
const REQUEST_ID_MAX_LENGTH = 128;

/** Map the HTTP method to the finite label vocabulary used by logs and metrics. */
export function classifyCommentHttpMethod(method: string | undefined): CommentHttpMethod {
  if (typeof method !== 'string' || method.length > METHOD_MAX_LENGTH) {
    return 'OTHER';
  }
  switch (method.toUpperCase()) {
    case 'GET':
      return 'GET';
    case 'POST':
      return 'POST';
    case 'OPTIONS':
      return 'OPTIONS';
    default:
      return 'OTHER';
  }
}

/**
 * Classify a pathname without retaining any variable path segment.
 * Query strings should be removed by the URL parser before this function is
 * called; splitting once also keeps direct callers from making query values
 * part of the classification decision.
 */
export function classifyCommentHttpRoute(pathname: string): CommentHttpRoute {
  const path = typeof pathname === 'string' ? pathname.split('?', 1)[0] ?? '' : '';
  if (path === '/healthz') {
    return 'liveness';
  }
  if (path === '/readyz') {
    return 'readiness';
  }
  if (path === '/metrics') {
    return 'metrics';
  }
  if (path === '/v1/comments/submissions') {
    return 'submission';
  }
  if (/^\/v1\/comments\/verify\/[^/]+$/u.test(path)) {
    return 'verification';
  }
  if (/^\/v1\/comments\/control\/[^/]+(?:\/delete)?$/u.test(path)) {
    return 'control';
  }
  if (path === '/v1/comments/admin/comments') {
    return 'admin_queue';
  }
  if (path === '/v1/comments/admin/export') {
    return 'admin_export';
  }
  if (/^\/v1\/comments\/admin\/comments\/[^/]+\/(?:approve|reject|quarantine|spam|delete)$/u.test(path)) {
    return 'admin_moderation';
  }
  return 'unknown';
}

/** Keep status labels numeric and within the conventional HTTP range. */
export function normalizeCommentHttpStatus(statusCode: number): number {
  if (!Number.isFinite(statusCode)) {
    return 500;
  }
  const normalized = Math.trunc(statusCode);
  return normalized >= 100 && normalized <= 599 ? normalized : 500;
}

/** Round a monotonic duration while failing closed for invalid or backwards clocks. */
export function normalizeCommentHttpDuration(durationMs: number): number {
  if (!Number.isFinite(durationMs)) {
    return 0;
  }
  return Math.max(0, Math.round(durationMs));
}

export function createCommentHttpRequestRecord(input: CommentHttpRequestRecordInput): CommentHttpRequestRecord {
  const statusCode = normalizeCommentHttpStatus(input.statusCode);
  const method = classifyCommentHttpMethod(input.method);
  const route = normalizeCommentHttpRoute(input.route);
  const outcome: CommentHttpOutcome = input.outcome === 'success' || input.outcome === 'failure'
    ? input.outcome
    : statusCode < 400
      ? 'success'
      : 'failure';
  return {
    requestId: normalizeRequestId(input.requestId),
    method,
    route,
    statusCode,
    outcome,
    durationMs: normalizeCommentHttpDuration(input.durationMs)
  };
}

export function defaultCommentHttpRequestIdFactory(): string {
  return randomUUID();
}

export function defaultCommentHttpMonotonicNow(): number {
  return performance.now();
}

/** Write one newline-delimited, privacy-safe record to the process stream. */
export function logCommentHttpRequest(record: CommentHttpRequestRecord): void {
  process.stdout.write(`${JSON.stringify(record)}\n`);
}

export class CommentHttpMetrics {
  private readonly counters = new Map<string, CommentHttpMetricCounter>();

  record(record: CommentHttpRequestRecord): void {
    const bounded = createCommentHttpRequestRecord({ ...record });
    const key = metricKey(bounded);
    const previous = this.counters.get(key);
    if (previous) {
      this.counters.set(key, {
        ...previous,
        count: previous.count + 1,
        durationMs: previous.durationMs + bounded.durationMs
      });
      return;
    }
    this.counters.set(key, {
      method: bounded.method,
      route: bounded.route,
      statusCode: bounded.statusCode,
      outcome: bounded.outcome,
      count: 1,
      durationMs: bounded.durationMs
    });
  }

  snapshot(): readonly CommentHttpMetricCounter[] {
    return [...this.counters.values()]
      .sort(compareMetricCounters)
      .map((counter) => ({ ...counter }));
  }

  toPrometheus(): string {
    const lines: string[] = [];
    for (const counter of this.snapshot()) {
      const labels = formatMetricLabels(counter);
      lines.push(`${COMMENT_HTTP_METRIC_NAMES.requestsTotal}${labels} ${counter.count}`);
      lines.push(`${COMMENT_HTTP_METRIC_NAMES.requestDurationSecondsSum}${labels} ${formatSeconds(counter.durationMs)}`);
      lines.push(`${COMMENT_HTTP_METRIC_NAMES.requestDurationSecondsCount}${labels} ${counter.count}`);
    }
    return lines.length > 0 ? `${lines.join('\n')}\n` : '';
  }

  render(): string {
    return this.toPrometheus();
  }
}

export { CommentHttpMetrics as CommentHttpMetricsCollector };
export { CommentHttpMetrics as CommentMetricsCollector };

export function createCommentHttpMetrics(): CommentHttpMetrics {
  return new CommentHttpMetrics();
}

function normalizeCommentHttpRoute(route: string): CommentHttpRoute {
  return (COMMENT_HTTP_ROUTES as readonly string[]).includes(route) ? route as CommentHttpRoute : 'unknown';
}

function normalizeRequestId(requestId: string): string {
  if (typeof requestId === 'string' && requestId.length > 0 && requestId.length <= REQUEST_ID_MAX_LENGTH) {
    return requestId;
  }
  return defaultCommentHttpRequestIdFactory();
}

function metricKey(record: CommentHttpRequestRecord): string {
  return `${record.method}\u0000${record.route}\u0000${record.statusCode}\u0000${record.outcome}`;
}

function compareMetricCounters(left: CommentHttpMetricCounter, right: CommentHttpMetricCounter): number {
  return left.method.localeCompare(right.method)
    || left.route.localeCompare(right.route)
    || left.statusCode - right.statusCode
    || left.outcome.localeCompare(right.outcome);
}

function formatMetricLabels(counter: CommentHttpMetricCounter): string {
  return `{method="${escapePrometheusLabelValue(counter.method)}",route="${escapePrometheusLabelValue(counter.route)}",status_code="${counter.statusCode}",outcome="${escapePrometheusLabelValue(counter.outcome)}"}`;
}

export function escapePrometheusLabelValue(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n');
}

function formatSeconds(durationMs: number): string {
  return Number((durationMs / 1000).toFixed(3)).toString();
}
