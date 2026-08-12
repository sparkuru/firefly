# Initialize Repository with Trellis Plus

## Goal

Extend the installed Trellis workflow with the full default Trellis Plus enhancement set so future tasks inherit repository-specific development, browser-validation, review, attribution, and continuity rules.

## Background

- Trellis `0.6.14` is already initialized; this task customizes it rather than creating a second workflow.
- The repository contains a browser-accessible Astro UI under `experiments/nerv/` and project-level frontend specs under `.trellis/spec/frontend/`.
- The repository is new and has no commit history, so no existing commit-body language or Codex/OpenAI attribution convention can be inferred.
- A Docker development-wrapper rename is partially applied: the current file is still named `hako`, while its implementation and `dev.sh` already use the intended `sam` name. The user confirmed `sam` is the canonical wrapper name.
- No Playwright or equivalent browser-test runner is configured.
- Codex UUPM is not initialized at `.codex/skills/ui-ux-pro-max/SKILL.md`; the user approved adding project-local Codex initialization to this task.
- `.trellis/workflow.md` is a Trellis-managed template target. There is no `.trellis/.backup-*` recovery snapshot.
- The worktree contains only uncommitted bootstrap content. Existing files outside this task's approved scope must remain untouched.

## Requirements

### R1. Durable workflow enhancements

Apply all default Trellis Plus workflow behaviors without replacing the installed Trellis state machine:

- submit-ready human review classification before Phase 3.4 commits;
- selective Codex completion summaries and `Co-authored-by: OpenAI Codex <codex@openai.com>` trailers for substantial AI-authored work commits only;
- Docker dev-wrapper readiness before implementation and validation;
- UUPM Plan -> Implement -> Check -> Update Spec integration when initialized;
- automate-first Playwright validation for eligible browser UI tasks;
- conservative no-task Project Pulse and guided mainline continuity.

Preserve the existing Trellis wording, status names, and required phase gates. Add compact titled sections or pointers rather than duplicating the reference procedures.

### R2. Project-specific validation profile

Record exact repository-backed commands and boundaries in the frontend Trellis spec. The profile must distinguish:

- Astro type/build validation;
- focused and full browser validation;
- app startup, readiness URL, base URL, browser/viewports, fixtures, accessibility checks, visual-baseline policy, and failure artifacts;
- residual checks that genuinely need human judgment.

Because no browser runner exists, bootstrap only the smallest deterministic Playwright setup needed to validate the NERV route and establish reusable project conventions.

### R3. Docker development wrapper

Rename the existing root `hako` file to `sam` and keep `dev.sh`; do not create a competing wrapper. Preserve the intended `sam` command, `SAM_*` variables, `sam.*` labels, UID mapping, repository-local `.devhome`, configurable host/container ports, and exact-label teardown.

Do not add broad Docker, shell, or package-manager authorization. For Codex, follow the maintained `dev-it-in-docker` policy: use session-scoped `./sam` approval when needed and do not create a portable `.codex/rules/default.rules` allowlist.

### R4. UUPM initialization

Initialize UUPM only for Codex with the locally available `uipro init --ai codex`, inspect the generated diff, preserve ignore behavior, and verify the generated skill entry point and its required script/data paths.

Never use `--ai all`, never overwrite an existing complete initialization without approval, and never force-track `.codex/`.

### R5. Mainline continuity boundary

Add the conservative Project Pulse behavior to the `no_task` workflow block. Do not create `.trellis/mainline.md` during this task because the user has not approved a concrete product initiative, ordered work list, or serial continuation authority.

### R6. Update resilience and workspace protection

- Treat `.trellis/workflow.md` as an update-sensitive template customization and document that Trellis Plus must be reapplied after conflicting `trellis update` results.
- Treat `.trellis/spec/**` and task artifacts as project data.
- Preserve all unrecognized bootstrap files and the separate `00-bootstrap-guidelines` task.
- Keep `.agents/`, `.codex/`, and `.claude/` ignored/untracked unless the user explicitly requests tracking; always keep `.trellis/` eligible for tracking.
- Do not stage, commit, push, or force-add files during implementation without the later Phase 3.4 confirmation.

## Acceptance Criteria

- [x] `.trellis/workflow.md` contains one coherent Trellis Plus integration for Docker readiness, UUPM phase behavior, Playwright automate-first validation, submit-ready human review, selective Codex attribution, and no-task mainline continuity.
- [x] Existing workflow status names, planning/start gates, sub-agent protocol, and archive behavior remain intact.
- [x] `.trellis/spec/frontend/index.md` contains concrete project validation and Playwright profiles with commands that run through the repository wrapper.
- [x] The wrapper is available only as executable `sam`; `sam` and `dev.sh` consistently use `./sam`, `SAM_*` variables, and `sam.*` labels while `.devhome/` remains ignored.
- [x] A focused Playwright check covers `/lab/nerv/` with stable semantic assertions at desktop and narrow-mobile viewports, without production credentials or mutable external data.
- [x] Astro check/build and the focused Playwright command pass through `./sam`, or any environment blocker is recorded with its exact failed command and required replacement evidence.
- [x] `./dev.sh down` safely succeeds when no project dev container is running.
- [x] UUPM is initialized and verified for Codex without force-overwriting or force-tracking its generated assistant-local files.
- [x] No `.trellis/mainline.md` is invented without an approved initiative.
- [x] No broad Codex/Docker allow rule, forced tracking, unrelated file edit, commit, or push is introduced.
- [x] The task remained in `planning` until these artifacts were reviewed and the user separately approved implementation.

## Out of Scope

- Implementing the product roadmap in the root `prd.md`.
- Redesigning or materially changing the NERV UI.
- Filling every placeholder frontend guideline owned by `00-bootstrap-guidelines`.
- Declaring a project mainline, prioritizing future product tasks, or enabling serial continuation.
- Updating Trellis itself or running `trellis update`.
- Committing, archiving, or pushing the repository as part of planning.
