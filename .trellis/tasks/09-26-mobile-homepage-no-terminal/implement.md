# Implementation plan

## Planning gate

- [x] Owner authorized the repair task and mobile constraint spec.
- [x] Inspect prior intent, archived tasks, current lifecycle/CSS and affected tests.
- [x] Present final planning summary and obtain subsequent explicit approval before product edits or `task.py start`. Owner approved with "开始".
- [x] Validate real context manifests, then start the task after approval. Both manifests passed; oversized workspace spec requires direct reads as recorded in research.

## Ordered work

1. [x] Load curated specs and directly read the oversized content-workspace homepage/input/mobile sections. Implementation owns `apps/site`; main owns task/spec writes.
2. [x] Gate static CSS, inline marker, module entry and Terminal runtime consistently. Mobile-first does not initialize Terminal; mode changes suspend input/focus/pending boot and initialize/resume once on desktop.
3. [x] Preserve mobile native index/search, suppress shell-only framing and remove Terminal viewport reservation. Search failure never opens Terminal.
4. [x] Replace obsolete mobile Terminal expectations with absence/native-browsing/input tests while retaining desktop commands and article policy. Register new suites in explicit Playwright patterns.
5. [x] Run site gates and affected built-artifact browser checks through wrappers. Inspect portrait/landscape viewport captures; record actual evidence in `research/validation.md`.
6. [x] Dispatch independent Trellis check, fix verified findings and rerun affected checks. Main synchronizes mobile/search/workspace specs with reviewed code. Two desktop-origin failed/delayed-module detours were reproduced and fixed; final gates passed.
7. [x] Complete AC/evidence/diff review and prepare a coherent Phase 3.4 commit plan. Owner approved the proposed batch with "提交"; archive/journal follow the work commit under finish-work.

## Validation commands

Use `./sam` for Node and `./render.sh` for rendering/browser checks, with explicit tracked `content/`. Build static artifacts first; no host npm/Node or `astro dev` evidence.

```bash
./sam npm --prefix apps/site ci
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run test:content
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run test:x-core
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run check
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run build
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run test:e2e -- tests/home-search.spec.ts tests/document-navigator-mobile.spec.ts --project=chromium-mobile-interactive
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run test:e2e -- tests/terminal.spec.ts tests/home-search.spec.ts tests/document-navigator.spec.ts --project=chromium-desktop-interactive
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run test:e2e -- tests/site.spec.ts tests/home-search.spec.ts --project=chromium-desktop-static --project=chromium-mobile-static
git diff --check
python3 .trellis/scripts/task.py validate .trellis/tasks/09-26-mobile-homepage-no-terminal
```

Include any new mobile-homepage suite in final commands and project registration. Test paths precede `--project=<name>` to avoid variadic CLI parsing. Add package gates only if source changes cross a package boundary. No lint script is declared; report Astro diagnostics/whitespace checks accurately.

## Review focus

Early/delayed modules must not flash Terminal. Document-level typing/composition/clear handlers and async boot/effect continuations must respect availability. Hidden prompts cannot retain focus. Native index must survive desktop startup/hidden flags. Repeated switches cannot duplicate listeners, boot records, command effects or search timers. Do not weaken desktop checks or force mobile media settings to satisfy obsolete tests. Physical-device keyboard review is optional and must not be claimed complete.
