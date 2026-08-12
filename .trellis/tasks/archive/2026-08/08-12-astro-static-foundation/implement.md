# M1 Implementation Plan

## Ordered Checklist

1. **Scaffold the autonomous package**
   - Create only the planned `apps/site/` authored paths.
   - Add the exact dependency set from `design.md`, app scripts, strict Astro
     TypeScript config, static Astro config, and app-local lockfile through
     `./sam`.
   - Add root delegating scripts without changing NERV scripts or workspace mode.

2. **Implement the content contract**
   - Add the shared runtime schemas and focused Node test.
   - Configure explicit post/page `glob()` loaders against `../../content/...`.
   - Add one framework-neutral sample post, one sample page, and only the minimum
     draft fixture needed for route-exclusion evidence.
   - Add public collection helpers for draft filtering, deterministic sorting,
     global slug uniqueness, and public layout boundaries.

3. **Build the static route shell**
   - Implement `DocumentLayout.astro`, global Tailwind CSS/tokens, and thin route
     files for `/`, `/posts/<slug>/`, `/pages/<slug>/`, and `404`.
   - Preserve semantic/no-JavaScript readability and keep the scaffold visually
     neutral per the approved UUPM context.

4. **Add browser evidence**
   - Add app-local Playwright config and semantic tests for all M1 route classes.
   - Disable JavaScript in both projects and verify deep links, focus visibility,
     headings/body, 404 recovery, and overflow at both approved viewports.
   - Add only app-specific artifact ignores if the existing ignore rules do not
     already cover them.

5. **Integrate and verify without broadening scope**
   - Run content-schema test, Astro check, and production build through `./sam`.
   - Inspect emitted route files and prove drafts are absent.
   - Run focused then full Playwright through the matching image.
   - Re-run unchanged NERV check/build to prove isolation.
   - Do not edit Dockerfile, Nginx, compose, `dev.sh`, `sam`, NERV source/config,
     or future milestone directories.

6. **Refresh durable specs after the quality gate**
   - In Phase 3.3, update frontend specs from “NERV is the only runnable package”
     to the implemented two-package reality, including site commands, content
     loader/schema, route, and Playwright contracts.
   - Do not promote temporary sample copy or M1-specific visual choices.

## Validation Commands

```bash
./sam npm --prefix apps/site ci
./sam npm --prefix apps/site run test:content
./sam npm --prefix apps/site run check
./sam npm --prefix apps/site run build

test -f apps/site/dist/index.html
test -f apps/site/dist/posts/hello-static-foundation/index.html
test -f apps/site/dist/pages/about/index.html
test -f apps/site/dist/404.html

SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host \
  ./sam npm --prefix apps/site run test:e2e -- tests/site.spec.ts

SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host \
  ./sam npm --prefix apps/site run test:e2e

./sam npm --prefix experiments/nerv run check
./sam npm --prefix experiments/nerv run build
git diff --check
python3 ./.trellis/scripts/task.py validate 08-12-astro-static-foundation
```

Use repository-aware output inspection rather than depending on the literal sample
slug if implementation makes a documented fixture-name adjustment. The route and
draft-exclusion assertions must remain equivalent.

## Risky Files and Rollback Points

- `package.json`: preserve every NERV script while adding site delegates.
- `apps/site/package.json` / lockfile: exact versions only; peer conflicts stop
  the task instead of forcing resolution.
- `apps/site/src/content.config.ts`: loader bases must resolve from the app root to
  repository-root `content/`; a wrong base can produce a false empty build.
- `src/lib/content-schema.mjs`: collection and test imports must point to the same
  schema object; do not duplicate validation logic.
- `src/lib/content.ts`: draft filtering and uniqueness errors must run before
  route generation.
- `astro.config.mjs`: preserve Unified processing and static directory output.
- Playwright config: keep package/image version `1.62.0`, `SAM_IPC=host`, app-local
  artifacts, JavaScript disabled, and the approved two viewports.

Rollback is limited to new site/content paths plus the small root script/ignore
edits. Deployment and NERV are deliberate non-participants.

## Pre-Start Gate

- [x] Minimal route set selected by the user.
- [x] Current Astro/package compatibility researched.
- [x] UUPM task research generated and approved signals promoted to design.
- [x] In-scope/out-of-scope and observable acceptance criteria converged.
- [x] Implementation and check manifests contain real spec/research entries.
- [x] User approved the final planning summary in a fresh message on 2026-08-12.
