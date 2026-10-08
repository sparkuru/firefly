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

Desktop uses a sticky left vertical rail and natural document scrolling.
Narrow viewports use a sticky top horizontal rail and one content column.
The controller distinguishes browsing, dragging and settling ownership: pointer
seek positions changed targets, native scroll updates the cursor, induced scroll
cannot trigger feedback seeking. Preserve active ID across orientation changes,
long entries and media geometry; reserve sufficient tail space for the oldest
entry to align below sticky controls.

Arrows select adjacent entries; Page Up/Down select occupied months; Home/End
select bounds. Click/touch, visible focus, slider date semantics, reduced motion
and non-chatty updates remain available. No-JS content includes native detail
links/month anchors. Empty/single corpora have honest inert controls. Detail,
Back and explicit return preserve timeline entry context; drag frames do not
push history or open details. Scope Memo CSS/runtime to owning routes.

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
