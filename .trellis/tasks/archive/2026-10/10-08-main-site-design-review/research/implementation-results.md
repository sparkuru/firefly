# Terminal refinement implementation evidence

## Retained changes

- Default standalone body blocks and unthemed streamed body blocks use the existing readable-measure token at 76ch. The direct-child boundary keeps code, tables and their cell contents independent. Removed the later contradictory stream `100%` prose reset. In the current stream markup the body has no theme attribute; standalone measurement remains explicitly scoped to `default`. Existing standalone paper content stays full width with its own typography/padding.
- Reduced outline vertical padding and the first default body-heading top margin, making the outline/body handoff less distant. Post metadata is slightly smaller with a controlled bottom edge. Existing outer shell, title scale, fonts, tree vocabulary, authored headings and palette remain intact.
- Canonical directory anchors and article outline anchors meet a 44px minimum under the established coarse-pointer/no-hover predicate; fine-pointer density and homepage inline browse remain unchanged.
- Empty desktop command input has native `help` placeholder text with muted semantic color. The value stays empty. Native help/history/completion/IME ownership remains with existing controllers.
- Directory/outline hover and press feedback uses existing semantic surfaces; pressed foreground pairs with text color. Only color/background transition, at 120ms when motion is allowed. Existing visible keyboard focus remains intact.
- Memo mobile month summary inherits its existing 44px base target rather than overriding it to 32px. Reader/controller/time mapping are untouched.
- Root minimum width is bounded by viewport width. This fixes a demonstrated 200% text enlargement overflow on 375px, where the old 20rem minimum expanded to 640px.

## Fixture and capture method

Used existing `prepareMemoFixture(undefined, { enabled: false })` orchestration to create contained ignored configuration, and selected tracked `content/` through the wrapper. Owner configuration and content were not mutated. All Node/browser execution used `./preview.sh render` and pinned Playwright Chromium; screenshot servers used container-local port 4333 and terminated their own process.

Before product edits, built the sample fixture and captured baseline. Screenshot paths are ignored:

- `apps/site/artifacts/design-refinement/before/`
- `apps/site/artifacts/design-refinement/after/`

Each stage contains `desktop-{home,pages,about,long,mixed}.png`, `mobile-{home,pages,about,long,mixed}.png`, `desktop-cat.png` and `metrics.json`. Final stage also has `desktop-firefly-{dark,white}-directory.png` and `states.json`. Existing initial assessment artifacts were preserved separately.

Initial touch full-page screenshots were replaced before the refined build: the pinned Chromium full-page operation can reset touch ownership. Final baseline and post mobile captures use viewport screenshots and explicitly assert the coarse/no-hover predicate before and after every capture. Desktop full-page captures remain valid. Temporary capture scripts live alongside ignored artifacts.

## Measurements

| Surface | Baseline | Final |
| --- | --- | --- |
| Default standalone paragraph at 1440px | 1150px | 760px |
| Default `cat` paragraph at 1440px | 1152px | 760px |
| Mobile standalone paragraph at 375px | 343px | 343px |
| Canonical mobile directory anchor | 21px | 44px |
| Mobile outline anchor | 26.39px | 44px |

All sampled route document scroll widths equal their viewport widths. Coarse input target changes were checked at 375px portrait, 768px tablet and 812px landscape with actual native link navigation. Text enlargement and reduced motion were checked in all four maintained site projects. Measured dark/white hover, press, keyboard focus and placeholder text contrast passed 4.5:1; minimum changed-state text contrast was 5.51:1 and visible focus contrast was 5.29:1. These are sampled computed checks, not an exhaustive accessibility certification.

## Actual commands and outcomes

Common fixture selection for site commands:

```sh
FIREFLY_CONTENT_ROOT="$PWD/content" \
FIREFLY_SITE_CONFIG_PATH=.firefly/memos/browser-fixture/config/site.toml \
./preview.sh render <command>
```

- `npm --prefix apps/site run build`: baseline and final builds passed. Final Astro check: 140 files, zero errors/warnings/hints; static-output tests: 18 passed.
- `npm --prefix apps/site run test:e2e -- tests/terminal-refinement.spec.ts tests/site.spec.ts tests/terminal.spec.ts tests/document-navigator.spec.ts tests/document-navigator-mobile.spec.ts`: initial coherent implementation yielded 123 passed, 38 intentionally skipped, three new acceptance failures. Existing suite cases passed in that initial run.
- Investigated the three failures rather than weakening acceptance: stream root had no theme attribute; root min-width caused enlarged-text mobile overflow. Corrected both, rebuilt, and reran `tests/terminal-refinement.spec.ts`: 11 passed, five intentional project skips. Initial failure contexts/screenshots/traces are retained at `apps/site/artifacts/design-refinement/failures-first/`.
- `npm run prepare:test:memos` followed by `npm run test:e2e:memos`, with tracked fixture selection: 17 passed, seven intentional static/project skips. Covers 44px month disclosure/link navigation and oldest-entry clearance after End alongside maintained reader regressions.
- Updated existing wide-stream layout assertion: article/header/toolbar/wide frame still align with both command-row edges; prose stays left aligned and narrower. The previous right-edge paragraph assertion was incompatible with approved readable measure. All existing code/table/scroll-direction assertions remain.
- `npm --prefix apps/site run test:e2e -- tests/terminal.spec.ts --grep 'inline wide content'`: one passed against the final artifact, including native table/code scroll, 1920px full-width frames, 768px sticky toolbar and enlarged layout.
- `git diff --check`: passed.

The dedicated screenshot and state scripts ran against the final immutable fixture; geometry and contrast reports are retained in the final stage.

## Review and remaining checks

Viewed desktop about, mobile about and mobile directory comparisons: text now has a clear reading column, directory rows have usable spacing, and Terminal identity remains familiar. This is subjective agent observation and not evidence of award qualification.

At implementation handoff, the independent checker owned source/test follow-up and main owned broad verification and final visual review. Subsequently completed gates are recorded in `final-validation.md`. No commit, archive or production deployment occurred.

Physical-device engines, assistive technology and owner subjective approval remain residual review limits; touch emulation is not certification.
