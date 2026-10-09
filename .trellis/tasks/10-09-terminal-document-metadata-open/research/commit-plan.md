# Terminal metadata and opening commit plan

Prior owner commit authorization persists for this ongoing Terminal refinement.
The owner explicitly requested this task and implementation, then confirmed the
date/bytes/license order. The concrete result passed independent browser,
static, original-source and visual checks; local preview is updated.

Submit-ready classification: human-optional. Preference review remains possible
in the ready preview, with no missing material automated check or blocker.

Work commit: `feat(site): unify Terminal metadata and open documents in new tabs`.

Explicit files:
- `apps/site/playwright.config.ts`
- `apps/site/src/components/TerminalDocument.astro`
- `apps/site/src/components/TerminalStreamDocument.astro`
- `apps/site/src/lib/document-share-url.d.mts`
- `apps/site/src/lib/document-share-url.mjs`
- `apps/site/src/scripts/document-share.ts`
- `apps/site/src/scripts/terminal-home.ts`
- `apps/site/src/styles/terminal.css`
- `apps/site/tests/content-build-positive.test.mjs`
- `apps/site/tests/document-navigator.spec.ts`
- `apps/site/tests/document-sharing.spec.ts`
- `apps/site/tests/static-output.test.mjs`
- `apps/site/tests/terminal.spec.ts`
- `.trellis/spec/frontend/content-workspace-contract.md`
- `.trellis/spec/frontend/terminal-file-metadata-contract.md`
- `.trellis/spec/frontend/terminal-reading-contract.md`
- `.trellis/mainline.md`
- `.trellis/tasks/10-09-terminal-document-metadata-open/prd.md`
- `.trellis/tasks/10-09-terminal-document-metadata-open/design.md`
- `.trellis/tasks/10-09-terminal-document-metadata-open/implement.md`
- `.trellis/tasks/10-09-terminal-document-metadata-open/task.json`
- `.trellis/tasks/10-09-terminal-document-metadata-open/research/integration-notes.md`
- `.trellis/tasks/10-09-terminal-document-metadata-open/research/validation.md`
- `.trellis/tasks/10-09-terminal-document-metadata-open/research/commit-plan.md`

No unrecognized dirty paths are present. Generated/private content, captures,
reports and JSONL runtime context stay ignored and unstaged. Source/helper/test
fingerprints remained identical through the final owner publication rebuild.

After the work commit, archive only this completed task via supported
`task.py archive terminal-document-metadata-open --no-commit`; inspect source/
destination and stage explicit paths plus continuity evidence. Create the
separate archive commit with exactly one Codex trailer, then journal referencing
the work commit only. No push, amend or production deployment.
