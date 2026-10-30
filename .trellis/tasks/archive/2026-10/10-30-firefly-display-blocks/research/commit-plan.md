# Submission plan

Status: the owner approved submission on 2026-10-30 and requested a local
demonstration project under `content`. Work commit `cfad1fd` includes that
addition and its passing build/browser checks. Supported archival and session
bookkeeping follow the approved batch. Paths below preserve the reviewed
pre-archive staging list.
All current dirty files belong to this task; no unrecognized file is proposed.
The task-local JSONL context manifests are intentionally ignored by the existing
repository rule and will not be force-added. No dependency lockfile changed.

## 1. Work commit

`feat(content): add Firefly display blocks`

One coherent feature commit includes the parser, publication lifecycle, reader
integration, tests, author guide, examples, shared contracts and task evidence:

```text
.trellis/mainline.md
.trellis/spec/frontend/content-workspace-contract.md
.trellis/spec/frontend/firefly-display-blocks-contract.md
.trellis/spec/frontend/index.md
.trellis/spec/trellis-plus/validation-profile.md
.trellis/tasks/10-30-firefly-display-blocks/design.md
.trellis/tasks/10-30-firefly-display-blocks/implement.md
.trellis/tasks/10-30-firefly-display-blocks/prd.md
.trellis/tasks/10-30-firefly-display-blocks/research/commit-plan.md
.trellis/tasks/10-30-firefly-display-blocks/research/pipeline.md
.trellis/tasks/10-30-firefly-display-blocks/research/validation.md
.trellis/tasks/10-30-firefly-display-blocks/task.json
apps/site/astro.config.mjs
apps/site/package.json
apps/site/playwright.config.ts
apps/site/scripts/materialize-content.mjs
apps/site/src/build/firefly-assets.mjs
apps/site/src/build/firefly-blocks.mjs
apps/site/src/components/TerminalStreamDocument.astro
apps/site/src/lib/workspace-collection-loader.mjs
apps/site/src/scripts/document-navigator.ts
apps/site/src/styles/article-content.css
apps/site/tests/content-build-positive.test.mjs
apps/site/tests/firefly-assets.test.mjs
apps/site/tests/firefly-blocks.test.mjs
apps/site/tests/firefly-display.spec.ts
apps/site/tests/firefly-media.spec.ts
apps/site/tests/fixtures/firefly-test-animation.gif
apps/site/tests/fixtures/firefly-test-clip.mp4
apps/site/tests/fixtures/firefly-test-tone.mp3
apps/site/tests/mobile-homepage.spec.ts
apps/site/tests/static-output.test.mjs
content/pages/firefly-display-semantic.md
content/posts/firefly-playground/index.md
content/posts/firefly-playground/assets/bookshop.png
content/posts/firefly-playground/assets/harbor.png
content/posts/firefly-playground/assets/lakeside.png
content/posts/firefly-playground/assets/test-motion.gif
content/posts/firefly-playground/assets/test-pattern.mp4
content/posts/firefly-playground/assets/test-tone.mp3
content/pages/markdown-template.md
docs/firefly-blocks.md
nginx.conf
readme.md
tooling/assemble-publication/src/serve-release.ts
tooling/assemble-publication/tests/serve-release.test.ts
tooling/plugin-access/check-runtime.sh
```

## 2. Archive commit

`chore(task): archive firefly-display-blocks`

After the work commit, use the supported `task.py archive --no-commit` route.
This task was not PR-backed. Review and stage only the task source removal,
its `.trellis/tasks/archive/2026-10/10-30-firefly-display-blocks/` destination,
and mainline completion evidence. Record the work commit and use the required
Codex attribution trailer. Preserve all unrelated task history and Git identity.

## 3. Session record

`chore: record journal`

Use the supported session recorder after archival, recording the work commit
and actual checks. Only the developer journal/index bookkeeping belongs here.

No push, production deployment or next product task is part of this plan.
