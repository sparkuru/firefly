# Memo Publication and Private Runtime Integration

## 1. Scope / Trigger

Read this when changing memo assembly, static build evidence, publication
history, shared input files, proxy/Compose wiring, delivery scheduling or their
integration tests. The pure [memo contract](./memo-contract.md), private
[service](./memo-service-contract.md) and [site](./memo-site-contract.md) retain
their domain owners. No historical Typecho input, production credential,
deployment switch, public runtime listing or SSR is part of this boundary.

## 2. Signatures

`tooling/assemble-publication/src/plugins/memos.ts` exposes:

```ts
interface MemoPublicationOptions {
  readonly siteConfigPath?: string;
  readonly exportPath?: string;
  readonly environment?: Readonly<Record<string, string | undefined>>;
}
loadMemoPublication(repositoryRoot: string, options?: MemoPublicationOptions):
  MemoPublicationInput | null
validateMemoTree(root: string, files: readonly string[],
  input: MemoPublicationInput | null): Promise<void>
decodeMemoMetadata(value: unknown): MemosPublicationMetadata
```

`assemblePublication` accepts optional `memoOptions` and independently loads
the input. Its `PublicationResult` and schema-1 `artifacts/publication.json`
contain exactly six memo metadata fields: `enabled`, `schemaVersion`,
`sourceRevision`, `generatedAt`, `digest`, `tombstoneEpoch`. No caller-supplied
metadata can replace export/HTML validation. `beforePromotionRename(step)` is a
test seam for caught filesystem failures, not a deployment operation.

`tooling/shared/contained-file.mjs` supplies
`readContainedFile(relativePath, repositoryRoot, label, maxBytes?): Buffer`.
The site retains its existing helper path as a facade. The assembler owns
direct pinned TOML/HTML parser dependencies and never imports Astro/site source.

The memo HTTP factory keeps its diagnostic argument and adds the policy last:

```ts
createMemoServer(service, adminHash, diagnostic?, trustProxy?: 'none' | 'loopback')
startDeliveryWorker({ deliver, close, diagnostic?, heartbeat?, schedule? }):
  { stop(): Promise<void> }
```

Host Docker validates Compose; Node/browser commands use `./sam` and
diagram-capable site commands use `./render.sh`. Runtime commands in the image
remain `npm run start`, `npm run worker`, private `admin`, maintenance,
one-shot delivery and backup/restore. Default image startup is still HTTP.

## 3. Contracts

### Input and actual static identity

- Read the selected contained site TOML, parse memo activation through the
  pure config module, then return null disabled before memo config/export/
  environment getters. An unusable unused memo override is irrelevant.
- Enabled loading projects public plugin values independently, checks safe
  `.toml`/`.json` paths and raw UTF-8 bytes, and decodes the exact public wire
  without normalization, sorting, replacement characters or optional digest.
  Files and path components must be contained, regular and nonsymlink.
  Configuration reads are capped at 1 MiB, raw memo exports at 64 MiB, and
  prior publication manifests at 4 MiB. Oversized inputs fail before promotion.
- Share the regular-descriptor reader rather than duplicating comments' older
  permissive input pattern. It applies no-follow/nonblocking flags and optional
  size limits. It does not claim hostile concurrent-parent race protection.
- The existing stream emits five public envelope attributes for schema,
  revision, generated time, digest and epoch; record articles emit only opaque
  public IDs. The route passes the immutable envelope, without a new UI or
  runtime endpoint.
- Parse the copied candidate HTML. Require one live memo stream/form at the
  owning index route and exact ordered IDs, displayed names/bodies/time text
  and datetime against the decoded records. Validate empty state, native
  action/fields and public consent settings. A current marker on stale rendered
  text is not sufficient. Hidden/template counterfeit evidence, duplicates,
  active/nested record markup, private structural fields and shadow routes fail.
- Compare decoded text faithfully, including Unicode/LF/entities. Approved
  literal HTML or email-looking words remain text; they are not executable
  markup or proof of private identity. Existing global credential/source-path
  policies still apply. Actual asset references remain validated.
- Disabled authored aliases remain allowed when they have no plugin-owned memo
  surface. Memo records never become post/page/search/Lab/Terminal records.

### Publication history and target replacement

- Enabled metadata reflects the exact validated envelope; epoch must be at
  least the retained prior memo epoch. Disabled metadata uses false, schema 1,
  `sourceRevision='empty'`, epoch date and null digest, while retaining the prior epoch.
  No runtime/export dependency or duplicate floor field is needed to disable.
- Read prior history through strict contained regular-file/fatal-UTF-8 checks.
  Validate present memo keys/date/revision/digest/boolean/safe epoch exactly.
  Malformed, partial, symlinked or special evidence never becomes epoch zero.
- A valid memo-free legacy schema-1 manifest has zero history. Memo-bearing
  legacy output without memo history requires recovery. Fresh bootstrap permits
  only explicitly selected, decoded memo/comments public inputs in the target
  directories, with no prior publication/HTML/staged trees or unrelated files.
- Load once before target replacement and compare the staged site and final
  release against that same envelope. Serialize only its canonical public
  snapshot to `artifacts/memos/memos.public.v1.json`; no raw siblings/private
  source trees are retained. The snapshot stays out of `dist` and the web image.
- Overrides outside promotion targets stay unchanged. Inputs inside either
  target are consumed on success and preserved on failure; the canonical memo
  snapshot remains under artifacts. Disabled promotion may omit the snapshot
  but preserves history. A fresh export after moderation is explicit.
- Validate before `promoteTogether`; caught promotion failures restore the
  prior artifact/release pair and clean owned candidates. This is coordinated
  repository promotion, not crash-atomic, concurrent or external deployment
  recovery. Deleting/replacing history or downgrading to history-unaware tooling
  is not an accepted rollback procedure.
- The full root Docker builder excludes `artifacts/` and `dist/`, so it starts
  fresh and cannot establish a prior host/deployment epoch. Use the maintained
  wrapped host publication with durable history and the minimal
  `package-runtime.sh` release context when validating retained deletion state.
  Fresh Docker assembly is not evidence of cross-release rollback protection.

### Private proxy and rate identity

- Root `memos` and `memos-worker` services are opt-in. HTTP shares the web
  namespace on loopback 8788, distinct from comments 8787; private services
  publish no host port. Standalone operator Compose uses same-host loopback.
- Both share owner-only persistent data and read-only config/secrets, read-only
  root filesystems, bounded tmpfs, dropped capabilities and no-new-privileges.
  Missing bind inputs are not created automatically. Root identity defaults
  nonroot 1000:1000 with an explicit override; standalone requires an operator
  UID:GID. Inactive root interpolation needs no memo inputs. Align ownership
  instead of broadening private modes. Web/build contexts receive no secrets/DB.
- `MEMOS_TRUST_PROXY` is exactly none (default) or loopback. Loopback requires
  loopback bind, local socket and peer. Accept exactly one literal X-Real-IP
  from raw headers, canonicalize IPv4/mapped IPv6/IPv6, and reject missing,
  duplicate/list/port/invalid addresses before write/rates. Direct mode ignores
  forwarded identity; Forwarded/X-Forwarded-For are not rate inputs.
- The memo Nginx prefix overwrites X-Real-IP, clears forwarded chains, retains
  Host/Origin, and uses bounded timeouts. Unknown v1 remains bounded 404 and
  an absent memo upstream fails closed. Owner operations still authenticate
  at the service; health/unrelated routes are not added as public proxies.
- Memo responses have no-store, restrictive CSP/referrer, nosniff and frame
  denial without duplicate weaker headers. Disable memo access/error URI logs
  so verification tokens cannot reach proxy logs. Diagnostic codes contain no
  recipient/body/Authorization/token. A real outer edge is operator-validated,
  never implicitly trusted through arbitrary forwarded chains.

### Bounded private delivery

- Worker cycles wrap existing SQLite claims/retry/transport, one message every
  15 seconds with one in-flight drain. Errors report bounded status codes;
  scheduled cycles recover, including synchronous injected transport failures,
  without changing moderation or schema. Assign the active promise before
  invoking delivery so synchronous failure cannot suppress later cycles.
- Stop cancels scheduling, awaits active work and closes once. Forced stop
  relies on lease expiry/retry and at-least-once delivery; verification remains
  single-use. Compose provides a 200-second grace against the SMTP total
  180-second deadline.
- Worker health is its private process/tick file, not the image's default HTTP
  healthcheck. Idle freshness is 45 seconds, active freshness 190 seconds.
  A healthy HTTP sibling cannot conceal a dead worker. No health/readiness
  operation probes real SMTP or exposes queued payloads.
- Existing private backup/restore commands retain key/schema/integrity and
  absent-destination rules. Restored old epochs remain subject to publication
  history. Service state never lives under artifact/release targets.

## 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| Disabled with unusable memo config/export/override | Skip input; reject only stale plugin-owned output |
| Bad raw export/config/path/digest/order/private key | Bounded failure, no value-bearing output or promotion |
| Fresh export with stale/changed/hidden rendered records | Reject before replacing either target |
| Candidate epoch below retained history | Refuse rollback; keep prior pair |
| Disabled then stale re-enable | Retained epoch still blocks old export |
| Lost/corrupt/unsafe existing metadata | Require recovery, never auto-zero |
| Valid memo-free legacy or input-only initial bootstrap | Compatible zero floor |
| Caught promotion rename failure | Restore prior targets; exact candidate cleanup |
| Forged/invalid/duplicate proxy address | Reject before submission persistence or use authoritative direct peer |
| Memo service absent or unknown route | Fail closed; last static stream remains readable |
| Missing/unreadable private mounts | Fail startup; do not create/broaden inputs |
| Worker retry/error/forced termination | Bounded private diagnostics and leased retry; no concurrent drain |
| Real deployment/SMTP acceptance unperformed | Report local evidence only |

## 5. Good / Base / Bad Cases

- **Good:** synthetic verification and owner approval produce a strict export;
  actual staged records match it; a retained epoch prevents old restored state
  from replacing a later deletion release.
- **Base:** memo activation/profile remain disabled and no memo input/service is
  required. Existing comments/static defaults stay compatible.
- **Bad:** trust forwarded chains, copy private artifact siblings, validate only
  a digest marker, use sibling HTTP health as worker health, log verification
  URIs, or erase publication history to make stale output pass.

## 6. Tests Required

- Loader/path/raw-byte and malformed/empty/disabled configuration matrices;
  direct assembler API cannot accept unchecked metadata as evidence.
- Actual built site plus parsed staged/final DOM: exact text/order/form,
  swapped export, current markers on stale records, hidden/template/duplicate
  evidence, active markup, Unicode/entities and escaped attribute-looking text.
- Legacy/fresh/lost/malformed/symlink/special history; enabled → disabled →
  stale re-enable; independent comments epochs; public snapshot/input lifecycle;
  injected prepared/promoted rename failures and pair preservation.
- Trust defaults/bind/peer/raw header/IP normalization/spoofed rates;
  worker schedule/no-overlap/retry/stop/health diagnostics; existing service tests.
- Default/memo/comments/combined and standalone Compose syntax, disposable
  nonroot/private/read-only/no-port/health/persistence checks, actual proxy
  headers/auth/unknown/absent behavior and exact-label cleanup.
- Actual no-JavaScript desktop/mobile native POST through a fixture HTTPS edge,
  local certificate-validated mail sink, verification/moderation/export/build/
  publication/deletion/old-restore refusal. No intercepted acceptance response
  substitutes for this integration. Private sentinels stay outside artifacts,
  HTML and proxy/service logs; fixtures never contact real recipients.
  Browser evidence first refuses the untrusted certificate, then trusts only
  the synthetic fixture CA in a disposable NSS store and repeats the native
  flow with normal certificate checks. The owned browser image adds
  `libnss3-tools`; preparing it requires access to the image package repository.
  Neither browser nor service disables TLS validation. Anonymous volumes from
  exact-owned fixture containers must be removed along with those containers.
- Maintained package/root gates, shell syntax/ShellCheck/shfmt, minimal runtime
  image/manifest/inventory equivalence and document/search/Lab regressions.
  Parent completion maps all source acceptance criteria to actual child/joint
  evidence. Local fixtures do not prove operator TLS/SMTP/deployment topology.

## 7. Wrong vs Correct

Wrong: decode the latest export, compare only its epoch, and promote an older
prebuilt memo page that still contains deleted text. Set the disabled epoch to
zero or recover missing history by silently accepting a fresh empty record.

Correct: decode once, compare the actual copied DOM with the exact public
envelope, retain the prior epoch while disabled, serialize only the validated
snapshot and promote the coordinated candidate after all privacy/history gates.
