# Protected Trellis Recovery Boundary

This project-owned note records the boundary used during the 2026-08-28
runtime rebuild.

## Initializer-owned files

The current initializer owns these paths and their contents:

- `.trellis/workflow.md`
- `.trellis/scripts/**`
- `.trellis/agents/**`
- `.trellis/config.yaml`
- `.trellis/.gitignore`
- `.trellis/.version`
- `.trellis/.template-hashes.json`
- `.trellis/.backup-*`
- Trellis-managed files under `.agents/skills/` and `.codex/agents/`
- Trellis-managed Codex hooks and configuration
- Trellis managed blocks in root agent instruction files

Older copies are retained only in the external recovery backup. They are not
merged back into the active project.

## Project-owned files

The following may be restored when their provenance is clear:

- `.trellis/tasks/**`, including archived tasks, without changing status;
- `.trellis/workspace/**` and the personal `.trellis/.developer` state;
- `.trellis/mainline.md`;
- standalone project contracts and `.trellis/spec/trellis-plus/**`.

Conflicting task files are compared rather than overwritten. A newly created
initializer bootstrap task is retained. No task is archived as part of
recovery.

## Provenance rule

Files that combine Trellis template prose with project additions stay in the
external quarantine until provenance is reviewed. Generic upstream-derived
specifications require a license notice review before reuse. Project decisions
are re-expressed in original project wording under `spec/trellis-plus/` rather
than copying workflow prose, scripts, or template text.
