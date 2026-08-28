# Trellis Plus Project Contract

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

The current recovery copy is kept at
`/tmp/trellis-repair-firefly-20260828-032131/`. It is an external rollback
artifact, not a project source directory.

## Project execution profile

- The repository is a single root with separate manifests and lockfiles for
  the site, presentation packages, validation tooling, publication tooling,
  and NERV experiment.
- `./sam` is the executable boundary for Node, npm, browser, and Docker
  commands. Host npm, global Playwright, and raw Docker commands are not
  validation evidence.
- The approved dependency direction is X Core → semantic/Terminal → site.
  The validator feeds the site and assembler at build time; the assembler
  depends on the validator; NERV remains isolated.
- The restored mainline is guided and serial: the main session owns task
  transitions and must obtain a fresh owner decision before creating or
  starting the next product task.

## Durable project contracts

- [Validation profile](./validation-profile.md) records the project command
  boundary, package gates, browser matrix, and failure classification.
- [Protected recovery boundary](./protected-recovery-boundary.md) records
  what may be reconciled and what must remain initializer-owned.
- [Project-record privacy](../guides/project-record-privacy.md) remains the
  authority for handling task, journal, and evidence records.
- The standalone frontend contracts remain under `../frontend/`; the
  template-derived files that had mixed provenance were quarantined for
  review rather than copied over the fresh initializer output.

## Review and attribution profile

Automated checks are the primary evidence. Human review is reserved for
subjective visual judgment, real devices, assistive technology, and private
deployment environments. A generic smoke test is not required after the
applicable automated gates pass.

Commit creation is outside this recovery. If a later owner-authorized commit
explicitly requests Codex attribution, use only the selective trailer
`Co-authored-by: OpenAI Codex <codex@openai.com>`; do not add it to archive or
journal records.
