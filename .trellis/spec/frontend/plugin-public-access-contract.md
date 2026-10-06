# Plugin Public Access Contract

## 1. Scope / Trigger

Read when changing plugin registration/activation, site build state, assembler
evidence, static serving, runtime packaging or owner synchronization. Current
plugins are comments and Memo; Experiments and presentation adapters keep their
separate contracts. An `enabled` flag controls public availability, not merely
discovery. Independent publisher/service data has a separate lifecycle.

## 2. Signatures

`plugins/public-access.mjs` and its declaration own:

```ts
decodePluginAccess(value: unknown): PluginAccess
pluginAccessFromConfig(config): PluginAccess
serializePluginAccess(access): string
enabledMarkerPaths(access): readonly string[]
pluginForPublicPath(decodedPathname): 'comments' | 'memos' | null
```

The registry constants are `PLUGIN_IDS`, `PLUGIN_PUBLIC_ROUTES`,
`PLUGIN_ACCESS_PATH = 'plugins.public.v1.json'`,
`PLUGIN_MARKER_ROOT = 'plugin-access'` and
`PLUGIN_ENABLED_MARKER_CONTENTS = 'enabled\n'`.

```json
{
  "schemaVersion": 1,
  "plugins": {
    "comments": { "enabled": false },
    "memos": { "enabled": false }
  }
}
```

`plugins/public-access-files.mjs` owns asynchronous
`readPluginAccess(root)` and `writePluginAccess(root, access)`. The site build
integration writes from its frozen selected `SITE_CONFIG`. The assembler stores
the same projection in `artifacts/publication.json.pluginAccess` and includes
the release JSON/markers in the exact inventory.

The contained owner helper runs through `sam`:

```sh
./sam node apps/site/scripts/plugin-access.mjs current
./sam node apps/site/scripts/plugin-access.mjs check --release-root /app/dist
./sam node apps/site/scripts/plugin-access.mjs compare --release-root /app/dist
```

`current` and `compare` accept optional `--expected-comments-origin` containing
a canonical HTTPS origin. Enabled comments must match that managed origin;
disabled comments does not require a runtime-origin match. `check` validates
the built snapshot without importing the current site configuration.

## 3. Contracts

### Configuration and artifact authority

- Missing activation defaults false through the existing plugin parsers. Exact
  projection fields, schema 1 and real booleans are required; reject accessors,
  decorated/nonplain objects, extra plugins/fields and unsupported versions.
- Registry IDs must match all tracked plugin manifests. Registering a plugin
  also requires its owned-route policy and runtime coverage; a manifest alone
  cannot bypass activation.
- Emit the snapshot from the same parsed config used for UI/SEO, including a
  validated `FIREFLY_SITE_CONFIG_PATH` override. Do not independently grep TOML
  or use `publication.memos.enabled` as a current flag.
- Each true value emits exactly `plugin-access/<id>.enabled`; false emits none.
  Owned public snapshot/marker files are mode 0644 and marker directories 0755,
  independent of the caller's umask. No permission changes reach private data.
  Marker content is exact, files are regular/nonsymlink, no unknown entries or
  directories are allowed. JSON/marker disagreement fails before deployment.
- Reserve the snapshot and marker namespace against authored output collisions.
  Rewriting an owned prior snapshot removes its old marker set; unowned or
  symlinked collisions fail rather than being overwritten.
- These public artifacts contain no origins, owner identity, private paths,
  secrets, source bodies or private runtime settings. Public file permissions
  remain readable by the static runtime.
- Historical manifests without `pluginAccess` remain readable for floor
  recovery. Missing activation in an artifact selected for live serving or
  synchronization requires rebuilding or closes plugin routes; retained bytes
  never imply enabled.

### Public route and data boundaries

| Plugin | Owned exact/prefix routes | False behavior |
| --- | --- | --- |
| comments | `/v1/comments`, `/v1/comments/` and descendants | 404 before proxy/CORS/method handling; no embedded comment section/form/data in newly built posts |
| memos | `/memos`, `/memos/` and descendants | 404 before redirects/method handling/alias reads; no discovery or sitemap entry |

Gate Memo public JSON, CSS and media as well as HTML. Gate every publicly
routed comments branch, including visitor tokens and authenticated admin URLs.
GET/HEAD/POST/OPTIONS cannot override false. Malformed requests retain the
owning strict HTTP/path error behavior. Canonical host/HTTPS redirects continue
to the gated canonical endpoint.

Preserve ordinary article/Experiment routes and shared CSS. Private loopback
health, readiness, metrics, maintenance and owner operations remain separate;
public deactivation does not stop processes, reset DBs or erase exports,
receipts, established markers, outboxes or immutable releases.

### Runtime and synchronization

- Node static serving and Nginx consume validated release state. Nginx uses a
  return-only regular-file gate rooted at the explicit blog release, independent
  of the Memo alias. Never use alias-dependent `$document_root` for gate lookup.
- Keep enabled-file cache checks fresh across blog-pointer changes. Disabled
  route responses are non-cacheable; verify actual origin and edge behavior.
- A Memo method rejection uses a return-only method test after the activation
  gate. An access-phase `limit_except` can produce 403 before the required
  disabled 404. If a host has a global `error_page`, use a named plugin 404
  handler with no-store/security headers so an internal redirect preserves them.
- The blog pointer selects its static bytes and activation markers together.
  A retained Memo mount or running comments upstream cannot override false.
  Combined preview/package validates the same projection and public-only input.
- Owner sync verifies the selected current flags against the built snapshot,
  including `--no-build`; toggled flags require rebuilding. Validate exact
  artifact/manifest inventory and runtime readiness before any publication.
- Do not assume an SSH login shell is POSIX sh. Complex probes must use an
  explicit interpreter or shell-neutral names and syntax. In Zsh, `path` changes
  PATH and `status` is read-only; use `request_path` and `http_status` instead,
  and exercise the actual generated probe under both sh and the target shell.
- Disabled Memo skips combined-sync publication and preserves its current
  receipt/history. Enabled Memo retains independent publication and partial-
  success reporting. Standalone explicit owner publisher operations retain
  their separate interface and do not enable public routes by themselves.
- Enabled comments requires its prepared matching private upstream and route
  configuration. An unsupported external write origin fails explicitly; do not
  auto-provision or expose a broken proxy.
- `--dry-run` performs local generation/read-only probes only. Never upload,
  change a pointer, install routes or reload a service in that mode.
- One-time edge-gate installation retains a backup, syntax-tests and reloads the
  existing host Nginx. Subsequent flags follow ordinary blog switching. Blog
  rollback restores its access markers; independent Memo history must never be
  reverted by selecting an older Memo receipt.
- Apply permissions only to the new blog release/source mirror. A recursive
  chown over a shared web root changes retained plugin owners and is forbidden.

### Historical floor preservation

Disabling comments emits no public content digest but retains at least the
maximum validated previously published `tombstoneEpoch`. Re-enabling with a
lower export epoch still fails. Deactivation is not a history reset. Legacy
Memo six-field metadata retains its own floor and compatibility meaning,
separate from the new activation projection and schema-2 owner receipts.

## 4. Validation & Error Matrix

| Condition | Required result |
| --- | --- |
| Unknown plugin/schema/field, bool string or accessor | Strict decoding error before artifact use |
| Missing JSON or marker mismatch/unknown/symlink entry | Rebuild/input error; no inferred enabled state |
| Reserved artifact collision or unowned marker directory | Refuse write; leave existing content untouched |
| Current flags differ from prebuilt release | Refuse `--no-build`; request a normal build |
| False with a retained nonempty mount/live upstream | 404 for all owned routes and relevant methods |
| True with missing prepared runtime/wrong managed origin | Preflight failure before publication |
| Disabled comments after positive history | Build succeeds with retained deletion floor |
| Re-enable export below retained floor | Existing rollback guard refuses publication |
| Upload/promotion/post-switch validation fails | Report failure and recover blog state where supported; report any independently accepted Memo |
| Cached stale marker decision after pointer change | Runtime test failure; do not claim switch support |

## 5. Good / Base / Bad Cases

Good: close Memo while keeping its exact old bytes/history, then restore access
through a new enabled blog release. Base: both plugins default false and ordinary
static reading works. Bad: hide a link while still serving the old alias, skip a
publisher without closing its route, or treat deactivation as deletion-floor zero.

## 6. Tests Required

Exercise all four state combinations, alternate config, malformed/unknown
projection, marker closure, stale-marker removal and unowned/symlink collision
refusal. Assert site UI/SEO and exact assembler inventory use the same state.

Use a nonempty retained Memo artifact and responding synthetic comments upstream
for runtime tests. Assert bare/prefix paths, JSON/style/media, GET/HEAD/POST/
OPTIONS, private receipt exclusion, shared article reading and on/off/on pointer
switches without restarting Nginx. Hash retained data/history through toggles.

Test positive comments floors across off/on, stale re-enable refusal, missing
legacy activation, repeated assembly, private sync no-build/dry-run/failure/
rollback/statuses and exact resource cleanup. Distinguish synthetic positive
states from actual owner-host acceptance; never submit real comments or mail
merely to test disabled access.

## 7. Wrong vs Correct

Wrong: `if (!site.plugins.memos.enabled) hideLink()` while an independent alias
still exposes the retained page, or publish based on `publication.memos.enabled`.

Correct: render the selected activation, validate its exact release marker set,
gate public requests before serving/proxying, and preserve independent data
and history while switching the blog release.
