# Close comments configuration and publication WIP

## Goal

Converge the existing uncommitted WIP into a small, reviewable follow-up to
M5.1: preserve the static-only comments boundary, make the shared comments
configuration and service runtime behavior coherent, align publication tests
with the canonical nested post route, and finish with reproducible validation
and durable task evidence.

The user outcome is a repository that can be checked and committed without
guessing whether the four `??` files are disposable artifacts or missing
source files. The comments service remains disabled in the tracked site
configuration and no external service is provisioned by this task.

## Confirmed facts and constraints

- The active branch is `anti-entropy-loss-syndrome`, four commits ahead of its
  upstream, with no staged changes.
- The worktree contains 22 modified tracked files and four untracked source
  files. The untracked files are the comments plugin declaration/types,
  service runtime loader, and its configuration tests.
- The current WIP has two independently verifiable seams:
  `comments-config-boundary` and `publication-route-alignment`.
- `apps/site/src/lib/site-config.mjs:166-177` consumes only the public
  projection from `plugins/comments/config.mjs`; the service loader at
  `services/comments/src/config.ts:59-69` resolves the private runtime
  projection and environment overrides.
- The publication assembler currently accepts authored post documents with
  `segments.length >= 4` at `tooling/assemble-publication/src/index.ts:208-219`.
- The canonical representative post route is
  `/posts/ai/llm-workflow-with-trellis/`; remaining fixture/runtime references
  must not silently fall back to `/posts/main/379/`.
- The existing project validation scripts are `check:m51`, `test:m51`,
  `build:m51`, the assembler/publication tests, shell checks, and runtime
  probes. The service package declares Node `>=22.13.0`; Astro rejects the
  current Node 20 runtime.
- `.trellis/mainline.md` still labels M5.1 `in_progress` while its evidence
  and next-decision sections say the implementation was committed and the
  remaining gate is external service provisioning. The record must be
  reconciled after this WIP is closed.

## Requirements

### R1. Preserve the product boundary

The main site remains a static build consumer. It must not become SSR, read the
comments database, or receive SMTP credentials, private email, moderation
tokens, outbox paths, or other service-only fields. Comments stay disabled by
default in tracked configuration.

### R2. Converge the comments configuration boundary

The comments plugin owns the `[comments]` namespace. Its parser must validate
public settings, optional non-secret SMTP/runtime settings, legacy environment
overrides, safe secret indirection through `passwordEnv`, and exact supported
keys. The site receives only the frozen public projection; the service receives
the validated runtime projection with explicit environment variables taking
precedence.

### R3. Converge canonical publication paths

The public comments fixture, runtime probes, assembler tests, and publication
browser test must use the canonical nested post route. Publication assembly
must continue to recognize ordinary authored pages while accepting deeper
post-directory nesting without weakening unsafe-reference or inventory checks.

### R4. Make validation reproducible

Run the complete affected validation under Node `>=22.13.0`, separate genuine
code failures from environment failures, and retain exact commands/results in
task evidence. Container checks must use the repository-root Docker build
context when Docker is available; no credentials or deployment are required.

### R5. Close the worktree deliberately

Review and stage only intended files, keep generated ignored directories out of
the commit, update the frontend contracts and task evidence, reconcile the
mainline record, and produce logically separable commits or an explicitly
documented reason for one combined commit.

## Acceptance Criteria

- [x] All four currently untracked comments source files are either integrated
      and tracked as intentional source, or a documented evidence-based reason
      explains their removal. No `git add .` or force-tracking is used.
- [x] `comments-config-boundary` satisfies its child acceptance criteria,
      including public/private projection, secret exclusion, service loading,
      environment precedence, package checks, and comments tests.
- [x] `publication-route-alignment` satisfies its child acceptance criteria,
      including canonical route fixtures, nested post publication detection,
      assembler tests, and publication checks.
- [x] Under Node `>=22.13.0`, `npm run check:m51`, `npm run test:m51`, and
      `npm run build:m51` pass, or each unavailable external/container check is
      explicitly recorded with a reproducible reason and a replacement check.
- [x] Shell syntax/format/lint checks and the repository's publication/runtime
      probes pass for the affected scripts when their dependencies are
      available.
- [x] No tracked public output contains private comments fields or credentials;
      the default tracked config still has `comments.enabled = false`.
- [x] `.trellis/spec/frontend/` and `.trellis/mainline.md` accurately describe
      the final boundary and status, and the parent/child task evidence is
      complete before archival.

## Out of scope

- Provisioning SMTP, a public comments origin, DNS, tunnels, credentials, or a
  production/staging deployment.
- Enabling comments in the tracked site configuration.
- Changing the comments database schema, moderation policy, public export
  schema, or site rendering model beyond what is required to close this WIP.
- Unrelated Terminal interaction changes, content rewrites, or broad cleanup of
  ignored build artifacts.
