# Inline article nav, provenance footer and Share

## Implemented owner direction

The final owner steering supersedes the interim metadata/action-row candidate. The inline reader now has centered `Command | Collapse/Expand | Open | Share`, followed by its visible title/body and a footer with virtual Markdown path, total UTF-8 bytes, publication date and post license. Removed the duplicate permalink and persistent guidance paragraph. Nonrepeated metadata titles stay visible below the action bar; repeated authored titles appear once.

Repeated-title templates retain exactly one labeled title marker. A hidden non-heading label exists only in the inert template. Startup validation additionally checks the first authored heading's tag, ID and normalized text. After clone ID/reference scoping, the marker/tabindex and article label move to that validated visible heading, and the placeholder label is removed. No authored text or IDs are rewritten. Existing draft/caret return, collapse identity/focus, native Open destination policy, wide prose and mobile no-shell behavior remain intact.

The four controls keep 44px targets and centered placement on narrow fine-pointer desktop. Actual measurement found 2px width changes in initial feedback slots under border-box sizing: Share 64→Copied 66px and Collapse 82→Expand 80px. The final slots include border width; measured Share/Copied is 66px and Collapse/Expand is 82px across captured widths. Browser assertions also check feedback/collapse dimensions and sticky heading clearance.

## Source metadata model

- Capture `sourceBytes.length` from the existing race-checked original Buffer before frontmatter insertion or legacy heading normalization. Every collection gets a generated-only `.source-provenance.json` containing version, safe collection-relative identities, kind and byte count. This sidecar is promoted atomically with the candidate content stage and recreated on every materialization.
- Authored counts include original frontmatter, BOM, newline bytes and body. The synthesized `pages/memos.md` has explicit `generated` provenance and counts its generated virtual Markdown Buffer. An authored page with that identity follows the original Buffer rule.
- `readSourceProvenance` validates the generated snapshot/records and requires an exact own-key lookup; missing, malformed or unsafe data fails instead of substituting staged/HTML/body size. No long-lived cache can retain a stale count. The default root follows the existing site-command working directory; source-relative `import.meta.url` cannot locate it after Astro prerender bundling.
- `renderDocument` adds site-owned `sourceByteLength`/`sourceKind` siblings without changing X Core metadata, presentation adapters or Terminal runtime entries. Public inline footers receive only their own record; provenance inventories and filesystem paths do not enter publication.
- Post-only `license` accepts the six CC 4.0 IDs and defaults to `CC-BY-NC-4.0`. Fixed descriptors provide readable labels/official deed URLs. Pages/Memo do not inherit or accept the post field. The explicit blog-meta serialization allowlist preserves validated license overrides and the post default while retaining authored body bytes.

## Share behavior

Share uses the existing build-time canonical resolver, with a route/browser-origin fallback only when configured canonical data is absent. Its projection removes fragments; native Open independently retains navigator fragments where applicable. Existing schema already rejects authored canonical fragments.

Clipboard writes are guarded and report true success or failure through a short stable button label and live announcement. Missing/rejected Clipboard API leaves native Open available. Per-button feedback resets and cleanup preserve input draft/selection and focus. A same-button in-flight guard prevents overlapping clipboard writes. Deferred browser coverage proves rapid duplicate clicks, superseded timer cancellation and late resolution after `clear` cannot revive detached feedback or overwrite the cleared announcement.

## Owned changes

Source: `TerminalStreamDocument.astro`, `terminal.css`, `terminal-home.ts`, `materialize-content.mjs`, `source-provenance.mjs`/`.d.mts`, `render-document.ts`, `post-license.mjs`/`.d.mts`, `content-schema.mjs`, `blog-meta.mjs`.

Tests/registration: site `package.json`, new `source-provenance.test.mjs`, and maintained content-schema, materializer, blog-meta, positive/negative build, static-output and Terminal browser tests. The existing materializer tests were exercised rather than changed. Task/spec/mainline/Git-plan edits remain main-session owned.

## Validation

Commands use the established wrapper, tracked content and contained public configuration:

```sh
FIREFLY_CONTENT_ROOT="$PWD/content" \
FIREFLY_SITE_CONFIG_PATH=.firefly/memos/browser-fixture/config/site.toml \
./preview.sh render <command>
```

- Targeted Node/content/materializer/schema/CLI/positive-negative build checks: **43 passed**. Covers full UTF-8/BOM/CRLF counts, linked virtual identity, normalization divergence, fresh counts for unchanged staged Markdown, generated aggregate identity, promotion failure/withdrawal, invalid provenance, license default/overrides/refusal and body-preserving metadata writes.
- Final isolated positive-build variation: **1 passed**, proving physical Markdown filename differs from slug while footer byte count/path, explicit canonical/override license and originless page Share projection remain correct. Sidecar output stays outside publication.
- Final site build: **145 files, zero errors/warnings/hints; all 18 static-output checks passed**.
- Focused maintained inline/typing/clear/native-reader/browser set: **15 passed**. After the final border-width correction and pending-Share cleanup assertion, the affected seven-case subset passed again: **7 passed**. These are overlapping checks, not additive unique test totals.
- Final desktop/narrow synthetic capture command exited zero; `git diff --check` passed.

Initial failures were meaningful and retained: source-relative provenance lookup failed under relocated prerender bundles; typed descriptor indexing exposed Astro's generated `any` metadata seam; the first authored-heading selector matched multiple headings and triggered strict runtime recovery. The fixes use the site working directory, validated typed descriptor lookup and an exact first-child heading selector. The obsolete first browser run was stopped after diagnosis, and failure screenshots/context remain ignored under `inline-chrome/failures-first-browser/`. No guard or assertion was weakened to conceal these failures.

## Measured visual evidence

Ignored synthetic before/after captures live under `apps/site/artifacts/design-refinement/inline-chrome/`. `metrics.json` records geometry and final feedback slots. Main-session visual review can use top/body and footer viewports for repeated `markdown-template`, nonrepeated `about` and a synthetic post containing the default license.

| Fixture / viewport | Previous article-start → body | Final |
| --- | ---: | ---: |
| Repeated title / 1440px | 235.02px | 85px |
| Repeated title / 375px fine-pointer | 256.13px | 85px |
| Nonrepeated title / 1440px | 257.09px | 137.31px |
| Nonrepeated title / 375px fine-pointer | 265.73px | 124.84px |

Authored body geometry remains complete; repeated body heading count stays unchanged while the redundant metadata heading disappears. Captured page scroll width equals viewport width. Focus targets are visible headings, the four controls fit/navigate at 375px, and body fragment settlement clears sticky controls. Inspected the final short nonrepeated article, narrow repeated article and desktop post footer: the intended nav/body/footer hierarchy and license are readable with the existing Terminal appearance.

## Handoff and limits

Implementation and focused gates are ready for independent review. The checker may strengthen its planned provenance rollback/malformed fixtures after handoff. Main owns full verification, normal-publication packaging/preview restoration, final visual acceptance and Git/task completion. No commit, staging, archive, deployment, owner-input modification or remote write occurred. Synthetic Chromium and fine-pointer emulation are not physical-device/assistive-technology certification.
