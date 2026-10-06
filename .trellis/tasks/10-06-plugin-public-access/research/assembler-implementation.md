# Assembler and static-runtime implementation evidence

## Implemented boundary

- The assembler reads the strict shared `plugins.public.v1.json` projection and
  exact positive-marker inventory before promotion. `PublicationResult` and
  `artifacts/publication.json` record `pluginAccess`, separately from current
  comments evidence and retained legacy Memo metadata.
- Comments evidence and actual emitted comment sections must agree with the
  built activation. Disabled comments ignores retained export input and retains
  the maximum validated previous tombstone floor without a fabricated digest.
  Re-enablement still refuses an export below that floor.
- New historical manifests validate activation, expected marker inventory and
  the matching retained site/release snapshots. Old manifests without this field
  remain readable for legacy-floor recovery. Missing live snapshots require a
  rebuild; no serving default infers enabled from retained files.
- Both Nginx and the Node assembled-release server gate owned exact/prefix paths
  before method handling or redirects. Node serves no comments backend and keeps
  unsupported comments requests closed even when static comments are enabled.
  Disabled responses are non-cacheable. Nginx tests fixed blog marker paths,
  independently of the Memo alias, with file caching disabled in gated locations.
- Static preview verifies activation and metadata before startup, requires an
  explicit validated Memo candidate for enabled reading, and includes the
  snapshot digest in its lifecycle configuration hash. Package inventory and
  route probes use activation rather than candidate presence.
- The existing independent Memo deployment fixture now explicitly emits a
  comments-off/Memo-on blog projection. The normal verify entry also invokes the
  new isolated plugin runtime fixture after independent Memo checks.

## Checks actually run

- Scoped assembler `check` through `SAM_CONTENT_MODE=none ./sam`: pass.
- Scoped assembler `test` through the same wrapper: **18/18 pass**; the script
  builds the package first. Coverage includes all four snapshots, malformed new
  history, old-history recovery, off/on retained floor, stale re-enable refusal,
  disabled retained-export inputs, caught-promotion activation/history rollback,
  and the actual Node HTTP method/redirect/read-only matrix.
- `bash -n`, ShellCheck and shfmt for `preview.sh` and
  `tooling/plugin-access/check-runtime.sh`: pass. `git diff --check`: pass.
- `tooling/plugin-access/check-runtime.sh`: real Nginx native configuration test
  passes. A responding synthetic comments upstream and a nonempty validated Memo
  publication remain present throughout all four states, a subsequent on/off/on
  cycle, and a legacy release with no markers. The same Nginx process serves each
  pointer switch without reload.
- False paths pass GET/HEAD/POST/OPTIONS/PUT/DELETE 404 checks, including public
  token/admin paths, Memo JSON/CSS/media and bare namespaces. Enabled supported
  fixture routes restore access; Memo served bytes match candidate hashes. Memo
  receipt/private paths stay unavailable. Ordinary blog reading remains 200.
- Source, independent Memo current pointer/receipt and all retained release bytes
  match the fixture's pre-switch preservation inventory. Exact disposable
  containers and their task-created temporary workspace are removed on exit.

## Runtime finding and limits

The real Nginx fixture exposed that retaining the prior `limit_except GET`
access-phase block allowed disabled Memo POST to return 403. The final runtime
uses ordered return-only rewrite checks: marker absence returns 404 first, then
enabled unsupported methods return 403. The host migration must apply the same
ordering; preserving the old method block is not equivalent evidence.

This is synthetic isolated runtime evidence. No owner flag, owner content,
remote Nginx, remote deployment pointer or private service was changed by this
implementation. Actual host and edge verification belongs to the main session.
Broad site/browser/package verification is coordinated separately to avoid
overwriting another agent's selected build output.

## Restrictive caller umask follow-up

The complete gate reached the new host fixture after its other phases passed,
but a caller `umask 077` created the redirected fixture Nginx config as 0600.
A focused reproduction retaining failed-container diagnostics confirmed
`open() "/etc/nginx/nginx.conf" failed (13: Permission denied)`. This was a
fixture file-mode failure, not an activation or upstream correctness failure.

The fixture now explicitly sets only its two synthetic public runtime inputs
to 0644, waits for the synthetic upstream before starting the network-sharing
Nginx, and retains container logs until its exact-ID cleanup. It preserves
private receipts and retained-source modes. The package helper likewise sets
only its task-created Dockerfile/Nginx context copies to 0644, avoiding the same
caller-umask dependence during Nginx image packaging. Shared-marker public modes
are fixed and separately tested by the other implementer. Targeted reruns under
`umask 077` are the justified affected-phase verification; the already-passing
browser suites do not need a redundant rerun for these fixture/context changes.
