# M3 Terminal interface — Implementation Plan

## Preconditions

- The task stays in `planning` until the owner reviews the completed planning
  summary and explicitly approves implementation. Only the main session runs
  `task.py start`.
- Phase 2 begins by loading the injected PRD, design, current frontend specs,
  architecture/article/UUPM research, and project-local pre-development rules.
- The 2026-08-13 shell-first PRD/design revision supersedes current durable M3
  spec clauses that still require a permanently visible fallback, visible Run
  control, card-based transcript, or navigation effect. Refresh those durable
  specs only after the revised implementation and independent check pass.
- Use the existing executable `./sam` wrapper for every Node, npm, Astro, and
  Playwright command. Do not install or run a competing host toolchain.
- Preserve exact package-local lockfiles and the non-workspace root. Do not edit
  X Core contracts, NERV, deployment, `sam`, `dev.sh`, or the reference
  prototype unless a recorded stop gate returns the work to planning.
- Treat
  `/home/wkyuu/cargo/repo/04-flyMe2theStar/03-genshin/online/` as read-only.
  Copy and normalize exactly the selected article; do not scan or migrate the
  rest during implementation.
- The approved design is the contract. If Astro/package/runtime evidence
  invalidates a material decision, stop, update `design.md` plus both context
  manifests, and request the smallest necessary owner decision before resuming.

## Ordered Work

### 1. Record the baseline and prove the package path

- Record `git status --short`, active task status, current route/artifact
  inventory, relevant package versions, and absence of a stale
  `apps/site/.astro/dev.json`.
- Verify `./sam node --version` before any install. Preserve the pinned
  Playwright image `mcr.microsoft.com/playwright:v1.62.0-noble`.
- Build current X Core before resolving new local `file:` dependencies.
- Confirm the design can use one private Terminal package plus site composition
  without an npm workspace, root lockfile, X Core contract change, xterm, or
  prototype/experiment import. Stop immediately if any is required.

### 2. Create the private Terminal package

- Add `presentations/terminal/` with private ESM metadata, strict NodeNext
  TypeScript, package-local exact lockfile, `check`, `test`, and `build`
  scripts, and an exact local X Core dependency.
- Expose the adapter at the package root and a side-effect-free `./runtime`
  subpath for the pure command/index engine. Its emitted browser graph must not
  import X Core, HAST, Astro, or the adapter entry.
- Reuse only direct dependency versions already compatible with the X Core and
  semantic packages; declare every runtime/type import in the owning package.
- Generate its lockfile through `./sam ... install --package-lock-only`, then
  prove a clean `ci` before relying on the package.
- Add root install/check/test/build delegates and M3 aggregate scripts without
  deleting or changing the meaning of M2/NERV delegates. Add only generated
  Terminal build/test paths to ignore rules.

### 3. Implement pure contracts and the command engine

- Implement strict `TerminalEntry`/identity/state/effect contracts and a
  decoder that rejects unknown/unsafe fields, bad local routes/dates, duplicate
  filenames/slugs, non-plain objects, sparse arrays, accessors, and mutation
  hazards without invoking getters or coercion.
- Implement balanced quoted-token parsing with no shell evaluation surface.
- Implement the exact M3 command table, strict arity, stable recovery messages,
  exact `<slug>.md` lookup, typed inline-document effect, authored dates in `ls`
  results, injected UTC clock formatting, and exhaustive tagged effects.
- Implement bounded 50-item page-local history, draft-preserving Arrow
  navigation, and contextual completion. Only a unique completion may consume
  Tab; ambiguous/no-match results must preserve normal focus traversal.
- Test the happy/negative path of every command. Explicitly assert that help and
  completion omit lab commands and that both `ls lab` and `open lab/nerv`
  produce the same ordinary unknown-command result used by unrecognized input.

### 4. Implement and register the Terminal document adapter

- Implement a pure `terminal` adapter supporting valid post/page contexts,
  preserving X Core heading/node identities, recursively wrapping nested
  `pre`/`table` elements in named focusable Terminal wide regions, and
  returning an empty enhancement manifest.
- Add adversarial adapter tests for unsupported contexts, repeated deterministic
  runs, nested wide content, identity preservation, immutable inputs, and empty
  enhancements.
- Build Terminal, add it as an exact site `file:` dependency, register it
  beside semantic in the sole Astro registry, and refresh the site lockfile
  through `./sam`.
- Run the actual Astro processor against schema-validated semantic and Terminal
  fixtures, proving selection uses the same production registry and generated
  metadata contract.

### 5. Import the real article with preservation-first editing

- Read the authorized `41-llm-workflow-with-trellis.md` source without changing
  it and add only
  `content/posts/llm-workflow-with-trellis.md` in this repository.
- Add strict public front matter, remove the body H1, retain all representative
  Markdown structures, keep Mermaid inert, normalize the public source link, and
  make only evidence-backed stale-fact/typo corrections.
- Create
  `research/article-edit-ledger.md` with every prose-level source fragment,
  replacement, and reason. Record source path, dates, and authorization without
  publishing a local absolute path in the site artifact.
- Before dispatching the check agent, the main session adds that completed
  ledger to `check.jsonl` with its editorial-verification reason and re-runs task
  validation, so review receives the actual evidence rather than a missing
  planning placeholder.
- Run content/schema/negative tests immediately. Stop for owner judgment if any
  editorial correction cannot be justified without changing the article voice
  or argument.

### 6. Add presentation-aware whole-page composition

- Add one exhaustive shared document presentation component used by both
  dynamic post/page routes. Switch only on validated
  `document.metadata.presentation`; fail closed on an unexpected value.
- Preserve the existing semantic layout/component unchanged in behavior.
- Replace its implicit CSS side-effect import with an explicit generated CSS URL
  linked only inside the semantic layout, so the Terminal static path does not
  inherit the semantic stylesheet.
- Add the complete Terminal layout and Terminal document component with shared
  skip-link/main/title-bar/tokens, one H1, semantic article/time/outline,
  prompt-like direct home path, and focusable local overflow.
- Import namespaced Terminal CSS as build-time raw text and emit it inline only
  from the Terminal layout. The layout and article component must contain no
  home script import, input, hydration directive, or enhancement loader.
- Add the narrow Vite `assetsInlineLimit` predicate required to keep only the
  generated Terminal-home script external. Match a normalized generated entry
  ID and leave unrelated assets on Vite defaults; do not set a global zero
  threshold.
- Build and inspect individual outputs before continuing. Stop if Terminal
  styles/scripts leak to the semantic sample, About, or 404.

### 7. Replace home with progressively enhanced Terminal composition

- Derive one minimal validated `TerminalEntry[]` from
  `getPublicContent()`; do not add another collection loader or sort/filter
  policy.
- Render a programmatic H1 plus native recovery links for every entry. Reuse the
  links as the `data-*` metadata boundary, but hide the recovery block only after
  successful enhancement; restore it on any fatal post-start failure.
- Render every public entry through `renderDocument()` at home build time and
  place a compact `TerminalStreamDocument` inside exactly one inert keyed
  `<template>`. Validate the decoded entry/template sets as a bijection before
  revealing any interactive UI.
- Render the whole session hidden. On successful boot, reveal only a continuous
  transcript and inline `guest@f1refly $` input row; no hero, index cards,
  visible Command label, field box, titlebar, or visible Run button. Never
  autofocus or capture whole-page/global key events.
- Apply text/list effects with safe DOM APIs. For `document`, clone only trusted
  template content, namespace every cloned ID and same-fragment ID reference,
  append the semantic article, focus its title, and keep a native return-to-
  prompt link. Never parse or transport source Markdown/HTML strings.
- `clear` removes all visible output and completion/status text, then focuses a
  fresh prompt; it preserves bounded in-memory history and inert recovery data.
- Handle Enter and full IME composition, Arrow history/caret placement, unique
  Tab completion, normal Tab escape, and mobile soft-keyboard Enter. Add no
  fetch, `DOMParser`, unsafe HTML insertion, client router, storage, websocket,
  worker, arbitrary URL navigation, or window-global state.

### 8. Apply the approved Terminal visual/accessibility system

- Implement the approved near-black/light/green/amber palette with measured
  WCAG 2.2 AA text/focus contrast and non-color status labels.
- Use only the system/local monospace stack and CSS/semantic text. Add no remote
  font, image, emoji/icon control, fake window action, GSAP, Bento/newsletter
  pattern, or delayed boot/typewriter sequence.
- Keep the shell visually continuous and unboxed. Desktop is centered and mobile
  is full-bleed/safe-area-aware; the transparent prompt input row is at least
  44px. Give inline Glow-like Markdown a 70–78ch measure, modest headings,
  underlined links, blockquote rule, and locally scrolling code/tables.
- Keep the article-route decorative title bar unavailable to the accessibility
  tree, suppress it entirely on the home, and remove any nonessential motion
  under `prefers-reduced-motion`.

### 9. Expand static, integration, and browser evidence

- Extend package and site Node tests described in `design.md`, including real
  production registration, article semantics, strict index projection, runtime
  startup failure, and lab-boundary negatives.
- Update static output assertions from the intentional M2 baseline to the exact
  M3 inventory: five HTML files, one semantic CSS asset, one home JavaScript
  asset, zero maps/unknown files, and bidirectional route-specific style/script
  closure.
- Split Playwright into:
  - `chromium-desktop-static` and `chromium-mobile-static`, JavaScript
    disabled, running the static/fallback route suite;
  - `chromium-desktop-interactive` and `chromium-mobile-interactive`,
    JavaScript enabled, running only the Terminal interaction suite.
- Keep 1440×900 and 375×812, retry/report/trace policy, and the matching
  Playwright image. Change the main-site browser server to `astro preview` of
  the prior validated build because locked Astro dev mode leaks the semantic
  `?url` CSS module into the Terminal dynamic path. Do not use dev output for
  route-asset or presentation-isolation evidence.
- Cover no-JS fallback/inert templates, prompt-only startup, all five route
  classes, command positives/negatives, lab omissions, history, completion/Tab
  escape, composition-safe Enter/Arrow/Tab, mobile soft-keyboard Enter, inline
  semantic/Terminal/page `cat` with unchanged `/`, repeated-cat ID scoping,
  clear-to-fresh-prompt, latest-only announcements, early/late failure recovery,
  reduced motion, article no-JS reading, and desktop/mobile overflow. Add one
  focused viewport-resize case for 768×900 and 1024×900 containment without more
  full browser projects.

### 10. Run the final gate, update durable knowledge, and stop for review

- Run the complete command matrix below after the last product edit. Do not
  report a prior run as final evidence. The site build must precede every
  focused/full Playwright sequence because its preview server consumes `dist/`.
- Re-run unchanged X Core/semantic and NERV checks after the final site build.
  Confirm browser-owned preview exits cleanly, no stale dev lock/test temp
  directory remains, and `./dev.sh down` reports a clean project runtime.
- After delegated implementation/check handoff, the main session performs Phase
  3.3 with `trellis-update-spec`: update the existing frontend specs and index
  to document the Terminal package, shared dispatcher, pure command state,
  progressive enhancement, route/asset inventory, M3 build order, and
  four-project Playwright profile. Replace obsolete M2-only facts; do not
  describe M4 as implemented.
- The main session, not a delegated implementation/check agent, updates
  `.trellis/mainline.md` from planning to submit-ready only after all runnable
  evidence passes. Validate both task manifests and run `git diff --check`.
- Apply the Trellis Plus submit-ready gate before any commit. This task is
  `human-required` even when automation passes because Terminal visual quality
  and preservation of the real article voice are subjective. Provide focused
  desktop/mobile home/article screenshots, the article edit ledger, exact
  automated results, and ask only for visual/editorial pass/fail. Assistive
  technology and real-device behavior remain named residuals, not claimed
  automated passes.
- Do not stage, commit, complete, or archive until that focused human review is
  approved.

## Validation Commands

Run Node/npm/browser commands through the approved wrapper. Generate package
locks only during the corresponding ordered step; the final reproducible gate is:

```bash
./sam node --version

./sam npm --prefix packages/x-core ci
./sam npm --prefix packages/x-core run check
./sam npm --prefix packages/x-core run test
./sam npm --prefix packages/x-core run build

./sam npm --prefix presentations/semantic ci
./sam npm --prefix presentations/semantic run check
./sam npm --prefix presentations/semantic run test
./sam npm --prefix presentations/semantic run build

./sam npm --prefix presentations/terminal ci
./sam npm --prefix presentations/terminal run check
./sam npm --prefix presentations/terminal run test
./sam npm --prefix presentations/terminal run build

./sam npm --prefix apps/site ci
./sam npm --prefix apps/site run test:content
./sam npm --prefix apps/site run test:x-core
./sam npm --prefix apps/site run check
./sam npm --prefix apps/site run build

SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- --project=chromium-desktop-static --project=chromium-mobile-static tests/site.spec.ts
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- --project=chromium-desktop-interactive --project=chromium-mobile-interactive tests/terminal.spec.ts
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e

./sam npm --prefix experiments/nerv ci
./sam npm --prefix experiments/nerv run check
./sam npm --prefix experiments/nerv run build

./dev.sh down
python3 ./.trellis/scripts/task.py validate 08-12-m3-terminal-interface
git diff --check
```

The final report records exact package versions, unit/integration/browser counts,
route and asset inventory, JavaScript mode, projects/viewports, focused/full
commands, inline-template payload size, article normalization changes, contrast
evidence, soft-keyboard/real-device residuals, and any unavailable command. A missing image, network failure, or
unrunnable material check is `unavailable`, never `passed`, and makes the
human-review gate blocking.

## Review and Rollback Checkpoints

- **After package creation:** clean Terminal install/check/test/build must pass
  before site dependency changes.
- **After registry integration:** real semantic and Terminal fixtures must pass
  through one registry; no route-local presentation shortcut is accepted.
- **After article import:** schema/heading/safety checks and the editorial ledger
  must be reviewable before UI work builds on it.
- **After document dispatch:** inspect semantic and Terminal static path closure
  before adding home JavaScript.
- **After home startup:** prove no-JS and failed-initialization fallback before
  command polish.
- **After final build:** prove exact output allowlists and browser project
  separation before human review.

Rollback at each checkpoint is additive: remove the new package/site
composition/article and restore the prior home/routes. Never mutate the
authorized external source, rewrite package history, delete user work, or use a
destructive Git reset.

## Start Gate

- `prd.md`, `design.md`, and this plan contain no blocking open question.
- Task-local architecture, article, raw UUPM, and approved UUPM research exist.
- `implement.jsonl` and `check.jsonl` contain real curated design/spec/research
  entries.
- The owner reviews the final planning summary in a subsequent message and
  explicitly approves implementation.
