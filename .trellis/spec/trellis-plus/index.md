# Trellis Plus Project Contract

- ownership: project-shared
- source: project-authored
- tracking: commit this index and its project-owned detail files

This directory contains project-authored operating decisions for Firefly. It
is the durable home for decisions that must survive a Trellis runtime
rebuild; it does not replace the generated Trellis workflow, scripts, agents,
or platform adapters.

## Ownership and recovery boundary

- `.trellis/workflow.md`, `.trellis/scripts/`, `.trellis/agents/`,
  `.trellis/config.yaml`, `.trellis/.gitignore`, `.trellis/.version`, and
  `.trellis/.template-hashes.json` remain generated runtime files.
- Task history, `mainline.md`, developer workspace records, and project
  contracts remain project evidence and are recovered selectively.
- Platform skills, hooks, commands, and agents managed by Trellis are replaced
  by the current initializer. Personal, untracked design skills under
  `.codex/skills/` remain local configuration.
- Do not stage the whole repository or automatically commit a reconciliation.

Historical recovery snapshots are owner-local rollback artifacts, not project
source directories or policy-loading prerequisites. Consult archived recovery
evidence before using one; a former temporary location is not proof that the
snapshot still exists.

## Project execution profile

- The repository is a single root with separate manifests and lockfiles for
  the site, presentation packages, validation tooling, publication tooling,
  and NERV experiment.
- `./sam` is the executable boundary for Node, npm, and browser commands.
  Host npm and global Playwright are not validation evidence. Compose syntax,
  image isolation, runtime packaging, and the maintained disposable static Memo
  lifecycle fixture use the explicit host Docker boundaries in the validation
  profile; their containers require exact ownership labels and cleanup.
- The approved dependency direction is X Core → semantic/Terminal/Memo → site.
  The validator feeds the site and assembler at build time; the assembler
  depends on the validator; NERV remains isolated.
- The restored mainline is guided: the main session owns task
  transitions and must obtain a fresh owner decision before creating or
  starting the next product task.

## Durable project contracts

- [Development and preview](./development.md) defines the unified `preview.sh`
  CLI, root dotenv configuration, readiness, address output and exact teardown.
- [Development principles](./development-principles.md) applies before every
  implementation, diagnosis and final check.
- [Review, attribution and continuity](./commit-policy.md) applies before a
  commit/archive and when choosing subsequent work.
- [Frontend design workflow](./frontend-workflow.md) applies to changes in
  page structure, visuals, interaction or accessibility.
- [Third-party inventory](../../../third_party/index.md) records retained
  material and unresolved notice provenance; recheck when versions change.
- [Validation profile](./validation-profile.md) records the project command
  boundary, package gates, browser matrix, and failure classification.
- [Protected recovery boundary](./protected-recovery-boundary.md) records
  what may be reconciled and what must remain initializer-owned.
- [Project-record privacy](../guides/project-record-privacy.md) remains the
  authority for handling task, journal, and evidence records.
- [Private comments observability and release boundary](./comments-observability-release-boundary.md)
  records the bounded HTTP evidence contract and the deferred deployment
  recovery boundary.
- The standalone frontend contracts remain under `../frontend/`; the
  template-derived files that had mixed provenance were quarantined for
  review rather than copied over the fresh initializer output.

## Review and attribution profile

Automated checks are the primary evidence. Human review is reserved for
subjective visual judgment, real devices, assistive technology, and private
deployment environments. A generic smoke test is not required after the
applicable automated gates pass.

Codex-assisted tasks receive the exact attribution trailer once on their
successful archive commit, using the supported `--no-commit` route described
in `commit-policy.md`. Ordinary work and separate journal commits do not
receive that task trailer. Existing historical commits are not rewritten.

## Policy loading

The installed `trellis-start` discovers the `trellis-plus` layer with
`python3 .trellis/scripts/get_context.py --mode packages`. Its manual index
read is the portable entry point. `AGENTS.md` points to `.trellis/spec/` but
does not itself inject this policy. The Codex task context loader consumes
explicit implement/check JSONL files; it does not recursively load Markdown
links from this index.

At session/task start, after interruption, and before commit/archive, read
this index and `.trellis/mainline.md`; then read the detail files whose loading
conditions match the work. For an owner-approved active task, register each
needed detail explicitly in both contexts:

```sh
python3 .trellis/scripts/task.py add-context <task-dir> implement .trellis/spec/trellis-plus/index.md "Shared project policy"
python3 .trellis/scripts/task.py add-context <task-dir> check .trellis/spec/trellis-plus/index.md "Shared project policy"
```

Repeat those commands for each applicable detail path after inspecting existing
entries to avoid duplication. Verify with `task.py validate <task-dir>`
and read the JSONL records. No automatic task-wide registration has been
installed. When the owner explicitly declines a task, load matching specs in
the main session and supply their paths directly to authorized workers; do
not fabricate task records. The 2026-10-05 preview consolidation uses this
no-task exception. Future start/check/archive execution remains unverified
until an actual task runs these steps.
