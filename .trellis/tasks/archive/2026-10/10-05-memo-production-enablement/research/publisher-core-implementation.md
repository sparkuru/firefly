# Publisher core implementation handoff

Date: 2026-10-06. Scope: owner-approved static Markdown Memo core only.
No owner source/config, credentials, private operational temporary inputs,
remote host, database or runtime lifecycle was read or changed by this worker.
The independent integration worker owns authenticated publish, site/assembler,
preview/static mount and interactive service retirement. Main owns task/spec
state, image/deployment acceptance, commits and archive.

## Files and boundaries

- Added `tooling/publish-memos/`: exact pinned package/lock, framework-neutral
  `.mjs` source, immutable `.d.mts` API contracts, declaration/syntax checks,
  focused tests and an ephemeral publisher `Dockerfile`.
- Adapted `plugins/memos/{public,config}.{mjs,d.mts}`, plugin manifest,
  contract/declaration tests and owner-workflow README.
- Adapted the two tracked `config/plugins/memos/*.toml.example` descriptions.
  Actual owner TOML/environment files were not inspected or changed.
- Added the empty default `content/memos/.gitkeep` workspace.
- Extracted the unchanged pure Markdown HTML policy into
  `tooling/shared/markdown-html-policy.mjs`; the site library is now a facade.
  Article sanitation policy and class vocabulary remain unchanged.

Repository-local generated Memo output must be under ignored `.firefly/memos/`.
External isolated roots remain supported. Sources, assets and output cannot
overlap. The package does not import an article loader, Astro layout, site
configuration, X Core, diagrams or private service code.

## Source and public semantics

Each file has exact strict YAML `id`, `createdAt`, `draft`. Source filenames
can contain safe Unicode; filenames never appear in public records. `new`
creates an absent-only random stable ID/canonical UTC draft. Empty drafts are
valid, duplicate IDs include drafts, and draft bodies/IDs/filenames are omitted.
Accepted creation times are immutable even when a note moves back to draft.

Schema 2 requires `bodyFormat: "markdown"`; schema 1 plain-text input is
rejected. The public fields remain exactly `id`, `displayName`, `body`,
`createdAt`. Markdown normalizes CR/CRLF to LF while preserving significant
whitespace and code points. Owner display metadata normalizes NFC. Unicode,
controls, byte limits, canonical timestamps, ordering and exact digests remain
strict. Decoders do not repair noncanonical wire text.

The renderer directly reuses the repository's existing pinned underlying
unified/remark/rehype processor stack and shared sanitation policy, without
an Astro application dependency. Basic Markdown/GFM, inert fenced code,
lists/tables and owned images render at build time. HTML-only bodies whose
sanitized output has no visible content fail. Footnote identifiers are scoped
per stable Memo ID. No script/browser runtime or fetch is emitted or executed.

Images must be owned contained raster assets; external images are rejected.
HTTP(S) links and same-origin navigation remain native. Referenced image and
download assets use a bounded extension/signature allowlist; Unicode asset
URLs are URI encoded. Only referenced files are copied. Signatures are basic
type checks, not a full image/media decoder. SVG/HTML/executable types,
traversal, symlinks, missing files and broken signatures fail.

## Artifact, receipt and API

A candidate root contains:

```text
public/index.html
public/memos.public.v2.json
public/assets/style.css
public/assets/media/<referenced owned media>
receipt.json                           owner-only; outside served subtree
```

The stylesheet retains Firefly's existing reading palette/system fonts.
The page has one chronological semantic column, stable native fragment links,
UTC time elements, an honest empty state, home/blog navigation and no form.
Long content wraps; code/tables scroll within the reading column.

`src/index.mjs` exposes `buildCandidate`, `validateCandidate`,
`readCurrentHistory`, `promoteCandidate`, `buildRollbackCandidate`, `newMemo`,
`parseMemoSource`, `readMemoSources`, `decodeReceipt`, `renderMarkdown`.
`src/index.d.mts` defines the exact immutable API.

`MemoReceipt` contains `schemaVersion:1`, `sequence`, `deletionFloor`,
`retiredIds`, `acceptedMemos` (ID/creation time/digest), `exportDigest`,
`expectedBase`, exact public `inventory` (path/bytes/digest), and `digest`.
Validation checks exact files/directories, canonical export, public/private
correspondence, and regenerates canonical sanitized HTML from public Markdown.
It does not trust arbitrary pre-rendered HTML, even if an altered inventory
has been rehashed. Candidate receipts must be owner-only.

## CLI for the host integration

Node/npm commands run through `./sam`; SSH credentials stay with the host
orchestrator. The core CLI intentionally provides bounded local/remote
operations rather than authenticated `publish` itself.

```text
new <name> [--source-root ROOT]
build [--source-root ROOT] [--assets-root ROOT] [--output-root ROOT]
      [--display-name NAME] [--history FILE] [--initial-deletion-floor N]
validate --candidate-root ROOT
state --deployment-root ROOT
promote --candidate-root ROOT --deployment-root ROOT
        --expected-base DIGEST|null [--initial-deletion-floor N]
rollback --candidate-root PRIOR --history FILE --output-root NEW
```

`state` emits receipt JSON or literal `null` only for a never-established
destination. `build --history FILE` accepts that receipt or literal null.
Build emits candidate location/receipt without printing source bodies.
Operational errors name the owner operation without serializing input/config.

First cutover must independently inspect applicable legacy deletion evidence.
If its validated floor is nonzero, pass the same
`--initial-deletion-floor N` to build and promote. A seeded candidate cannot
promote through implicit zero. This seeds a real first candidate, never a
synthetic accepted receipt. Established history cannot be overridden by a
nonzero bootstrap option; subsequent publications use its existing floor.
There is no reset flag.

Promotion locks only the Memo root, rereads/validates current, checks expected
base and the full next transition, copies the candidate into a retained
`releases/r_<sequence>_<receipt digest>` directory, validates the copy, then
atomically renames the `current` symlink within the deployment mount. This
supports a separate read-only candidate bind mount without cross-device
rename. The pointer selects public bytes plus matching private history.
Accepted public directories/files are 0755/0644; receipts are 0600.

A fixed owner-only `established` marker contains no content/history and prevents
zero bootstrap after the accepted pointer/releases disappear. It is created
before first pointer promotion. Missing/malformed established state, malformed
current targets, stale same-floor candidates and unsafe roots fail closed.
Interrupted first promotion may require explicit inspection/recovery of its
retained validated release/marker; the CLI does not invent a replacement base.
It never removes accepted releases, owner source or blog data.

Rollback reads retained prior content but builds a new sequence against current
history; retired content cannot return. After ambiguous connection loss, host
integration must inspect the destination receipt before retry/reporting.

## Minimal image context

Copy only this allowlist into a disposable context, then build with
`-f tooling/publish-memos/Dockerfile`:

```text
tooling/publish-memos/Dockerfile
tooling/publish-memos/package.json
tooling/publish-memos/package-lock.json
tooling/publish-memos/src/**
plugins/memos/public.mjs
plugins/memos/validation.mjs
tooling/shared/contained-file.mjs
tooling/shared/markdown-html-policy.mjs
```

No actual owner TOML/env/source/assets, dependency caches or `node_modules`
belong to this context. Image: `node:22-alpine`, production-only pinned
`npm ci --ignore-scripts`, `USER node`, entrypoint `node src/cli.mjs`.
Remote validation/promotion runs ephemeral with no network, read-only
candidate input, explicit owner UID/GID and only the Memo deployment mount
writable. Main/local-readiness own actual image build/fixture/remote evidence.

Frozen implementation hashes supplied to image preparation:

```text
index.mjs  5cad168e754621fa2997c9f30ad64b30b077f05fabaf55e03d970eeff9ffb193
cli.mjs    e3d082c11ad920b5a891e045f7f00fc1a5bdcbfde1e6082a7802ac71a92837b2
render.mjs 8287daa37dd3a459e95e6b63b2c81474e16fade81f1f6c121b1cf4689ebf3989
style.mjs  6bcedae3681998becd89ac8e11cecaab7dc3697a39800acc1586e6ef212c41a5
Dockerfile e85364cdd396cd6035aebba4ad284669cebb2b28f07384e0a6e0e49e27ff0724
```

## Validation evidence and remaining gates

- Lockfile generation and fresh pinned install ran through `./sam`;
  installation audit reported no dependency vulnerabilities.
- `./sam npm --prefix tooling/publish-memos run check`: passed. TypeScript
  checks public/API declaration fixtures; the implementation is JavaScript
  with syntax checks, not `checkJs` implementation type analysis.
- `./sam npm --prefix tooling/publish-memos run build`: passed (the package
  uses native ESM directly; this build gate delegates to the declared check).
- `./sam npm --prefix tooling/publish-memos run test`: passed 13/13.
- `./sam npm run test:memos-contract`: passed 9/9.
- `git diff --check`: passed.

Focused tests cover absent-only/random drafts; strict YAML/UTF-8/limits; draft
privacy/duplicates; safe Markdown/hard breaks/code point preservation;
sanitized-empty rejection; Unicode media/asset closure/signature failure;
source/output separation; receipt/DOM/inventory tampering; edit/withdrawal;
stale same-floor refusal; immutable creation times including draft transition;
missing established history; monotonic rollback/resurrection refusal; lock
and candidate failures preserving current; symlink/empty-tree rejection;
inherited floor preservation and actual CLI arguments/status/output.

One initial test fixture incorrectly expected an already replacement-encoded
JavaScript surrogate to remain invalid UTF-8. It was corrected to actual
malformed UTF-8 bytes; the strict byte rejection assertion remains present.

Not run by this worker: image build/runtime fixture, static desktop/mobile
browser validation, authenticated SSH/dry-run/upload, deployment interruption
fixture, cutover or retained private runtime checks. Those remain integration
and main-session gates. No acceptance of those unrun surfaces is implied.
