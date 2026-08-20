# Repository Evidence for Trellis Plus Initialization

## Trellis state

- `.trellis/.version` reports `0.6.14`.
- `.trellis/.template-hashes.json` identifies `.trellis/workflow.md` as a managed template target.
- No `.trellis/.backup-*` directory exists, so there is no prior Trellis Plus block to recover.
- The session-selected task is `.trellis/tasks/08-12-trellis-plus-init` in `planning`.
- `.trellis/tasks/00-bootstrap-guidelines` separately remains `in_progress`; it owns broad frontend guideline population and must not be folded into this task.

## Frontend and browser surface

- `experiments/nerv/package.json` uses Astro `^4.16.18` and exposes `dev`, `start`, `check`, `build`, and `preview` scripts.
- `experiments/nerv/astro.config.mjs` sets the static site base to `/lab/nerv`.
- `experiments/nerv/src/pages/index.astro` renders the NERV page and includes browser interaction, so the repository is a frontend/UI project with a browser-automatable route.
- No Playwright, Cypress, or equivalent browser-test dependency, config, script, or test directory was found.
- The active Codex UUPM entry point `.codex/skills/ui-ux-pro-max/SKILL.md` is absent.

## Current validation and runtime

- Root scripts delegate to the NERV experiment: `npm run check:nerv` and `npm run build:nerv`.
- `firefly.yaml`, `Dockerfile`, and `nginx.conf` provide a static Nginx deployment at host port `8080` by default; this is deployment evidence, not the preferred task-local browser-test runner.
- The current `hako` file and `dev.sh` are executable, and `.gitignore` excludes `.devhome/`.
- The file named `hako` already identifies itself as `sam`, uses `SAM_*` variables and `sam.*` labels, and is called as `./sam` by `dev.sh`. The user confirmed this is a partially completed rename and that `sam` is the intended wrapper name.
- The maintained `dev-it-in-docker` skill says Codex should use session-scoped prefix approval and must not create `.codex/rules/default.rules`; this narrower maintained rule resolves the older Trellis Plus reference's portable-rule suggestion.

## Commit and continuity evidence

- The repository has no commits, so there is no established commit language, body style, or Codex/OpenAI trailer to preserve.
- The worktree consists of uncommitted repository bootstrap files; implementation must classify and avoid unrelated paths during the Phase 3.4 commit plan.
- The root `prd.md` describes a product direction, but the current user request did not authorize that document as an ordered Trellis initiative or grant serial continuation. Mainline behavior must therefore remain `guided`, and `.trellis/mainline.md` must remain absent.

## Planned durable targets

- `.trellis/workflow.md`: compact state-machine behavior and phase pointers.
- `.trellis/spec/frontend/index.md`: repository validation profile and single Playwright Validation Profile.
- `hako` -> `sam` plus `dev.sh`: complete the user-intended wrapper rename and keep the existing `sam` contract.
- `experiments/nerv/` and root scripts: smallest Playwright setup justified by the existing browser route.
- `.codex/skills/ui-ux-pro-max/`: only when the user explicitly approves project-local Codex initialization; retain existing global ignore behavior and never force-track it.
