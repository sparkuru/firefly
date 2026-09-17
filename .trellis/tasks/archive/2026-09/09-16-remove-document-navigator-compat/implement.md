# Remove legacy document navigator compatibility — Implementation Plan

## Activation gate

Do not run `task.py start`, dispatch an implementation agent, or edit product
code until the owner approves the final planning summary in a later response.
After approval, the main session activates this task and dispatches the
Trellis implementation and review agents with the task path at the start of
each prompt.

## Ordered checklist

1. Load `trellis-before-dev` for the frontend package and verify the task is
   active, the worktree is clean apart from approved task artifacts, and the
   current repository evidence still matches `prd.md` and `design.md`.
2. Change the single exported `DOCUMENT_NAVIGATOR_FRAGMENT` value in
   `apps/site/src/lib/document-navigation.ts` to `#document-navigator`.
3. Change the document navigator region ID in
   `apps/site/src/components/SemanticDocument.astro` and
   `apps/site/src/components/TerminalDocument.astro` to
   `document-navigator`. Preserve data markers, role/label, article-theme
   boundaries, outline links, and profile-derived initial state.
4. Verify `apps/site/src/scripts/document-navigator.ts` and
   `apps/site/src/scripts/terminal-home.ts` have no independent legacy hash
   literal and that their existing shared-constant flow now produces the
   current fragment. Keep `presentations/terminal/src/commands/session.ts`
   and all `vim` command semantics unchanged.
5. Update site unit/content/static tests and Playwright tests in:
   - `apps/site/tests/presentation-experiences.test.mjs`
   - `apps/site/tests/static-output.test.mjs`
   - `apps/site/tests/site.spec.ts`
   - `apps/site/tests/document-navigator.spec.ts`
   - `apps/site/tests/permalinks-review-screenshots.spec.ts`
   Keep assertions for focus, status visibility, native hash behavior,
   Back/Forward, `:q`, search, responsive layout, and `vim` routing; update
   only the page fragment/region ID contract.
6. Update the live contract wording in:
   - `.trellis/spec/frontend/content-workspace-contract.md`
   - `.trellis/spec/frontend/publication-contract.md`
   - `.trellis/spec/frontend/x-core-contract.md`
   Keep the command vocabulary and `vim` references where they describe the
   current Terminal product command. Do not rewrite archived task records or
   historical journal entries.
7. Search all live source, tests, and specs for `terminal-reader`, excluding
   archived task records, the historical journal, and the current task's own
   evidence. Resolve every remaining compatibility reference before review.
8. Run focused site validation:
   - `./sam npm --prefix apps/site run check`
   - `./sam npm --prefix apps/site run test:content`
   - `./sam npm --prefix apps/site run test:x-core`
   - `./sam npm --prefix apps/site run build`
9. Run focused browser validation through the pinned project wrapper for the
   document navigator, terminal routing, JavaScript-disabled native deep link,
   and screenshot route suites at desktop and mobile sizes.
10. Run the repository package/publication gates required by the validation
    profile when the focused checks pass:
    - `./sam npm run check:m4`
    - `./sam npm run test:m4`
    - `./sam npm run build:m4`
    - `./sam npm --prefix tooling/assemble-publication run test:e2e`
    - `./package-runtime.sh`
    - `git diff --check`
11. Dispatch `trellis-check` with the task context. Resolve any verified
    findings, rerun the smallest affected gate, and repeat full checks only
    when the change or failure warrants it.
12. Run `trellis-update-spec` if implementation discovers a durable contract
    or prevention rule not captured by the planned frontend contract edits.
    Otherwise verify the three planned contract files are correct.
13. Re-run task validation, review the final diff and live-reference audit,
    then commit the product/spec changes before archiving and recording the
    session through `trellis-finish-work`.

## Review gates

- No implementation before the owner approves the final planning summary.
- No task activation while `prd.md`, `design.md`, or this checklist has a
  blocking open decision.
- No compatibility alias or dual ID may be added to make a failing test pass.
- `vim` must remain a working command whose shell effect is fragment-free;
  only the browser destination hash changes through the shared site constant.
- The final diff must not alter authored Markdown, route generation, X Core
  metadata, comments payloads, article-theme resolution, or NERV behavior.

## Rollback points

- Before code edits: task artifacts only; rollback is deleting the new task if
  planning is rejected.
- After the constant/DOM edit: restore those three source changes if static or
  type checks reveal a contract mismatch.
- After tests/specs: use the live-reference audit and `git diff --check` to
  identify partial updates before any commit.
- Before archive: require all applicable gates and a clean review result.
