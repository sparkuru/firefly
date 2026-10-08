# Offline Memo Documents Implementation

The owner-approved implementation adds three focused files under
`tooling/memo-documents/`: `documents.mjs`, `cli.mjs` and
`documents.test.mjs`. No product reader, root delegate, source workspace,
external file, publication pointer or recovery history was changed by this
worker. Shared YAML/Markdown dependencies and contained-file/history helpers
come from the retained `tooling/publish-memos` installation; this does not
reactivate independent publishing.

## Authoring and CLI

`new [YYYYMMDD-HHMMSS.md] [--source-root ROOT]` generates only stable random
`id`, precise UTC `date`, and `draft: true`. The default root is
`memos/` below `FIREFLY_CONTENT_ROOT`, or repository `content/` if the
environment is absent. Timestamp filenames default to UTC. The command uses
exclusive creation, owner-only file mode and contained regular directories.
The root entrypoint owns dotenv loading and the approved selected workspace.

`import --config PRIVATE_JSON` reads explicit owner-only inputs: `notesRoot`,
`conversionReport`, `sourceMapping`, `database`, `commentDocumentRef`,
`shortRoot`, `outputRoot`, `historyFiles`, and `expectedDumpDigest`. The
read-only database query includes every comment of the selected document,
without author filtering. Only a separate offline operation reads the private
database; normal website builds do not. Existing output roots fail instead of
being overwritten. Failed candidates are retained for inspection.

`validate --candidate-root ROOT` checks the exact candidate manifest, all
269 identities/dates/body hashes, retired-ID exclusion and reverse patch
correspondence. `install --candidate-root ROOT --workspace-root ROOT` is a
dry-run by default. `--apply` adds only absent files after all path/hash/ID
conflicts are checked; an identical installation is idempotent. Atomic sibling
files plus exclusive hard links prevent replacement of a racing user write.
Any partial interruption leaves existing/new user data intact and records an
owner-only installation journal in the candidate. It never changes posts,
pages, deployment state or the old source selector.

## Data Correspondence and Paths

The final candidate is an ignored private workspace with empty `posts/` and
`pages/` directories, plus 269 documents and 211 assets under `memos/`.
The reader's materializer generates the compact Pages aggregate; this worker
does not create a competing `pages/memos.md`.

All 89 corrected note IDs and original creation instants are preserved.
Historical titles become optional `title` metadata. The 180 short IDs are
deterministic `m_` plus SHA-256 of the private opaque comment reference with
an origin prefix; numeric SQL IDs are not public metadata. Short filenames
retain the approved UTC+8 timestamp convention. Authoring dates are canonical
UTC; source mtimes do not determine content dates.

Only parsed Markdown/HTML URL destinations change:

- `assets/**`, `./assets/**` or `/memos/assets/**` become
  `/pages/memos/assets/**`, retaining exact owned asset names/bytes.
- Verified `/memos/#<id>` destinations become `/pages/memos/<id>/`.

Code spans/fences, authored labels, body Unicode and CRLF remain exact.
Each transformation has an offset, before/after value and reason in the
private correspondence report. Forward and reverse reconstruction prove that
no undeclared body transformation occurred. Source heading compatibility
belongs to generated-stage document processing, not offline source mutation.

## Retained History Audit

The bounded local audit found 18 receipts. Eight applicable owner-corpus
receipts contain the same 89 historical identities, with sequences one to
five, deletion floor zero and no retired IDs. All eight strict receipt decoders,
digests, immutable accepted dates and retired-ID sets participate in import.
Two explicit browser-fixture receipts are excluded. Eight empty receipts with
no identities, retired IDs or deletion floor are classified as non-impacting
evidence with uncertain provenance, rather than treated as accepted owner
history. The classification and every digest remain private.

No retained accepted local publication pointer or additional private receipt
was found within the inspected relevant directories. This is local recovery
evidence, not remote-history or production acceptance. No SSH probe occurred.

## Actual Validation

The following commands ran through the authorized Node container boundary:

```sh
SAM_CONTENT_MODE=none ./sam node --test tooling/memo-documents/documents.test.mjs
SAM_CONTENT_MODE=none ./sam node tooling/memo-documents/cli.mjs import --config <ignored-private-config>
SAM_CONTENT_MODE=none ./sam node tooling/memo-documents/cli.mjs validate --candidate-root <ignored-private-candidate>
```

The import additionally uses an exact read-only source bind for the extracted
short-entry directory. All seven focused tests passed: minimal/exclusive
creation, parsed URL/code/Unicode preservation, full corpus/duplicate-body
identity, baseline mismatch rejection, explicit history/retired-ID rejection,
conflict-before-write/idempotent installation, and CLI argument behavior.
A first synthetic test expected a reference definition immediately after an
HTML block; Markdown correctly treated it as HTML. The fixture was separated
with its required blank line, then the complete suite passed.

The real import and an independent byte/UTC-date/UTF-16-offset reconstruction
audit passed:

- Exactly 269 distinct entries: 89 notes and 180 short bodies.
- All 211 assets match retained inventory, size and SHA-256.
- Exactly 258 declared URL patches across 33 notes: 221 asset references
  and 37 entry references. No unexplained body changes.
- All 180 short bodies remain byte-identical to both exported originals and
  read-only retained database values, including 48 U+200B characters and
  103 bodies containing CRLF.
- All 491 original input inode/device/mode/mtime/size/hash snapshots remain
  unchanged, including the eight applicable history files.
- Candidate directories are 0700, files 0600, with no symlinks.
- The selected workspace's Memo target has zero files/symlinks at preflight;
  an owner-only install plan records the actual path without tracked leakage.
- No external installation, data deletion or deployment occurred.

Node 22's experimental SQLite warning is informational; all operations exited
zero. The main session independently repeated candidate validation and checked
the 480 emitted file hashes, identities, body correspondence and histories.

## Install Seam and Remaining Acceptance

Ignored role files under the private migration candidate directory include the
import configuration, history audit, install plan, full correspondence/source
snapshots and independent audit. The main session owns actual source-install
approval enforcement and any necessary write escalation after a coordinated
real-corpus build passes. `installCandidate({ candidateRoot, workspaceRoot,
apply: false })` performs preflight; `apply: true` is the explicit absent-only
mutation. Workspace selection follows the ordinary blog content root, not the
retired independent Memo selector. Mask owner paths in wrapper logs by retaining
them only in an ignored owner-only operational log.

Shared-renderer real-corpus compatibility, public asset closure, coordinated
build/package/browser gates and actual installation are separate reader/main
session acceptance. This worker does not claim them as passed.
