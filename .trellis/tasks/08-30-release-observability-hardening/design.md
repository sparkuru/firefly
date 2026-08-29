# Release and observability hardening design

## 1. Scope and invariants

This child implements repository-local observability for the private comments
HTTP process. It does not enable comments, contact SMTP or deployment, read
production data, or change the static publication pipeline.

The following boundaries remain fixed:

- `/healthz` remains the cheap liveness probe and keeps its current JSON
  response so existing Docker healthchecks remain compatible.
- The Nginx public route remains limited to `/v1/comments/*`. The new
  `/readyz` and `/metrics` endpoints are process-local operator surfaces and
  are not added to the public proxy configuration.
- Metrics are in-memory only. They reset on process restart and do not create
  a new database, outbox, file, or external telemetry dependency.
- Repository-local candidate promotion/rollback remains the assembler's
  boundary. Production immutable releases, `current` switching, and crash
  recovery stay operator-owned and are documented as deferred.

## 2. Components and ownership

### `services/comments/src/observability.ts`

Add a package-local collector and formatter with no third-party dependency:

- fixed `CommentHttpMethod` values: `GET`, `POST`, `OPTIONS`, and `OTHER`;
- fixed route classes for liveness, readiness, metrics, submission,
  verification, control, admin queue, admin export, admin moderation, and
  unknown paths;
- request records containing an internally generated UUID, bounded method and
  route classes, numeric status code, `success`/`failure` outcome, and rounded
  non-negative duration in milliseconds;
- in-memory counters keyed only by the bounded method, route, status code, and
  outcome tuple;
- deterministic Prometheus text output with fixed metric names and sorted
  label tuples.

The default logger writes one JSON record per completed request to the process
stream. `createCommentHttpServer` accepts an injectable logger and monotonic
clock/request-id factories for deterministic unit tests without changing the
production output contract.

### `services/comments/src/service.ts`

Track the service lifecycle and expose a small readiness query. A service is
ready only while open and while its repository can answer the existing
metadata read (`getTombstoneEpoch()`). Repository failures return `false` to
the HTTP layer; dependency details are not returned to callers. The readiness
query does not include SMTP delivery because notification delivery is a
separate worker and is not a process liveness dependency.

### `services/comments/src/http.ts`

Instrument the existing request lifecycle without changing route behavior:

1. Classify the request path into a fixed route class before handling it;
   token, post-path, query, and other variable segments are discarded.
2. Generate an opaque request id and capture a monotonic start time.
3. Run the existing handler and preserve its current bounded error mapping.
4. Handle `GET /readyz` from the service readiness query and
   `GET /metrics` from the collector.
5. In a single completion path, record the bounded result and emit the JSON
   request record after the response status is known.

The request record never contains raw URL/query, request body, email, token,
public id, post path, IP address, user-agent, origin, secret, filesystem path,
or arbitrary exception text. The metrics labels use the same bounded route and
method taxonomy, so attacker-controlled strings cannot create high-cardinality
or log-injection fields.

Readiness responses are:

```json
{"ok":true,"status":"ready"}
```

with status 200, or:

```json
{"ok":false,"status":"not_ready"}
```

with status 503. Both use the existing no-store JSON response helper.

Metrics use the Prometheus text content type and expose these bounded series:

```text
firefly_comments_http_requests_total{method="...",route="...",status_code="...",outcome="..."} N
firefly_comments_http_request_duration_seconds_sum{...} N
firefly_comments_http_request_duration_seconds_count{...} N
```

Values are process-local. The `/metrics` request is recorded after its body is
rendered, so a scrape does not include itself; this avoids recursive or
surprising scrape inflation and is documented in the operational contract if
needed.

## 3. Data flow

```text
HTTP request
  -> fixed method/path classification
  -> existing service route handling
  -> bounded status/error response
  -> in-memory metrics + JSON request record
  -> operator-only process stream / local metrics endpoint
```

The static site, comments public export, SQLite schema, notification outbox,
and publication artifact inventory are not on this data path.

## 4. Documentation and tests

- Extend `services/comments/README.md` with endpoint ownership, record fields,
  privacy exclusions, process-local metric reset behavior, and operator-owned
  log retention/access expectations.
- Add the accepted repository/deployment recovery boundary to a durable
  `.trellis/spec/trellis-plus/` contract during the required Phase 3 spec
  update; do not add deployment state or operational identifiers.
- Extend HTTP tests for unchanged liveness, ready/not-ready responses,
  deterministic request records, fixed route classification, metrics output,
  and absence of sensitive values from logs/metrics.
- Keep existing assembler tests as the evidence for local promotion rollback
  and tombstone-epoch protection; no assembler implementation change is
  planned for this child.

## 5. Compatibility and rollback

The additive endpoints and optional logger/metrics wiring do not change existing
submission, verification, control, admin, or static routes. If observability
integration fails, the response path remains bounded and the failure is visible
through the focused service test. A rollback is limited to removing the new
observability module, HTTP wiring, service readiness state, tests, and docs;
the existing comments contract and publication metadata remain untouched.
