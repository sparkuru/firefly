# Owner Refinement Independent Quality Review

## Scope and Result

Reviewed the complete task diff from HEAD, including first-candidate styling
and the owner's approved refinement, against the current PRD/design/execution
plan, both curated manifests and owning site/Memo/project contracts.

The final reader matches the refinement: left desktop history plus entry stream,
horizontal narrow history, absent global header/navigation/hero, and flat detail
date/authored title/full body/divider/exactly one bottom return/footer. Accessible
titles, skip navigation, canonical routes, static fallbacks and content/access
boundaries remain intact. `memo-shell.ts` is retired and no source references to
its removed header/intro enhancement remain.

No unresolved product-code finding remains in this reviewed scope. The main
session owns the broader repository gate, normal packaging, actual-corpus
reading/preview restoration and owner acceptance. This review performs no
commit, archive, push or deployment.

## Findings Fixed

### Month activation could perform two alignments

The controller settled a valid month link and then allowed its native anchor
default to scroll again. A later scroll could release explicit seek ownership
and select a different center entry, especially when activating the current
hash. The original failure and subsequent intermittent passes were not accepted
as evidence of resolution.

In `memo-timeline.ts`, recognized unmodified same-tab month links now prevent
the duplicate default alignment. A changed fragment adds exactly one history
entry; the current fragment adds none. The controller performs one immediate
seek. Static/no-JS anchors, modified clicks, external/body links, target/download
behavior and public URLs remain native. Existing month tests now assert exact
history growth and unchanged same-hash history without removing retention checks.

### Earlier native key-scroll motion outlived a later seek

Repeated focused testing after the anchor fix exposed another real ordering
edge. The earlier ArrowDown scroll animation still moved the viewport by 1–8px
after a subsequent instant month alignment. Fixed two-frame ownership release
could then classify those finishing frames as fresh browsing.

`settle` now requires quiet alignment frames and re-aligns if earlier motion
continues while settling. New browsing contact can still arm takeover, and
actual new viewport movement releases the lock. Existing non-scrolling taps,
selection-compatible body interaction, modified keys, observer/geometry events,
feedback expiry, 1px wheel, keyboard, touch and viewport-only scroll assertions
remain intact. No timeout or retention assertion was relaxed.

### BFCache harness used a browser that disables caching

After removing the implementer's duplicate trace startup, the existing cached
return test reached its sentinel assertion but still loaded a fresh document.
Chromium's `Page.backForwardCacheNotUsed` diagnostic reported
`BackForwardCacheDisabledForDelegate` and `BrowsingInstanceNotSwapped` for the
default headless-shell executable. Local Playwright source confirms its default
headless executable differs from the bundled `channel: 'chromium'` executable.

Only the BFCache scenario now uses full bundled Chromium and removes the default
`--disable-back-forward-cache` argument. Its dedicated test fixture disables
tracing instrumentation; explicit failure screenshots remain. The original
document sentinel, actual `pageshow.persisted === true`, retained older URL hash,
clicked short-entry identity and consumed/preserved history state assertions are
unchanged and pass on both desktop and touch-enabled narrow viewports.

The main session synchronized these justified mechanisms into the owning Memo
contract. This reviewer did not overwrite shared specs or mainline.

## Verification

All content materialization, fixture preparation and checks were serial.
After the final controller correction, the complete public/empty/single fixture
build succeeded before authoritative browser testing. No pure-content suite was
repeated for these controller/test-only corrections.

| Reviewer check | Final outcome |
| --- | --- |
| `./preview.sh render npm run prepare:test:memos` | Complete public/empty/single fixture build passed |
| Focused seek/BFCache/month-history scenarios, both interactive projects, three repetitions | 18 passed, 0 failures |
| `./preview.sh render npm --prefix apps/site run check` | 0 errors, 0 warnings, 9 existing hints across 149 files |
| `./preview.sh render npm run test:e2e:memos` | 37 passed, 15 intentional project-specific skips |
| `git diff --check` | Passed |
| Task context validation | Both 12-entry manifests passed |
| Scoped record privacy and manual final diff review | No private inputs/endpoints/credentials introduced |

No independent lint command is declared for the site; Astro checking and diff
whitespace validation are the applicable maintained static gates.

| Final browser project | Passed | Intentional skips |
| --- | --- | --- |
| Desktop interactive | 12 | 1 mobile touch scenario |
| Desktop static | 6 | 7 enhancements/gestures |
| Mobile interactive | 13 | 0 |
| Mobile static | 6 | 7 enhancements/gestures |

Passing cases cover clipped first/last entries and center-selected full entries,
nearest gaps, sustained long content, explicit-seek ownership, pointer/touch/
keyboard/native browsing, equal occupied-month mapping, orientation, details and
Back, genuine cached Back with an older hash, null/other-key state preservation,
same-hash month activation, empty/single, controller failure, no-JS oldest/month
clearance, tablet/short landscape, 200% text, local overflow and reduced motion.
Unchanged light tokens retain the independently calculated contrast ratios in
`quality-review.md`; normal text, links and focus remain readable.

## Evidence and Limits

Final stdout: `/tmp/memos-owner-review-matrix-final.log`,
`/tmp/memos-owner-review-focused-stable.log`,
`/tmp/memos-owner-review-typecheck-final.log`, and
`/tmp/memos-owner-review-fixtures-final.log`.

Original clean failures remain under
`/tmp/memos-refinement-clean-matrix-failures/`; this review also preserved the
initial output at `/tmp/memos-owner-review-before/` and the remaining
post-anchor failure output at `/tmp/memos-owner-review-after-anchor/`.
Residual native-motion ordering is recorded in
`/tmp/memos-owner-review-scroll-diagnostic.log`; headless-shell cache diagnostics
are in `/tmp/memos-owner-review-bfcache-diagnostic.log`.
Temporary event logging/CDP diagnostics were removed from maintained tests.

Final synthetic captures were copied to `/tmp/memos-owner-review-final-browser/`
before the main session's subsequent gate could replace ignored runner output.
Inspected desktop feed, mobile reading-center feedback and the minimal detail's
one bottom return/divider/footer. Screenshots are diagnostic evidence, not an
automatically accepted baseline. Physical devices, assistive technology,
subjective feel and real selected-corpus reading remain main/owner review.

## Final Source Fingerprints

```text
814d594cf0380c0397f2b464d9e906e6dd1d639504c018b79b968f5707a0d43a  apps/site/src/layouts/MemoLayout.astro
f710c82e16db2e1ae05690732694336704e4eefc1e1d8f83cbcd7de58f5111a0  apps/site/src/components/MemoDocument.astro
94459bcc2199feec06488e0ea686e121fa06fcd9a4b711ab1afdbccdb67fae17  apps/site/src/components/MemoTimeline.astro
0a6a310a912af06355ddcadf17fbaa749bbe4da5b76257f839f947ea1ba6942f  apps/site/src/components/MemoEntry.astro
c7eeccd08e54fc6e833620fa8703dfb3db82e58cb0e0a6551fd7c04cca84caa2  apps/site/src/styles/memo.css
ec166dc703cfbf07ee27c7a1b1c42f2fbe84cbdc78c7f9b4b044dad07d3d9ab1  apps/site/src/scripts/memo-timeline.ts
11536cf4adeda8a685fb798f528be261aac67e40946b9e427ff32dcbd284801c  apps/site/tests/memos.spec.ts
```

`apps/site/src/scripts/memo-shell.ts` is absent. All review commands have
completed; the main session has exclusive ownership of subsequent broad gates.
