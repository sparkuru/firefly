# Execution Plan

The owner approved the final planning summary on 2026-10-12. Implementation is
authorized within the reviewed scope.

1. Activate the task; load curated implement context and applicable language
   guidance. Recheck repository state and exact targets.
2. Record tracked-source and local-media fingerprints. Inspect the retired
   service directory for unexpected data; create a private recovery location.
3. Move source to `labs` and Memo remnants outside the repository. Verify source
   preservation before installs/builds modify generated files.
4. Update discovery, root scripts, Docker installs, source fixtures, source
   protection and ignore rules. Preserve public/API/manifest/artifact naming.
5. Synchronize current project-owned specs and third-party source paths. Preserve
   owner README, authored content and historical task/journal evidence.
6. Dispatch implementation and independent checking through the Trellis workflow
   with explicit ownership. The main session owns task transitions/mainline.
7. Record acceptance/check results, review final diff and update mainline from
   approved scope and actual evidence. Commit/archive need owner authorization.

## Validation Commands

Run Node/npm through `./sam`; site/browser work through `./preview.sh render`.
Clean-install affected lockfiles before checks, including local validator
consumers. Use existing package/root scripts:

- Validator: `install:validator`, `check:validator`, `test:validator`,
  `build:validator`, `validate:experiments`. Confirm real default discovery finds
  both directories under `labs` and containment negatives remain covered.
- Assembler: `install:assembler`, `check:assembler`, `test:assembler`,
  `build:assembler`, preserving transaction/rollback tests.
- Publisher: `SAM_CONTENT_MODE=none ./sam npm run install:memos`, then
  `check:memos`, `test:memos`, `build:memos` for the protected-root update.
- NERV/MAJO: existing root install/check/build commands; verify declared local
  media inputs/outputs and preservation.
- Integrated publication: `./preview.sh build`; focused publication browser
  gate `./preview.sh render npm run test:e2e:publication` against rebuilt output.
- Runtime: `./preview.sh package` for inventories and current lab/Memo/media
  routes; `docker compose config --quiet` for maintained configuration.
- Shell example: `bash -n sam`, `shellcheck sam`, `shfmt -d sam`, and
  `./sam node --version`.
- Hygiene: fingerprint comparison, `git diff --check`, rename/diff review,
  moved-media/report ignore checks, and operational stale-path search. Classify
  retained artifact, semantic and historical mentions explicitly.

Report unavailable prerequisites/failures accurately and retain failure evidence.
Do not deploy, stop unrelated processes or delete retained recovery state.
