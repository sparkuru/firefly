# Owner review revision implementation

## Changes

- Restored pre-task page-dependent default paragraph/list/blockquote and heading widths against `HEAD`. Standalone and streamed reading again use the available page/command width; locally scrollable code/table and paper boundaries remain independent. Retained task-owned metadata/outline spacing, first-heading rhythm, touch targets, state feedback, placeholder color and enlarged-text containment.
- Removed the static recurring placeholder from `TerminalHome.astro`, returning that file to `HEAD`. The desktop controller initializes `help` only after the first interactive index startup. Guarded browser-local key `firefly.terminal.help-seen` reserves that first visit immediately; command input/use clears the visible placeholder. Reload, real Back/return and persisted-page restoration do not revive it. Mobile does not initialize/consume the hint. A blocked storage getter cannot prevent commands; persistent cross-reload suppression depends on available browser storage.
- Added completion viewport settlement without changing runtime resolution. Fitting prompt/candidate groups center vertically. Oversized groups keep the prompt row centered at the viewport midpoint, bound the candidate list to remaining space and scroll the selected option locally. The existing motion predicate selects smooth movement or immediate reduced-motion settlement. Safe unique/no-match results also settle; ignored/composing/modified Tab events retain their previous handling.
- The scoped completion spacer provides enough trailing page space to reach the desired viewport placement after long output. Its selector deliberately matches the existing non-empty transcript rule's specificity. Dismissal releases the additional space. Candidate scrolling preserves input focus, value, active-descendant semantics and Enter/Space acceptance.

Implementation-owned paths: `apps/site/src/styles/terminal.css`, `apps/site/src/scripts/terminal-home.ts`, `apps/site/tests/terminal-refinement.spec.ts`. `TerminalHome.astro` and the existing wide-width assertion in `terminal.spec.ts` were restored to `HEAD`, so they no longer have net task changes. Other prior dirty task paths were preserved. Main-session specs, task documents, mainline and Git plan were not edited by this worker.

## Focused validation

All commands used tracked content and the existing contained public configuration:

```sh
FIREFLY_CONTENT_ROOT="$PWD/content" \
FIREFLY_SITE_CONFIG_PATH=.firefly/memos/browser-fixture/config/site.toml \
./preview.sh render <command>
```

- Final `npm --prefix apps/site run build`: exit zero; Astro checked 140 files with zero errors/warnings/hints; all 18 static-output checks passed. Empty optional Memo collection notices are expected for this ordinary site fixture.
- Final `npm --prefix apps/site run test:e2e -- tests/terminal-refinement.spec.ts`: 20 passed, 20 intentional desktop/mobile/static applicability skips. Covers page-wide reading, paper isolation, local keyboard code scrolling, touch targets/navigation, enlarged text, reduced motion, hint lifecycle/storage/mobile and actual completion viewport geometry/selection.
- `npm --prefix apps/site run test:e2e -- tests/terminal.spec.ts --grep 'completion|Tab|IME|Control|settle|wide content|page typing'`: exit zero, 17 first-attempt passes and one flaky native Control-click new-tab regression that passed its automatic retry. Completion, modifier/IME guards, cancellation, output settlement, wide reading and typing ownership passed first attempt.
- Investigated only that popup case with `--grep 'inline open intent' --repeat-each=3 --retries=0`: all three passed without retry. No code/test weakening or timeout increase was made. The initial timeout waiting for a new page is retained as a browser-test flake; an underlying cause is not established.
- `git diff --check`: passed.

The final source adds only persisted-page hint cleanup after the existing-regression run; final build and full focused suite include that change. The main session coordinates independent check and the required complete verification/package gate; earlier complete-gate totals do not establish acceptance of this revision.

## Measured and visual evidence

- Default paragraph width equals its owning prose root within the browser geometry assertion in desktop/mobile static/interactive projects. The streamed paragraph likewise equals its command-width prose root. Wide regions remain independently constrained/scrollable.
- At 1440×900 after four real `ls` outputs, the fitting completion group's center settles within 3px of viewport center (450px). Repeated Tab/Arrow selection remains visible, retains exact draft/focus, and Enter accepts before execution.
- At 1440×350 with reduced motion and nine directory candidates, prompt row center stays at 175px within the geometry assertion; panel bottom stays within 333px. Cycling every candidate causes positive local list scrolling while each active option remains fully inside the list and horizontal page scroll stays zero. Arrow wrapping and Space acceptance also pass.
- Synthetic viewport captures were inspected: `apps/site/artifacts/design-refinement/owner-revision/completion-fitting.png` and `completion-oversized.png`. They show visible command/selection with the established Terminal styling; screenshots remain ignored.
- The initial flaky popup screenshot/context are preserved under `apps/site/artifacts/design-refinement/owner-revision/failures-native-popup/`. Wrapper/build/browser logs are private temporary artifacts and contain no tracked owner-content fixture additions.

## Remaining acceptance

No focused implementation blocker remains. Independent check, final complete gate, normal-publication packaging/preview and owner subjective review are main-session follow-ups. Physical-device engines and assistive technology were not certified. No commit, staging, archive, owner content/configuration change, production deployment or remote write occurred.
