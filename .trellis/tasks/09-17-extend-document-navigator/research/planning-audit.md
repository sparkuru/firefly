# Planning audit — 2026-09-17

Scope: audit and revise the existing parent planning task only. No implementation,
external workspace edit, task start, build, or browser test was performed.

## Findings

| Severity | Baseline problem | Correction |
| --- | --- | --- |
| High | Goal/R4 describes renaming a field that does not exist (`contentTheme`) | Establish `articleTheme` as current; rename direction and compatibility remain explicit decisions |
| High | Disabled capability has no configuration owner, default, or destination contract | R1/R2 require configuration resolution and destination-aware vim; site configuration versus author metadata is a blocking choice |
| High | No markup was treated as a proxy for no resources | Require built HTML/import graph and browser request evidence; account for navigator CSS embedded in shared styles |
| Medium | Completed fragment migration still appears as fresh work | R5 becomes a cross-child regression invariant; historical records and negative tests are exempt from textual bans |
| Medium | Four cells could overclaim arbitrary navigator compatibility | Bound production support to registered implementations; use a test-only alternate definition for resolver extensibility |
| Medium | Semantic initial fragment activation does not establish same-page entry behavior | Require post-load activation, focus, repeat entry, exit and history acceptance |
| Medium | Theme rename/picker conflates independent compatibility and runtime policies | Separate migration policy from picker UX; do not infer breaking migration from fragment policy |
| Medium | Parent has work streams but no dependency/completion map | Propose three independently verifiable children; R5 stays a shared gate |

## Verified evidence

- `apps/site/src/lib/presentation-experiences.ts:6`: renderer kind and required
  navigator profile share one experience; registry validation is hard-coded to
  one navigator kind and two entry policies; defaults are firefly/always and
  semantic/fragment.
- `apps/site/src/lib/document-navigation.ts:1`: current fragment and entry types;
  no disabled state.
- `apps/site/src/components/DocumentPresentation.astro:27`: resolution uses
  presentation metadata; theme comes from `entry.data.articleTheme`.
- `apps/site/src/components/SemanticDocument.astro:72` and
  `apps/site/src/components/TerminalDocument.astro:98`: theme attribute lives on
  the same body wrapper that currently carries navigator semantics. Both render
  navigator status unconditionally; outlines require two or more entries.
- `apps/site/src/components/DocumentNavigationStatus.astro:38`: component script
  imports the navigator runtime. Actual Astro bundling for conditional components
  is a future build-verification obligation, not a claim proven by this audit.
- `apps/site/src/styles/global.css:272` and
  `apps/site/src/styles/terminal.css:1127`: navigator rules are embedded in shared
  presentation CSS. Asset isolation requires more than suppressing status markup.
- `apps/site/src/scripts/terminal-home.ts:127` and `:808`: same-origin helper
  unconditionally decorates document-navigation destinations with the fragment.
- `apps/site/src/scripts/document-navigator.ts:159`: runtime reads the initial
  fragment; future entry UX must be checked against the complete state machine.
- `apps/site/src/lib/content-schema.mjs:91`: presentation defaults and existing
  articleTheme schema; `apps/site/scripts/blog-meta.mjs:38` lists both public keys.
- `.trellis/spec/frontend/content-workspace-contract.md:218`: existing registry
  contract and site-owned navigator boundary; author-facing navigator schema
  would require an intentional spec change.
- `.trellis/spec/frontend/site-configuration-contract.md:222`: theme schema,
  registered default/paper values, content-scoped CSS, strict input validation,
  X Core exclusion, and external-workspace no-edit validation.

A search of `apps`, `presentations`, `packages`, `plugins`, `tooling`, and
`.trellis/spec` found no `terminal-reader` match. An additional nonexistent `docs`
path produced a search error; no claim is made about that path. Historical task
records/journals were intentionally outside the live-contract audit.

## Relevant future validation surfaces

Existing tests include `presentation-experiences.test.mjs`,
`content-schema.test.mjs`, `blog-meta-cli.test.mjs`, `static-output.test.mjs`,
`document-navigator.spec.ts`, `terminal.spec.ts`, and X Core integration tests
under `apps/site/tests/`. Reuse these contracts instead of source-text-only checks.

Root package scripts expose `check:m3`, `test:m3`, `build:m3`,
`test:e2e:site`, and `test:e2e:publication`. Select exact commands and the project's
Docker/content-root procedure when creating implementation artifacts; this audit
has not executed those gates and does not declare implementation readiness.
