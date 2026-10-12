# Final Implementation and Validation Evidence

## Outcome

Implementation and AC1–AC5 are complete. The owner approved the final plan and
subsequently authorized submission on 2026-10-12. Work commit `afcfcc7` contains
the reviewed source/config/spec changes. Standard task archival and session
bookkeeping complete the local task, now archived with status `completed`;
no remote push or deployment is included. Preservation
comparisons refer to the original pre-task HEAD `e469f9c`.

## Acceptance

| Criterion | Evidence | Result |
| --- | --- | --- |
| AC1 | All 39 tracked independent-package files match original HEAD blobs after migration and after builds; 8 ignored MAJO media files match their original SHA-256 values. Root `experiments/` is absent. | PASS |
| AC2 | Validator real discovery finds `majo` and `nerv` below `labs`; clean package gates, full fixture build and normal configured publication build succeed. Containment and assembly rollback tests remain covered. | PASS |
| AC3 | Media/dependencies/dist/reports remain ignored; unignored moved file set is exactly the 39 original sources. Operational stale-path search has no old source-path caller. | PASS |
| AC4 | `services/memos/` is absent. An owner-only temporary recovery copy matches all 421 original inventory entries, including file hashes, modes and symlink targets. No active repository wiring consumes it. | PASS |
| AC5 | Normal configured publication was restored after fixture browser checks. Current lab and integrated Memo pages exist; runtime validates the 354-file release/image inventory and existing route/header/permission boundaries. Private inputs and document source remain intact. | PASS |

The recovery directory's exact temporary path was provided to the owner; it is
outside the repository and retained for rollback. Cross-filesystem rename was
unavailable, so cleanup used copy, complete inventory verification, then removal
of the exact source directory. No unrelated process or service was stopped.

## Checks Run

- Validator: clean lockfile installation, type-check, build, 4 passing tests and
  real-manifest validation. Default discovery points to `labs`, while canonical
  `/lab/` routes and the optional `experimentsRoot` API remain compatible.
- Assembler: clean lockfile installation, type-check, build and 21 passing tests.
- Retained publisher: clean lockfile installation, syntax/type checks, build and
  16 passing tests, including source/output protection for `labs`.
- NERV and MAJO: clean lockfile installations and package checks with zero
  errors; declared builds pass through the full publication build. MAJO emitted
  every required local media input/output.
- Site: clean installation refreshed the local validator dependency.
  `FIREFLY_CONTENT_ROOT="$PWD/content" ./preview.sh build` passed the complete
  dependency graph, site type-check, 18 static-output tests, both independent
  builds and root assembly.
- `FIREFLY_CONTENT_ROOT="$PWD/content" ./preview.sh render npm run test:e2e:publication`:
  6 passing tests across desktop/mobile, covering diagrams, canonical lab
  navigation, local assets, owning 404s, native return and reduced motion.
- `FIREFLY_RUNTIME_IMAGE=firefly:labs-directory-cleanup ./preview.sh package`:
  normal configured content build and its 18 static-output tests passed;
  release/image inventory equality, route/media/header/cache/404 probes,
  non-root and read-only checks passed. A read-only exact-label container query
  confirmed no residual package-runtime container.
- `docker compose config --quiet` passed without starting services.
- `bash -n sam`, `shellcheck -x sam`, `shfmt -d sam`, wrapper Node version,
  task-context validation and `git diff --check` passed. Plain `shellcheck sam`
  encounters the preexisting sourced-file SC1091; `-x` resolves the existing
  source boundary without a suppression or unrelated source edit.

Full command logs and preservation manifests are in private temporary
task-owned locations. Logs retain their owner-only mode; package execution used
normal public-file permissions. Docker validation required narrowly approved
sandbox escalation for the existing project wrappers.

## Independent Review

The `trellis-check` reviewer found no source/config defects and made no edits.
It independently verified original HEAD/source/media fingerprints, the complete
retired-service recovery inventory, ignored output rules, current specs,
context manifests, task-record privacy and all 41 package-test results.
Its final full-scope review also verified the completed site/lab builds,
desktop/mobile publication tests, normal runtime results and final records,
confirming AC1–AC5 without further source edits or repeated builds/tests.

Retained `experiments` mentions are semantic APIs/commands, artifact staging,
historical records, conservative source protection or explicit pre-change task
evidence. Public names/URLs and artifact formats were not renamed.

Human review is not needed: this scope changes repository mechanics, has no
visual/interaction change, and the applicable automated gates passed. The full
repository browser suite and production deployment were not run.
Dependency audit output was retained; existing upstream dependencies/lockfiles
were not changed as part of this task.
