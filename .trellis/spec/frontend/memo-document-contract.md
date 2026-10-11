# Memo Documents and Time-Scrubbing Reader

## 1. Scope / Trigger

Read before changing Memo authoring/import, its site collection, the registered
Memo presentation, timeline navigation or coordinated publication. The owner's
2026-10-07 decision supersedes independent Memo publication for new releases.
Legacy wire/receipt/runtime contracts remain recovery evidence, not an alternate
active publishing path. Comments and ordinary Terminal documents retain their
existing behavior.

## 2. Signatures

- `apps/site/src/lib/content-schema.mjs`: `memoSchema`, sharing document fields.
- `apps/site/scripts/memo-source.mjs`: `stageMemoSource`, aggregate source and
  contained asset staging, called by `materializeContentWorkspace`.
- `getCanonicalContent()` returns ordinary homepage `documents` and a separate
  guest-projected `memos` list. `projectCanonicalRoute` accepts `memos`.
- `presentations/memo`: framework-neutral `memoPresentation`, registered alongside
  Firefly and Semantic; native navigation has navigator ID `none`.
- `memoPreview(tree, id, route)` projects balanced sanitized preview HTML.
- `createMemoTimeIndex(records)`, `nearestMemo(index, position)` and
  `startMemoTimeline(root)` own the time mapping and progressive interaction.
- `tooling/memo-documents/cli.mjs` exposes `new`, `import`, `validate`, `install`.
  Its `installCandidate({ candidateRoot, workspaceRoot, apply: false })` is
  preflight-only; explicit apply installs absent files exclusively.

```sh
./sam npm run memos -- new
SAM_CONTENT_MODE=none ./sam npm run memos -- validate --candidate-root <candidate>
```

The selected external Memo directory is normally read-only in `sam`. Authoring
there requires the existing exact `SAM_MEMOS_SOURCE_ROOT` mount with
`SAM_MEMOS_SOURCE_WRITABLE=1`, `SAM_CONTENT_MODE=none`, and an explicit
`new --source-root <workspace>/memos`. Never make the entire blog writable.

## 3. Contracts

### Content and metadata

Memo lives in optional `memos/` under the same `FIREFLY_CONTENT_ROOT` workspace
as posts/pages. An absent directory means an empty collection; an existing
invalid/unreadable root fails. New-entry creation generates only `id`, precise
UTC `date`, and `draft: true`, with a random opaque ID and absent-only filename.
IDs match `^m_[A-Za-z0-9_-]{3,128}$`, independent of title or physical filename.

Optional `title`, `description`, `updated`, `tags`, `firefly.markers`, access
and content theme share document semantics. Memo's current supported layout and
presentation are `memo`, supplied by default; arbitrary adapters are not a
collection-level override. Ordinary post/page title and description stay strict.
Unknown fields, duplicates and invalid chronology fail. Untitled short entries
have no visible filename/title chrome; metadata still supplies an accessible
date-based title and body-derived description. Featured is not a pin policy.

Draft/private entries have no public details, cursor index or body projection.
`workspaceCollectionLoader(collection)` clears that scoped Astro content store
when the staged Markdown match set is empty, before delegating to `glob`.
Astro 7.1.6's empty-glob early return otherwise retains old records. Apply the
guard to posts/pages/Memo, excluding retained assets from the match decision.
Warm last-entry withdrawal must work without `--force` or manual cache removal.
Do not display repeated author identity. Keep one stream, newest first with
ASCII-ID ties; brief content is complete and long content has a balanced preview
(initial budget 500 Unicode code points / 12 logical lines) plus full detail.
The preview is not the stored body and cannot discard full reading access.

### Shared processing and routes

Use the site build-time Markdown, sanitation, highlighting and X Core path.
Memo-only pre-XCore HAST compatibility starts body headings at H2, repairs
skipped levels and represents generated footnote labels as accessible paragraphs
retaining their IDs/references. Preserve original Markdown, code and visible
label text. Ordinary article heading diagnostics remain strict.

Keep intentional prose/verse/dialogue line breaks and Unicode/U+200B. Scope
aggregate heading/footnote IDs and retain useful full-detail anchors. Resolve
owned assets from contained inputs; collect actual parsed DOM references,
not code strings resembling attributes. Decode/validate asset paths before
output, rejecting traversal/symlinks/collisions and missing referenced bytes.
Only publicly referenced assets enter output; private source/recovery files do
not. Static details contain full content without a browser Markdown parser.

Reserve `/pages/memos/`, `/pages/memos/<id>/`, `/pages/memos/assets/...` and
legacy `/memos/`, plus both access-snapshot filenames. The aggregate is a real
Pages timeline document. Home embeds its compact introduction/link template,
not all Memo entries or the feed; existing template/search inventory remains
exact. First-cut discovery uses Pages and normal `open`, with no Memo VFS root,
dedicated command, category tabs, full-body home search or social features.

Legacy `/memos/` supplies site-owned compatibility navigation, mapping recognized
public entry fragments only. Unknown/withdrawn fragments cannot read legacy
content. New releases use strict comments-only version-2 access snapshots; old
Memo config is validated deprecated input with no new visibility effect. Keep
strict version-1 recovery meaning; reject mixed versions/contradictory markers.
See [Plugin Public Access](./plugin-public-access-contract.md).

### Time and reading interaction

Occupied UTC+8 months receive equal track space regardless of elapsed gaps,
entry count or card height; empty intervals compress. Within-month positions
reflect actual instants. Show real dates, highlight the active month and soften
surrounding ticks without implying a proportional elapsed-time scale.

The owner-approved 2026-10-11 reader uses silver/white surfaces, light-gray
layering and a wide site-owned shell shared by the feed and complete details.
The owner's preview refinement removes global site header/identity/navigation
and the large intro. Above `48rem` the feed contains only a sticky left vertical
historical rail and a spacious readable stream. At `48rem` and below, CSS and
the controller agree on a sticky top horizontal rail and one content column.
Details are flat bounded date/content reading followed by a divider, exactly
one bottom Return to timeline link and the footer. Keep authored titles as
content when present and the accessible title for untitled entries; omit global
header/sidebar, top return and visible marker/tag/update chrome in details.
Do not render an unused historical control or repeat author identity per entry.
Natural document scrolling remains the reading model in every layout.

Absent global header means zero header clearance/fallback. Retire unused header
enhancement code rather than keeping the former compact-label observer.
Preserve the skip link, accessible page title, landmarks and native body links.
Time navigation supplies an ARIA-hidden visual date bubble alongside the cursor
for pointer/keyboard feedback; the existing slider value text remains the
accessible date. Clamp the bubble within the track in both orientations.
Discrete seeks/fragment returns briefly emphasize the selected entry, while
native browsing updates only quiet active state. Never animate per-frame seek
scrolls or delay body availability behind reveal effects. Actual links/controls
receive hover/focus/press feedback; whole bodies remain selectable rather than
appearing to be card-wide buttons. Reduced motion retains static selected/focus
states and removes decorative transitions.
The native month disclosure and month links retain at least 44px interactive
height in both layouts; do not shorten the mobile summary below its base target.
When control height changes, verify measured sticky-rail clearance and that
seeking the oldest entry positions it below the header/rail, including no-JS
month-anchor navigation. Supply static tail space for native oldest-entry
anchors as well as runtime-measured tail space; JS-disabled reading must not
depend on the controller to reveal the final entry. Account for expanded month
disclosure in native anchor clearance. Bound sticky historical-control height
to leave content visible in short landscape/zoomed viewports, with local control
overflow remaining operable and month links retaining their touch targets.
At 200% root text and short landscape dimensions, the narrow rail's cap must
retain at least one usable 54px track plus padding rather than collapsing to
padding-only height. Native anchor margins leave an absolute 96px content
allowance instead of a font-scaled remainder that can shrink below the rail.
Assert usable control area and the target's visible top/clearance, not only
partial viewport intersection or a click that auto-scrolls a clipped control.
Native browsing uses the center of the unobscured reading viewport, excluding
the sticky horizontal rail on narrow screens. Select the visible entry interval
containing that center; if the center is in a gap, choose the nearest visible
interval with deterministic feed-order ties. A long entry stays active while
containing the reading center. The clipped first visible entry is not inherently
the active reading entry. This is a reading-position proxy, not gaze detection.

The controller distinguishes browsing, dragging and settling ownership: pointer
seek positions changed targets, induced scroll cannot trigger feedback seeking.
Settling waits for alignment to become quiet: a native key-scroll animation
started before a seek must not be mistaken for fresh browsing when its final
frames arrive. Fresh browsing input can still take ownership on actual movement.
Explicit pointer/keyboard/month/hash/return seeks retain their selected entry
through feedback expiry, induced events and geometry/observer updates. Resume
central browse selection only after actual user scrolling; non-scrolling taps,
body selection or modified keys must not reassign that explicit target. Wheel,
touch, keyboard and scrollbar scrolling must still work. Preserve active ID
across orientation changes,
long entries and media geometry; reserve sufficient tail space for the oldest
entry to align below sticky controls.

Arrows select adjacent entries; Page Up/Down select occupied months; Home/End
select bounds. Click/touch, visible focus, slider date semantics, reduced motion
and non-chatty updates remain available. No-JS content includes native detail
links/month anchors. Empty/single corpora have honest inert controls. Detail,
Back and explicit return preserve timeline entry context; drag frames do not
push history or open details. Scope Memo CSS/runtime to owning routes.
For same-tab canonical detail navigation, return metadata may use replaceState
without changing the URL or history length. Respect modifiers, canceled clicks,
download/other-target links and unrelated history state. Validate the returned
ID against the current public index, consume stale metadata, and restore the
clicked entry ahead of a retained earlier month fragment on Back, including
BFCache restoration. Enhanced unmodified same-tab month activation supplies one
controller-owned alignment, adding a native-equivalent fragment history entry
only when the fragment changes; repeated same-fragment activation adds no
history. Avoid a second default anchor scroll overriding an explicit target.
Static anchors and modified/other-target activations remain native links.

### Bounded migration and retention

The offline historical import accounts for 180 short entries plus 89 corrected
notes/211 assets. This fixed migration count does not limit later authored Memo.
Reverify original database/export bodies and instants, final note manifests and
all applicable retained accepted/retired histories. Preserve note IDs/dates;
derive deterministic opaque short-entry IDs. Only parsed verified legacy URL
destinations may change; record patches and original/converted hashes privately.
Reverse and forward replay must prove untouched spans, code and body identity.

Candidate records must have exact count/origin split/title/meta and file closure.
Retired IDs, changed accepted instants, conflicting files, extra output and unsafe
media fail before apply. Source/body reads enforce 256 KiB / 128 KiB UTF-8 bounds.
Use owner-only candidate/report permissions. Apply takes an exclusive workspace
lock, rechecks candidate and target trees, checks each expected hash before its
exclusive atomic file commit, and preserves a private partial journal on failure.
Never overwrite racing user files or silently erase partial evidence. Inspect
interrupted operation/journals before clearing an exact stale owned lock.

Old publish/push entrypoints refuse with migration guidance before transport.
Retain recovery tools, exports, SQL, receipts and deletion floors. Local feature
work does not authorize remote asset fetching, SSH, deployment, commits or
archival. Real corpus data stays ignored and never becomes tracked fixtures.

## 4. Validation & Error Matrix

| Condition | Result |
| --- | --- |
| Missing optional Memo directory | Readable empty timeline |
| Invalid meta/ID/chronology/root, duplicate identity or reserved route | Fail owning build |
| Draft/private entry or private-only asset | Absent from public projection |
| Unsafe/missing/encoded traversal asset or dangling symlink | Reject, no substitute bytes |
| Cursor seek/native scroll overlap | Ownership prevents oscillation |
| JS failure, disabled JS or reduced motion | Static reading/native links remain usable |
| Candidate/hash/history/title mismatch or racing target | Reject; preserve sources/evidence |
| Legacy independent push or active combined-candidate setting | Explicit migration guidance |

## 5. Good / Base / Bad Cases

Good: write a brief draft, publish through the coordinated build and find it
by date alongside complete long notes. Base: a clone has an empty independent
Memo reading page and ordinary Terminal pages. Bad: route Memo through its
retired wire decoder, trim prose/code, embed every body in home, overwrite user
sources or reinterpret a disabled retained version-1 release as version 2.

## 6. Tests Required

Run affected X Core/adapters/site/assembler/access/migration gates through `sam`,
integrated Memo fixture/browser tests through pinned `preview.sh render`, then
`./preview.sh verify` and runtime packaging. Cover actual pointer/scroll/keyboard/
touch actions and final alignment, equal occupied-month segments, bounds/gaps,
draft/private exclusion, resize/media, detail Back/return, empty/single/no-JS,
reduced motion and ordinary Terminal regressions. Retain failure artifacts.
For reader-shell changes, also check left-rail desktop placement, missing global
chrome, exactly one bottom detail return, tablet/mobile landscape and zoom,
clipped-edge/central/long-entry reading, seek retention versus actual browse
takeover, date-bubble bounds after keyboard/touch seeks, transient emphasis and
no-JS/runtime-failure navigation. Text/focus contrast and touch-target coverage
must include the light surfaces and new navigation feedback.
Serialize content materialization and fixture preparation: negative-build tests
and browser fixtures share the generated content/store. After interrupted or
overlapping preparation, rebuild full/empty/single fixtures successfully before
treating the browser matrix as authoritative.

Independently compare actual imported source bodies/dates/IDs, all declared URL
patches and asset hashes before installation and after building installed inputs.
Separate synthetic browser evidence, real-corpus evidence and production checks.
Physical devices, assistive technology and subjective snap feel remain residual
review; emulation is not certification.

## 7. Wrong vs Correct

Wrong: use `plugins.memos.enabled` to hide newly built Memo, infer time from card
heights, or publish a hand-edited preview as the full canonical body.

Correct: guest-project document access/draft first, build all public Memo routes
coordinately, synchronize a real-date month model with natural scrolling, and
preserve complete individual content plus private source correspondence.
