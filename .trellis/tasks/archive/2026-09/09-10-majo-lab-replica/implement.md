# Implementation plan: majo static Experiment

## Ordered work

1. Add the tracked research/rights documentation and isolated Experiment
   skeleton (`experiment.json`, package metadata, Astro config, license, and
   source/test directories). Do not add binary media to tracked paths.
2. Add the ignored `public/media` contract and build script. Validate the five
   canonical image inputs and three MP3 inputs, build Astro output so its public
   directory emits `dist/media`, verify every emitted file, and produce
   actionable missing-file errors.
3. Implement the new page from scratch:
   - semantic three-slide HTML and no-JS first-slide fallback;
   - local CSS for full-viewport layout, overlay, fade, zoom, text reveal,
     responsive footer, and reduced motion;
   - typed/native controller for preload readiness, pagination, keyboard
     navigation, audio selection, progress, seeking, and ended-track advance.
4. Connect the package to the root graph: install/check/build scripts, Docker
   builder dependency installation, and explicit `.gitignore` rules.
5. Add focused package Playwright coverage for loading, slide transitions,
   text reveal, audio controls, reduced motion, no horizontal overflow, no-JS
   fallback, and local-only requests. Use stable `data-majo-*` hooks.
6. Update existing catalog, Terminal, static-output, publication, and runtime
   assertions that encode “NERV is the only listed Experiment”; retain all NERV
   behavior checks and add majo entry/media probes.
7. Run focused validation with real local ignored media, then the complete
   project checks/build/publication gates. Confirm the media paths remain ignored
   and no binary files enter the diff.

## Validation commands

Run through the repository command boundary:

```sh
./sam npm run validate:experiments
./sam npm run check:majo
./sam npm run build:majo
./sam npm --prefix experiments/majo run test:e2e
./sam npm run check:m4
./sam npm run test:m4
./sam npm run build:m4
./sam npm run test:e2e:publication
git diff --check
git status --short --ignored experiments/majo
```

When the local media is intentionally absent, also run the package build once
and record that it fails with the expected missing-input diagnostic. Do not
turn that failure into a skipped test or an external download.

## Risk points and rollback points

- `experiments/majo/scripts/build.mjs`: validates the ignored `public/media`
  inputs and the Astro `public/media` → `dist/media` boundary; review path
  containment and stale-output cleanup carefully.
- Root `package.json` and `Dockerfile`: keep majo installation/build ordering
  consistent with the generic manifest-driven build.
- `apps/site/tests`, `tooling/assemble-publication/tests`, and
  `package-runtime.sh`: update exact catalog/inventory assumptions without
  weakening NERV or publication-contract coverage.
- `nginx.conf`: do not add a special route unless tests prove the generic route
  cannot serve the assembled mount; the planned default is no change.
- If an integration change causes unrelated publication failures, revert only
  the majo integration edits and preserve the isolated package/PRD; do not
  reset the working tree or discard existing task work.

## Pre-start review gate

Before `task.py start`:

- confirm `prd.md`, `design.md`, and this checklist agree on the eight
  `public/media` → `dist/media` → `/lab/majo/media` inputs/outputs and no
  external fallback;
- confirm `implement.jsonl` and `check.jsonl` contain real spec/research
  entries, not the seeded example row;
- confirm the owner has reviewed and explicitly approved the final planning
  summary, separate from task-creation consent;
- confirm no implementation file has been changed during planning.
