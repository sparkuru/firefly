# Release and observability hardening

## Goal

Close the remaining release-quality decision from the P1 remediation by defining
the minimum evidence needed to operate the private comments service safely and
by making the repository-versus-deployment recovery boundary explicit. The
result must remain compatible with the static-publication architecture and the
tracked default of comments disabled.

## Background and confirmed facts

- The comments service is a private write, verification, moderation,
  notification, and storage runtime. Public comments remain disabled in tracked
  configuration; public enablement, SMTP delivery, deployment, and credentials
  are separate owner-authorized gates.
- `services/comments/src/http.ts` exposes `/healthz`, public submission and
  control routes, and private admin routes. It currently has no application
  request-log or metrics contract. `services/comments/Dockerfile` and the
  Compose templates provide a liveness healthcheck, but liveness alone does
  not describe request outcomes or operational evidence.
- The current HTTP layer passes origin, remote address, and user-agent data to
  the service for abuse/audit behavior. Any new operational record must define
  redaction, aggregation, retention, and access boundaries so private data does
  not enter tracked files, public exports, or ordinary logs.
- `services/comments/README.md` lists private health, proxy, origin, SMTP,
  backup/restore, and browser smoke gates, but it does not specify a structured
  request-log, readiness/metrics, or incident-evidence contract.
- `tooling/assemble-publication/src/index.ts` validates a repository-local
  candidate and atomically promotes the local `artifacts/` and `dist/` trees,
  with rollback on an in-process promotion failure. The root PRD assigns
  immutable deployment releases, `current` switching, crash recovery, and
  production rollback to the operator-owned deployment boundary; this
  repository contains no deployment runner or remote release state.
- The latest repository validation reached all checks, tests, and builds before
  the existing comments tombstone/publication epoch rollback guard. That guard
  must remain authoritative and must not be weakened to make a candidate pass.

## Requirements

- R1. Preserve the static-publication boundary, comments-disabled default,
  private data/secrets boundary, and the existing publication tombstone epoch
  guard.
- R2. Establish a testable minimum observability contract for the private
  comments service: preserve the existing liveness surface, add a private
  readiness surface for service dependencies, expose bounded operational
  metrics, and emit request outcome evidence with privacy-safe fields.
- R3. Keep observability implementation and evidence repository-local and
  deterministic. Do not contact deployment, SMTP, production data, or public
  comments endpoints.
- R4. Resolve whether repository-owned deployment crash recovery belongs in
  this task. If it does not, record an owner-approved deferral that names the
  deployment boundary and the evidence required before public enablement or a
  future deployment task.
- R5. Update the relevant service/plugin/Trellis contract documentation and
  tests so the accepted boundary is executable and discoverable.

## Acceptance Criteria

- [x] The final scope explicitly states whether this task covers comments
      observability only, repository-owned release recovery, or both.
- [x] The comments service preserves `/healthz` as liveness, exposes a private
      `/readyz` dependency check that returns a bounded failure response, and
      exposes bounded metrics without raw request data or unbounded labels.
- [x] Each completed HTTP request emits a structured operational record with a
      stable route class, method, status, outcome, duration, and opaque request
      identifier; raw URL/query, body, email, token, IP, user-agent, origin,
      secrets, and private storage paths are excluded.
- [x] The comments service has documented retention and access expectations for
      logs/metrics, and tests prove private data cannot enter those surfaces.
- [x] The repository/deployment release boundary is documented; deployment
      crash recovery is explicitly deferred to the operator-owned boundary with
      an owner-approved rationale and follow-up gate.
- [x] Existing comments-disabled behavior, public routes, publication metadata,
      tombstone epoch protection, and static output remain unchanged.
- [x] Focused service/assembler tests and the applicable full validation gate
      pass, or any pre-existing/environmental blocker is recorded with exact
      evidence.

## Owner decision (2026-08-30)

The owner approved the minimum observability-only scope: harden the private
comments service with privacy-safe request logging, liveness/readiness/metrics,
and operational evidence, while explicitly deferring repository-owned
deployment crash recovery to the operator-owned deployment boundary.

This choice keeps the task testable without public enablement, deployment
access, SMTP, credentials, or production data. Public comments enablement
remains a separate owner-authorized task.

## Open questions

None block planning. Deployment crash recovery is deferred; any future task
must first supply the deployment release-state owner, crash-recovery semantics,
rollback authority, and private operational test environment.

## Validation evidence (2026-08-30)

- `./sam npm run install:comments` completed with four packages installed and
  no reported vulnerabilities.
- `./sam npm run check:comments`, `./sam npm run test:comments` (59/59), and
  `./sam npm run build:comments` passed.
- `./sam npm run check:assembler`, `./sam npm run test:assembler` (8/8), and
  `./sam npm run build:assembler` passed; no assembler implementation changed.
- `./verify.sh` passed the repository checks, package tests, and build stages
  reached before publication assembly, then stopped at the existing guard:
  `comments tombstone epoch 0 predates the published epoch 4; refusing
  rollback.` The guard remained authoritative, publication artifacts and
  timestamps were unchanged, and browser stages were not reached. This is the
  same pre-existing fixture-state blocker recorded by the previous remediation
  children, not an observability failure.
- `task.py validate` and `git diff --check` passed. No lint script is declared
  in the comments package.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
