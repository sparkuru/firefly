# Private Comments Observability and Release Boundary

This contract governs the private comments HTTP process and the boundary
between repository-local publication work and operator-owned deployment work.

## 1. Scope / Trigger

- Trigger: the comments service gained readiness, request outcome records, and
  in-memory metrics, which changes a cross-layer HTTP/operations contract.
- Scope: repository-local observability for the private comments service only.
  It does not enable public comments, contact SMTP, read production data, or
  manage deployment releases.
- `/healthz` remains liveness with status `200` and JSON
  `{"ok":true,"status":"ok"}`.
- `/readyz` and `/metrics` remain private process surfaces. They are not added
  to the public Nginx `/v1/comments/*` proxy.
- Repository-local candidate promotion and rollback remain the assembler
  boundary. Immutable deployment releases, `current` switching, crash
  recovery, and production rollback remain operator-owned and require a
  separate approved task.

## 2. Signatures

The package-local TypeScript boundary is:

```ts
interface CommentHttpRequestRecord {
  requestId: string;
  method: 'GET' | 'POST' | 'OPTIONS' | 'OTHER';
  route:
    | 'liveness' | 'readiness' | 'metrics' | 'submission'
    | 'verification' | 'control' | 'admin_queue' | 'admin_export'
    | 'admin_moderation' | 'unknown';
  statusCode: number;
  outcome: 'success' | 'failure';
  durationMs: number;
}

function createCommentHttpServer(
  service: CommentService,
  options?: CommentHttpOptions
): Server;

class CommentHttpMetrics {
  record(record: CommentHttpRequestRecord): void;
  snapshot(): readonly CommentHttpMetricCounter[];
  toPrometheus(): string;
}

class CommentService {
  isReady(): boolean;
}
```

The default request identifier is generated inside the process with a UUID;
the HTTP layer does not trust a caller-supplied identity header. The default
logger writes one JSON record per completed request to the process stream.

## 3. Contracts (request/response/env)

### HTTP responses

| Request | Ready response | Exposure |
| --- | --- | --- |
| `GET /healthz` | `200`, `{"ok":true,"status":"ok"}` | existing liveness surface |
| `GET /readyz` | `200`, `{"ok":true,"status":"ready"}` when ready; otherwise `503`, `{"ok":false,"status":"not_ready"}` | private process surface |
| `GET /metrics` | Prometheus text with `Cache-Control: no-store` | private process surface |

Readiness is true only while the service is open and
`repository.getTombstoneEpoch()` returns a non-negative safe integer. The
metadata read is synchronous and fails closed; dependency details are not
returned. SMTP delivery is not a readiness dependency.

### Request records

Every completed request produces exactly the six record fields shown in the
signature. `method` and `route` use fixed vocabularies. Route classification
uses the URL pathname only and discards query strings and variable path
segments. Status is numeric in the range `100..599`; invalid values normalize
to `500`. Duration is monotonic, non-negative, and rounded to milliseconds.

Records must not contain raw URL/query, body, headers, token, public ID, post
path, email, IP address, user agent, origin, secret, filesystem path, or
exception text. Metrics use only the fixed method/route/outcome vocabularies
and numeric status code labels. The three metric names are:

- `firefly_comments_http_requests_total`;
- `firefly_comments_http_request_duration_seconds_sum`;
- `firefly_comments_http_request_duration_seconds_count`.

Metrics are process-local and reset on restart. A `/metrics` response is
rendered before that scrape is recorded. Request records and metrics are
private operator evidence; retention, access, collection, and deletion follow
the existing private host/container policy and are not persisted by this
package.

### Environment

No new environment key, credential, deployment path, or external telemetry
dependency is introduced by this contract. Runtime secrets and exact
operator-owned deployment details remain at their existing private boundary.

## 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| Known endpoint/path | Map to one fixed route class; never retain variable segments. |
| Unknown path or malformed URL | Handle with the existing bounded HTTP error mapping and log route `unknown`. |
| Unsupported/oversized method string | Log method `OTHER`; do not create a variable metric label. |
| Repository closed or metadata read throws/returns an invalid epoch | `/readyz` returns `503` with only `not_ready`; `/healthz` remains unchanged. |
| Handler returns a service error | Preserve the existing status/error-code mapping; record outcome `failure` without exception text. |
| Metrics input has invalid status or duration | Normalize status to `500` and duration to non-negative milliseconds before aggregation. |
| Logger or metrics collector throws | Do not replace, alter, or leak the HTTP response; the failure is bounded to observability. |
| Production release/current/crash-recovery behavior is requested | Stop at the repository boundary and require a separate owner-approved deployment task. |

## 5. Good/Base/Bad Cases

- **Good:** `{ "requestId": "opaque-uuid", "method": "GET", "route":
  "liveness", "statusCode": 200, "outcome": "success", "durationMs": 3 }`.
- **Base:** an admin request with a token-bearing path is recorded as
  `admin_moderation` (or `unknown` when unmatched), with no token, public ID,
  authorization header, or query value in the record or metric labels.
- **Bad:** logging `request.url`, request headers, a request body, an email,
  an IP address, or an exception message; using raw paths or token values as
  metric labels; adding a deployment `current` symlink manager here.

## 6. Tests Required (with assertion points)

- `./sam npm run check:comments`: TypeScript accepts the public signatures and
  fixed unions.
- `./sam npm run test:comments`: assert unchanged `/healthz`, ready/not-ready
  responses, all fixed route classes, one bounded record per completed request,
  no sensitive values in records/metrics, deterministic metric ordering, label
  escaping, non-negative duration, and scrape self-exclusion.
- `./sam npm run build:comments`: the service emits the runtime module and
  preserves its existing start boundary.
- `./sam npm run check:assembler`, `./sam npm run test:assembler`, and
  `./sam npm run build:assembler`: preserve local promotion/rollback and the
  comments tombstone-epoch anti-rollback guard.
- `./verify.sh`: run the repository gate. If the existing published epoch is
  newer than the local candidate, record the exact guard failure and confirm
  that publication artifacts were not changed; do not lower the epoch or
  weaken the guard.
- Before commit, run `task.py validate`, `git diff --check`, and a durable
  record privacy scan over task/spec/mainline files.

## 7. Wrong vs Correct

### Wrong

```ts
logger({ url: request.url, headers: request.headers, body, error: String(error) });
metrics.inc({ route: request.url, token, email });
```

This leaks private request data and lets attacker-controlled values create
unbounded log or metric dimensions. It also mixes deployment recovery into a
repository-local service change.

### Correct

```ts
const record = {
  requestId: randomUUID(),
  method: classifyCommentHttpMethod(request.method),
  route: classifyCommentHttpRoute(pathname),
  statusCode: normalizeCommentHttpStatus(response.statusCode),
  outcome: response.statusCode >= 400 ? 'failure' : 'success',
  durationMs: normalizeCommentHttpDuration(monotonicNow() - startedAt)
};
metrics.record(record);
logger(record);
```

Keep the production record bounded and private, and handle deployment crash
recovery only in a separately approved operator-owned workflow.
