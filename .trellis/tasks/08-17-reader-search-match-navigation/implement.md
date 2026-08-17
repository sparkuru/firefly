# Reader search match navigation and highlighting — Implementation Plan

## Preconditions

- Obtain explicit approval of the final planning summary before `task.py start`.
- Keep the current branch/worktree clean before implementation; do not fold
  unrelated future work into this task.
- Use `./sam` for every Node, Astro, and Playwright command.
- Preserve the current canonical URL, reader fragment, static HTML, and
  read-only capability contracts.

## Ordered implementation checklist

### 1. Establish the occurrence model

- Add a private `SearchMatch` record and a pure/local collector that maps every
  literal query occurrence to an exact DOM Range within one reading unit.
- Preserve document order, case-insensitive matching, non-overlap, inline text
  boundaries, and empty/no-result behavior.
- Add focused browser assertions for exact range text and repeated occurrences
  within the same `<pre>`/reading unit.

### 2. Separate active match from active reading unit

- Replace unit-index `searchMatches` navigation with occurrence-index
  navigation.
- Make initial search, `n`, and `N` use deterministic direction and wraparound.
- Keep region keyboard ownership after submission and use a range viewport-band
  settlement that does not focus or select the match.
- Re-render all-match and active-match CSS Highlights after every transition.

### 3. Make status and `?` discoverable

- Add persistent search-status markup with stable selectors and accessible
  semantics.
- Update status after initial search, `n/N`, new query, empty query, and no
  results; keep the polite announcer for transient feedback.
- Add direction-specific labels/placeholders and visible prefix styling for `/`
  and `?`, preserving native input/IME/Escape behavior.

### 4. Update styles and static contracts

- Add distinct quiet/active search highlight styles without adding DOM wrappers.
- Keep content-first hierarchy, visible focus, responsive 1440/375 layouts,
  reduced motion, and no nested document scroller.
- Extend static-output tests for search-status markup, exact route-owned reader
  script, and JavaScript-free document completeness if serialization changes.

### 5. Regression and review evidence

- Extend `apps/site/tests/reader.spec.ts` for repeated same-unit matches,
  direct-fragment entry, `n/N`, status updates, wraparound, no results,
  backward-search hint, IME, native selection, and protected controls.
- Add/adjust desktop/mobile review screenshots for backward-search input,
  multiple exact highlights, active-match status, and a same-block `n/N`
  transition.
- Keep existing site/static and Terminal tests green.

## Validation commands

Run focused checks first, then the full gate:

```bash
./sam npm --prefix apps/site run check
./sam npm --prefix apps/site run test:content
./sam npm --prefix apps/site run test:x-core
./sam npm --prefix apps/site run build
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- tests/reader.spec.ts
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- tests/site.spec.ts
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e
git diff --check
python3 ./.trellis/scripts/task.py validate .trellis/tasks/08-17-reader-search-match-navigation
```

If the browser review config is changed, run its fixed Noble/host-IPC command
and record the exact desktop/mobile screenshot paths. Do not silently update a
baseline or treat an unavailable browser prerequisite as a pass.

## Risky files and rollback points

- `apps/site/src/scripts/terminal-reader.ts` — occurrence mapping, range
  highlights, status updates, and scroll settlement.
- `apps/site/src/components/ReaderStatus.astro` — search status and input
  labels/placeholders.
- `apps/site/src/styles/global.css` and `apps/site/src/styles/terminal.css` —
  visible status/input/highlight treatment.
- `apps/site/tests/reader.spec.ts`, `apps/site/tests/static-output.test.mjs`,
  and focused review screenshot tests.
- `.trellis/spec/frontend/content-workspace-contract.md` and adjacent reader
  specs if a durable occurrence-level contract is established.

First rollback checkpoint: occurrence collector and exact-range tests. Second:
active-match navigation/status. Third: CSS/input review evidence. Roll back
only task-scoped changes if a checkpoint fails.

## Definition of done

- Exact occurrence ranges, not whole-unit ranges, are highlighted.
- `n/N` visibly navigate repeated same-unit matches from the real reader entry.
- Persistent status follows the active match and announces bounded transitions.
- `?` search direction is visually and accessibly obvious on desktop/mobile.
- Existing static, native-browser, accessibility, IME, selection, reduced-motion,
  and no-persistence boundaries remain intact.
- Full validation passes and reviewed screenshots are recorded before commit.
