# Completion stability verification

## Final implementation

The controller checks actual viewport bounds with a 0.5px geometry tolerance
before any page movement. Selection-only Tab/Arrow updates the existing list's
active/ARIA state, preserving its height cap, local scroll and form settlement
space. Obscured content keeps fitting-group centering and midpoint-limited
oversized recovery; local active-option scrolling remains independent.
No CSS, content, lab, dependencies or configuration changed.

## Tracked fixture build and focused browser

Commands use the maintained Docker wrapper and pinned browser runtime:

```sh
FIREFLY_CONTENT_ROOT="$PWD/content" \
FIREFLY_SITE_CONFIG_PATH=.firefly/memos/browser-fixture/config/site.toml \
./preview.sh render npm --prefix apps/site run build

FIREFLY_CONTENT_ROOT="$PWD/content" \
FIREFLY_SITE_CONFIG_PATH=.firefly/memos/browser-fixture/config/site.toml \
./preview.sh render npm --prefix apps/site run test:e2e -- \
  tests/terminal-refinement.spec.ts tests/terminal.spec.ts \
  --project=chromium-desktop-interactive \
  --grep 'completion|Tab centers|prompt owns unmodified Tab|IME composition|theme help'
```

- Build passed: 145 checked files, zero errors/warnings, 18 static-output tests.
  Two existing hints come from an ignored earlier capture script; no new hint
  is attributed to changed source.
- Final focused browser run: 9 passed. Under ordinary smooth-motion preference,
  an off-center prompt at 620px kept its viewport position and page scroll
  through first Tab, repeated Tab, Arrow selection and wrap-around; page
  `scrollBy` calls were zero.
- Settled page-end cycling retained the spacer and exact prompt/page geometry.
  Obscured fitting/oversized completion, local active visibility and viewport
  shrink recovery passed.
- The first run had one new shrink assertion fail at 247.15625px against a
  rounded 247px margin. The panel remained inside the 260px viewport; the
  margin assertion now uses the same 0.5px geometry tolerance. Initial failure
  artifacts are retained under ignored `artifacts/completion-stability/failures-first`.

## Independent review

```sh
FIREFLY_CONTENT_ROOT="$PWD/content" \
FIREFLY_SITE_CONFIG_PATH=.firefly/memos/browser-fixture/config/site.toml \
./preview.sh render npm --prefix apps/site run test:e2e -- \
  tests/terminal.spec.ts tests/terminal-refinement.spec.ts --retries=0
```

Reviewer made no source/test edits and found no remaining blocker. Broader
Terminal suite passed: 81 passes, 26 intentional applicability skips, no retries.
Desktop interactive: 70/1; desktop static: 3/9; mobile interactive: 4/8; mobile
static: 4/8 (passes/skips). Checks include selection/acceptance, unique/no-match,
modified/IME keys, history/clear, native Open, Share, touch and enlarged reading.
Final `git diff --check` passed.

## Local review publication

Root ran `./preview.sh build` successfully with the existing configured owner
content, then `./preview.sh status` reported ready without a configuration change
or service restart. A read-only localhost check confirmed the served homepage's
entry script exactly matches the rebuilt release. The reviewed controller/test
SHA-256 fingerprints remained unchanged through publication rebuilding.
No remote push or production deployment is included.
