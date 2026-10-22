# Memo reading actions — validation evidence

## Status

The 2026-10-21 implementation passed the full evidence below. On 2026-10-22,
the owner requested a bounded Read Full label/underline/Share-style refinement.
Its focused validation, independent review and normal preview refresh passed;
the earlier full-gate results describe the previous source snapshot. The owner
accepted the final result and explicitly authorized submission on 2026-10-22.
Local work commit, supported task archival and session bookkeeping are now
authorized. Remote push and deployment remain outside scope.

## Focused evidence

| Check | Result |
| --- | --- |
| Site lockfile install | Passed without lockfile change |
| Astro check | 0 errors, 0 warnings; informational hints only |
| Memo unit/build integration | 10 passed |
| Site content regression | 113 passed |
| Site build/static output | 18 passed after successful Astro build/check |
| Memo desktop/mobile, static/interactive browser matrix | 48 passed, 24 applicability skips, no retries |
| Existing standalone Share browser regression | 16 passed, 12 applicability skips |
| Diff whitespace | Passed |
| Independent full-scope Trellis review | No defects or fixes; separate Astro check passed with 0 errors/warnings |
| Complete `./preview.sh verify` | Exit 0: 417 Node passes; 265 browser passes, 201 applicability skips; both host runtime fixtures passed |
| Normal configured `./preview.sh package` | Exit 0: exact publication/inventory, route/header/404, non-root and read-only probes passed; disposable container/context cleaned |
| Original configured Memo sources | All 183 regular Markdown source files have identical aggregate hashes before/after packaging |
| Final reviewed source stability | All nine changed app/test source fingerprints stayed identical through integrated verification and packaging |
| Configured preview | `./preview.sh start` exited 0 and reported ready, serving the normal rebuilt publication |
| Task context validation | Both manifests passed with 13 real entries each |

The main session verified the Memo integration/build/browser summaries and
visually inspected desktop detail plus mobile feed/detail captures. Header
actions align right on wide screens and wrap below the date on mobile; feed
Share appears at the right of every entry's native detail-link row. Keyboard
focus is visible and controls remain readable.

## Acceptance coverage

- A1–A3: noncentral mouse hover, synchronized one-entry border/rail/date, no
  hover-induced scroll/history, stationary-pointer wheel and gutter/viewport
  leave, original viewport-center fallback, explicit seek/geometry retention,
  later deliberate mouse/browse takeover and native touch scrolling.
- A4: plain semantic timestamps, no timestamp click navigation, native detail
  access for all short/long entries in enhanced and JS-disabled output.
- A5–A8: exact canonical URLs, independent entry/action feedback, original byte
  provenance/deed, complete rendered prose/verse/list/code/Unicode COPY past the
  preview, selection/focus/scroll preservation, rejection/fallback, repeated
  pending requests, lifecycle retirement and hidden no-JS clipboard actions.
- A9: desktop/mobile static and interactive projects, narrow/landscape/200%
  text reflow, keyboard focus, 44px action height, reduced motion and existing
  standalone Share regression. The full integrated gate also passed, including
  ordinary Terminal/site, experiment and assembled-publication browsers.

## Investigated first-pass failures

- A new canonical fixture initially included a fragment, violating the existing
  strict schema. The fixture now supplies a valid fragment-free canonical URL.
- An initial plain Alpine wrapper run could not execute the existing Mermaid
  browser binary. Diagram-bearing checks use the required pinned render image.
- A component-level script interrupted the strict detail article/Return sibling
  contract. Action initialization now belongs to MemoLayout after the footer.
- A touch-only seek-retention test needed to establish a fresh explicit seek
  after its preceding genuine mouse movement began intentionally owning hover.
  Its actual no-scroll touch/retention assertion remains intact.
- A subsequent run had overall browser/protocol timeouts during high host load.
  Failure traces were retained. The final unchanged normal-concurrency run
  passed; despite its scratch log name, the attempted root npm worker flag was
  swallowed and the runner actually used the normal eight workers.
- Static output expected direct clipboard imports and six scripts. Reused Share
  now creates a shared module plus Memo action entry, yielding eight scripts.
  Assertions enumerate exact expected chunks and traverse local import closure,
  preserving ordinary-route isolation and proving Memo-only action loading.

Failure traces/screenshots and runner logs remain in temporary/ignored local
artifacts. No private content or operational configuration is retained here.

## Completion and review boundary

The package used an isolated task-owned image tag, verified its exact image ID
and removed that tag after the successful runtime checks. The normal running
preview and pre-existing runtime images were preserved. Full-gate and package
logs remain in an owner-only temporary directory, with 0600 log files.

Automatable acceptance A1–A9 is satisfied. Submit-ready classification is
`human-optional`: the requested incremental layout and mechanics have maintained
desktop/mobile/static/interactive coverage and screenshot inspection, with no
remaining concrete defect. Owner visual preference feedback remains welcome;
no additional generic smoke test is required. Commit/archive await owner
authorization, not another implementation-planning gate.

Physical devices, assistive technology and subjective preference remain human
review residuals; browser emulation does not certify those environments.

## Read Full refinement — 2026-10-22

The owner generally accepted the baseline and requested the exact underlined
label `Read Full`, removal of the arrow and Share's interaction visuals. The
native anchor now reuses `memo-action`; a scoped underline/transition rule
preserves the underline while removing the old anchor-only timing. Its href,
keyboard navigation and static availability are unchanged.

- Site build/type check passed, including all 18 static-output assertions.
- The changed 20-entry Memo build integration assertion passed (1/1).
- Focused desktop/mobile static/interactive browser scenarios passed 8/8,
  without retries: exact label/no arrow, href, underline, 44px height, hover,
  pressed opacity, focus and Share visual parity.
- The first browser test's simulated anchor drag stalled in no-JS projects;
  replacing that gesture with release/native navigation/Back verifies the actual
  link interaction. Failure artifacts were retained temporarily; assertions
  and timeouts were not weakened.
- Independent incremental review found no defects and required no fixes.
- The normal configured `./preview.sh build` and preview startup passed.
  Served Memo HTML exactly matches the rebuilt artifact's SHA-256. All four
  refinement source/test fingerprints stayed fixed through this refresh.
- Diff whitespace and task-context checks passed. No full verify/package rerun
  was needed for this bounded label/style change after the focused gates passed.

The main session inspected the mobile feed capture. Current preview contains the
underlined Read Full links without arrows. Commit/archive remain owner-directed.

## License action refinement — 2026-10-22

The owner directly requested Share's interaction visuals and timing for the
Memo CC BY-NC 4.0 link, without the license underline. Native deed navigation
and the Read Full underline remain intact. Implementation, focused checks,
independent review and normal preview refresh are complete for this follow-up.

The license anchor uses `memo-license memo-action` with scoped no-underline and
no-transition styling. Existing metadata scenarios passed 4/4 across desktop/
mobile, static/enhanced projects without retries or skips. Coverage includes
correct deed href/rel, native navigation and Back against a controlled response
without external traffic, 44px height, hover/press/focus parity, transition
timing and 200% text at 375/667px. Earlier Read Full underline checks still pass.
Site build/type check and all 18 static assertions passed. Independent review
found no defects and needed no changes or redundant test runs.

Normal configured publication build and preview readiness passed. The served
Memo detail exactly matches its rebuilt HTML artifact, and all three refined
source/test fingerprints stayed unchanged during refresh. The main session
inspected the mobile detail screenshot. This scoped style change did not require
another full verify/package run. No commit, archive or deployment occurred.

## Owner acceptance and closeout

On 2026-10-22 the owner accepted the final preview with "可以提交". All requested
R1–R4 / A1–A9 behavior and both visual refinements are complete. Independent
reviews and applicable automated checks passed; final source fingerprints
remain identical to the reviewed snapshot. Subjective preference acceptance is
now satisfied; physical-device/assistive-technology feedback remains optional.
The authorized Git sequence is one coherent work commit, then the attributed
task archive commit, then a separate developer-journal commit. No push or
deployment accompanies this closeout.
