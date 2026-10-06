# Owner-authored static Memo publisher design

## Decision and scope

The owner replaced interactive Memo on 2026-10-06 and selected Markdown bodies.
Independent revised review passed and the owner explicitly approved execution
on 2026-10-06. Implementation and actual production acceptance are recorded in
`research/owner-publisher-production-acceptance.md`. One
cohesive task covers source, processor, static display, independent publishing
and cutover, because splitting accepted components before integration would
leave the blog-preservation requirement unproved. Prior interactive artifacts
remain historical in `research/superseded-production-plan.md`.

## Owner workflow

- `new <name>` creates under the actual checkout's `content/memos/`, without
  operator config and without honoring an external config as a write target.
  It creates a previously absent Markdown draft with a random stable
  `m_` ID and canonical UTC creation time. It never overwrites an existing file.
- Edit the file locally; change `draft` to false when it is ready to publish.
- `build` validates and renders locally, without promoting remote state.
- `publish` reads current Memo publication history, builds the full owner Memo
  stream, validates it and automatically pushes only that static publication.
- `publish --dry-run` performs validation and read-only destination checks,
  without upload or pointer changes. Errors report the failed owner operation;
  sources remain intact and no invalid candidate becomes public.

Use a generic supported CLI under `tooling/publish-memos` with npm/preview
wrapper integration; these are command semantics, not a mandated binary name.
A thin host-owned orchestration entry performs authenticated SSH using owner
configuration; Node generation/render/validation runs through `./sam` or the
approved preview wrapper. SSH config/keys are never injected into public build
containers. No watch daemon, web editor or browser-side publishing controls
are added.

Each source file has YAML front matter with exactly `id`, `createdAt`, `draft`
and a Markdown body. Author identity is configured once in the publisher,
not an alternate visitor identity field. IDs/time never derive from mutable
body text, filename position or publication order. Invalid or duplicate IDs,
unsupported metadata, unsafe paths and broken inputs fail before publication.
A new draft may have an empty body; non-draft publication requires nonempty
Markdown. Drafts have no public body, identifier or filename projection. Moving a
published file to draft or removing it is a withdrawal at the next publish.
Source scanning uses an independent selected Memo root; it neither reads nor
materializes the blog workspace. Local generated candidates/history default to an ignored `.firefly/memos/`
boundary outside root `artifacts/` and `dist/`, which the blog assembler replaces.
Synthetic defaults belong to tracked fixtures;
actual owner root and connection settings stay owner-local.

## Topology and ownership

```text
owner Memo Markdown root
  -> tooling/publish-memos processor + safe Markdown renderer
  -> Memo-only public candidate + private publication metadata
  -> authenticated owner SSH push
  -> immutable Memo release with public/ and private metadata
  -> atomic Memo current pointer
  -> existing HTTPS /memos/ static location

owner blog root
  -> existing article/site/Experiment pipeline
  -> existing blog release + independent blog current pointer
```

Select a dedicated static Memo mount, not a cloned or rebuilt whole-blog
release. All emitted Memo styles/icons/fonts and owned media live under
`/memos/`; no reference depends on a blog `_astro` filename. The existing host
Nginx gets a bounded static `/memos/` location with canonical trailing-slash
behavior and GET/HEAD-only serving. No private listener, API proxy, DNS or
certificate change is needed. Source and connection files are never uploaded
as public content. Private publication metadata sits outside the served
`public/` subtree, with owner-only access.

Main-site activation controls discovery/navigation only. Namespace reservation
for `/memos/` is independent of that flag, so hiding a navigation link cannot
let an authored alias shadow an existing Memo mount. Blog builds may advertise that external same-origin static page in navigation
and sitemap, and do not read Memo source, renderer config or public export.
Remove in-site visitor form/route generation and full-assembler ownership of
Memo output. Full blog deployments switch only the blog pointer; they cannot
replace Memo pointer/state. First navigation activation is a one-time site
integration step; routine Memo updates do not rebuild any blog HTML or source.

Combined local preview/runtime explicitly serves an already built read-only
Memo artifact at the same route. A blog-only build/package remains independent
and declares that an enabled Memo link expects the external static mount.
Neither preview nor packaging silently builds or downloads Memo. A requested
combined preview with a missing/invalid Memo artifact reports that exact input
failure rather than replacing it with an empty stream. Default disabled site
behavior remains available.

## Rendering and public data

Reuse the repository's pinned Markdown processor, YAML parser and sanitization
policy. Extract only the pure HTML policy to `tooling/shared/` with a site
facade/re-export; do not import Astro document layouts/config singletons,
article Content Collections, X Core post contexts or diagram execution.
Render paragraphs, emphasis, links, lists, tables, images and fenced code at
build time. Sanitize active HTML and dangerous URL schemes. Referenced local
media must be contained regular files under the owned Memo assets root;
copy only validated referenced assets. Missing or escaping resources fail.
No script execution, remote build-time fetch or executable Markdown occurs.

The previous schema-1 body is plain text with a text-only DOM contract. Use
schema version 2 with required `bodyFormat: "markdown"` for the new producer/decoder instead
of silently reinterpreting old service exports as Markdown. Keep public
record fields minimal (`id`, `displayName`, `body`, `createdAt`); identify Markdown
semantics in the versioned envelope and digest. Do not add email, consent,
verification, moderation, source paths or SSH state. Normalize Markdown line endings to LF but preserve significant leading/trailing
spaces, indentation, hard breaks and authored Unicode code points, especially
inside code. Apply NFC to owner-display metadata rather than silently changing
Markdown/code text. Strict decoding rejects noncanonical wire input instead of
repairing it. Unicode/control/short-note byte limits, deterministic newest-first
ordering and digest checking remain strict. The renderer generates sanitized fragments itself and validates
final DOM/inventory against those canonical fragments and input receipt; it
never accepts arbitrary pre-rendered HTML as authoritative public input.

## History, concurrency and failure

An accepted publication retains its monotonic publication sequence, current
public IDs/digests, retired IDs and deletion floor in private metadata adjacent
to the public artifact. For an already accepted ID, reject changes to its creation time by comparing
with accepted public data/history; normal body edits retain it. A candidate is
tied to the expected current receipt.
The remote Memo pointer atomically selects both its public subtree and matching
metadata. Retain the previous accepted release and matching recovery material.
This avoids a public/state switch across two independently updated pointers.

Before remote promotion, lock only the Memo boundary, recheck the expected
current receipt, verify exact inventory/digest and reject stale candidates.
Missing/malformed established history fails closed. Two publishers starting
from the same state cannot overwrite each other's completed update. Ordinary
blog publication does not share a content pointer or mutate Memo state.

Withdrawals retire IDs and advance the deletion floor. Restoring an old source
workspace cannot automatically republish a retired ID; deliberate republication
requires creating a new Memo ID. Edits keep identity/time but get a new sequence
and input digest. Old same-epoch candidates are rejected by expected receipt/
sequence, not merely the deletion epoch. Local-only builds do not advance the
remote authority. After an ambiguous connection loss, inspect the exact remote
receipt before retrying or reporting failure; never assume a pointer switch did
or did not happen from SSH output alone.

Memo rollback is a new validated publication using retained prior content and
current history. It must refuse any withdrawn content and advance sequence;
never simply repoint to an old lower-history release. No broad deployment
crash-recovery framework or history-reset escape hatch is introduced. Preserve
any established legacy deletion floor or stop for explicit recovery instead
of inventing a zero bootstrap.

## Static reading UI

Follow `research/ui-ux-pro-max.md`: preserve current Firefly typography/colors,
one chronological column, semantic articles/time elements and native stable
fragment links. Keep all own assets in the Memo namespace. No reader-note or
submission copy remains. Empty state says no Memo has been published and gives
normal home/blog links. Loading is native static navigation; build/push error
feedback belongs to the owner CLI, not visitor UI.

Long text wraps; code/tables scroll within their bounds without page overflow.
Use visible focus, accessible names, readable narrow-mobile spacing and native
links. No JavaScript is required for reading, navigation or Markdown content.
No motion library, virtualized hidden notes or new design-system master is
needed. Browser classification is `playwright-required`; mobile is
`mobile-required`, including zoom/text enlargement and reduced motion.

## Retirement and real deployment

After approval and local gates, main rechecks the exact task-created Memo HTTP
and worker identities, stops only them and confirms no Memo private listener
or enabled write proxy remains. Retire their product wiring, service package,
Compose/Nginx examples and obsolete tests/docs as one coherent scope. Retain
owner database, keys and initial backups as private recovery material; do not
import historical private records or delete them. Preserve comments runtime,
keys, data, routes and existing article/Experiment behavior.

Validate/retain source edge config before the static location change, then
promote through the reviewed publisher. Initialize production with an empty
stream unless owner-authored publishable Markdown is supplied. Nonempty add/
edit/draft/withdrawal tests use controlled local/isolated deployment fixtures.
Cutover first publishes/validates the independent Memo artifact and verifies
its static HTTPS mount. Only then perform the one-time blog release that adds
the navigation/sitemap entry, retaining its prior release and preserving article
sources/routes/comments. Establish the non-Memo byte/inventory and blog-mirror
baseline after that intentional integration change. Routine Memo publication
must leave this baseline and blog pointer unchanged; a later ordinary blog
release must leave Memo current/history unchanged. Real acceptance proves the
static mount, automatic push, ownership/modes and asset closure against those
explicitly separate stages. Subjective UI review remains
separate from automated evidence. No mail test or logging-policy approval is
needed for this read-only design.

## Owner correction: repository defaults and private adapter

The earlier owner-specific external-source selection was superseded by a
subsequent explicit correction. Generic authoring/default build serves the
current checkout and clones, with original Markdown under `content/memos/` and
ignored candidates under `.firefly/memos/candidates/`. Host `new` stays repo-local
regardless of any supplied operator config. Omitted source/output keys in an
explicit host config resolve to the actual repository; present invalid values
still fail. `publish`/`rollback` retain explicit private deployment config and
the existing accepted-history boundary.

An ignored owner-only tooling wrapper supplies the selected external source via
a private temporary config projection to the same shared build/publish entry.
It excludes `new` and never writes authored Markdown to the external directory.
No additional rendering/promotion system, external-source import, production
publication or private-history reset accompanies this change. Existing external
originals remain untouched. The low-level core API retains explicit roots for
controlled fixtures/operators; its reviewed image inputs remain unchanged.
