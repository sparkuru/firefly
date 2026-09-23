# Implementation verification

Validation uses the pinned Playwright container through `render.sh` (which
delegates to `sam`). Fixture gates explicitly select the tracked `content/`
root. The configured owner blog is a separate visual-review input; no source
files or raw screenshots are committed.

## Completed automated evidence

- `check:m4`: all package checks and Astro diagnostics pass.
- `test:m4`: 179 tests pass before the final two policy regression cases;
  the final dedicated `test:diagrams` run passes all 14 cases, including native
  full-size SVG dimensions and no-JS entry into a wide flowchart.
- `build:m3` from an empty shared cache: successful, 18 static checks pass.
- `build:site` with warm cache: successful, 18 static checks pass.
- Cold and warm output both contain exactly the three referenced fixture SVGs;
  asset names and SHA-256 bytes match the earlier assembled publication.
- `package-runtime.sh` with a task-specific local image: build:m4 and assembly
  pass; manifest/filesystem/runtime inventories agree; routes, security/cache
  headers, 404 ownership, non-root/read-only operation and SVG HTTP/hash probes
  pass. The probe container is cleaned up; no remote publication occurs.
- Assembled publication Playwright: 6/6 pass, including desktop/mobile SVG
  loading, full-size URLs and native source disclosure.
- Full site matrix: 176 passed, 2 expected skips for no-JS command interaction;
  two static focus assertions initially failed after pointer disclosure interaction.
  Explicit keyboard modality corrected the test, then the complete static suite
  passed 24/24. All 178 applicable cases therefore have passing evidence.
- Post-cache-change content suite: 90/90 pass, including isolated builds.
- Astro development probe: both fixture SVGs return 200 with SVG content type,
  immutable cache headers and bytes identical to their cache files; an unknown
  asset key returns 404. The owned server is stopped and its dev lock removed.
- Shell syntax, ShellCheck, shfmt and diff-whitespace checks pass.
- All three task context manifests validate (seven entries in each manifest).

## Integration defects found and resolved

1. Astro's `unified()` ignores a nested syntax-highlighting option. Mermaid must
   be excluded from Shiki through top-level `markdown.syntaxHighlight`. A
   production-renderer regression now checks the real configuration path, exact
   retained source and normal highlighting for other languages.
2. Astro HTML and diagram caches originally had different cleanup roots. Astro
   now uses `.astro/cache/`, alongside `.astro/diagrams/`; clearing the complete
   `.astro/` directory makes the documented cold rebuild recover both together.
   Serialized pipeline and artifact policy versions invalidate changed output.
3. An automatic home Grid column expanded at 200% zoom. `minmax(0, 1fr)` plus a
   bounded home container fixes the track instead of clipping page overflow.
4. Table wrapping needed to cover both adapters without overriding nested
   preformatted code. Regression cases check real line wrapping and exact code
   whitespace.
5. Source filtering rejected inert URL and instruction labels. Only actual
   resource/callback/configuration features are rejected; network isolation and
   generated-SVG validation remain enforced.
6. Existing full-browser tests referenced a machine-local semantic article and
   an outdated case-sensitive route. They now use tracked synthetic content,
   retaining native fragment/history/focus coverage and nonzero scrolling.

7. A long real SVG also fitted its native URL into a tiny overview. Explicit
   validated intrinsic dimensions now make full-size URLs readable at natural
   scale; inline previews remain bounded. Regression coverage checks actual
   SVG bounds in a browser, including no-JS contexts. The first-node native
   fragment additionally prevents a mobile full-size link from opening on the
   blank left margin of a wide diagram; a fake marker in label text cannot
   change that link. Final v4 fresh/warm builds preserve all three asset hashes.
   Diagram browser checks pass 6 cases with 2 expected no-JS command skips;
   final assembled-publication checks pass 6/6.

## Final acceptance evidence

The final configured local source (135 posts, 8 pages) builds successfully with
18/18 static checks. The sampled long workflow article and Markdown page passed
the final Chromium review with zero recorded failures.

| Viewport | Reading width | Page width / scroll width | Action bar at top/middle/end |
| --- | ---: | --- | --- |
| 375 x 812 | 343px | 375 / 375 | visible / visible / visible |
| 768 x 1024 | 614.4px | 768 / 768 | visible / visible / visible |
| 1440 x 900 | 832px | 1440 / 1440 | visible / visible / visible |
| 1920 x 1080 | 832px | 1920 / 1920 | visible / visible / visible |

Every viewport passes draft text/selection restoration, same-node collapse and
expansion, stable headings, independent repeated outputs with unique IDs,
remaining-scroll direction cues and conditional row-label pinning. Additional
200% CSS zoom and 812 x 375 landscape checks pass. The long diagram loads locally;
its native full-size bounds match 1428 x 6331.8px and its first node is visible
on entry at every viewport. Source disclosure and standalone SVG navigation work.
The owner source contains one empty Mermaid fence: its parse failure correctly
produces source fallback and does not block other documents.

Reviewed screenshots include mobile opening, both table edges, collapsed output,
mobile and desktop full-size diagrams, tablet middle, wide desktop opening and
200% zoom. Text wrapping increases the phone article height (about 12,946px vs
10,353px baseline); explicit reachable actions solve navigation without truncating
content or reducing text size.

Final local evidence: `apps/site/test-results/cat-final-review/metrics.json` and
its PNG files. A temporary copy is retained alongside the baseline outside the
repository. These are intentionally ignored and may expire; this table and the
baseline reproduction instructions are the durable record.

Physical mobile soft keyboards remain an explicitly unverified device follow-up;
touch emulation and CSS zoom do not substitute for that evidence.
