# Boundary evidence: X Core host and canonical routes

## Evidence snapshot

| Boundary | Current evidence | Risk | Planned treatment |
| --- | --- | --- | --- |
| X Core public surface | `packages/x-core/src/index.ts:1-7` re-exports `plugins.ts`; `packages/x-core/src/plugins.ts:41-73` defines publication/service inputs and lifecycle types | X Core appears to own site, publication, and service lifecycle even though its approved contract ends at content/Presentation processing | Remove the generic host/export; retain document/Presentation APIs and move site-only behavior to `apps/site` |
| X Core host usage | `apps/site/src/lib/site-plugins.ts:1-125` is the only current registry consumer; repository search found no production caller of `publicationContributions()` or `servicePlugins()` | Unused host behavior expands the package boundary and makes private/publication data look like X Core concerns | Keep one statically registered, site-local comments extension registry; leave publication/service adapters with their owners |
| Canonical content route | `apps/site/src/lib/content.ts:80-84,91-123` builds page and nested-post hrefs used by the canonical model, directory tree, comments mapping, and route reservations | Public route behavior is concentrated in the content model but is not reusable by the Astro resolver | Export/use a pure site-owned route projection helper without changing directory or alias ownership |
| Astro X Core route | `apps/site/src/lib/x-core-context.ts:75-105` independently computes parent path, slug, and route from staged files/front matter | Future route changes can make `DocumentContext.route` disagree with `CanonicalDocument.href` | Feed the same validated collection/path/slug contract into the shared helper and keep X Core diagnostics at the adapter boundary |
| Existing compatibility | `apps/site/tests/site.spec.ts:221-250`, `apps/site/tests/comments.test.mjs:47-112`, and the full deterministic gate cover nested/page/Unicode/public comments routes | A boundary refactor could silently change output while unit tests stay green | Retain focused route tests plus site, static-output, browser, and publication verification |

## Constraints

- No public URL, authored content, comments schema, private service input, or
  deployment state changes.
- The route helper is site-owned, not an X Core package API, because it uses
  the site's `posts`/`pages` collection and staged-content conventions.
- The comments manifest remains an internal ownership index. Static registration
  is allowed; dynamic discovery and generic runtime lifecycle hosting are not.

## Validation evidence

- `python3 ./.trellis/scripts/task.py validate .trellis/tasks/08-28-x-core-route-boundary-cleanup` passed for both context manifests.
- `./sam npm run check:x-core`, `./sam npm run test:x-core`, `./sam npm run check:site`, `./sam npm run test:content:site`, `./sam npm run test:x-core:site`, and `./sam npm run build:site` passed.
- `./verify.sh` passed its package checks, package tests, site/static build, and experiment build stages, then stopped at publication assembly with the existing state guard: `comments tombstone epoch 0 predates the published epoch 4; refusing rollback.` The command therefore did not reach the later browser/publication E2E stages; no publication state was changed.
- `FIREFLY_CONTENT_ROOT="$PWD/content" SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm run test:e2e:site` passed all 130 main-site browser tests, and the corresponding `test:e2e:nerv` run passed all 8 NERV tests.
- The standalone `test:e2e:publication` run reached its 4 tests against the existing release: NERV passed 2/2, while the two main publication tests failed because the existing release did not expose the expected `llm-workflow-with-trellis` heading. A fresh assembled release could not be produced without crossing the guarded publication state above; this failure is recorded rather than attributed to the route/X Core change.
