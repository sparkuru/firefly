# Owner Memo publication operations

Only the owner authors Memo. Visitors read static HTML under `/memos/`; there
is no form, write API, verification mail, worker or persistent publisher service.
The blog and Memo use separate release roots and separate `current` pointers.

## Configure

`tooling/publish-memos/publish.sh new first-note` works without an operator config
and creates an absent-only draft in this checkout's `content/memos/`. The same
entry's `build` works locally without SSH or config, using display name `Owner`
and `.firefly/memos/candidates/`. Paths are resolved from the script's actual
repository root, so a clone can use the same commands from any current directory.
The tracked empty source directory belongs to authoring; generated candidates
and private configuration remain ignored. The blog reads only `posts/` and
`pages/` and does not process this Memo collection.

For custom display identity or publication, copy `config.example.json` to the
ignored `config/memos-publisher.json`, restrict it to owner-owned mode 0600 and
replace deployment examples locally. Explicit configs require `displayName`;
omitted `sourceRoot` and `outputRoot` select the current checkout's defaults.
Present invalid/null fields fail before the wrapper or transport. Explicit
source/assets/output roots must be canonical nonsymlink paths. Source and assets
must stay separate from candidate/deployment output and blog build/release paths;
assets may be contained in the source root. Repository-local generated output stays
under `.firefly/memos/`. Optional `assetsRoot` defaults to the source's `assets/`.

`new` always creates in the repository-local authoring directory, including when
an operator config is supplied for compatibility. That config cannot redirect
creation outside the checkout. Do not use a production source selection as the
creation target for a clone.

An owner-only adapter under ignored `tooling/private/` (also excluded from
Docker build context) can select an external source for read/
build/publication by creating a private temporary config projection and calling
the shared publisher. It does not implement another renderer or deployment
pipeline. Keep exact external paths and connection inputs out of tracked scripts
and examples. The private adapter excludes `new`; author external Markdown with
your chosen editor, and use the generic `new` for repository-local drafts. When
a private adapter selects a sibling authoring directory, its layout may be:

```text
authoring/
  posts/
  pages/
  memos/
    first-note.md
    assets/
```

The selected `sourceRoot` is the Memo leaf, not the shared parent or either blog
collection. Version/back up originals in their owning workspace. Local promotion
additionally requires an existing owner-controlled `deploymentRoot`.

Remote publication also requires an existing owner-writable `deploymentRoot`,
`sshTarget`, a regular absolute `knownHosts` file and `remoteImage`, the exact
reviewed `sha256:<content-id>` of the publisher image already loaded on that host.
`sshConfig` selects a regular absolute SSH config, or `/dev/null` for the explicit
config fallback. `remoteSudo: true` selects only `sudo -n docker`; provisioning
and permission changes remain separate operator work. Key authentication,
`BatchMode=yes`, password refusal and strict known-host checking are enforced.
No connection file/key is mounted in any publisher container. Image operations
are ephemeral, have no network, and mount only the selected Memo deployment.

`initialDeletionFloor` defaults to zero and applies only to a proven empty
bootstrap. Before migration, the operator must retain and validate the maximum
applicable legacy floor. Supply that floor or stop for recovery; do not infer
zero from an absent file. Established independent history is authoritative and
is never reset by this setting. The blog manifest retains legacy floor evidence
only; it no longer supplies Memo bodies or current independent state.

## Create and publish

Run the host entry directly; it owns SSH. Node rendering/validation uses `sam`.
The root `memos` npm alias exposes only the bounded core CLI, not SSH orchestration.

```sh
tooling/publish-memos/publish.sh new first-note
# Edit the draft locally; retain id/createdAt and set draft: false to publish.
tooling/publish-memos/publish.sh build --config config/memos-publisher.json
tooling/publish-memos/publish.sh publish --dry-run --config config/memos-publisher.json
tooling/publish-memos/publish.sh publish --config config/memos-publisher.json
```

`build` validates a prospective candidate against null history without contacting
or advancing the destination. `publish` and `publish --dry-run` read and validate
established destination history before building. Dry-run writes only a local
candidate: no upload, remote mkdir or pointer change. `publish --local` runs the
same history/build/validation/promotion sequence on the selected isolated local
deployment instead of SSH. All candidates remain owner-retained for inspection.
No watch daemon is started, and no blog build/sync script is invoked.

Remove a source file or move it to draft and publish to withdraw it. Its ID is
retired permanently; restoring an old source cannot resurrect it. To publish a
new note later, create a new ID. Edits retain ID and creation time.

For rollback, retain the earlier **candidate**, then run:

```sh
tooling/publish-memos/publish.sh rollback --prior-candidate /absolute/retained-candidate --config config/memos-publisher.json
```

Rollback builds a new validated sequence against current remote history. It
refuses retired records and never repoints an old receipt or changes the blog.
The remote immutable release history is retained separately; copying a prior
candidate for owner inspection is an explicit operator action.

## Static mount, preview and recovery

Review `nginx-static.conf.example` within the existing HTTPS server before
installing the `/memos/` alias to `current/public/`. Stable Memo HTML/style/media paths use `Cache-Control: no-cache, no-store` so clients
fetch current bytes after publication. `no-store` asks browsers and
intermediaries not to store the response. Overriding edge rules can still change
that policy, so verify actual CDN response headers as well as origin headers.
The gate uses a fixed blog `current` root, independently of the Memo alias.
Keep the example's named 404 handler when a surrounding server has a global
error page, so an internal redirect cannot discard the non-cacheable headers.
Only that public subtree is served: `receipt.json`, `established`, incoming candidates and sources remain
private. Never serve the deployment root. Select a deployment root outside the blog deployer's recursive copy, ownership
and cleanup scope. Full blog deployment switches only
the blog pointer and preserves this independent mount and history.

The site flag `plugins.memos.enabled` controls discovery and public access.
Deploying a blog release with false closes `/memos` and all descendants with
404, while retaining the independent Memo release and accepted history. The
combined owner push skips Memo publication when false; standalone publication
does not change the blog's activation. The flag never loads
Memo config/source/export or generates the page; `/memos/` stays reserved even
when discovery is hidden. An enabled blog-only build expects an external static
mount. Explicit combined preview/package selects a previously validated candidate:

```sh
FIREFLY_MEMOS_CANDIDATE=/absolute/validated-candidate ./preview.sh start
FIREFLY_MEMOS_CANDIDATE=/absolute/validated-candidate ./preview.sh package
```

Neither command builds or fetches Memo. Enabled Memo requires that explicit
validated input for local preview/package. Disabled Memo may retain a selected
artifact, but its public routes remain closed. Missing/invalid selected input fails.
Astro `dev` explicitly rejects a selected combined candidate; use static `start`
or `preview` for composition. Background/Compose runtime receives only the
validated `FIREFLY_MEMOS_PUBLIC_ROOT`, mounted read-only.
The public-only runtime target copies only `public/` into a separate tree and
compares its exact inventory/digests independently of the blog inventory.
`compose.memos-static.yml` offers an explicit public-only read-only bind override
for an already reviewed `FIREFLY_MEMOS_PUBLIC_ROOT`; validate its parent candidate
with the publisher before using it. Default/comments Compose remains independent.

A failed upload leaves the accepted release intact. Expected-base checks and the
Memo-only lock reject stale concurrent updates. If SSH fails after promotion,
the host command probes current state and reports success only for the exact
candidate receipt; failed inspection reports an ambiguous outcome and requires
inspection before retry. Incoming cleanup is bounded to that operation's unique
staging directory. Established marker/receipt loss fails closed; retain the
matching immutable release and restore through reviewed recovery, never bootstrap
again or simply delete history. Retired interactive data/keys/backups remain
owner-managed private recovery material; this workflow neither imports nor deletes
them. Comments state and behavior remain separate.

## Validation

- `SAM_CONTENT_MODE=none ./preview.sh render npm run test:memos:ops` exercises
  host orchestration with synthetic SSH/Docker/jq adapters and real publisher
  transitions. It proves command/failure behavior, not actual SSH/TLS deployment.
- `tooling/publish-memos/ops/check-runtime.sh` runs filesystem preservation,
  fresh rollback/withdrawal/stale refusal, then an exact-owned disposable static
  Nginx image/container with no private publisher metadata in its context.
- Maintained Memo Playwright tests serve prebuilt independent output on static
  desktop and narrow mobile plus interactive mobile, including no form, links,
  owned assets, focus, enlarged text and bounded overflow. Real devices and
  assistive technology require separate evidence.
