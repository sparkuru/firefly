# Proposed Commit Batch

The owner accepted the visible result and approved archival on 2026-10-08.
Execute this reviewed commit/archive batch before the separately requested
content change to historical short entries only. No deployment or Git push is
authorized. Staging/commit/archive results are recorded by the finish flow.

## 1. Work Commit

`feat(memos): unify documents with time-scrubbing reader`

One coherent feature commit includes the document/reader/source tools, coordinated
publication and retained recovery transition, regression coverage, shared specs,
mainline and this task's approved planning/review evidence. These layers must
ship together. Exact session-owned dirty paths:

- `.env.example`
- `.trellis/mainline.md`
- `.trellis/spec/frontend/architecture-contract.md`
- `.trellis/spec/frontend/content-workspace-contract.md`
- `.trellis/spec/frontend/development-runtime.md`
- `.trellis/spec/frontend/directory-structure.md`
- `.trellis/spec/frontend/index.md`
- `.trellis/spec/frontend/memo-contract.md`
- `.trellis/spec/frontend/memo-document-contract.md`
- `.trellis/spec/frontend/memo-publication-runtime-contract.md`
- `.trellis/spec/frontend/memo-site-contract.md`
- `.trellis/spec/frontend/mobile-experience-contract.md`
- `.trellis/spec/frontend/plugin-public-access-contract.md`
- `.trellis/spec/frontend/publication-contract.md`
- `.trellis/spec/frontend/site-configuration-contract.md`
- `.trellis/spec/frontend/x-core-contract.md`
- `.trellis/spec/trellis-plus/index.md`
- `.trellis/spec/trellis-plus/validation-profile.md`
- `.trellis/tasks/10-07-memo-presentation-meta-terminal/commit-plan.md`
- `.trellis/tasks/10-07-memo-presentation-meta-terminal/design.md`
- `.trellis/tasks/10-07-memo-presentation-meta-terminal/implement.md`
- `.trellis/tasks/10-07-memo-presentation-meta-terminal/prd.md`
- `.trellis/tasks/10-07-memo-presentation-meta-terminal/research/article-family-direction.md`
- `.trellis/tasks/10-07-memo-presentation-meta-terminal/research/document-migration-compatibility.md`
- `.trellis/tasks/10-07-memo-presentation-meta-terminal/research/final-acceptance.md`
- `.trellis/tasks/10-07-memo-presentation-meta-terminal/research/full-check.md`
- `.trellis/tasks/10-07-memo-presentation-meta-terminal/research/homepage-template-boundary.md`
- `.trellis/tasks/10-07-memo-presentation-meta-terminal/research/implementation-migration.md`
- `.trellis/tasks/10-07-memo-presentation-meta-terminal/research/implementation-reader.md`
- `.trellis/tasks/10-07-memo-presentation-meta-terminal/research/implementation-release.md`
- `.trellis/tasks/10-07-memo-presentation-meta-terminal/research/independent-corpus-audit.md`
- `.trellis/tasks/10-07-memo-presentation-meta-terminal/research/lab-placement.md`
- `.trellis/tasks/10-07-memo-presentation-meta-terminal/research/metadata-and-reading.md`
- `.trellis/tasks/10-07-memo-presentation-meta-terminal/research/migration-check.md`
- `.trellis/tasks/10-07-memo-presentation-meta-terminal/research/page-presentation-independence.md`
- `.trellis/tasks/10-07-memo-presentation-meta-terminal/research/release-check.md`
- `.trellis/tasks/10-07-memo-presentation-meta-terminal/research/retained-corpus-verification.md`
- `.trellis/tasks/10-07-memo-presentation-meta-terminal/research/terminal-discovery.md`
- `.trellis/tasks/10-07-memo-presentation-meta-terminal/research/time-scrubbing.md`
- `.trellis/tasks/10-07-memo-presentation-meta-terminal/research/ui-ux-pro-max.md`
- `.trellis/tasks/10-07-memo-presentation-meta-terminal/research/unified-stream-recommendation.md`
- `.trellis/tasks/10-07-memo-presentation-meta-terminal/task.json`
- `Dockerfile`
- `apps/site/astro.config.mjs`
- `apps/site/package-lock.json`
- `apps/site/package.json`
- `apps/site/playwright.memos.config.ts`
- `apps/site/scripts/materialize-content.mjs`
- `apps/site/scripts/memo-source.mjs`
- `apps/site/scripts/prepare-memos-fixture.mjs`
- `apps/site/scripts/serve-memos-fixture.mjs`
- `apps/site/src/build/memo-assets.mjs`
- `apps/site/src/build/memo-body-compatibility.mjs`
- `apps/site/src/build/memo-markdown.mjs`
- `apps/site/src/components/DocumentPresentation.astro`
- `apps/site/src/components/MemoDocument.astro`
- `apps/site/src/components/MemoEntry.astro`
- `apps/site/src/components/MemoTimeline.astro`
- `apps/site/src/components/SiteHead.astro`
- `apps/site/src/components/TerminalHome.astro`
- `apps/site/src/components/TerminalStreamDocument.astro`
- `apps/site/src/content.config.ts`
- `apps/site/src/layouts/DocumentLayout.astro`
- `apps/site/src/layouts/MemoLayout.astro`
- `apps/site/src/layouts/TerminalLayout.astro`
- `apps/site/src/lib/canonical-route.d.mts`
- `apps/site/src/lib/canonical-route.mjs`
- `apps/site/src/lib/content-schema.mjs`
- `apps/site/src/lib/content.ts`
- `apps/site/src/lib/document-navigation-composition.ts`
- `apps/site/src/lib/memo-time.d.mts`
- `apps/site/src/lib/memo-time.mjs`
- `apps/site/src/lib/presentation-experiences.ts`
- `apps/site/src/lib/render-document.ts`
- `apps/site/src/lib/site-config.mjs`
- `apps/site/src/lib/site-meta.mjs`
- `apps/site/src/lib/site-plugins.ts`
- `apps/site/src/lib/site-seo.mjs`
- `apps/site/src/lib/workspace-collection-loader.d.mts`
- `apps/site/src/lib/workspace-collection-loader.mjs`
- `apps/site/src/lib/x-core-context.ts`
- `apps/site/src/pages/memos/index.astro`
- `apps/site/src/pages/pages/memos/[id].astro`
- `apps/site/src/scripts/memo-timeline.ts`
- `apps/site/src/styles/memo.css`
- `apps/site/tests/content-materializer.test.mjs`
- `apps/site/tests/firefly-ignore.test.mjs`
- `apps/site/tests/memo-documents.test.mjs`
- `apps/site/tests/memos-build.test.mjs`
- `apps/site/tests/memos.spec.ts`
- `apps/site/tests/mobile-homepage.spec.ts`
- `apps/site/tests/plugin-access.test.mjs`
- `apps/site/tests/presentation-experiences.test.mjs`
- `apps/site/tests/preview-command.test.mjs`
- `apps/site/tests/static-output.test.mjs`
- `apps/site/tests/x-core-integration.test.mjs`
- `nginx.conf`
- `package.json`
- `packages/x-core/src/contracts.ts`
- `packages/x-core/src/pipeline.ts`
- `plugins/memos/plugin.json`
- `plugins/memos/tests/config.test.mjs`
- `plugins/public-access-files.mjs`
- `plugins/public-access.d.mts`
- `plugins/public-access.mjs`
- `plugins/tests/public-access-files.test.mjs`
- `plugins/tests/public-access.test.mjs`
- `presentations/memo/package-lock.json`
- `presentations/memo/package.json`
- `presentations/memo/src/index.ts`
- `presentations/memo/tests/memo.test.ts`
- `presentations/memo/tsconfig.json`
- `preview.sh`
- `sam`
- `tooling/assemble-publication/scripts/check-runtime-metadata.mjs`
- `tooling/assemble-publication/src/index.ts`
- `tooling/assemble-publication/src/plugins/access.ts`
- `tooling/assemble-publication/src/plugins/memo-history.ts`
- `tooling/assemble-publication/src/plugins/memos.ts`
- `tooling/assemble-publication/src/serve-release.ts`
- `tooling/assemble-publication/tests/assembler.test.ts`
- `tooling/assemble-publication/tests/memos.test.ts`
- `tooling/assemble-publication/tests/serve-release.test.ts`
- `tooling/memo-documents/cli.mjs`
- `tooling/memo-documents/documents.mjs`
- `tooling/memo-documents/documents.test.mjs`
- `tooling/plugin-access/check-runtime.sh`
- `tooling/plugin-access/runtime-fixture.mjs`
- `tooling/publish-memos/ops/check-runtime.sh`
- `tooling/publish-memos/ops/publish.test.mjs`
- `tooling/publish-memos/ops/sam.test.mjs`
- `tooling/publish-memos/package-lock.json`
- `tooling/publish-memos/package.json`
- `tooling/publish-memos/publish.sh`
- `tooling/publish-memos/src/cli.mjs`
- `tooling/publish-memos/tests/publisher.test.mjs`

## 2. Archive Commit

`chore(task): archive memo-presentation-meta-terminal`

After the work commit and explicit acceptance, archive only this task through
`task.py archive --no-commit`; inspect and stage the actual source-to-archive
move plus its mainline completion evidence. Expected paths:

- `.trellis/tasks/10-07-memo-presentation-meta-terminal/` (source removal)
- `.trellis/tasks/archive/2026-10/10-07-memo-presentation-meta-terminal/`
- `.trellis/mainline.md`

Include the work-commit reference and exactly one required trailer:
`Co-authored-by: OpenAI Codex <codex@openai.com>`.

## 3. Journal Commit

`chore: record journal`

Record this completed session with the work-commit reference using the supported
`add_session.py --no-commit`, then inspect and commit only its workspace changes:

- `.trellis/workspace/sam/index.md`
- `.trellis/workspace/sam/journal-2.md`
- `.trellis/mainline.md` (the owner's post-archive short-entry-only content
  decision and its actual verification evidence)

## Unrecognized Dirty Paths

None at the reviewed snapshot. Reconcile Git status immediately before staging;
leave any new unrelated paths out and report them. All private correspondence,
source data, owner dotenv, rendered output/screenshots and protected Trellis
runtime remain outside the batch. Curated JSONL context follows the repository's
existing ignored-context convention. No amend, push or production deployment.
