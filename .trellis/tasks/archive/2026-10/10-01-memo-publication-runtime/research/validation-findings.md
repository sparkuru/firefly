# Memo integration validation

## Review state

Implementation was authorized on 2026-10-05. Functional sources are frozen after
independent full-scope fixes and verification. The complete maintained gate,
minimal web packaging and final service image check passed with exit zero.
Final task/spec/privacy record review passed. The owner confirmed the concrete
commit and bookkeeping plan on 2026-10-05; verified work commit `08be5df`
contains the 53-file implementation/spec batch. Child and parent archival plus
scoped journal recording follow that approval. No push, production deployment
or real mail was performed.

## Final automated evidence

All Node/browser commands used `sam`/`render.sh` with tracked content; runtime
Docker checks used disposable exact-labeled local resources.

| Gate | Final result |
| --- | --- |
| Assembler clean install | Passed, zero audit vulnerabilities |
| Assembler check/test/build | Passed; 51/51 tests |
| Pure Memo contract | Passed; 12/12 |
| Site contained input/build tests | Passed; 4/4 |
| Actual isolated Astro publication | Enabled, empty, disabled and stale refusal passed |
| Memo browser fixture | Passed; 3/3 |
| Service clean install/check/tests | Passed; 34/34 |
| Service Docker image | Nonroot readiness, private modes and approved/rate/encrypted-outbox recreation passed |
| Compose syntax | Default, Memo, comments, combined and standalone passed |
| Actual local lifecycle | Strict HTTPS/TLS, proxy, persistence, scheduled mail, no-JS desktop/mobile POST/read, verify/approve/export/build/assemble/delete/old-restore refusal and exact private-value privacy scan passed |
| `./verify.sh` | One complete final invocation passed; 372 Node tests, 174 browser passes and 139 intentional browser skips |
| Ordinary site / NERV / publication browser | 157 passed + 139 intentional skips / 8 passed / 6 passed |
| `./package-runtime.sh` | Exact metadata/staged/release DOM, inventory/image equivalence, minimal public-only context, routes/security/404/assets/nonroot/read-only probes passed |
| Wrapper Node / help / short-circuit | Node smoke passed; help/invalid-argument checks passed; simulated inner failure preserved exit 17 and did not invoke runtime fixture |
| Shell syntax/ShellCheck/shfmt/whitespace | All touched-shell and final diff checks passed |
| Exact cleanup | No fixture containers, anonymous volumes, owned images/private state or package-runtime containers remained |

The initial lifecycle fixture was corrected to derive the complete tracked
site configuration example rather than a partial TOML missing required core
fields. This changed fixture setup, not product validation. The final gate also
proves caller UID:GID alignment without broadening private modes, worker health
isolation from its HTTP sibling and successful graceful worker shutdown.

The independent review fixed synchronous injected delivery failures suppressing
later ticks, replaced the browser HTTPS waiver with fixture CA trust, added
exact private-token/admin/password scans of artifacts/release, and removed and
verified anonymous volumes belonging to exact-owned containers. New safe prior
history regressions reject symlink/directory/FIFO/invalid-UTF-8 evidence without
altering the release or leaving candidates. An untrusted certificate is refused
before importing the synthetic CA; trusted native POST/read then use normal
certificate validation. The complete final gate ran after these source fixes.

Main inspected the public-only approved desktop/mobile captures: both records
are readable, script-looking body content stays literal text, the native form
and unchecked consent remain clear, and mobile content wraps without visible
horizontal overflow. The final strict-certificate public captures and bounded
JSON summaries are under ignored
`services/memos/dist/test-results/runtime-evidence.ofADXjWa/`. Main also inspected
the final mobile acceptance/return response and approved stream. Temporary logs
are `/tmp/memo-review-full-verify.log`, `/tmp/memo-review-package-runtime.log`
and `/tmp/memo-review-service-image.log`; raw logs are not copied into records.

## Child acceptance mapping — all passed

| Child criterion | Evidence boundary |
| --- | --- |
| AC1 | Independent raw loading, strict paths/wire; exact parsed built DOM/form and identity |
| AC2 | Safe prior history, disabled retention, bootstrap, stale refusal and pair rollback |
| AC3 | Optional runtime shapes, private nonroot mounts/persistence, worker schedule/health/stop |
| AC4 | Real proxy headers/routes/auth/rates and direct/loopback trust regressions |
| AC5 | Native local whole lifecycle, approved-only static data, deletion/restore refusal and projection privacy |
| AC6 | Maintained full gate, web image inventory, shell/wrapper cleanup and operator docs |

## Parent criteria and combined evidence

All eight source requirements below pass against the accepted contract/service/
site children plus the final integrated evidence. Implementation acceptance is
4/4; the owner approved final-child archival and the separate parent archive
after work commit `08be5df`.

| Parent criterion | Accepted dependency plus integration evidence |
| --- | --- |
| Dedicated plugin/route isolation | Contract manifest; site route/projection regressions; exact staged Memo DOM and route ownership |
| Anonymous submission/verification/private pending | Service validation and lifecycle tests; actual no-JS native HTTPS/TLS-mail verification flow before approval |
| Private list/approve/reject/delete/export | Service authenticated API/CLI and full transition tests; integration approval/export/deletion |
| Approved-only public fields; no private/history | Exact pure wire and service projection; site escaping; independent assembler/raw/DOM gates and actual private-value scan |
| Static build consumption without DB/business logic | Site/publication import ownership; canonical artifact-only public snapshot; release/image inventory |
| Independent persistent Docker service | Nonroot service image recreation; optional root/standalone wiring; persistence and worker/private mount checks |
| Readable without JavaScript | Accepted site browser matrix plus actual native desktop/mobile submission and approved static reading |
| Disabled without service/export | Disabled short-circuit/build and retained-epoch sequence; default publication/full browser/package gate |

No real recipients, production deployment, owner infrastructure, historical
Typecho input, account/SSR/read API or database-schema changes are included.
Local synthetic HTTPS/SMTP acceptance does not certify operator edge or mail
topology. Temporary logs stay outside project records; fixture identity/token/
config/database contents are not copied into these records.

The fresh root Docker builder excludes prior publication state; it does not
prove a retained deletion floor. The supported local history evidence is the
wrapped assembler plus minimal runtime packager. Operator deployment/history
switching remains separate. New direct assembler parsers are pinned build-only
`parse5@7.3.0` (MIT) and `smol-toml@1.8.0` (BSD-3-Clause); package license files
are retained with installed dependencies, and parser code is not in the public
release/web runtime. No new browser-runtime notice payload is required.
