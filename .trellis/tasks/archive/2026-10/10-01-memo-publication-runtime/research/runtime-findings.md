# Memo runtime integration findings

## Accepted inputs and remaining integration work

Contract `c9885e6`, service `bcbca34` and site `f5bc47c` are archived and
reviewed. At this research baseline the child was planning; the owner later
approved implementation on 2026-10-05. Source observations below preserve that
planning baseline. Final design and `validation-findings.md` own the resolved
implementation and actual evidence. No private configuration, historical
content, remote host or real mailbox was inspected.

- `compose.yml:21` supplies the comments profile precedent. Its
  `network_mode: service:web` at line 35 makes loopback reachable by Nginx
  without publishing the service port. Comments owns port 8787; memo defaults
  to 8788 (`services/memos/src/config.ts:47`).
- `nginx.conf:69` proxies only the comments prefix; `nginx.conf:83` bounds
  unknown `/v1/` routes. Memo proxying is absent. Current comments address
  forwarding is not a memo trust implementation.
- `services/memos/src/http.ts:61` exposes the server factory; line 73 uses
  socket identity for submissions. Forwarded headers currently do not affect
  rates. Behind the planned loopback proxy, all visitors would share its IP.
- `services/memos/src/config.ts:10` defines service configuration; port/bind
  validation at lines 47–49 supports loopback and wildcard modes. Explicit
  proxy trust must remain opt-in and require loopback binding.
- `services/memos/src/server.ts:8` schedules maintenance, but no delivery.
  `services/memos/src/operations.ts:19` provides a one-shot mail drain;
  `services/memos/src/service.ts:14` owns bounded leased delivery/retries.
  A persistent runtime needs scheduling of this existing operation.
- `services/memos/Dockerfile:10` sets the private config/secret locations,
  nonroot user and port. The SQLite database defaults inside the private data
  root; no invented MEMOS_DATABASE_PATH override should be added to Compose.
- `services/memos/README.md:105` documents delivery as one-shot; its
  backup/restore procedures already enforce absent destinations and retained
  keys. Integration docs must preserve that boundary.
- `package.json` includes comments in M5.1 install/check/test/build but not
  memos. `verify.sh:65` selects the tracked fixture; preserve this behavior.
- `package-runtime.sh:123` chooses an existing build pipeline and validates
  comments metadata only. Its minimal runtime context and exact inventory
  checks must extend to memo metadata without copying service/secrets/data.

## Proposed integration shape

Root Compose adds `memos` and a mail worker under the opt-in `memos` profile.
Both run the independent service image with private persistent data and
read-only config/secrets, dropped capabilities and a read-only root filesystem.
The HTTP service shares the web network namespace and binds loopback on 8788;
the worker drains existing encrypted SQLite claims with bounded, nonoverlapping
cycles and graceful shutdown. No business transition or schema change is needed.
No memo service/worker host port is published.

Config defaults reference ignored `config/plugins/memos` owner inputs, distinct
from the data root. Root Compose uses portable nonroot 1000:1000 and an explicit
owner UID:GID override; the operator template requires that override.
Do not make inactive profiles require environment values during interpolation,
or solve identity mismatch by broadening permissions.
Compose mount options must refuse missing config/secrets instead of silently
creating directories. A plugin-local template uses host networking and the same
loopback port, with owner-supplied identity/image and no published ports.

Add a service-local `MEMOS_TRUST_PROXY` mode with exactly `none` (default) and
`loopback`. Trust is a deployment boundary, not public plugin configuration.
`loopback` requires loopback bind and a loopback socket peer; accept exactly one
valid literal `X-Real-IP`, normalize IPv4/mapped IPv6/IPv6 rate identity, and
reject missing/duplicate/list/port/invalid input before persistence. Do not use
Forwarded or X-Forwarded-For. With trust disabled, ignore forwarding headers.
The Nginx memo location overwrites `X-Real-IP` using its authoritative client
address and removes alternative forwarded-address chains. Tests must show that
spoofed browser headers cannot choose the rate key and distinct clients do not
consume one shared loopback quota.

The existing global Nginx access log includes request URIs (`nginx.conf:15`),
and normal upstream error messages can include those URIs as well. Memo
verification URLs carry tokens, so the new memo proxy/edge locations must
disable raw access/error URI logging; service diagnostics remain bounded codes.
Do not add body/recipient/Authorization logging. Test fixture token absence in
proxy/service logs as well as public artifacts.

The repository container proxy has no automatic trust in an upstream edge.
Host-specific edge examples route the memo prefix to the matching private
runtime and overwrite the address header; operator-managed TLS/real-IP topology
requires separate validation. Never trust arbitrary incoming forwarded chains.

Use a worker package entrypoint that wraps existing `service.deliver()`, not a
shell loop repeatedly invoking an admin CLI or spawning a new process per
message. Delivery health is process/tick status only; it must not probe real
SMTP as part of readiness. Preserve private bounded diagnostics and leased
retry/single-use semantics. Real SMTP remains an operator gate.

## Required local evidence

1. Config/header tests: opt-in defaults, bad modes/bind, untrusted peer,
   missing/duplicate/malformed header, mapped/IPv6 normalization, spoofing and
   per-client rates; existing service tests remain green.
2. Worker tests with injected scheduler/transport: periodic bounded drain,
   no overlap, error recovery, SIGTERM/shutdown and no recipient/token logs.
3. Host Docker Compose config for default, memo, comments and combined profiles,
   and plugin-local template, using synthetic mount inputs/identity only.
4. Disposable labelled containers: nonroot/read-only/no published private port,
   health/readiness, actual proxy paths/headers, absent service, unknown routes,
   authenticated admin, persisted rates/state/outbox across recreation.
5. A synthetic local TLS mail sink or injected transport proves the integrated
   submit → delivery → verify → owner approval → export → build → assemble →
   delete → fresh export flow. Synthetic tokens stay private fixture inputs;
   none enter static artifacts, logs or Trellis records.
6. Reuse existing backup/restore contract to prove an old restored epoch cannot
   replace a newer publication, with fixture-only private data.

## Applicable contracts

`frontend/memo-service-contract.md`, `frontend/memo-site-contract.md`,
`frontend/memo-contract.md`, `frontend/comments-publication-contract.md`,
`frontend/development-runtime.md`, `trellis-plus/validation-profile.md`, and
`guides/project-record-privacy.md` under `.trellis/spec/`.

## Scope clarification for final review

The earlier draft excluded all service/site edits. Integration requires only
trusted-address and worker entrypoint plumbing in the service plus site build
evidence attributes. This clarification changes ownership, not approved visitor
UX, moderation rules, database schema or pure public wire format. Present it in
the latest planning summary before activation. Production deployment remains
excluded.
