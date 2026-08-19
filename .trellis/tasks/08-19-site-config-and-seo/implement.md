# Implementation Plan: Build-time site personalization and SEO configuration

## Ordered checklist

1. [ ] Re-read the approved task PRD/design and frontend specs; confirm the
       working tree contains only this task's planning artifacts before start.
2. [ ] Add `config/site.yaml` and `config/site.yaml.example` with current
       defaults and documented public fields; add the direct YAML dependency to
       `apps/site` and update its lockfile through `./sam`.
3. [ ] Implement the strict, frozen site-config loader and pure metadata/URL
       helpers; add unit coverage for valid, invalid, optional-origin, and
       override behavior.
4. [ ] Extend content schema/types for `htmlTitle`, `canonical`, `seoImage`,
       and `noindex`; update content-schema tests and representative fixtures.
5. [ ] Add the shared site head metadata contract and wire both layouts,
       document dispatch, route defaults, language, brand, title suffix,
       canonical, robots, Open Graph, Twitter Card, and article metadata.
6. [ ] Add build-time robots/sitemap emission from the final public route list,
       including XML/text escaping and no-origin behavior; update static
       inventory/publication assertions.
7. [ ] Thread configured Terminal identity from Astro markup into the browser
       controller, update optional identity/cwd support in the Terminal runtime,
       and update directory prompts without weakening package defaults.
8. [ ] Update README with clone, Docker, development, production, config, and
       article front-matter instructions; state that build config is public and
       tracked private/draft source is not hidden from clones.
9. [ ] Run focused unit/schema/static tests and Astro check/build; inspect the
       emitted HTML, metadata, robots/sitemap, route inventory, and absence of
       draft/private/source paths.
10. [ ] Run focused and full main-site Playwright suites, then relevant Terminal,
        assembler, and publication checks; run `git diff --check` and review the
        diff for config leakage or cross-package imports.

## Validation commands

```bash
./sam npm --prefix apps/site ci
./sam npm --prefix presentations/terminal ci
./sam npm --prefix apps/site run test:content
./sam npm --prefix apps/site run test:x-core
./sam npm --prefix presentations/terminal run check
./sam npm --prefix presentations/terminal run test
./sam npm --prefix apps/site run check
./sam npm --prefix apps/site run build
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- tests/site.spec.ts
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- tests/terminal.spec.ts
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- tests/reader.spec.ts
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e
./sam npm run check:m4
./sam npm run test:m4
./sam npm run build:m4
git diff --check
```

## Risk and rollback points

- A malformed or missing config must fail clearly, but an unset canonical
  origin must remain a supported non-production clone state. Roll back only the
  config loader/integration if the default build becomes unusable.
- Changing Terminal identity crosses the server-rendered/browser boundary;
  preserve JavaScript-disabled recovery and package-level default identity
  tests. Roll back the data-attribute/controller seam independently if prompt
  behavior regresses.
- New front-matter keys touch strict schema, X Core metadata, both layouts, and
  route/static tests. Revert the schema/output changes together; do not loosen
  `.strict()` or delete negative tests.
- Static output gains SEO files and metadata. Update exact inventory and
  publication probes together, retaining private/draft/path scans.
- Keep the deferred M5.1 task and unrelated Trellis changes untouched. Before
  commit, inspect `git status`, `git diff --stat`, and changed paths.
