# Memo publication/runtime implementation plan

## Activation and dependencies

Contract `c9885e6`, service `bcbca34` and site `f5bc47c` are accepted/archived.
The owner approved the latest complete plan and explicitly requested
implementation on 2026-10-05. Main activated this child; the parent remains
the planning integration record. Curate specs/research only in both context
manifests; source
files are read during execution, not registered as injection entries.
The context validator reports that the existing comments contract exceeds the
injection byte cap. During dispatch, explicitly load its relevant full sections
from the file as fallback; do not change the generated cap or assume truncated
injection is complete.

## Ordered checklist

1. Load `trellis-before-dev` for shared static inputs, publication, service
   deployment plumbing, Nginx/Compose, wrappers and docs. Snapshot dirty paths;
   preserve parent/runtime planning artifacts and owner-only config/data.
2. Extract contained-file utility to `tooling/shared/` with declarations and a
   compatible site facade. Add exact assembler-owned parse5/smol-toml dependencies
   and lock updates; verify pinned APIs/licenses and third-party notice policy.
   Add narrow site stream envelope evidence and record IDs, without UI changes.
3. Add independent assembler activation/public config/export loading; strict
   bytes/paths and disabled short-circuit. Validate actual candidate DOM, native
   form and envelope equality. Keep all existing comments/global/privacy rules.
4. Add exact six-field memo publication metadata with retained disabled epoch;
   strict legacy/prior-manifest handling and validated memo/comments input-only
   bootstrap. Block memo-bearing legacy output with no epoch history. Serialize
   the validated public snapshot into artifacts only. Validate the copied site
   and final release; prevent unchecked metadata bypass. Exercise pair rollback
   with bounded promotion fault injection and exact candidate cleanup.
5. Add explicit service proxy trust/config/address normalization; default direct
   mode remains compatible. Add an injectable delivery worker around existing
   claims with no overlap, bounded health/diagnostics and signal shutdown; update
   image command support while preserving default HTTP startup.
6. Add root memo HTTP/worker profile and standalone operator Compose template,
   private no-port topology, mount-compatible identity and refusal of missing
   readonly inputs. Add memo Nginx prefix/headers and generic host-scoped example.
   Validate default inactive profiles without requiring memo env/files.
7. Add synthetic publication/proxy/worker/lifecycle fixtures. Build actual site
   output; use local TLS mail sink or injected transport, never real recipients.
   Provide a fixture HTTPS edge for actual native same-origin browser POST and
   fixture CA trust for local SMTP; no service TLS-validation bypass.
   Exercise approve/export/build/publish/delete/restore/stale refusal together;
   keep fixture tokens/config/DB private and scan artifacts/release for sentinels.
8. Wire independent memo delegates and focused static/browser integration into
   maintained root gates in dependency order. Update runtime packaging metadata
   checks without adding private/service inputs to the web-only context.
   Write operation/worker/export/backup/disable/rollback docs with placeholders.
9. Run focused checks, full repository gates, disposable runtime checks and
   desktop/mobile no-JavaScript inspection. Restore default disabled fixture
   output before ordinary browser gates. Inspect full source and record diffs.
10. Dispatch independent full-scope `trellis-check`; fix findings and update
    owning specs. Main session writes final child evidence and maps all eight
    parent acceptance criteria to accepted child plus integration results. Seek
    the required concrete commit-plan review, then archive only completed tasks
    and record journal with exact scopes; no implicit deployment or push.

## Validation commands and ownership

All Node/browser commands use tracked content through approved wrappers:

```bash
FIREFLY_CONTENT_ROOT="$PWD/content" ./sam npm --prefix tooling/assemble-publication ci
FIREFLY_CONTENT_ROOT="$PWD/content" ./sam npm --prefix tooling/assemble-publication run check
FIREFLY_CONTENT_ROOT="$PWD/content" ./sam npm --prefix tooling/assemble-publication run test
FIREFLY_CONTENT_ROOT="$PWD/content" ./sam npm --prefix services/memos ci
FIREFLY_CONTENT_ROOT="$PWD/content" ./sam npm --prefix services/memos run check
FIREFLY_CONTENT_ROOT="$PWD/content" ./sam npm --prefix services/memos run test
FIREFLY_CONTENT_ROOT="$PWD/content" ./sam node --test plugins/memos/tests/*.test.mjs
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run test:memos
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run prepare:test:memos
FIREFLY_CONTENT_ROOT="$PWD/content" SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e:memos
./verify.sh
```

Define maintained focused runtime/publication integration scripts during
implementation and record their exact commands/results. Do not substitute
source inspection or mocked frontend response HTML for actual proxy/service
integration. Host Docker boundaries (outside `sam`):

```bash
docker compose config --quiet
docker compose --profile memos config --quiet
docker compose --profile comments --profile memos config --quiet
docker compose -f plugins/memos/compose.yml config --quiet
services/memos/ops/check-image.sh
./package-runtime.sh
```

Supply synthetic owner identity/input mounts where required; do not print secret
values through unredacted `docker compose config`. Validate comments-only too.
Actual disposable probes require exact task labels, owned fixture roots and
trap-based cleanup, no private host ports, no production containers or broad
teardown. Runtime checks may use a fixture-private network/local SMTP sink.
Run Bash syntax, ShellCheck and shfmt for every touched shell script, plus
wrapper-Node smoke, exact teardown checks and `git diff --check`.

## Acceptance mapping

| Criterion | Planned evidence |
| --- | --- |
| AC1 | Strict export/config/file tests, actual copied DOM/identity/form comparison, valid/empty enabled build |
| AC2 | Legacy/fresh/prior-state matrix, disabled no-input path, retained-epoch sequence, injected promotion rollback |
| AC3 | Four root profile shapes and operator template; nonroot/private mounts, readiness, worker cycles/recreation |
| AC4 | Actual proxy absent/known/unknown routes and headers; auth/origin/client-address/rate spoof tests |
| AC5 | Synthetic no-JS whole lifecycle, deletion and old restore refusal, privacy/projection/comments regression |
| AC6 | Root/wrapper/runtime package gates, exact inventory, operator docs and redacted evidence review |

## Risks and rollback

- A fresh export digest cannot prove prebuilt HTML identity: compare staged
  records too, including stale text with a copied new marker.
- Do not erase deletion history on disable, downgrade to a history-unaware
  assembler, or treat corrupt/lost existing metadata as epoch zero.
- Retain only the canonical public snapshot, never recursively copy input
  siblings; keep service storage outside artifacts/dist.
- Overrides outside promotion targets stay unchanged. Inputs inside those
  targets are consumed on success and preserved on failure; test both paths.
- Shared helper extraction must preserve no-follow/nonregular behavior and
  disabled getter short-circuit. It does not provide hostile concurrent-parent
  race or multi-publisher guarantees.
- Root profile interpolation must work with no memo env values. Mount ownership
  mismatch is a startup error, never permission broadening or secret logging.
- Fail-closed proxy trust is opt-in; do not trust arbitrary forwarded chains or
  silently use one shared proxy rate identity.
- Worker errors must retain bounded retries/leases and private diagnostics;
  clean shutdown must not close SQLite during an in-flight drain.
- Override the worker's inherited HTTP image healthcheck with process/tick
  evidence; another healthy HTTP process is not worker liveness.
- Stop/revert profile/proxy plumbing without deleting private data. Older DB
  restore targets remain private candidates; publication epoch still applies.
- Real SMTP/production edge/TLS/provisioning are separate operator acceptance;
  local synthetic results do not authorize or claim deployment.

## Implementation and full-scope evidence — 2026-10-05

All ordered implementation and validation steps are complete. Separate
publication/runtime agents implemented their owned areas; an independent
`trellis-check` agent reviewed the full source and fixed synchronous delivery
recovery, strict browser CA trust, exact private-value scanning and anonymous
volume cleanup. Main synchronized executable specs and combined acceptance.

One final `./verify.sh` passed with 372 Node tests, 174 browser passes and 139
intentional browser skips, including actual native HTTPS/TLS mail/moderation/
publication/deletion/old-restore refusal. `./package-runtime.sh` and the final
default-user service image check passed. Shell, wrapper short-circuit, exact
cleanup, context validation and privacy checks passed. Six child and eight
parent acceptance criteria pass; see `research/validation-findings.md`.

Functional sources are frozen and final record/spec/privacy review passed.
The owner confirmed the concrete 53-file work commit plus separate child/parent
archives and scoped journal on 2026-10-05. Work commit `08be5df` was created.
The maintained archive operation records this completed child; the parent
awaits its separately approved archive, followed by the journal. No remote push
or subsequent product task is included.
