# Observability boundary research

## Question

What is the smallest repository-local observability contract that improves
operation of the private comments service without enabling public comments or
persisting private request data?

## Evidence

- `services/comments/src/http.ts` owns the complete Node HTTP boundary. It
  currently exposes `/healthz`, submission, verification, control, and private
  admin routes. The request handler converts service errors into bounded JSON,
  but it does not emit request outcome records or metrics.
- `services/comments/src/plugin.ts` constructs the SQLite-backed service and
  HTTP server. Database migrations run during repository construction, and the
  service already exposes `close()` through its runtime wrapper.
- `services/comments/src/sqlite-repository.ts` has a synchronous
  `getTombstoneEpoch()` query and closes the database explicitly. The same
  repository contract is implemented by `MemoryCommentRepository`, so a
  readiness probe can use the service boundary without adding a new storage
  abstraction.
- `services/comments/Dockerfile`, `compose.yml`, and
  `plugins/comments/compose.yml` already use loopback `/healthz` checks. Nginx
  only proxies `/v1/comments/*`; `/readyz` and `/metrics` can remain private
  process endpoints.
- `services/comments/README.md` requires private health, proxy, origin,
  backup/restore, SMTP, and browser gates before public enablement, but does
  not define request-log fields, metric labels, retention, or redaction.

## Recommended contract

1. Keep `/healthz` as an unchanged liveness response.
2. Add `/readyz` as a private readiness response. It returns a bounded 200
   response only when the service is open and its repository can answer the
   existing metadata query; otherwise it returns a bounded 503 response with
   no dependency detail.
3. Add `/metrics` as a private Prometheus text response backed by in-memory
   counters. Use only a fixed route taxonomy, a bounded method taxonomy, and
   numeric status codes. Do not use raw path, query, token, post path, origin,
   IP, user-agent, email, or body values as labels.
4. Emit one JSON request record after each handled request. Include only an
   internally generated request id, bounded method and route classes, status,
   success/failure outcome, and duration. Write records to the operator's
   process stream; do not create a new database or log file.
5. Keep retention, collection, and access control operator-owned. Metrics are
   process-local and reset on restart; request-log retention follows the
   private runtime's existing host/container policy.

## Rejected alternatives

- Do not add a third-party telemetry SDK or external collector: it adds a
  dependency and egress surface that the current private runtime does not need.
- Do not log raw URLs, bodies, headers, IP addresses, user agents, email
  addresses, public ids, or tokens: the service already handles those values
  for abuse, verification, and moderation and they are not necessary for the
  minimum operational signal.
- Do not make SMTP delivery a readiness dependency: delivery is an optional
  separate worker and a transient notification failure must remain visible as a
  request outcome without taking the HTTP process out of readiness.
