# Evidence inventory

Captured during Phase 1 planning on 2026-08-20. This file records repository
facts used to plan the documentation update; it is not a deployment record.

## Current-state evidence

- `.trellis/mainline.md` classifies M0–M5 as complete, M5.1 as deferred, M6
  as superseded, M7 as the accepted staging rehearsal, and production rollout
  as complete.
- `.trellis/tasks/archive/2026-08/08-20-production-rollout-record/prd.md`
  records the guarded promotion, public route/header/cache checks, rollback
  retention, and the deliberate exclusion of operational identifiers.
- The authored workspace inventory is 95 `content/posts/**/*.md` files and 8
  `content/pages/**/*.md` files. The root PRD's 93/7 values are the original
  SQL source baseline and must not be presented as the current filesystem
  inventory.

## Root PRD drift inventory

- Section 2 labels production permalink/Web-service/resource facts as still
  pre-launch checks.
- Section 7 says only the PRD, private backup, Terminal reference, and NERV
  exist, although the complete site, packages, tooling, and publication are
  present.
- Section 11 uses the obsolete user operand `open lab/<id>`.
- Section 13 describes a NERV-only runtime and a not-yet-landed assembler.
- Sections 16–17 do not classify the completed, superseded, or deferred
  milestones and leave evidence-backed checks unchecked.
- Section 19 mixes resolved production concerns with future M5.1 and historic
  migration questions.

## Approved privacy-cleanup inventory

The following tracked historical files contain real deployment identifiers and
are in scope for neutral references:

- `.trellis/tasks/archive/2026-08/08-14-m6-staging-rollout/prd.md`
- `.trellis/tasks/archive/2026-08/08-15-m7-reverse-tunnel-staging/prd.md`
- `.trellis/tasks/archive/2026-08/08-15-m7-reverse-tunnel-staging/design.md`
- `.trellis/tasks/archive/2026-08/08-15-m7-reverse-tunnel-staging/implement.md`
- `.trellis/tasks/archive/2026-08/08-15-m7-reverse-tunnel-staging/research/execution-evidence.md`
- `.trellis/workspace/sam/journal-1.md` (the matching staging entry only)

Replace domains, SSH aliases/commands, CDN/edge names, and public staging
identifiers while preserving generic topology, decisions, dates, and outcomes.
License files and their attribution email addresses are legal provenance and
are explicitly out of scope. The private `/tmp` execution record is not read
or modified by this task.
