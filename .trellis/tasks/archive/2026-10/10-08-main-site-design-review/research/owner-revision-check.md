# Independent owner-revision review

## Findings (fixed)

No product or maintained-test issue was found that required a source fix. All
eight dirty/new application, browser-test and browser-config paths were reviewed
against the owner revision and the retained refinement requirements. This review
did not change application source, maintained tests, owner content/configuration,
runtime packages, lab designs or Git state.

## Reviewed behavior

- `terminal.css` restores the pre-task page-dependent prose and authored heading
  widths; no new fixed reading cap remains. The existing independent wide/paper
  boundaries, task-owned metadata/outline rhythm, readable feedback, coarse
  44px targets and enlarged-text containment remain coherent. The completion
  spacer outranks the existing nonempty-transcript padding declaration.
- `terminal-home.ts` initializes the native hint only after successful eligible
  interactive startup, guards storage reads/writes, retires visible guidance on
  use and persisted-page restoration, and leaves initially mobile browsing free
  of Terminal construction/storage consumption. Help remains an empty-input
  placeholder rather than an executable value.
- Completion settlement operates on rendered prompt/panel geometry, retains
  input focus and existing selection/acceptance, centers fitting groups, bounds
  oversized lists below the centered prompt and reveals active options locally.
  Repeated rendering recomputes list geometry. Modifier/IME behavior and reduced
  motion follow existing ownership; no command-resolution package was changed.
- `memo.css` removes only the smaller mobile month-summary override. The Memo
  browser checks retain actual navigation and verify oldest-entry clearance.
- `home-browse.spec.ts` supplies a public synthetic friend only to its positive
  focus/history scenario, retaining all configured records and the exact count.
  `mobile-home-assertions.ts` accepts that complete explicit expectation while
  preserving configured/empty-state defaults for other callers.
- `terminal-refinement.spec.ts` measures actual page/stream widths, local code
  scrolling, touch hit regions and navigation, enlarged text, first-visit hint
  lifecycle/failure/mobile ownership, and fitting/oversized completion viewport
  coordinates after real long transcript output. `playwright.config.ts` selects
  this suite in all four maintained projects.
- `TerminalHome.astro` and `terminal.spec.ts` now have no net changes against
  `HEAD`, as intended after restoration. Existing runtime selection/listbox
  behavior takes precedence over the older contract's obsolete two-line
  ambiguity description. The focused Terminal reading contract documents the
  current revision correctly.

## Verification

- Lint: no dedicated site lint script is configured; `git diff --check` passed.
- TypeCheck/build: reused the stable final implementation build, which checked
  140 Astro files with zero errors/warnings/hints and passed all 18 static-output
  checks. No application source changed after that result.
- Maintained focused tests: reused the final revision suite's 20 passes and
  20 intentional applicability skips. The affected existing Terminal selection
  passed 17 cases on first attempt plus a native Control-click popup case on
  retry; its isolated three repetitions subsequently passed with retries off.
  The native-popup flake has no established source cause and was not hidden by
  weakening a test or raising a timeout.
- Additional independent wrapper browser diagnostic passed against the stable
  synthetic build: fine-pointer desktop at 375x812, then fresh Tab after resize
  to 375x350, 768x500 and 1440x900. Prompt, panel and last active option stayed
  visible, input focus was retained and the document had no horizontal overflow.
  Fitting group centers were approximately 406.27/249.98/450.20px for viewport
  midpoints 406/250/450px; the oversized 350px viewport's prompt center was
  approximately 175.45px. This supplements, rather than replaces, maintained
  reduced-motion and oversized-list regressions.
- A separate browser diagnostic denied storage writes while permitting reads;
  first-visit help and command execution remained usable, and use removed the
  visible placeholder. Read denial is already covered by the maintained suite.
- Independently viewed the ignored synthetic fitting and oversized completion
  captures. The selected option is visible with restrained existing Terminal
  styling; no further material visual refinement was justified.

The diagnostic script and captures remain ignored under
`apps/site/artifacts/design-refinement/owner-revision/`. The script used the
approved wrapper and an isolated container-local preview of the stable built
fixture; it did not rebuild shared outputs or reconfigure the owner's preview.

## Findings (not fixed)

No unresolved implementation blocker or spec drift was found. Main-session
follow-ups are the revised full verification/package gate, its evidence and
commit-plan update, and owner subjective visual/Git acceptance. Earlier gate
totals describe the first candidate and must not be reused as revised evidence.
Physical-device engines, assistive technology and private deployment remain
outside this local Chromium review. No commit, staging or archive was performed.
