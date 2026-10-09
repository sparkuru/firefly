# Navigation, file footer and licensing acceptance

## Owner direction and result

The owner accepted the previous revision and authorized commit `1a1fc31` on
2026-10-09, then explicitly supplied the next layout: centered four-action
navigation, title/body and a file-information footer with default post license.
The implementation follows that concrete design and keeps the minimal Terminal
language, previous page-wide reading, first-visit hint and completion behavior.

`Command | Collapse/Expand | Open | Share` is centered within the article width.
Duplicate metadata titles, duplicate permalink and persistent guidance are
removed. Visible authored reading focus, unique clone IDs, per-output collapse,
draft/caret return and native Open remain intact. The footer contains virtual
Markdown path, full source bytes, date and linked post license. Share copies
the canonical permanent URL with honest isolated feedback.

## Source correctness

Original UTF-8 Buffer size is captured before frontmatter/heading transformations
and atomically staged in generated-only provenance. Generated Memo aggregate
Markdown is distinguished and uses its own generated Buffer size. The renderer
receives only validated per-document size/kind siblings; no Core/runtime API,
authored source, host-path publication or whole-inventory projection changes.

Post `license` defaults to `CC-BY-NC-4.0`, accepts six fixed CC4 codes and is
preserved by explicit blog-meta normalization. Pages/Memo do not gain this
post-only policy. Label/link mapping uses the [official CC license families](https://creativecommons.org/cc-licenses/)
and [CC BY-NC 4.0 deed](https://creativecommons.org/licenses/by-nc/4.0/).

## Focused and independent verification

`inline-chrome-implementation.md` records 43 targeted content checks, final
isolated positive variation, Astro 145 files with zero diagnostics and 18
static-output passes. The maintained affected browser set passed 15 cases;
seven affected cases passed again after the final slot/Share cleanup edits.
These overlap and are not additive unique test totals.

`inline-chrome-check.md` records full-scope independent signoff. Five strengthened
Node checks passed, proving changed-candidate rollback, malformed provenance,
withdrawal, authored/generated semantics and physical filename/slug separation.
One added 375px/200%-text browser case passed with retries disabled. No reviewer
application-source change was needed; source/test/spec boundaries are coherent.

## Measured visual result

Repeated title article-start-to-body distance changed from 235.02px to 85px at
1440px, and from 256.13px to 85px at 375px fine-pointer. Nonrepeated titles remain
meaningful, with respective distances 257.09px to 137.31px and 265.73px to
124.84px. Feedback/control slots are measured stable: Share/Copied 66px and
Collapse/Expand 82px. All controls retain 44px targets and narrow sticky clearance.

Implementation, main-session and independent reviewer inspected synthetic
top/body and post-license-footer captures. The main session confirmed compact
navigation, one repeated title, retained wide content and legible footer with
the existing Terminal appearance. Captures/failure diagnostics stay ignored
under `apps/site/artifacts/design-refinement/inline-chrome/`.

## Complete gates and preview

The complete maintained gate exited zero:

```sh
FIREFLY_SITE_CONFIG_PATH=.firefly/memos/browser-fixture/config/site.toml ./preview.sh verify
./preview.sh package
```

| Browser suite | Passed | Intentional skips |
| --- | ---: | ---: |
| Integrated Memo | 17 | 7 |
| Main site | 182 | 159 |
| NERV | 8 | 0 |
| Assembled publication | 6 | 0 |
| Total | 213 | 166 |

No failure, flaky result or retry occurred. Content/schema/presentation/publisher,
static-output and retained independent-runtime/plugin-access checks also passed.
Normal-publication packaging restored configured owner output and the local
runtime passed publication/routes/headers/404/non-root/read-only probes.
All 19 changed app/test/config fingerprints stayed unchanged across these gates.

Existing local preview passed `./preview.sh status` without restart/reconfiguration.
Read-only homepage/same-origin script checks confirmed the four-action template,
source-byte footer, default license, Share controller and prior hint are served.
Logs/checksums remain owner-only temporary artifacts; no production deployment
or remote write occurred. Earlier 208-pass totals describe accepted `1a1fc31`.

## Submission boundary

The owner already authorized committing this task and specified the final
composition; no approval has been revoked by subsequent steering. Once the
required gates pass, submit-ready review is `human-optional`: the implemented
layout has direct owner direction and measured/visual evidence; remaining
preference review is optional. Reuse that authorization for the concrete
follow-up work/archive/journal batch. No remote push or production deployment
is included. Physical devices/other engines/assistive technology are not claimed
by the scoped Chromium evidence.
