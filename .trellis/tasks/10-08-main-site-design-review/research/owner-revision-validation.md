# Owner visual-review revision validation

## Authorized result

The owner rejected the first candidate's fixed reading cap and requested a
first-index-visit hint plus visible Tab completion settlement. Default prose
and authored heading wrapping now follow the previous page/shell width. Other
task-owned typography, touch, state feedback, Memo disclosure and enlarged-text
containment improvements are retained. Lab designs and owner content/config
remain outside the change.

The hint is consumed only on successful desktop Terminal startup, uses guarded
origin-local persistence and retires on initial use/reload/return, including
Back/Forward cache restoration. Completion centers a fitting row/panel group;
oversized lists keep the prompt at the midpoint and scroll active candidates
locally while retaining input focus, draft and acceptance semantics.

## Focused evidence

`owner-revision-implementation.md` records the final fixture build: Astro 140
files with zero diagnostics, 18 static-output passes. The revised maintained
browser suite passed 20 checks with 20 intentional applicability skips. Its
tests exercise actual page-wide reading and viewport coordinates, first-visit
lifecycle, storage failure/mobile policy and selection/acceptance/key guards.

Targeted existing Terminal regressions passed, including one native popup
case that needed an automatic retry. That isolated popup case then passed all
three repetitions with retries disabled; initial failure evidence was retained
and no workaround or test weakening was introduced. Its cause is unestablished.

Main-session visual inspection of ignored synthetic fitting and oversized
captures confirms the prompt and active candidate are visible with the
established restrained Terminal appearance. Implementation measured fitting
group center within 3px of 450px at 1440×900; oversized prompt center at 175px
with panel bottom at most 333px at 1440×350 and zero horizontal page scroll.

## Final gate status

Independent full-scope review passed without requiring a source fix; see
`owner-revision-check.md`. Additional wrapper browser diagnostics covered
narrow fine-pointer desktop, fresh Tab after resize and denied storage writes.
The completed revised gate used:

```sh
FIREFLY_SITE_CONFIG_PATH=.firefly/memos/browser-fixture/config/site.toml ./preview.sh verify
```

It exited zero. Final browser results:

| Suite | Passed | Intentional skips |
| --- | ---: | ---: |
| Integrated Memo | 17 | 7 |
| Main site | 177 | 159 |
| NERV integration | 8 | 0 |
| Assembled publication | 6 | 0 |
| Total | 208 | 166 |

No browser failure, retry or flaky result occurred in this full gate. Package
checks, content/schema/presentation/publisher/static-output checks and retained
independent-runtime/plugin-access fixtures also passed. Lab tests are existing
integration coverage; lab designs remain unchanged. Earlier totals in
`final-validation.md` are historical first-candidate evidence.

`./preview.sh package` also exited zero. The configured normal publication
was restored and the local `firefly:runtime` image passed publication inventory,
routes, headers, 404, non-root and read-only probes. Eight changed application/
test/config source fingerprints were identical across the complete gate and
packaging.

The local preview was stopped at final readiness inspection. The main session
started it using the existing `./preview.sh start` configuration; no existing
container was stopped or reconfigured. `./preview.sh status` then passed.
Read-only local homepage/asset checks confirmed the restored original 82ch
legacy token, guarded first-visit hint key and completion settlement code are
actually served. The original token is not an effective fixed paragraph cap:
page-wide geometry is established by the maintained standalone/cat tests.

Wrapper logs and source checksums remain in owner-only temporary storage.
Synthetic completion screenshots remain ignored. The implementation, main
visual inspection and independent final inspection found no material further
change justified by complexity. Full-page/native desktop, touch and narrowed
fine-pointer desktop coverage remain scoped Chromium automation, not physical
device or assistive-technology certification.

## Remaining review boundary

On 2026-10-09 the owner accepted this revision and authorized its commit with
“可以提交”. A subsequent request to simplify inline cat article chrome keeps
the task active before final archival.
Physical-device engines and assistive technology have not been certified.
No commit, archive, production deployment or remote write has occurred.
