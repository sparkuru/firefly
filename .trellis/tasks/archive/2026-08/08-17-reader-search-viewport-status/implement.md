# Reader search viewport status and prefix layout — Implementation Plan

## Preconditions

- Obtain explicit approval of this planning summary before running
  `task.py start` or dispatching implementation work.
- Keep existing user changes intact; the current worktree is clean apart from
  this new planning task.
- Use `./sam` for Astro, TypeScript, build, and Playwright commands.
- Read the frontend specs listed in the task manifests before implementation.

## Ordered checklist

### 1. Toggle the active-search layout state

- Update the reader controller's search-status synchronization to add and
  remove a dedicated `data-reader-search-active` attribute on the status
  section alongside the existing hidden/text state.
- Do not alter occurrence collection, highlight registration, active-match
  selection, scroll settlement, or reader keyboard boundaries.

### 2. Implement the two presentation refinements

- In `global.css` and `terminal.css`, make the status section sticky only when
  `data-reader-search-active` is present, using the existing semantic/Terminal
  surface and border tokens.
- Add an explicit 8px-or-more form column gap in both presentation styles and
  retain a shrinkable input and 44px minimum control height.
- In `terminal.css`, replace the document shell's fixed-only `78rem` desktop
  cap with the approved bounded fluid measure (`78rem` baseline, `86vw` growth,
  `180rem` upper cap), and apply the same measure to the shell/document
  containers that share its frame. Preserve the 40rem mobile override and
  existing text/wide-content containment.
- Keep native labels, visible prefix text, placeholders, focus outlines,
  reduced-motion behavior, and static HTML unchanged.

### 3. Add focused regression evidence

- Extend `apps/site/tests/reader.spec.ts` with sticky-status viewport checks,
  `n/N` status updates after scrolling, cancellation cleanup, and measurable
  prefix/input non-overlap at mobile and desktop widths.
- Add a wide-viewport assertion for 1440px/2560px/3840px that checks the shell
  grows beyond the old cap at 4K without page-level horizontal overflow, while
  retaining a diagnostic screenshot for the 4K review.
- Keep the existing exact CSS Highlight range assertions and backward-search
  label/placeholder checks as regression coverage.
- Update any static-output assertion only if the state attribute changes the
  server-rendered markup; the default HTML should remain unchanged.

### 4. Record the durable contract

- Add the sticky active-search status and explicit prefix/input spacing to
  `.trellis/spec/frontend/content-workspace-contract.md` and the relevant
  frontend hook/component guidance if needed.
- Keep the contract limited to behavior learned from this implementation; do
  not broaden it into a general fixed-header rule.

### 5. Validate and review

Run focused checks first:

```bash
./sam npm --prefix apps/site run check
./sam npm --prefix apps/site run test:content
./sam npm --prefix apps/site run test:x-core
./sam npm --prefix apps/site run build
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- tests/reader.spec.ts
```

Then run the full gate:

```bash
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- tests/site.spec.ts
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e
git diff --check
python3 ./.trellis/scripts/task.py validate .trellis/tasks/08-17-reader-search-viewport-status
```

Review the browser evidence at 375px and 1440px, including the backward-search
input before submission and the sticky status after a later match is active.
Record exact command results and screenshot paths in the task context before
commit.

## Files and rollback points

- `apps/site/src/scripts/terminal-reader.ts` — active-search state attribute
  only.
- `apps/site/src/styles/global.css` and `apps/site/src/styles/terminal.css` —
  sticky status, prefix/input spacing, and bounded wide-screen frame.
- `apps/site/tests/reader.spec.ts` — behavior and geometry evidence.
- `.trellis/spec/frontend/content-workspace-contract.md` and adjacent frontend
  guidance — durable contract.
- Task-local `research/ui-ux-pro-max.md`, manifests, and evidence logs.

First checkpoint: controller state toggles and existing search tests. Second:
sticky geometry and prefix spacing at both widths. Third: full validation and
contract review. Revert only task-scoped changes if a checkpoint fails.

## Definition of done

- Active search status stays visible in the viewport while the reader scrolls,
  and its index follows every `n/N` occurrence transition.
- Cancelling search restores normal flow.
- `/` and `?` prefixes are visibly separated from the input with no narrow-width
  overlap, while native focus and labels remain intact.
- Exact search behavior and all existing reader/static/native-boundary tests
  remain green.
- Durable specs, task evidence, commit, archive, and journal are complete.
