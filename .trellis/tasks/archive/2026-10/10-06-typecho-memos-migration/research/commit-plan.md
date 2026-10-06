# Proposed Commit and Finish Batch

The 89-note source migration, final checks and record refresh are complete.
At review time, no Git staging/commit, archive, journal auto-commit or remote
publication had run. The owner approved this exact batch on 2026-10-06;
execution follows the reviewed scope below.

## Scope Decision Requiring Confirmation

The checkout already contained the previous independent owner publisher change,
including the untracked publisher package and schema-2 consumer changes. This
turn preserved that prerequisite work and changed five of its code/test files,
plus shared specs/mainline and the new task records. Committing those whole
files alone would implicitly include earlier work or leave an incoherent package.

The proposed coherent batch therefore explicitly includes the prior publisher
manifest (159 paths), already documented in
[its commit plan](../../10-05-memo-production-enablement/research/commit-plan.md),
plus this task's 8 safe record paths. Earlier inclusion is
a separately approved scope, not inferred permission from migration approval.

Private originals, migration tooling/reports/configuration, candidates,
screenshots and credentials are excluded. External authoring sources/images
remain in their separate content repository; this proposal does not stage,
commit or push that repository. No remote push or production operation occurs.

## 1. Work Commit

`feat(memos): publish owner Markdown with historical note support`

One cohesive publisher/publication unit covers the prior owner-only Markdown
publisher, navigation/static runtime and visitor retirement, plus the reviewed
128 KiB body / 256 KiB source compatibility and verified 89-note migration records.
Exact root-repository allowlist: 167 paths, including tracked deletions.

- `.dockerignore`
- `.gitignore`
- `.trellis/mainline.md`
- `.trellis/spec/frontend/architecture-contract.md`
- `.trellis/spec/frontend/content-workspace-contract.md`
- `.trellis/spec/frontend/development-runtime.md`
- `.trellis/spec/frontend/directory-structure.md`
- `.trellis/spec/frontend/index.md`
- `.trellis/spec/frontend/memo-contract.md`
- `.trellis/spec/frontend/memo-publication-runtime-contract.md`
- `.trellis/spec/frontend/memo-service-contract.md`
- `.trellis/spec/frontend/memo-site-contract.md`
- `.trellis/spec/frontend/publication-contract.md`
- `.trellis/spec/frontend/site-configuration-contract.md`
- `.trellis/spec/trellis-plus/development.md`
- `.trellis/spec/trellis-plus/index.md`
- `.trellis/spec/trellis-plus/validation-profile.md`
- `.trellis/tasks/10-05-memo-production-enablement/design.md`
- `.trellis/tasks/10-05-memo-production-enablement/implement.md`
- `.trellis/tasks/10-05-memo-production-enablement/prd.md`
- `.trellis/tasks/10-05-memo-production-enablement/research/article-preservation-context.md`
- `.trellis/tasks/10-05-memo-production-enablement/research/commit-plan.md`
- `.trellis/tasks/10-05-memo-production-enablement/research/deployment-preparation.md`
- `.trellis/tasks/10-05-memo-production-enablement/research/edge-log-research.md`
- `.trellis/tasks/10-05-memo-production-enablement/research/execution-evidence.md`
- `.trellis/tasks/10-05-memo-production-enablement/research/execution-review.md`
- `.trellis/tasks/10-05-memo-production-enablement/research/local-readiness.md`
- `.trellis/tasks/10-05-memo-production-enablement/research/owner-publisher-local-acceptance.md`
- `.trellis/tasks/10-05-memo-production-enablement/research/owner-publisher-plan-review.md`
- `.trellis/tasks/10-05-memo-production-enablement/research/owner-publisher-production-acceptance.md`
- `.trellis/tasks/10-05-memo-production-enablement/research/owner-publisher-research.md`
- `.trellis/tasks/10-05-memo-production-enablement/research/private-runtime-evidence.md`
- `.trellis/tasks/10-05-memo-production-enablement/research/production-boundary.md`
- `.trellis/tasks/10-05-memo-production-enablement/research/publisher-core-implementation.md`
- `.trellis/tasks/10-05-memo-production-enablement/research/publisher-image-preparation.md`
- `.trellis/tasks/10-05-memo-production-enablement/research/publisher-integration-implementation.md`
- `.trellis/tasks/10-05-memo-production-enablement/research/publisher-quality-review.md`
- `.trellis/tasks/10-05-memo-production-enablement/research/static-cutover-preparation.md`
- `.trellis/tasks/10-05-memo-production-enablement/research/superseded-production-plan.md`
- `.trellis/tasks/10-05-memo-production-enablement/research/ui-ux-pro-max.md`
- `.trellis/tasks/10-05-memo-production-enablement/research/verification-transport-amendment.md`
- `.trellis/tasks/10-05-memo-production-enablement/task.json`
- `.trellis/tasks/10-06-typecho-memos-migration/design.md`
- `.trellis/tasks/10-06-typecho-memos-migration/implement.md`
- `.trellis/tasks/10-06-typecho-memos-migration/prd.md`
- `.trellis/tasks/10-06-typecho-memos-migration/research/commit-plan.md`
- `.trellis/tasks/10-06-typecho-memos-migration/research/execution-evidence.md`
- `.trellis/tasks/10-06-typecho-memos-migration/research/historical-source-inventory.md`
- `.trellis/tasks/10-06-typecho-memos-migration/research/quality-review.md`
- `.trellis/tasks/10-06-typecho-memos-migration/task.json`
- `Dockerfile`
- `apps/site/package.json`
- `apps/site/scripts/prepare-memos-fixture.mjs`
- `apps/site/scripts/serve-memos-fixture.mjs`
- `apps/site/scripts/validate-memos-build.mjs`
- `apps/site/src/components/TerminalHome.astro`
- `apps/site/src/lib/content.ts`
- `apps/site/src/lib/markdown-html-policy.mjs`
- `apps/site/src/lib/site-config.mjs`
- `apps/site/src/lib/site-plugins.ts`
- `apps/site/src/lib/site-seo.mjs`
- `apps/site/src/pages/memos/[...stream].astro`
- `apps/site/src/plugins/memos/MemoForm.astro`
- `apps/site/src/plugins/memos/MemoStream.astro`
- `apps/site/src/plugins/memos/index.d.mts`
- `apps/site/src/plugins/memos/index.mjs`
- `apps/site/tests/memos-build.test.mjs`
- `apps/site/tests/memos-fixture.mjs`
- `apps/site/tests/memos.spec.ts`
- `apps/site/tests/memos.test.mjs`
- `apps/site/tests/preview-command.test.mjs`
- `apps/site/tests/static-output.test.mjs`
- `compose.memos-static.yml`
- `compose.yml`
- `config/plugins/memos/config.toml.example`
- `config/plugins/memos/secrets.env.example`
- `config/plugins/memos/site-public.toml.example`
- `config/site.toml.example`
- `content/memos/.gitkeep`
- `nginx.conf`
- `package.json`
- `plugins/memos/README.md`
- `plugins/memos/compose.yml`
- `plugins/memos/config.d.mts`
- `plugins/memos/config.mjs`
- `plugins/memos/plugin.json`
- `plugins/memos/public.d.mts`
- `plugins/memos/public.mjs`
- `plugins/memos/tests/config.test.mjs`
- `plugins/memos/tests/declarations.mts`
- `plugins/memos/tests/public.test.mjs`
- `preview.sh`
- `sam`
- `services/memos/Dockerfile`
- `services/memos/README.md`
- `services/memos/migrations/001-initial.sql`
- `services/memos/ops/check-image.sh`
- `services/memos/ops/check-runtime.sh`
- `services/memos/ops/fixture-browser.mjs`
- `services/memos/ops/fixture-publication.mjs`
- `services/memos/ops/fixture-runtime.mjs`
- `services/memos/ops/fixture-smtp.mjs`
- `services/memos/ops/nginx-hosts.conf.example`
- `services/memos/package-lock.json`
- `services/memos/package.json`
- `services/memos/src/address.ts`
- `services/memos/src/admin.ts`
- `services/memos/src/backup.ts`
- `services/memos/src/config.ts`
- `services/memos/src/contract.ts`
- `services/memos/src/crypto.ts`
- `services/memos/src/files.ts`
- `services/memos/src/http.ts`
- `services/memos/src/index.ts`
- `services/memos/src/operations.ts`
- `services/memos/src/repository.ts`
- `services/memos/src/runtime.ts`
- `services/memos/src/server.ts`
- `services/memos/src/service.ts`
- `services/memos/src/smtp.ts`
- `services/memos/src/types.ts`
- `services/memos/src/validation.ts`
- `services/memos/src/worker-health.ts`
- `services/memos/src/worker-server.ts`
- `services/memos/src/worker.ts`
- `services/memos/tests/config-validation.test.ts`
- `services/memos/tests/helpers.ts`
- `services/memos/tests/http.test.ts`
- `services/memos/tests/lifecycle.test.ts`
- `services/memos/tests/mail-backup.test.ts`
- `services/memos/tests/runtime.test.ts`
- `services/memos/tests/smtp.test.ts`
- `services/memos/tests/tls-fixture.ts`
- `services/memos/tsconfig.json`
- `tooling/assemble-publication/package.json`
- `tooling/assemble-publication/scripts/check-memos-built.mjs`
- `tooling/assemble-publication/scripts/check-runtime-metadata.mjs`
- `tooling/assemble-publication/src/index.ts`
- `tooling/assemble-publication/src/plugins/memo-history.ts`
- `tooling/assemble-publication/src/plugins/memos.ts`
- `tooling/assemble-publication/src/serve-release.ts`
- `tooling/assemble-publication/tests/memos.test.ts`
- `tooling/publish-memos/Dockerfile`
- `tooling/publish-memos/README.md`
- `tooling/publish-memos/ops/README.md`
- `tooling/publish-memos/ops/check-deployment.mjs`
- `tooling/publish-memos/ops/check-runtime.sh`
- `tooling/publish-memos/ops/config.example.json`
- `tooling/publish-memos/ops/nginx-static.conf.example`
- `tooling/publish-memos/ops/publish.test.mjs`
- `tooling/publish-memos/ops/sam.test.mjs`
- `tooling/publish-memos/package-lock.json`
- `tooling/publish-memos/package.json`
- `tooling/publish-memos/publish.sh`
- `tooling/publish-memos/scripts/check-syntax.mjs`
- `tooling/publish-memos/src/cli.mjs`
- `tooling/publish-memos/src/files.mjs`
- `tooling/publish-memos/src/history.mjs`
- `tooling/publish-memos/src/index.d.mts`
- `tooling/publish-memos/src/index.mjs`
- `tooling/publish-memos/src/render.mjs`
- `tooling/publish-memos/src/source.mjs`
- `tooling/publish-memos/src/style.mjs`
- `tooling/publish-memos/tests/declarations.mts`
- `tooling/publish-memos/tests/publisher.test.mjs`
- `tooling/publish-memos/tsconfig.json`
- `tooling/shared/markdown-html-policy.mjs`

## 2. Task Archive Commits

After the work commit succeeds, archive only these completed tasks through
`task.py archive --no-commit`, inspecting source removal/destination each time:

- `chore(task): archive memo-production-enablement`:
  `10-05-memo-production-enablement` to its October monthly archive.
- `chore(task): archive typecho-memos-migration`:
  `10-06-typecho-memos-migration` to its October monthly archive.

Each archive commit contains only its exact move/status, approved mainline
archive reference and one `Co-authored-by: OpenAI Codex <codex@openai.com>`
trailer with work-commit evidence. No unrelated active task is archived.

## 3. Session Journal Commit

`chore: record journal`

Use `add_session.py --no-commit` and commit only the actual rotated developer
journal and index with the work hash and safe acceptance summary. The current
journal is `.trellis/workspace/sam/journal-2.md`; verify rotation before staging.
No ordinary work/journal attribution trailer or history amend.

## Validation and Remaining State

Current migration acceptance is `human-not-needed`. Pure/producer bounds,
publisher checks, integration, maintained browser matrix and actual no-JS
desktop/mobile corpus checks all pass; independent review verifies bodies,
timestamps, links, images, original hashes and absent-only/guarded write behavior.
Prior production acceptance remains its own task evidence; no new production
acceptance is claimed for this import.

Dirty files outside the documented publisher prerequisite and this task remain
excluded. Recheck exact dirty/index state before any approved staging and report
new unrecognized paths; never use broad/forced add, amend, or push.

Reply with approval of this batch to commit and finish both tasks, or choose
manual Git handling. No code or source-migration work remains pending.
