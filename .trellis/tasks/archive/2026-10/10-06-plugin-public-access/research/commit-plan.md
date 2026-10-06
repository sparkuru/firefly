# Proposed commit and bookkeeping plan

The owner explicitly confirmed this scoped work commit, task archival and
session journal. Work commit `c04b09f` is complete and the task is archived;
separate archive/journal commits follow in that order. The list below retains
the approved historical work scope. No Git push is authorized.

## Work commit

`fix(plugins): gate public routes with site activation`

The exact path list below contains only this task's shared plugin contracts,
site/assembler/runtime integration, tests, safe examples, project specs and
sanitized task evidence. There are no unrecognized dirty paths in this plan.
The owner site configuration, private push helper, connection inputs, certificate
files, deployment backups, browser screenshots and generated publications are
outside the commit. No Git push is proposed.

## Bookkeeping after the work commit

1. Archive only `plugin-public-access` using the supported no-auto-commit route,
   then commit that scoped task move with the required Codex archive attribution.
2. Record this session and work-commit reference in the developer journal,
   followed by its separate journal commit.

Actual work comes before archive/journal commits. The existing guided mainline
does not authorize starting another product task.

## Exact work paths

- `.trellis/mainline.md`
- `.trellis/spec/frontend/architecture-contract.md`
- `.trellis/spec/frontend/comments-publication-contract.md`
- `.trellis/spec/frontend/development-runtime.md`
- `.trellis/spec/frontend/directory-structure.md`
- `.trellis/spec/frontend/index.md`
- `.trellis/spec/frontend/memo-contract.md`
- `.trellis/spec/frontend/memo-publication-runtime-contract.md`
- `.trellis/spec/frontend/memo-site-contract.md`
- `.trellis/spec/frontend/plugin-public-access-contract.md`
- `.trellis/spec/frontend/publication-contract.md`
- `.trellis/spec/frontend/site-configuration-contract.md`
- `.trellis/spec/trellis-plus/validation-profile.md`
- `.trellis/tasks/10-06-plugin-public-access/design.md`
- `.trellis/tasks/10-06-plugin-public-access/implement.md`
- `.trellis/tasks/10-06-plugin-public-access/prd.md`
- `.trellis/tasks/10-06-plugin-public-access/research/assembler-implementation.md`
- `.trellis/tasks/10-06-plugin-public-access/research/commit-plan.md`
- `.trellis/tasks/10-06-plugin-public-access/research/contract-site-implementation.md`
- `.trellis/tasks/10-06-plugin-public-access/research/independent-cross-review.md`
- `.trellis/tasks/10-06-plugin-public-access/research/main-quality-check.md`
- `.trellis/tasks/10-06-plugin-public-access/research/owner-routing-boundary.md`
- `.trellis/tasks/10-06-plugin-public-access/research/plugin-switch-deployment.md`
- `.trellis/tasks/10-06-plugin-public-access/research/plugin-switch-inventory.md`
- `.trellis/tasks/10-06-plugin-public-access/research/private-sync-implementation.md`
- `.trellis/tasks/10-06-plugin-public-access/research/runtime-independent-review.md`
- `.trellis/tasks/10-06-plugin-public-access/task.json`
- `apps/site/astro.config.mjs`
- `apps/site/package.json`
- `apps/site/scripts/plugin-access.mjs`
- `apps/site/scripts/serve-memos-fixture.mjs`
- `apps/site/src/build/plugin-access.mjs`
- `apps/site/src/lib/content.ts`
- `apps/site/src/lib/site-config.mjs`
- `apps/site/tests/memos-build.test.mjs`
- `apps/site/tests/memos.test.mjs`
- `apps/site/tests/plugin-access.test.mjs`
- `apps/site/tests/preview-command.test.mjs`
- `apps/site/tests/static-output.test.mjs`
- `config/site.toml.example`
- `nginx.conf`
- `package.json`
- `plugins/memos/README.md`
- `plugins/public-access-files.d.mts`
- `plugins/public-access-files.mjs`
- `plugins/public-access.d.mts`
- `plugins/public-access.mjs`
- `plugins/tests/declarations.mts`
- `plugins/tests/public-access-files.test.mjs`
- `plugins/tests/public-access.test.mjs`
- `preview.sh`
- `tooling/assemble-publication/scripts/check-runtime-metadata.mjs`
- `tooling/assemble-publication/src/index.ts`
- `tooling/assemble-publication/src/plugins/access.ts`
- `tooling/assemble-publication/src/plugins/comments.ts`
- `tooling/assemble-publication/src/plugins/memo-history.ts`
- `tooling/assemble-publication/src/serve-release.ts`
- `tooling/assemble-publication/tests/access-fixture.ts`
- `tooling/assemble-publication/tests/assembler.test.ts`
- `tooling/assemble-publication/tests/memos.test.ts`
- `tooling/assemble-publication/tests/serve-release.test.ts`
- `tooling/plugin-access/check-runtime.sh`
- `tooling/plugin-access/fixture-upstream.mjs`
- `tooling/plugin-access/runtime-fixture.mjs`
- `tooling/publish-memos/README.md`
- `tooling/publish-memos/ops/README.md`
- `tooling/publish-memos/ops/check-deployment.mjs`
- `tooling/publish-memos/ops/nginx-static.conf.example`
