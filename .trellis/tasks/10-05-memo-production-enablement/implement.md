# Owner-authored static Memo publisher implementation plan

## Approval and preserved state

Original interactive enablement approval is historical. The owner has selected
a local-only author model and Markdown. The owner explicitly approved this
converged revised plan on 2026-10-06 and implementation is in progress. Do not
implement the abandoned POST-verification fix or send mail. Existing private
runtime/data/keys/backups remain retained until the reviewed cutover.

## 1. Context and ownership

Validate curated manifests. Read PRD/design, owner-publisher/UI research,
applicable specs and project policy. Use Trellis implementation/check agents
with explicit module ownership; child agents implement directly and do not
spawn others. Main session owns task/spec changes, remote actions, commits and
finish. Preserve owner-local deployment inputs and unrelated worktree changes.

A first implementation agent owns the new tooling package and pure contract/
shared-policy adaptations. A subsequent integration agent owns site/assembler/
preview/runtime migration and obsolete service removal after consuming that
checked interface. Keep shared contract edits with one owner. This is one
cohesive task, not independently accepted children that omit integration.

## 2. Local authoring, Markdown and publisher contract

Add `tooling/publish-memos` with pinned existing processor/parser/sanitizer
versions, package manifests, CLI and focused tests. Implement source scanning,
`new`, `build`, `publish` and `publish --dry-run`; use explicit independent source,
output, owner identity and deployment configuration. `publish` automatically
pushes after valid generation. `build`/dry-run never promote. No watcher.

New drafts use stable random ID and UTC timestamp without overwrite. Parse
exact metadata, omit drafts, bound body/Unicode, validate duplicate IDs and
contained sources/assets. Create versioned owner-Markdown public data; render
sanitized deterministic HTML and all styles/media under its own route. Extract
the pure HTML policy narrowly, retaining a site facade and existing article
semantics. Verify exact public fields, canonical digest, final DOM and complete
asset inventory before accepting a candidate.

Implement retained private publication receipt/sequence/retired-ID history,
expected-base checks and stale/removal/rollback refusal. Remote promotion
switches one Memo pointer selecting both public and private receipt data.
Lock/recheck that boundary and never mutate the main blog pointer or mirror.

## 3. Retire interactive and integrate independent static reading

Remove visitor form/wording, write-origin/consent/service coupling and old Memo
HTTP/mail package/build scripts, Compose services, proxy examples and lifecycle
fixtures from active product wiring. Update service operation documentation
as part of this explicitly reviewed retirement scope; retained operational
keys/data are not repository cleanup targets.

Refactor site Memo activation to navigation of the external static page.
Reserve the Memo namespace independently of the link flag. Blog builds do not read Memo config/source/export, even when navigation
is enabled. Remove in-site Memo output and exact-form assembler constraints;
preserve unrelated comments/publication validation. Ensure old established
history is retained or explicitly rejected during migration, never reset.

Add explicit read-only Memo artifact composition to local preview/static
runtime when selected, preserving the default blog-only profile and minimal
public package boundary. A missing selected Memo artifact is an explicit
combined-preview error, not a reason for blog source/build failure. Runtime
mounts contain only public Memo output, no publisher sources or private state.

## 4. Generic deployment and owner documentation

Use a thin host-owned orchestration entry for authenticated SSH and owner-local
host configuration, never hardcoded operational identities. Run Node generation,
rendering and validation through `./sam`/approved preview; do not inject SSH
config or credentials into the public build container.
Reuse existing verified connection semantics, including strict host-key checking
and the documented SSH-config fallback. Push only validated Memo candidate
public data and private receipt to its new release root, with narrow ownership
and a separately retained current pointer. Validate paths, regular-file modes,
checksums, inventory and expected receipt before switch. Include bounded cleanup,
ambiguous-result inspection and exact Memo rollback behavior.

Document complete owner create/edit/publish/draft/withdrawal/local/dry-run
workflow, configuration examples, external static mount expectation and retained
history recovery. Do not call the existing full-blog sync script, copy blog
sources, invoke broad ownership scripts or widen private permissions.

## 5. Required local evidence

Node/build/browser commands go through `./sam` or `./preview.sh`; browser tests
use the repository pinned browser/IPC profile. New root `check:memos` and
`test:memos` (or final curated equivalent scripts) target the owner publisher,
not the retired service. Integrate meaningful checks into maintained m51/full
verification and packaging commands rather than skipping old failing assertions.

Required focused tests cover:

- source metadata/drafts/stable IDs/time, immutable accepted timestamps, significant Markdown
  whitespace and blank-draft/nonempty-public body semantics; real safe Markdown links/lists/code/
  tables/images, hostile HTML/URLs, duplicate IDs, invalid UTF-8 and escape paths;
- native static empty/nonempty reading with JavaScript disabled on desktop and
  narrow mobile, keyboard focus, text zoom, code/table overflow and asset closure;
- Memo build with blog unavailable; blog build with Memo source/config unavailable;
- add/edit/withdrawal/stale same-epoch input, retired IDs, missing history,
  conflicting publisher receipts, transfer/promotion failure and retry/rollback;
- independent static mount fixture: non-Memo path/content manifest remains exact
  across Memo updates; a normal blog deployment preserves latest Memo and history;
- no form, verification URL, private key/source/SSH value, write listener or
  active Memo HTTP/mail runtime in the read-only product/deployment boundary.

After focused checks run maintained `check:m51`, `test:m51`, `./preview.sh verify`
and `./preview.sh package` with suitable tracked synthetic fixtures and the
correct public-build umask/private-log contract. Recurate actual root script
names once package wiring is concrete. Do not repeatedly rerun passing gates
without new changes/failures. Verify default/combined static and comments Compose
syntax and exact task-owned Docker cleanup.

## 6. Actual cutover and deployment

Main session alone rechecks current private runtime identities/empty state,
static release/mirror, edge config and free space through the existing approved
operational channel. Preserve unknown differences. Stop only the task-created
Memo HTTP/worker; retain keys/database/recovery and remove no owner content.
Confirm comments and unrelated services retain their actual baseline.

Prepare the generic publisher's owner-local settings and an empty initial Memo
source unless actual owner-publishable Markdown exists. Validate a fresh
Memo-only artifact, source Nginx candidate and rollback material before installing
the narrow static location. Use the publisher's normal `publish` operation to
perform real authenticated automatic push and atomic Memo promotion. Confirm
HTTPS/static headers, assets, empty stream or supplied content and existing
blog/comments behavior. Then publish the one-time blog navigation/sitemap
integration, retaining the previous blog release and preserving article source/
routes and comments. Establish the preservation baseline AFTER that intentional
integration change. Check a subsequent routine Memo push against the complete
non-Memo path/content inventory, blog pointer and mirror; verify an ordinary
blog deployment preserves Memo current/history. Do not classify the intentional
first navigation change as routine Memo byte preservation. Any production blocker stays explicit, not a fixture
pass. No SMTP/verification/visitor traffic is part of this cutover.

## 7. Check, specs and finish

Run Trellis check against the rewritten scope and actual evidence. Update
architecture/Memo/config/publication/runtime/validation specs and guided mainline
only with approved implemented behavior; archive old lifecycle as history rather
than active requirements. Curate third-party notices for reused dependency/
font assets. Recheck owner-value privacy, diff/status, manifests, candidate/
container cleanup and every acceptance criterion. Preserve intentional private
recovery material with an owner-local handoff. Commit/finish/archive only under
project policy and only when complete; do not stage unrelated paths.

## Stop and rollback conditions

Invalid source/render/inventory/history, stale base, unknown live state,
unverified blog preservation or a failed gate stops promotion. Keep prior live
surfaces, source files and private recovery material. Static rollback uses current
history and refuses removed content; it never lowers history or restores over
private SQLite. Do not relax tests, add a history-reset flag or use whole-blog
publication to make a Memo-only failure disappear.

## Owner correction follow-up execution

Make the generic host `new`/local `build` work with checkout-relative defaults;
keep `new` confined to `content/memos/` even when a source-selecting operator
config is supplied. Include the empty authoring directory in clones. Preserve
strict present types and all publication/history gates. Implement the explicit
external read/build selection only in ignored private tooling by projecting the
existing private host config; exclude `new`, forward to the shared entry and
clean only the owned temporary projection. Main owns private input changes and
shared task/spec docs. Implement/check agents cover the bounded host entry,
regressions and generic guide; no frozen image sources change. Verify fresh
clone/cwd defaults, absent-only drafts, external-write refusal, real generic and
private read-only builds, real jq types and complete blog/source preservation.
Update actual evidence and the concrete uncommitted path list; the prior Git
commit/archive confirmation remains pending.
