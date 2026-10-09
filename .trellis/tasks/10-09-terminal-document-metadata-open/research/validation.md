# Terminal metadata and new-tab verification

## Final behavior

Standalone Terminal metadata follows UTC date, exact original Markdown bytes,
actual post license and Share. Inline cat keeps its path followed by the same
date/bytes/license sequence. The build-time canonical URL helper is shared;
standalone Share is an independent progressive enhancement, including when the
navigator is disabled. Static metadata stays readable without an inert action.

Command document intent opens a synchronous blank tab, clears its opener and
navigates to the validated capability-aware document destination. Success leaves
only the original command record and next input; real blocking/throwing retains
a native new-tab retry. Inline Open is a native target-blank noopener anchor.
Original URL, cwd/history, transcript and drafts remain usable. Experiment
launch and popup-local navigator exit/history retain their existing behavior.

## Implementation checks

All commands use the maintained wrapper with tracked content and
`FIREFLY_SITE_CONFIG_PATH=.firefly/memos/browser-fixture/config/site.toml`.

```sh
FIREFLY_CONTENT_ROOT="$PWD/content" \
FIREFLY_SITE_CONFIG_PATH=.firefly/memos/browser-fixture/config/site.toml \
./preview.sh render npm --prefix apps/site run build
```

- Final build: 148 checked Astro files, zero errors/warnings, two existing hints
  from an ignored earlier capture script. Static-output tests: 18 passed.
- Exact external JavaScript asset inventory remains four. Standalone Share is
  emitted as a small inline module on its owning Terminal article surfaces;
  semantic/Memo/home enhancement boundaries remain tested.
- Isolated `content-build-positive.test.mjs`: 1 passed. An actual Terminal post
  covers original full UTF-8 bytes, CC-BY-SA-4.0, canonical override and
  `navigator = "none"`, alongside the retained presentation/body checks.
- Focused popup/Terminal/navigator suite: 12 passed. Includes normal/modified
  inline Open, canonical command popups, opener isolation, source cwd/history/
  draft, blocked retry, popup Back/Forward/`:q`, inline Share and same-tab launch.
- Standalone Share initial suite: 10 passed, six intentional static enhancement
  skips. After independent reflow coverage: 12 passed, eight applicable skips.
  Covers ordering/static output, exact canonical copy, actual rejection/
  unavailability, stable feedback/focus, concurrent and retired pending promises,
  independent startup, coarse targets and narrow enlarged text.

Initial development failures were corrected without weakening production
validation: a browser-test Node import type error was removed by keeping exact
source-byte assertions in Node/static tests; an authored canonical with a
fragment was rejected by the existing schema, so the isolated fixture now uses
a schema-valid override. Relevant failure logs are retained locally.

## Independent final review

```sh
FIREFLY_CONTENT_ROOT="$PWD/content" \
FIREFLY_SITE_CONFIG_PATH=.firefly/memos/browser-fixture/config/site.toml \
./preview.sh render npm --prefix apps/site run test:e2e -- \
  tests/terminal.spec.ts tests/terminal-refinement.spec.ts \
  tests/document-navigator.spec.ts tests/document-navigator-mobile.spec.ts \
  tests/site.spec.ts tests/document-sharing.spec.ts --retries=0
```

Final affected suite passed: 156 passes, 67 intentional applicability skips,
zero retries. Independent source review found no remaining issue. Reviewer
changed only the existing CSS group and new sharing tests: separator/Share stay
together on wrapping, preserve their spacing and pass 375px/200% text geometry.
Final build/static/browser checks followed the final spacing change.

Root and reviewer viewed final desktop, mobile and enlarged-text captures.
Feedback labels retain width, coarse Share targets are at least 44px, and there
is no horizontal overflow or metadata overlap. Synthetic screenshots/reports
stay untracked; they contain no owner-private authoring inputs.

## Local preview and scope

Thirteen app/helper/test paths changed; no X Core/runtime API, content schema,
dependencies, owner Markdown/configuration or lab design changed. Root has
started the normal configured `./preview.sh build`; final readiness and served
output checks are appended after completion. No remote push/deployment.

The first owner build exposed a new static-test assumption: it used the tracked
sample basename instead of the existing workflow document's physical identity.
Page rendering succeeded, but the static gate stopped publication promotion.
The reviewer changed only that assertion to read the original Buffer via the
actual virtual file mapping and use its date/validated authored license/default;
official license href checks were strengthened. Owner current-output static
checks passed 18/18, then the tracked build/static gate passed again. Seven app
source hashes remained identical, so the 156/67 browser evidence still applies;
the test-only change did not require another browser run. The failure log stays
private/local, and the root final owner build is being rerun normally.

Final owner `./preview.sh build` exited successfully and promoted the combined
publication. `./preview.sh status` reports ready without reconfiguration or a
restart. Read-only localhost checks verified exact served homepage, entry bundle
and the requested OpenWrt article against rebuilt bytes; date/bytes/license/
Share order and every inline Open target-blank/noopener attribute passed.
All thirteen reviewed app/helper/test fingerprints stayed unchanged through the
final owner build. No outstanding automated check or review blocker remains.
