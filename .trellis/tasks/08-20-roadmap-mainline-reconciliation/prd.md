# P1 roadmap and mainline reconciliation

## Goal

Bring the root product PRD and its roadmap language into agreement with the
evidence-backed post-v1.0.0 mainline. A reader should be able to distinguish
the original migration plan, completed milestones, superseded staging plans,
deferred work, and the current production baseline without consulting private
deployment material.

## Confirmed facts

- The approved static publication is in production and the prior immutable
  release remains the rollback target. The guarded build, promotion, public
  route, error, security-header, and hashed-asset checks are recorded in the
  archived P0 task.
- M0 through M5 are complete. The M5.1 dynamic comments/identity service is
  deliberately deferred for a later self-built solution and is not on the
  current release path.
- The original M6 local-TLS rehearsal is superseded. The separately scoped M7
  reverse-tunnel staging rehearsal is the accepted staging evidence; the
  archived M6 and M7 tasks remain historical records.
- The repository now contains the static site, Terminal and semantic
  presentations, the NERV experiment, publication assembly, and the guarded
  immutable-release tooling. The current authored workspace contains 95 post
  documents and 8 page documents; the root PRD still describes the original
  SQL input as 93 posts and 7 pages, which must remain labeled as source
  history rather than current output.
- The root PRD still has stale statements about the pre-M1 directory state,
  the NERV-only runtime, the old `open lab/<id>` Terminal operand, unchecked
  MVP criteria, and production items described as merely pre-launch checks.
- The root PRD, task records, and mainline must not add operational endpoints,
  SSH commands, credentials, DNS identifiers, or exact rollback commands.
  Detailed deployment execution evidence remains local-only.

## Requirements

- R1: Reconcile the root PRD's current-state, architecture, directory,
  Terminal, build/release, milestone, acceptance, risk, and pending-decision
  sections with the approved mainline and archived evidence.
- R2: Mark completed work and distinguish deferred, superseded, historical,
  and genuinely unresolved items without rewriting the original migration
  counts as if they were current publication counts.
- R3: Replace stale user-facing Terminal examples with the unified grammar:
  cwd-relative operands or an explicit `~/blog` virtual absolute operand;
  internal HTTP/VFS slash-rooted paths remain implementation details.
- R4: Keep the documentation boundary privacy-safe: repository-facing
  updates may link to sanitized archived tasks, but never copy private
  deployment details from the local execution record.
- R5: Preserve historical task chronology and evidence links. The approved
  privacy cleanup is limited to operational identifiers in the archived M6/M7
  records and the Trellis workspace journal; it must not rewrite outcomes or
  legal attribution text.

## Out of scope

- Product, Terminal, site, deployment, DNS, server, or production code changes.
- Starting or implementing M5.1 comments/identity work.
- Changing the v1.0.0 tag, the promoted release, or the rollback target.
- Rewriting archived task records or workspace journals unless the owner
  explicitly includes that privacy-cleanup scope.

## Acceptance criteria

- [x] The root PRD states the evidence-backed current mainline and separates
      original source counts from current authored/published inventory.
- [x] The root PRD's milestone table and MVP checklist classify completed,
      deferred, superseded, historical, and unresolved work consistently with
      `.trellis/mainline.md` and archived task results.
- [x] Stale pre-release architecture, NERV-only runtime, and old Terminal
      operand wording is removed or explicitly labeled as historical.
- [x] Production and staging language records verified outcomes without
      exposing domain, SSH, DNS, credential, or exact rollback details.
- [x] Task validation, documentation-focused stale-language checks, and
      `git diff --check` pass; no product build is required because product
      code is out of scope.

## Result

The root roadmap now reflects the evidence-backed post-v1.0.0 mainline: M0–M5
and P0 are complete, M6 is superseded, M7 is accepted staging evidence, and
M5.1 remains deferred. Historical SQL counts are explicitly separated from the
current 95/8 authored inventory, Terminal examples use the unified
cwd-relative/`~/blog` grammar, and production language contains no operational
identifiers. The approved M6/M7 and targeted journal records were sanitized
with neutral references while preserving chronology, outcomes, and legal
attribution. Documentation scans, task validation, and diff checks passed.

## Resolved privacy decision

The owner approved including the privacy cleanup. Replace real domain, SSH,
CDN/edge, and related operational identifiers in the archived M6/M7 task
records and Trellis workspace journal with neutral references while
preserving chronology and outcomes. Do not alter license attribution emails;
they are legal provenance rather than deployment details. The private local
execution record remains the source for exact operational values.
