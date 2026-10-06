# Research: Release-bound plugin access and private push integration

- Query: How can the public activation switches control private push and HTTP access while preserving independent Memo releases, comments data, and rollback?
- Scope: internal; private deployment helpers read only, with operational identities omitted here
- Date: 2026-10-06

## Findings

### Files found

| File | Responsibility |
| --- | --- |
| `tooling/push-majoim/sync.sh` | Ignored owner-local build, Memo publication, upload, static-pointer switch and Markdown-mirror promotion |
| `tooling/push-majoim/readme.md` | Ignored operational procedure and existing independent rollback description |
| `tooling/private/memos.sh` | Ignored external-source adapter that projects an owner-only config into the shared publisher |
| `tooling/publish-memos/publish.sh` | Generic authenticated host entry; independent candidate validation and guarded promotion |
| `tooling/publish-memos/src/index.mjs` | Memo expected-base lock, accepted-history checks, and independent pointer ownership |
| `nginx.conf` | Container-local static routes, unconditional Memo alias, and unconditional private comments proxy |
| `Dockerfile` | Generic static runtime; optional validated Memo public-only composition |
| `compose.yml` | Optional private comments process sharing the web network namespace |
| `plugins/comments/compose.yml` | Operator-owned same-host comments runtime template with independent config, secrets, and data |
| `preview.sh` | Validated publication preview and runtime image packaging |
| `tooling/assemble-publication/src/index.ts` | Assembled release, sorted inventory, and repository build transaction |
| `tooling/assemble-publication/scripts/check-runtime-metadata.mjs` | Legacy Memo-history and runtime inventory validation |
| `services/comments/tests/provisioning.test.ts` | Private listener, no public service port, host routing and provisioning assertions |
| `tooling/publish-memos/ops/check-runtime.sh` | Actual read-only Nginx fixture for the independent Memo artifact |
| `services/comments/ops/nginx-hosts.conf.example` | Generic host-selected edge comments proxy example |

### Existing behavior and the gap

- Private sync always calls the Memo publisher after the SSH probe and before either blog upload (`sync.sh:552-562`). `publish_memos` has no activation check (`sync.sh:256-281`). Its top-level executable requirement is also unconditional (`sync.sh:531`), so merely skipping the call is insufficient for a disabled plugin whose tooling is absent.
- Current no-build validation checks a root release, selected sentinel files, publication metadata existence, file count and index hash (`sync.sh:283-302`). It does not establish that plugin switches belong to that release, that the manifest inventory matches all emitted files, or that the selected site configuration is unchanged since build. Reading today's TOML after a stale no-build release would pair different inputs.
- Container Nginx currently redirects `/memos` and exposes all `/memos/` public bytes independent of activation (`nginx.conf:93-106`). It also proxies `/v1/comments/` regardless of the static switch (`nginx.conf:65-81`). A missing service can fail requests, but that is not deliberate plugin disablement. `/v1` and unknown `/v1/` already fail with bounded JSON 404 (`nginx.conf:55-63,83-91`).
- Existing blog `publication.json.memos.enabled` is deliberately false historical metadata, not current activation (`tooling/assemble-publication/src/index.ts:587-589,640-645`; `scripts/check-runtime-metadata.mjs:7-12`). `comments.enabled` describes the static public export rather than the complete route policy (`src/plugins/comments.ts:27-32,65-75`). Neither is a substitute for a new explicit activation projection.
- Static/public source loading already resolves and validates a selected site config override (`apps/site/src/lib/site-config.mjs:29-59`) and returns activation for both comments and Memos (`site-config.mjs:266-267`). Reuse this authority; shell TOML scraping would duplicate schema, path and override rules.
- Blog build transaction promotes its artifacts and assembled release together on caught failures, but is not crash-atomic (`publication-contract.md:166-189`). External deployment remains a different boundary; research must not claim a universal transaction.

### Smallest generic protocol recommendation

1. Add a strict public-only activation artifact owned by the build/publication boundary, separate from legacy Memo history and comment export metadata. It contains schema version, the supported plugin IDs and booleans, plus evidence tying it to the selected build input and release. No private `configPath`, runtime path, host identity, upstream, source body or secret is required.
2. Capture activation from the same validated site configuration used for the build, not from a second independent read after rendering. A site build handoff consumed by the assembler is preferable to letting the private helper infer HTML/navigation or reuse legacy metadata. Detect a changed input during the build instead of accepting mixed evidence.
3. Make the deployable release carry this evidence and any route-gate files, so packaging, Docker serving, host deployment and rollback use the same policy. Validate exact known IDs, scalar types, missing/extra entries and the corresponding release inventory. Activation must remain independent of reading Memo bodies/history.
4. For `--no-build`, require the release evidence and reject stale selected-site-input/activation evidence before remote writes. Respect the same override path used for the original build. A switch changed after the build should require rebuilding rather than silently publish old HTML with new route policy. Validate the entire release/inventory, not only `index.html`.
5. Keep route ownership explicit for every currently supported plugin. There are two activation projections today: `comments` and `memos`; Experiments are a separate architecture boundary. Future plugin registration should require a public access disposition instead of becoming an unchecked route exception.

This is a project-owned generic contract change. Actual host choices, external source selection and privileged Nginx installation remain in the ignored private adapter, not tracked defaults.

### Route gate options

The simplest deployment coupling is **request-time gate files inside the selected static release**. Emit a safe enabled marker for each true plugin; validate marker identity and prevent an arbitrary/extra marker from enabling a plugin. Gate the relevant Nginx locations with a file-existence check against the static release root, then perform their existing redirect/alias/proxy behavior only when enabled. Absence closes access. A malformed protocol must fail deployment validation; the runtime fallback remains closed.

- For Memos, both exact `/memos` and prefix `/memos/` must return 404 when disabled. Cover HTML, styles and media, and retain normal GET/HEAD-only behavior and public-only alias when enabled. Do not remove the independent Memo `current`, receipt, image or releases.
- For comments, gate the exact namespace boundary and `/v1/comments/` before the proxy, for every method and endpoint. Preserve the existing bounded no-store JSON 404 shape for disabled/unknown API resources. Disabled static output emits no UI or browser submission code. The private listener, notification worker, secrets and databases can remain operational; public activation does not imply deleting or resetting private state.
- A route-gate file must resolve relative to the **blog/static root**, not the Memo alias root or comments storage. Container root and operator current-release root differ; the generic protocol defines the safe relative path, and the private adapter selects its own root.
- With request-time file checks, a verified static `current` switch also switches access policy. Per-sync Nginx reloads and a second independently mutable policy pointer are unnecessary. Install/upgrade the route-gate Nginx logic once through the private adapter, validate and reload it, and use release switching afterward.
- An alternative is generated per-release Nginx include snippets. This requires config syntax validation, reload, and rollback for every activation change, plus careful release/policy ordering. It introduces more partial states than request-time markers. Choose it only if the actual host topology makes marker checks unsuitable.

These are design candidates, not proven Nginx behavior from this research. An actual pinned Nginx fixture must prove request-time checks, alias/root resolution, disabled response headers and pointer-switch behavior before adopting the marker approach. Do not rely on regex tests of config text alone.

### Enablement prerequisites

- Memos true: the selected independent artifact/publisher must validate and be reachable from the alias boundary before the new static release exposes it. Preserve the shared publisher's immutable image, strict host-key checks and history validation. The private adapter already refuses config replacement and selects its source separately (`tooling/private/memos.sh:28-56`); leave those decisions there.
- Comments true: verify the owner-local service/upstream and compatible route catalog before opening the public proxy. Reuse private health/readiness and existing route-catalog contracts. A healthy listener is not alone proof of route coverage. Do not copy local TOML or secrets into the static release or change the runtime UID/data modes.
- False plugins should not require their publication/runtime prerequisites merely to close their route. Memo source/config/validator checks should be conditional, otherwise a broken or absent disabled publisher can prevent closure of the old public surface.
- Missing selected Memo artifact must never fabricate an empty stream. Preview/package's explicit artifact selection already validates a candidate (`preview.sh:77-80,545,590-592`). A disabled combined package may retain a validated public mount for the disablement preservation test, but it must still return 404 publicly.

### Private sync sequencing and failure handling

Recommended practical order:

1. Build or verify one authoritative local release, activation artifact and selected-input freshness.
2. Read-only host checks: current static target, supported route-gate Nginx installation, service/validator prerequisites only for enabled plugins, and required ownership. Record the old static/mirror state and bounded policy evidence.
3. Stage and verify static bytes and source mirror before switching any blog pointer. Keep existing destinations untouched on validation/upload failure.
4. If Memos is enabled, run its guarded independent publisher before exposing a newly enabled route. If disabled, log that publication is skipped and old Memo history/data are retained.
5. Under a deployment-only lock or equivalent expected-current guard, verify the recorded static base again, atomically select the new static release/policy, then promote/verify the mirror; preserve backups until completion. Verify public routes and expected status after the switch.
6. If mirror/policy/post-switch verification fails, restore the prior mirror and prior static target only when the active target still equals the one this run installed. Do not clobber a later successful deployment. Record failure honestly if rollback cannot be established.

The present `sync.sh:417-435` static switch does not have a guard against a concurrent deployment, and `rollback_current_release` overwrites `current` without comparing its installed target (`sync.sh:514-521`). Coupling access to that pointer makes guarded restore especially relevant. Serialize private deployments or use compare-before-switch/rollback; do not claim the existing unconditional rollback is concurrency-safe.

**Memo publication remains independent.** The generic publisher compares expected receipt base and promotes under its Memo-only lock (`tooling/publish-memos/src/index.mjs:125-145`). If SSH promotion fails, it probes the accepted digest before declaring failure (`publish.sh:278-284`). An accepted Memo release must not be reversed by selecting an old Memo symlink: rollback is a new candidate preserving retirement/deletion history (`memo-publication-runtime-contract.md:108-111`). Therefore a later blog/policy failure can restore old blog visibility while leaving newly accepted Memo bytes in place. Existing warning about this independent outcome is correct (`sync.sh:147-148`); update it to include policy stage failure, not promise combined rollback.

No ordering completely hides an enabled-to-enabled Memo update until the separate blog pointer switches: an already enabled old release can serve the independently promoted Memo release. That is a deliberate existing ownership boundary, not proof of all-or-nothing combined publication. Closing a disabled target route is achieved only when that target static policy is actually selected; a failed preflight leaves the old accepted deployment unchanged.

### Dry-run and Nginx installation

- Dry-run may write local build candidates/logs but performs no remote staging, uploads, activation writes, reloads or pointer changes. Current Memo dry-run reads history and locally validates a candidate, then returns before uploading or running remote promotion (`publish.sh:239-262`). Preserve that distinction in logs.
- Disabled dry-run skips Memo publication and predicts bounded route closure, while still inspecting the installed route-gate capability. If host Nginx is not prepared, report this as a prerequisite rather than silently mutating it during dry-run.
- A one-time/upgrade Nginx apply must use an exact owner-approved host-selected block, retain the old regular config by checksum, create a bounded candidate, test configuration before reload, and inspect the expected route/host afterward. Leave unrelated hosts, locations, TLS and proxy choices unchanged. If validation/reload fails, restore the prior config and validate/reload the restore; do not claim successful disablement based only on writing a file.
- Remove the sync helper's broad post-switch ownership repair or prove it cannot touch independent plugin roots. Existing spec explicitly requires Memo bytes **and private receipt ownership** to survive the blog helper's recursive operations (`memo-publication-runtime-contract.md:131-135`). This research did not inspect any actual remote ownership helper.

### Required focused validation

- Same-build activation handoff and malformed/missing/extra protocol rejection; no-build unchanged acceptance and changed switch/config/release-byte rejection before remote writes.
- Real Nginx matrix: both false, each enabled alone, both true; retained mounted Memo content and a live synthetic comments upstream must still be unreachable when their switch is false.
- Include exact namespaces, deep Memo media/style paths, comments submission/verification routes and methods, unknown `/v1/`, URI normalization and sibling-prefix nonmatches. Enabled Memo retains public-only inventory and security/no-store headers.
- Switch false/true/false by replacing the static release pointer; assert gate changes and independent Memo pointer/receipt/private comments store do not change merely from disabling. Container packaging must use identical activation evidence.
- Mock private push: disabled Memo means no adapter call, including absent adapter/config; enabled publication failure prevents exposure; dry-run has no remote mutation; manifest/input stale failure precedes Memo publication; Nginx validation/reload failures preserve/restore old configuration; blog failure reports any already accepted Memo update.
- Concurrent base change must refuse/avoid overwriting another deployment in promotion or rollback. Interruptions must leave a recoverable staged tree and precise accepted-state evidence.
- Existing provisioning text assertions (`services/comments/tests/provisioning.test.ts:30-43`) and Memo Nginx fixture (`tooling/publish-memos/ops/check-runtime.sh:101-110`) need to reflect the new policy, but cannot replace the runtime matrix. Runtime fixtures currently construct minimal blog trees and must include valid activation evidence (`check-runtime.sh:72-83`).

### Related specs and external references

- `.trellis/spec/frontend/site-configuration-contract.md`: selected-site input, canonical plugin projections; currently states Memo navigation-only semantics and therefore requires a deliberate contract update.
- `.trellis/spec/frontend/publication-contract.md`: validated inventory, legacy history distinction, repository versus external deployment boundaries.
- `.trellis/spec/frontend/memo-publication-runtime-contract.md`: independent receipt/history/current, strict SSH, public-only mount and preservation of private ownership.
- `.trellis/spec/frontend/comments-publication-contract.md`, section 9: plugin-owned private runtime/data, host-specific public proxy, route catalog and normal enablement requirements.
- `.trellis/spec/frontend/architecture-contract.md`: static core, plugin/service ownership and Memo independence; currently describes navigation-only activation.
- `.trellis/spec/frontend/development-runtime.md`: wrapper execution, package inventory and genuine runtime evidence.
- External references: none fetched, in accordance with the scoped no-network investigation. The repository uses `nginx:1.28-alpine` for static runtime (`Dockerfile:25`) and an authenticated generic Node publisher boundary. Concrete Nginx behavior should be proven by that runtime fixture rather than inferred from this report.

## Caveats / Not Found

- No SSH, network request, production credential file, external note body or actual remote Nginx configuration was read. Main-session inspection owns the real host-selected block, canonical static root, edge proxy location, privilege behavior and ownership-helper scope.
- Exact operational host/user/path/image values found in ignored helpers are intentionally absent from this tracked report; cited code anchors identify their roles only.
- No project/private code, configuration, spec, task metadata or Git state was changed by this researcher. This file is the only owned output.
- New protocol names, marker paths, operation locks and rollback storage locations above are design choices, not established APIs. Main should select the concrete minimal representation after receiving host constraints and the other schema/build research.
- A successful future sync can close server access; it cannot erase previously downloaded browser/offline copies. No content deletion is needed or recommended.
