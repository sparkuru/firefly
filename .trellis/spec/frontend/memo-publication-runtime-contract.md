# Independent Owner Memo Publication and Static Runtime

## 1. Scope / Trigger

Read when changing `tooling/publish-memos/`, static Memo mounting, combined
preview/packaging or blog/Memo preservation. Memo publication is separate from
root blog `artifacts/`, `dist/`, deployment pointer and source mirror. The
[public contract](./memo-contract.md), [site navigation](./memo-site-contract.md)
and [retired private boundary](./memo-service-contract.md) retain their owners.

## 2. Signatures

Core entrypoint `tooling/publish-memos/src/index.mjs` exposes:

```ts
buildCandidate({ sourceRoot, assetsRoot?, outputRoot, displayName,
  history?: MemoReceipt | null, generatedAt?, initialDeletionFloor? })
validateCandidate(candidateRoot)
readCurrentHistory(deploymentRoot): Promise<MemoReceipt | null>
promoteCandidate({ deploymentRoot, candidateRoot, expectedBase,
  initialDeletionFloor? })
buildRollbackCandidate({ priorCandidateRoot, history, outputRoot, generatedAt? })
newMemo({ sourceRoot, name, now? })
```

CLI commands are `new`, `build`, `validate`, `state`, `promote`, `rollback`.
`state --deployment-root ROOT` emits a receipt or literal null. `build --history
FILE` accepts that output; bootstrap may pass `--initial-deletion-floor N`.
`promote --candidate-root ROOT --deployment-root ROOT --expected-base DIGEST|null`
requires the matching explicit bootstrap floor when inherited. Host orchestration
exposes `new NAME` and `build` without config, using the actual checkout's
`content/memos/` and `.firefly/memos/candidates/`. It also owns `publish` and
its automatic SSH push, with explicit `--config`, `--dry-run` and isolated local
publication. Core generation/checks run through `sam`; bounded remote
validation/state/promotion run in the reviewed ephemeral publisher image.

## 3. Contracts

### Sources and rendering

- An independent Memo source root contains Markdown and optional `assets/`.
  Each file has exact YAML `id`, `createdAt`, `draft`, followed by Markdown.
  No aliases/custom executable directives or article/Experiment import hooks.
- Generic host `new` always creates in the actual checkout's `content/memos/`,
  even when a source-selecting operator config is supplied. It needs no config
  and cannot redirect creation to an external authoring root. The low-level
  core API retains explicit roots for controlled fixtures/operators.
- Repository-local originals and the tracked empty source directory belong to
  authoring; generated candidates/private operational inputs remain ignored.
  Default local build uses that source and owner display `Owner`. Missing
  default directories are initialized only after their canonical parent and
  nonsymlink checks. Resolve paths from the script root, never caller cwd.
- `new` creates a private absent-only draft with random stable ID and UTC time.
  Draft bodies may be empty; public bodies require visible sanitized content.
  Drafting/removing an accepted ID withdraws it at the next publication.
  Duplicate IDs include drafts; accepted creation timestamps are immutable.
- Strict raw UTF-8, contained regular nonsymlink files and bounded body/media
  reads precede rendering. URI-encoded contained local media and Unicode author
  filenames are supported; traversal/controls/nonregular inputs fail.
- Markdown source reads are bounded to 256 KiB including front matter. Bodies
  use the shared 128 KiB UTF-8 contract, including whitespace-only draft size
  checks. Above-limit bodies/source files fail; no legacy validation bypass.
- Reuse pinned Unified/remark/rehype and the shared HTML policy. Render safe
  Markdown links, lists, tables and fenced code, without script/diagram/article
  extensions. Remote images are rejected; explicit HTTP(S) links are allowed.
  Referenced local assets are contained, allowlisted and copied only as needed.
  Styles and assets use `/memos/`; no blog `_astro` filenames or runtime JS.
- Owner-approved historical conversion stages and validates its exact corpus
  before absent-only promotion to authoring sources. Recover only referenced
  local/HTTP(S) images as contained validated assets; preserve unavailable image
  captions and original targets as ordinary links/text with a private outcome
  report. Rewrite old-note links only through verified source correspondence and
  origin. Never invent destinations for missing targets or rewrite code examples.
  Original backup/export hashes and raw time values remain private and unchanged.
- A bare GFM or angle autolink converted to a relative Memo target must become
  an explicit Markdown link retaining its visible label. A relative string alone
  is not an autolink. Verify rendered anchor targets against the migration mapping,
  including shared reference definitions and raw HTML links.
- Generated candidates default below ignored `.firefly/memos/`. Output cannot
  overlap blog source/build/release roots or the selected Memo source/assets.

### Public candidate and private acceptance history

- Candidate layout is `public/index.html`, `public/memos.public.v2.json`,
  `public/assets/...`, with private `receipt.json` at candidate root.
  Public files are 0644, traversable public directories 0755, receipt 0600.
  Source/config/keys/receipt never belong in a web image or served subtree.
- Validate strict export fields/digest, canonical sanitized rendered HTML,
  exact asset bytes, complete sorted inventory and no extra/empty directories.
  A marker or digest alone is not proof of rendered identity.
- Receipt schema 1 is exact: `schemaVersion`, `sequence`, `deletionFloor`,
  `retiredIds`, `acceptedMemos`, `exportDigest`, `expectedBase`, `inventory`,
  `digest`. Accepted entries contain `id`, `createdAt`, `digest`; inventory
  entries contain `path`, `bytes`, `digest`. All hashes use SHA-256.
- One Memo `current` symlink selects both public bytes and their receipt in
  `releases/r_SEQUENCE_DIGEST`. A private `established` marker prevents loss
  of the pointer and release directory from silently becoming a fresh store.
  Missing/corrupt established history fails closed; there is no reset command.
- Under an exclusive Memo-only lock, re-read current and compare expected base,
  sequence, immutable times, retired IDs and deletion floor. Copy validated
  candidate bytes into an absent release within the deployment filesystem,
  validate again, then atomically rename the current symlink there. Upload and
  release mounts may differ; do not rename an incoming directory across mounts.
- Fresh bootstrap permits null history only at a never-established boundary.
  Main migration independently validates applicable legacy history and passes
  an inherited floor at least that high to build and promote. Nonzero bootstrap
  options cannot override established history; missing history is not floor zero.
- Withdrawal increments the floor and retires IDs; stale candidates, conflicting
  bases and resurrection of retired IDs fail. Rollback builds a *new* candidate
  against current history from a validated older publication. It never selects
  an old pointer or lowers the floor. Inspect ambiguous results before retrying.

### Host/deployment and static mount

- Host-only authenticated SSH uses owner-only operational configuration and
  strict host-key checks. No SSH config/key, blog root or credential is mounted
  into generation containers. Push only validated candidate public files plus
  its private receipt to the independent deployment root.
- Explicit owner host config requires display identity; missing source/output
  keys resolve to the actual checkout defaults. Present invalid/null values
  are rejected. Deploying and rollback still require explicit operator config.
- An ignored owner-only tooling adapter may project an external read/build/
  publication source into a private 0600 temporary config, forwarding to the
  shared host entry. It excludes `new`, keeps external originals untouched,
  refuses caller config replacement and cleans only its own temporary root.
  No actual external path belongs in tracked defaults or clone examples.
- Owner-local host configuration selects source/assets/output/display name,
  immutable remote image, SSH target/config/known-hosts, remote deployment root
  and bounded sudo-Docker choice. No operational identities belong in tracked
  templates, Trellis records, build contexts or public output.
- Choose the Memo deployment root outside the blog deployer's recursive copy/
  chown/cleanup scope, not merely outside its current release. Review the actual
  owner-local helper without running broad ownership commands. Independent
  pointers alone do not protect a private 0600 receipt from a recursive chown;
  normal blog deployment preserves Memo ownership as well as bytes.
- Existing Nginx serves `/memos/` from the independent current `public/`, with
  trailing-slash canonicalization, GET/HEAD-only reading and static security
  headers and `Cache-Control: no-cache, no-store` on every Memo response.
  Check actual edge response headers as well as origin headers. No Memo HTTP/mail listener, worker, API proxy, DNS or certificate
  change is required. Keep comments and unrelated locations intact.
- Public access is additionally gated by the blog release's validated
  `plugin-access/memos.enabled` marker. False returns non-cacheable 404 before
  redirects or method handling and preserves the independent pointer/history.
  A combined owner sync skips disabled Memo publication. Standalone explicit
  publisher operations do not enable that route. See
  [Plugin Public Access](./plugin-public-access-contract.md).
- Blog builds never read current Memo input/state. The assembler reserves the
  namespace and retains strict legacy Memo metadata solely as migration
  evidence. Explicit combined preview/package consumes already validated
  `public/` read-only; a missing selected artifact fails rather than fabricating
  an empty stream. Default blog-only operation remains independent.
- First navigation activation is intentional blog integration. Establish the
  preservation baseline afterwards: routine Memo push must leave every non-Memo
  byte, blog pointer and source mirror unchanged; a normal blog deployment must
  leave the Memo pointer and history unchanged. Fixture evidence and actual
  production evidence are reported separately.

## 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| Invalid Markdown metadata/UTF-8/draft ID/path/visible body | Fail before upload |
| Source above 256 KiB or body above shared 128 KiB | Reject before candidate emission |
| Generic host new with external source config | Create only repo-local draft, leave external source unchanged |
| Clone/caller cwd differs | Resolve default authoring/candidates from actual checkout |
| Default source/output ancestor is symlink/noncanonical | Fail before directory creation or draft/output effects |
| Private external adapter receives new or caller config override | Refuse before projection or publication |
| Canonical render/export/assets/inventory differ | Reject candidate |
| Changed accepted timestamp, stale base, retired ID or lower floor | Refuse promotion |
| Lost/malformed established pointer/receipt/marker | Require recovery, never auto-zero |
| Transfer or promotion interrupted | Retain current; inspect owned staging/release before retry |
| Old rollback contains withdrawn content | Refuse new rollback publication |
| Selected combined artifact missing or invalid | Explicit combined-input error |
| Retained Memo artifact while public activation is false | 404 without changing publisher history |
| Selected combined candidate in Astro dev | Refuse explicitly; use static start/preview |
| Present optional config field has wrong type/null | Refuse before wrapper/transport; absence alone gets defaults |
| Blog source/config unavailable during Memo build | Independent Memo build still succeeds |
| Production checks not performed | Report local evidence only |

## 5. Good / Base / Bad Cases

Good: build and automatically push an owner edit; one Memo pointer advances
without touching the blog. Base: valid empty static stream with no private
service. Bad: publish root `dist/`, serve a receipt, erase history or import a
legacy text body as Markdown.

## 6. Tests Required

Cover copied/fresh checkout defaults and unrelated caller cwd, no-config new/
build, no-overwrite drafts, supplied external config unable to redirect host
new, present-type validation and missing source/output defaults. Exercise the
private external read-only adapter and assert original file inventories and
blog outputs remain exact, without a remote promotion for local checks.
Run focused contract/publisher/site/assembler checks through wrappers, then
maintained m51/full/package gates. Cover draft/new/ID/time/Unicode/whitespace,
128 KiB body and 256 KiB source exact/overflow boundaries for ASCII/Unicode
filenames, long-body round trips and the same strict limits for nonempty drafts,
safe real Markdown/media, unsafe HTML/URL/UTF-8/escapes, actual canonical render
and inventory; add/edit/withdraw/stale/conflict/history loss/rollback and failed
transfer/promotion/retry. Assert no-blog Memo build and no-Memo blog build,
no-JS desktop/mobile empty/nonempty reading, focus/zoom/code/table overflow,
static mount closure, two-way publication preservation and exact Docker cleanup.
Historical owner conversion additionally verifies exact approved record count,
UTC+8-to-UTC mapping, unchanged code/untouched spans, all media/link outcomes,
actual clickable bare/angle/inline/reference link destinations,
private-original hashes and byte-identical absent-only retries. Real corpus
evidence stays private; synthetic regression fixtures contain no owner data.
Actual cutover additionally verifies HTTPS/headers/assets, retained private
recovery, exact stopped legacy processes and unchanged comments/blog boundaries.
The host runtime fixture's `--config-check-only` runs real-jq negative cases
and local build positives without the static image/deployment phase; synthetic
jq adapters do not prove actual jq-expression correctness.

## 7. Wrong vs Correct

Wrong: swap back to an old Memo symlink or call the full blog sync script to
publish one Memo; accept missing private history as a new empty store.

Correct: build a new validated Memo-only candidate against current history,
check expected base under its lock, atomically switch its independent pointer,
and prove the blog pointer/mirror and non-Memo bytes remain unchanged.
