# Research: Terminal resource-path command consistency

- Query: Inspect the Terminal virtual-path command surface (`open`, `cat`, `vim`, `cd`, `ls`), path resolution, completion, and unit/browser coverage; identify paths printed by `ls` that cannot be used relative to the virtual cwd.
- Scope: internal
- Date: 2026-08-20

## Findings

### Existing path model

- The authoritative VFS resolver receives every command's operand plus the virtual cwd. It accepts safe NFC input only, rejects URL/percent/backslash/control input, and resolves `.` locally. Directory/pattern commands may use bounded `..`; resource commands deliberately may not (`presentations/terminal/src/vfs/paths.ts:55-120`).
- `ls`, `cd`, and `tree` delegate to that resolver in directory/pattern modes (`commands/ls.ts:102-105`, `commands/cd.ts:8-17`, `commands/tree.ts:47-53`). `cat`, `vim`, and `grep` delegate in resource mode (`commands/cat.ts:12-28`, `commands/session.ts:200-208`, `commands/grep.ts:356-381`). Thus their normal relative operands are already cwd-relative: e.g. document names in `/posts/<directory>` and page names in `/pages` work.
- Absolute virtual operands work through `/...`; `~/blog/...` also denotes virtual-root absolute form. At virtual root only, multi-segment `posts/...`, `pages/...`, and `lab/...` are resource-root shorthands; exact mount names are accepted as mount aliases (`vfs/paths.ts:30-35`, `75-94`). This bounded asymmetry is existing behaviour and should not be broadened by this hotfix.

### Confirmed user-visible inconsistency

1. In virtual `/lab`, `ls` renders a listed experiment as `nerv/`. `open nerv` should therefore resolve `/lab/nerv`, but it fails before resolution: `executeOpen` only permits operands beginning `lab/` or `/lab/` and force-converts the former to absolute (`commands/session.ts:188-197`). `open ./nerv` and `open ~/blog/lab/nerv` fail for the same precondition. This is the reported UX bug.
2. Keyboard completion has the same hard-coded canonical-only model: the `open` completion handler completes only `lab/<id>` regardless of cwd (`runtime.ts:831-836`). In `/lab`, `open n` gets no relative candidate even though `nerv/` was just displayed by `ls`.
3. Existing explicit text compounds the issue: `cat nerv` in `/lab` correctly refuses to read an experiment, but recommends `open lab/nerv` (`commands/cat.ts:20-24`). That recommendation succeeds, but it hides the fact that the natural cwd-relative form is rejected. `ls /lab/nerv` carries the same canonical guidance (`commands/ls.ts:134-138`). These are not unsafe behaviour, but their wording should remain canonical only if the canonical spelling is intentionally retained as a compatibility form.

### Checked cases that are intentional or already consistent

| Cwd / listing | Operand | Result | Classification |
| --- | --- | --- | --- |
| `/` → `posts/`, `pages/`, `lab/` | `cd posts`, `cd pages`, `cd lab`; `ls <mount>` | resolves to listed mount | consistent |
| `/posts/<nested>` → document names | `cat <file>`, `vim <file>`, `ls <file>` | resolves relative to cwd; completion uses same cwd scope | consistent |
| `/pages` → document names | `cat <file>`, `vim <file>`, `ls <file>` | resolves relative to cwd | consistent |
| `/lab` → `nerv/` | `ls nerv` | treats listed experiment leaf as a bounded listing and prints open guidance | consistent |
| `/lab` → `nerv/` | `cat nerv`, `vim nerv`, `cd nerv` | rejected because experiment is neither a readable document nor public directory | intentional type boundary; `cd` completion currently does **not** include experiments because its runtime call leaves that optional list empty (`runtime.ts:831-835`) |
| any cwd | `open lab/<id>` / `open /lab/<id>` | current documented canonical forms work | compatibility behaviour to retain |
| any cwd | `open <unlisted>`, unsafe/control/non-NFC/traversal input | no validated experiment effect; no URL is constructed from input | required safety boundary |

`ls` showing a document does not promise `cd` will accept it, and `ls` showing a directory does not promise `cat`/`vim` will accept it; those are explicit command type boundaries, not relative-path defects. The only displayed leaf whose operation is `open` is the experiment leaf, and it is the sole confirmed mismatch.

### Recommended cohesive contract

- Path-aware commands resolve ordinary relative operands from the current virtual cwd. Preserve existing resource traversal denial and public VFS validation.
- `open` accepts a resolved **experiment** leaf, not a syntactically canonical string. Therefore, at `/lab`, both `open nerv` and `open ./nerv` must navigate only after the VFS resolves them to a listed experiment. `/lab/nerv` and `~/blog/lab/nerv` are absolute virtual operands.
- Preserve `open lab/<id>` as a documented, cwd-independent legacy canonical shorthand. Treat only that spelling as a command-level compatibility alias for `/lab/<id>` before VFS resolution; do not change global mount-alias resolution for `cat`, `vim`, `grep`, `ls`, or `cd`.
- Completion must mirror execution: when its operand has no root/canonical prefix, offer experiments under the current cwd (`open n` → `open nerv` in `/lab`); retain completion of an explicit `lab/` canonical prefix and `/lab/` absolute prefix. It must preserve `./` or `/`, own only safe completion decisions, and retain existing prompt focus/ambiguous/no-match rules.
- Update the frontend contract wording that currently says all relative `cat`/`vim` operands are under posts and describes `open` only as `lab/<id>` (`.trellis/spec/frontend/hook-guidelines.md:54-61`). The implementation already supports cwd-relative documents/pages; the spec should state the unified virtual-cwd rule and experiment type boundary.

### Minimal safe implementation and test plan

1. In `executeOpen`, retain one-operand validation but remove the `startsWith` gate. Normalize only the legacy `lab/<id>` form to `/lab/<id>`; otherwise pass the supplied safe operand directly to `context.fs.resolve(operand, context.cwd, 'resource')`. Navigate only when `stat` returns a listed `experiment`, preserving the closed `{ kind: 'open-experiment', id }` control and never deriving a URL from raw input.
2. Replace the canonical-only `open` completion with a small experiment-only completion helper. It should derive candidates from `context.experiments` plus cwd, rather than reuse document completion, so it cannot suggest `cat`/`vim` paths or directories to `open`.
3. Add Terminal unit coverage in `presentations/terminal/tests/neutral-shell.test.ts` and/or `terminal.test.ts` for execution from `/lab`: bare and `./` relative leaf, legacy `lab/<id>`, absolute `/lab/<id>`, virtual-home absolute form, unlisted leaf, traversal/control input, and exact completion outputs for `open n`, `open ./n`, `open lab/n`, and `open /lab/n`.
4. Add focused browser coverage in `apps/site/tests/terminal.spec.ts`: `cd /lab`, run `ls`, Tab-complete or submit `open nerv`, and assert navigation reaches the already validated experiment mount. Keep the existing canonical `open lab/nerv` test as a compatibility assertion.
5. Validate the Terminal package check/test/build, main-site check/build, and focused interactive Terminal Playwright suite using the project `./sam` profile. No production configuration or private deployment data is relevant to this change.

## Related specs

- `.trellis/spec/frontend/content-workspace-contract.md:564-668` — current virtual-cwd, leaf, completion, and test requirements; it already requires cwd-relative `cd`/`ls`/`cat` behaviour but does not name `open` as part of that contract.
- `.trellis/spec/frontend/hook-guidelines.md:50-61, 92-98` — registry ownership, decoded-only Experiment navigation, safe completion, and the stale/narrow wording noted above.
- `.trellis/spec/frontend/quality-guidelines.md:68-80` — interactive Terminal coverage requirements.

## Caveats / Not Found

- The active package has no existing direct browser assertion for `open` after changing cwd to `/lab`; existing unit/browser tests assert only canonical `open lab/nerv` (`presentations/terminal/tests/terminal.test.ts:516-520`, `apps/site/tests/terminal.spec.ts:493-497`) and canonical completion (`terminal.test.ts:781-782`, `terminal.spec.ts:729-731`).
- No production/private endpoints, deployment paths, or host filesystem paths were inspected or are needed.
