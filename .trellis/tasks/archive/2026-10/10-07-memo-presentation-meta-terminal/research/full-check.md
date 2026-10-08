# Full-Scope Memo Quality Review

The dispatched Trellis checker reviewed the approved PRD, design, execution
plan and curated check context on 2026-10-08. The native hook's saved output
was consulted; the oversized content-workspace contract was explicitly read
in all four sequential sections (2,144 lines). Current Memo document rules
supersede the retained independent-publisher descriptions. The package discovery
and frontend/Trellis Plus quality indexes were checked.

This review spans the complete task rather than the latest implementation
chunk: metadata/materialization, public projection and route reservation,
registered rendering, asset closure, timeline interaction, home discovery,
release/access compatibility, authoring/import/install and preserved history.
The focused migration/release reviews and independent actual-corpus audit are
separate evidence. Other agents' changes were preserved. No external sources,
originals, candidates, installed documents, publication pointers, SSH state or
production services were changed by this checker.

## Findings Fixed

1. Site Memo asset staging and public-reference validation rejected spaces,
   although the verified offline URL converter supported encoded spaces.
   `memo-source.mjs` and `memo-assets.mjs` now preserve contained NFC filenames
   with spaces; decoded separators, percent ambiguity, hidden segments,
   controls/format characters and unsafe Unicode remain rejected. Regression
   coverage checks exact bytes through staging and referenced-only publication,
   including encoded Unicode and space paths.
2. `memoPreview` counted elements/BR nodes but ignored text newlines inside
   highlighted code, allowing many short code lines to bypass the bounded
   preview. Its text projection now consumes the logical line budget across
   nested highlighting spans and leaves source HAST unchanged. Omitted media
   also marks the excerpt truncated, retaining the full-entry affordance.
   Balanced HTML, complete individual content and scoped references remain intact.
3. `rebaseBody` matched URL-shaped text with a regex over raw HTML. A synthetic
   reproduction produced four patches where only one actual image destination
   should change: comments, `data-src` and text inside `alt` were affected.
   Conversion now parses HTML attributes and uses exact source locations for
   actual `href`/`src` values, preserving labels/comments/quote styles and all
   other bytes. Unquoted/case-varied attributes, template content and escaped
   entity/query values have regression coverage. The already locked parse5
   7.3.0 is an explicit dependency of the existing publisher dependency provider;
   its lock update was offline and changed no resolved package version.

## Cross-Layer Review

- Memo metadata shares ordinary document policy while keeping titles/excerpts
  optional. The strict ordinary article requirements remain. Duplicate IDs
  include drafts; guest projection occurs before public details/time data.
- Optional/empty Memo roots generate a compact Pages aggregate; ordinary
  posts/pages indexes still exist. Private-only nested branches remain excluded.
  The home projection does not contain the full Memo stream or a Memo VFS root.
- Memo uses the shared sanitized build-time Markdown/X Core pipeline. Scoped
  preview identities and generated heading/footnote compatibility preserve the
  authored body and ordinary article diagnostics. Assets are discovered from
  parsed public DOM references and private-only/orphan assets stay absent.
- Equal occupied-month positions are independent of card height, count and
  elapsed gaps. The controller separates browsing/dragging/settling, uses
  natural page scroll, supports keyboard/touch and preserves responsive active
  identity. Static month/detail links remain available without the controller.
- Version 2 owns Memo as site content and gates comments only. Strict version-1
  recovery decoding/marker meaning and deletion floors remain. Mixed versions
  and contradictory markers fail. Legacy push entrypoints refuse before effects.
- Candidate validation and exclusive installation preserve origins, IDs,
  timestamps, retired histories, exact manifests, races and partial evidence.
  Website builds do not open the migration database or private correspondence.

## Verification Executed by This Checker

- `SAM_CONTENT_MODE=none ./sam node --experimental-strip-types --test
  apps/site/tests/memo-documents.test.mjs`: pass, 7 tests, repeated after the
  final asset safety patterns changed.
- `SAM_CONTENT_MODE=none ./sam node --test
  tooling/memo-documents/documents.test.mjs`: pass, 15 tests, including parsed
  HTML preservation and existing candidate/race/history behavior.
- `SAM_CONTENT_MODE=none ./sam npm --prefix tooling/publish-memos run check`:
  pass, TypeScript plus configured JavaScript syntax checks.
- `FIREFLY_CONTENT_ROOT="$PWD/content" ./preview.sh render npm --prefix
  apps/site run check`: pass, 136 files; zero errors, warnings or hints. The
  empty Memo loader and intentionally invalid diagram fixtures emitted their
  existing build-time diagnostics separately from the type-check result.
- The real final candidate was revalidated read-only after HTML parsing changed:
  exactly 269 entries, 211 assets, 33 changed bodies and the unchanged 258
  declared URL patches. No candidate regeneration or source replacement was
  needed. Exact operational paths/digests remain private.
- `git diff --check`: pass. Bounded task-record privacy signature scan found
  zero matches for private paths, mailbox/credential/key signatures. No debug
  logging, unsafe type suppression or body-copy fixture was introduced.

Initial unprivileged Docker execution could not access its socket. The same
focused command passed through the authorized narrow wrapper escalation; that
initial environment failure is not counted as successful validation. An early
synthetic stdin command had no input forwarding and was replaced by an explicit
Node expression; only the latter produced the reproduction evidence.

## Remaining Gates and Residuals

The concurrent first full verification stopped at a stale active-preview test
fixture before these final fixes. The release agent owns its repair and the
new full `./preview.sh verify` run. This record does not claim that rerun,
post-fix browser acceptance, installed-corpus rebuild, runtime packaging or
production checks passed. The main session owns final corpus/build/browser/
package verification and acceptance updates.

Small durable-spec drift was reported to the main session: the mobile spec's
old extra plugin link, a two-presentation count and the Trellis Plus dependency
direction. Owner-reserved README command guidance remains stale and was not
edited. Physical devices, assistive technology and subjective snapping/visual
density remain human residual review, not inferred from browser emulation.

No other concrete unresolved product defect was found in this full-scope
review. No commit, archive or deployment was performed.

## Full-Gate Follow-Up: Warm Empty-Collection Withdrawal

The subsequent full gate reached the exact static HTML inventory assertion and
found one unexpected synthetic Memo detail. Read-only diagnosis distinguished
the expected-route collector omission from a real stale-record defect:

- Both tracked and currently generated Memo sources contained zero Markdown.
- The built timeline/detail still contained the most recent single-entry fixture.
- The active `.astro/cache/data-store.json` retained that entry. The older
  `.astro/data-store.json` was not the active cache and did not contain it.
- Installed Astro 7.1.6 `glob` loader code returns immediately when an existing
  base has zero matching files, before deleting its untouched prior records.
  Its exported `LoaderContext`/`DataStore` types and content-layer code confirm
  `store.clear()` is the supported collection-specific clearing API.

`workspace-collection-loader.mjs` (with its typed declaration) wraps the existing glob loader for all
three document collections. It checks the generated tree for actual Markdown
and clears that collection's store before the empty glob load. It does not clear
the whole Astro/diagram cache, alter source files, change public policy or count
retained assets as documents. This prevents full withdrawal from republishing
cached Memo or ordinary articles.

The static expected-route collector separately derives Memo routes from current
staged YAML validated by `memoSchema`, excluding drafts/private records. Exact
actual-versus-expected equality remains; stale IDs are never accepted as input.

The integrated Memo/access suite passed 10/10. Its new actual warm-build test
first publishes one Memo and post, removes their sources and rebuilds without
`--force`; both detail routes disappear, timeline/posts show honest empty text
and compatibility HTML contains no retired fixture ID. A focused repeat with
an unreferenced source asset deliberately retained also passed. The asset stays
on disk while no public asset is emitted. No real corpus source was changed.

The main session should retain the root cause and reusable empty-store guard in
the content-workspace/Memo specs, including this no-force warm-cache regression
when considering a future Astro loader change.

The initial follow-up tracked build found two type errors because the site does
not install Node typings for a new TypeScript filesystem import. The helper was
placed at the established build-only MJS boundary with a typed `.d.mts` Loader
signature; no type suppression or browser Node-type dependency was added.
The corrected complete tracked `apps/site run build` passed: 137 files with
zero type errors/warnings/hints, successful static generation and all 18 exact
static-output tests. The zero-Memo source now emits zero Memo detail routes.
Existing empty-collection and intentionally invalid diagram build diagnostics
remain visible; they are not type-check warnings or hidden failures.

Product changes are stable and no checker-owned stage/build remains running.
The restarted full gate, post-fix browser run and actual-corpus/package acceptance
remain separate evidence with the main/release sessions.

## Full-Gate Follow-Up: Homepage Fixture Discovery

The third full gate passed Node/static and integrated Memo browser phases, then
six ordinary-home browser cases (and their retries) stopped at the same shared
fixture assertion: 16 recovery links expected, 17 received. Read-only inspection
of every failure context and the current built HTML confirmed 12 post links,
five Pages links, exactly one `/pages/memos/` aggregate and the unchanged 16
ordinary links when that aggregate is excluded. Those failures had not reached
their case-specific readiness/focus/history assertions. No homepage runtime or
module-interceptor defect was evidenced by them.

`mobile-homepage.spec.ts` now requires exactly 17 links and preserves the exact
12-post assertion. It additionally checks one canonical Memo Pages entry, its
visible title and accessible physical-path label, one compact introduction
template with its full-page link, and no Memo feed/Timeline script on home.
All existing startup, focus, history, key, module-interception, viewport, motion
and timeout assertions remain unchanged.

The checker initially confused the new link's accessible label with its visible
title in an added assertion. That focused run failed and 35 artifact files were
preserved privately before retrying. The correction requires `Memos` as visible
text and the exact physical path as `aria-label`; it changes no product behavior.
The original full-gate artifacts were separately preserved by the release agent.

The complete four-project `mobile-homepage.spec.ts` rerun through pinned
`preview.sh render` passed: 11 tests, 29 existing project-applicability skips,
zero failures, 12.1 seconds. It exercised the previously blocked behaviors,
including desktop/touch startup and recovery, missing/delayed modules, repeated
ready transitions, focus/history and mobile static reading. No test timeout was
increased or behavior assertion removed. Product sources are stable; the main/
release sessions own the next full verification attempt and remaining gates.

## Actual-Corpus Follow-Up: Exact Referenced Asset Inventory

The main session's installed-corpus build emitted the expected Memo routes and
211 attachments, but its static inventory test omitted Memo assets from the
expected non-HTML/CSS/JS set. The other 17 static checks passed; assembly had
not started. This was an incomplete corpus-aware test expectation, not missing
or unexpected public attachment bytes.

The bounded repair changes only `static-output.test.mjs`. It independently
walks parsed public HTML, including inert template contents, for actual local
Memo `href`/`src` destinations. It safely decodes each canonical path segment,
rejecting hidden/traversal/encoded-separator/percent ambiguity and unsafe Unicode.
Code text that resembles an attribute cannot become an asset reference. The
expected set derives from those references, never from the actual file list.

The test requires exact equality between that reference set and the emitted
Memo asset namespace, so missing or orphan/private-only files still fail. It
also checks every staged asset ancestor/file is contained and regular, and
compares each published file's byte length and SHA-256 with its staged source.
The existing complete miscellaneous inventory equality and diagram/other-asset
assertions remain intact.

`SAM_CONTENT_MODE=none ./sam node --test
apps/site/tests/static-output.test.mjs` passed all 18 tests against the already
built actual artifact. All 211 referenced assets matched their staged bytes;
both stage and emitted asset trees contained 211 files. `git diff --check`
passed. This checker did not rebuild, alter a stage, write sources, change
publication state or read private correspondence in this follow-up. The main
session owns subsequent assembly/actual acceptance and the required final
full-gate rerun after this test change.
