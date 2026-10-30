# Firefly display blocks: acceptance evidence

## State

Implementation and automated acceptance completed on 2026-10-30. The owner
authorized the design, implementation, and then submission ("提交") plus a
local demonstration project under `content`. The approved closeout is the
work commit, supported task archival and session journal. No remote push or
production deployment is authorized. Additional demo evidence follows below.

## Delivered behavior

- A site-owned build plugin validates YAML fences and renders `image`, `link`,
  `audio`, `video`, and `composition`. No new package dependency was added.
- Composition uses scoped CSS floats for `image-left` and `image-right`, with
  full-width prose below the image; `image-top` is centered above the prose.
  Narrow viewports stack image then prose. Blocks produce readable static HTML.
- Nested Markdown reaches X Core summary, references, outline and identities,
  document navigation/search, homepage search and Terminal inline reading.
  Raw author HTML remains sanitized before trusted generated media is inserted.
- Referenced guest-visible local media is atomically staged and published by
  content hash. Private/draft/ignored/unreferenced media stays unpublished.
  Warm builds replace changed media and withdraw removed references.
- Nginx permits external HTTP(S) images/media on site reading routes. HTTP
  probes verify retained API/lab/independent-Memo policy boundaries. The local
  publication server supplies media MIME types, HEAD and single GET ranges.
- `docs/firefly-blocks.md` documents authoring and portability. Tracked sample
  pages cover all five types, all layouts and both presentations.

## Automated verification

All Node/build/browser commands used repository Docker wrappers. Browser
execution used the pinned renderer with Chromium and Firefox. No host Node
toolchain or live external media service was needed.

| Check | Actual result |
| --- | --- |
| `./preview.sh verify` | Exit 0; package checks/tests/builds, site, Memo, NERV, publication and real host runtime fixtures passed. Log: `/tmp/firefly-final-verify.log`. |
| Site content suite within the full gate | 130 passed, including 8 parser tests, 9 asset tests and the public/private positive build. |
| Site check within the full gate | 0 errors, 0 warnings, 12 pre-existing deprecation hints. |
| Static output inventory within the full gate | 18 passed. |
| Main site browser matrix | 255 passed, 205 applicability skips, 0 failures. |
| Memo browser matrix | 48 passed, 24 applicability skips, 0 failures. |
| NERV / assembled publication browser matrices | 8 / 6 passed respectively. |
| Assembler unit suite | 27 passed, including six new HTTP media/range tests; TypeScript check passed. |
| Focused display browser matrix | 20 passed, 12 applicability skips. |
| Focused media browser matrix | 32 passed, 16 applicability skips. Log: `/tmp/firefly-media-browser.log`. |
| Final media-only cache regression | Exit 0, 1 passed after the last source fix. Log: `/tmp/firefly-media-cache-regression.log`. |
| Final tracked sample rebuild | Exit 0 and 18 static checks passed after the final cache regression. Log: `/tmp/firefly-tracked-build-final.log`. |
| Runtime shell / Nginx checks | Bash syntax, ShellCheck, shfmt, Compose configuration and actual Nginx configuration/CSP HTTP probes passed. Full gate repeated runtime probes successfully. |
| Task context / diff | Both JSONL manifests validate with 7 entries each; `git diff --check` passes. |

The full gate's content phase started before the final media-cache regression
was added. That regression and the tracked sample build were run separately
after the fix; they are the final-source evidence for media-only invalidation.
The earlier full-gate attempt had six mobile homepage failures because adding
the sample page changed an expected fixture entry count from 17 to 18. The
count was corrected, and the complete gate above then passed.

Applicability skips reflect existing runtime boundaries: no-JS playback/search
interaction, desktop-only navigation, and touch-home versus Terminal behavior.
Firefox mobile is narrow viewport coverage without touch emulation. Skips are
not counted as passes or evidence of physical-device behavior.

## Acceptance mapping

| PRD criterion | Evidence and result |
| --- | --- |
| AC1 | Parser tests, real Astro build and browser markup checks cover five types; ordinary code, Mermaid and full static publication gates pass. |
| AC2 | Sources remain ordinary Markdown fences; author guide explains literal-code fallback and sharing resource directories. No MDX/component import or source rewrite is required. |
| AC3 | Browser line rectangles verify left/right wrapping and full-width recovery beneath the image; top image is centered; following siblings are outside the float. |
| AC4 | Both presentations stack all layouts at 375px without document horizontal overflow, with JS enabled and disabled in both engines. |
| AC5 | GIF fixture decodes in both engines; alt/caption and nested paragraphs/emphasis/links retain semantics. |
| AC6 | URL-only link rendering is tested without metadata fetching; browser samples abort external requests and retain visible links. |
| AC7 | Real synthetic MP3/MP4 bytes decode and advance native playback; aborted media retains resource links and adjacent prose. |
| AC8 | Both engines render static/no-JS content; delayed and failed images plus rapid wheel scrolling keep prose visible. Diagnostic screenshots were inspected. |
| AC9 | Output checks preserve existing script inventories; the plugin emits static HAST/CSS without a new client YAML/Markdown parser or component runtime. |
| AC10 | Geometry runs both content themes in both presentations; nested reading/search units and protected native links are asserted. Existing media protection remains intact. |
| AC11 | Real publication tests verify hashed bytes, exact public/private reference closure, warm updates/withdrawal, homepage templates and original Markdown bytes. Terminal `cat`, touch-home search, summary/outline/reference tests pass. |
| AC12 | Parser tests exercise invalid YAML, duplicate keys, aliases, unsafe URLs, missing/unknown fields and nested blocks with virtual-document/fence diagnostics. Browser resource failures remain readable. |
| AC13 | Guide and two tracked sample pages cover the public vocabulary, layouts, fallback and resource portability. Small owned media fixtures cover playback and GIF decoding. |

## Review findings resolved

- A build-done hook imported `readdir` after Vite closed its runner. The import
  is now static; an isolated actual Astro build verifies publication succeeds.
- Replacing media bytes without editing Markdown could leave cached old hashes.
  Post/page loader digests now include the guest media manifest. A warm-build
  regression checks new hashes/bytes in canonical routes and homepage templates,
  absence of old hashes, and unchanged authored Markdown.
- Firefox no-JS image decoding checks now poll actual image state instead of
  waiting on a browser-dependent `decode()` promise. Layout assertions remain.
- Final independent review reported no unresolved concrete production defect.

## Limits and submission review

The approved first version preserves original image/media bytes: it does not
resize, transcode, fetch external metadata, embed platform players or add an
editor. Lazy loading and known dimensions do not eliminate the decode/download
cost of oversized images. HTTPS browsers can still block mixed HTTP media.

Review classification: **human-optional** for subjective appearance preference.
Relevant static, interaction, media, viewport, engine and runtime-policy checks
are automated and passing; no extra generic smoke or physical-device claim is
needed. Optional screenshots live under the ignored package test-results tree,
for example:

`apps/site/test-results/firefly-media-rapid-scroll-0396a--images-are-delayed-or-fail-chromium-mobile-static/failed-image-readable.png`

No third-party implementation or media was copied. New MP3/MP4/GIF fixtures are
small generated test resources. Existing NERV/MAJO notice gaps remain recorded
in `third_party/index.md`; this task makes no distribution or license clearance
claim for them. The owner subsequently approved the commit plan below and
requested the bounded local demo addition.

## Owner-requested demonstration and submission

The owner authorized submission and a test project under `content`. Added
`content/posts/firefly-playground/index.md` and six sibling media files: three
original geometric PNG illustrations, an animated GIF, a four-second MP4 test
pattern and a three-second low-volume synthetic MP3 tone. No third-party media
was downloaded. The Chinese prose demonstrates all three composition layouts,
standalone animation, audio/video, a URL card, and the corresponding source
syntax. The guide links the complete local example.

The initial demo under `pages/` exposed an incorrect assumed nested URL during
the ad hoc browser check (404). Existing canonical pages intentionally flatten
to `/pages/<slug>/`. The self-contained demo was moved to the existing nested
post convention without changing product routing. Its final route is
`/posts/firefly-playground/showcase/`; the native parent directory also resolves.

Final demo checks, all exit 0:

- `FIREFLY_CONTENT_ROOT="$PWD/content" ./preview.sh build`: all publication
  stages passed, including 18 static-output checks; no unresolved local-link
  warnings. Log: `/tmp/firefly-demo-build-final.log`.
- Ad hoc renderer-wrapped Playwright review: Chromium/Firefox × 1440px/375px
  × JS/no-JS, eight passing contexts. Verified all images decode, left/right
  wrap and full-width recovery, mobile stacking, no overflow, guest hashed
  media URLs, MIME/ranges, actual interactive audio/video playback and URL card.
  Log: `/tmp/firefly-demo-review-final.log`.
- Updated the existing homepage fixture counts to 19 public documents,
  including 13 posts. Focused static/interactive mobile regression: seven
  passed, 13 applicability skips, zero failures.
  Log: `/tmp/firefly-demo-mobile-regression.log`.
- Sixteen viewport screenshots were captured; desktop Chromium wrapping and
  narrow Firefox no-JS text were visually inspected. Preserved copies are in
  `/tmp/firefly-demo-evidence/`, including
  `chromium-1440-interactive-composition.png` and
  `firefox-375-static-composition.png`.
- `FIREFLY_CONTENT_ROOT="$PWD/content" ./preview.sh start` reports ready.
  The served demo HTML matches the assembled artifact byte-for-byte. The
  background local preview remains running for owner inspection; access from
  another physical device is unverified.

This is a content-only follow-up to the passing complete gate above; focused
demo/fixture checks cover its changed resources, route and counts. Commit,
archive and journal follow the already approved `commit-plan.md` batch.

## Local closeout

Work commit: `cfad1fd` (`feat(content): add Firefly display blocks`). The task
is completed and archived through the supported `--no-commit` route with
`--skip-branch-validation` because this task was never PR-backed. Archive and
journal are separate bookkeeping commits after the work commit. The approved
local preview remains running. No push or production deployment occurred.

## Owner-requested content cleanup

The owner requested direct cleanup without a new task. The archived PRD now
retains generic layout requirements and neutral examples, with external-article
identifiers, narrative excerpts and recording anecdotes removed. The author
guide uses geometric-illustration and synthetic-media examples. The demo is now
an independently written Chinese layout laboratory rather than a narrative.
No source excerpts or identifying details are reproduced in this record.

The six original local media files retain their exact checksums. Source-marker
searches across the task archives, author guide and demo returned no matches.
The tracked publication rebuild passed, including 18 static-output checks;
eight Chromium/Firefox desktop/narrow JS/no-JS contexts passed layout, decoding,
media delivery/playback and overflow checks. The running preview's response
matches the rebuilt artifact. Logs: `/tmp/firefly-reference-cleanup-build.log`
and `/tmp/firefly-reference-cleanup-browser.log`. Independent source/diff review
found no remaining issue within this cleanup scope.

The owner subsequently authorized sanitizing the historical snapshots in the
four local feature commits. Those commits are replayed with their original
identity/date fields and attribution; recorded work hashes are remapped.
Earlier history and unrelated refs are preserved. The task remains completed;
the owner handles any remote update. No new task or deployment is created.
