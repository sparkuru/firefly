# M2 X Core semantic interface

## Goal

Create the thin, build-time X Core boundary between validated Markdown and
presentations, then make the semantic presentation the main site's accessible,
static default. The milestone must prove that presentation selection is a real
contract without implementing the Terminal product scheduled for M3.

The reader outcome is durable, directly addressable HTML that remains complete
without JavaScript. The author outcome is that one framework-neutral Markdown
source can be transformed by a registered presentation without changing its
body.

## Background and Confirmed Facts

- The root product contract defines X Core as normalize / validate / transform,
  not as another site generator (`prd.md:115-150`, `prd.md:214-251`).
- M2 owns contracts, the AST pipeline, a presentation registry, and diagnostics;
  M3 separately owns the Terminal interface (`prd.md:512-522`).
- M1 already provides Astro 7.1.6, explicit Unified processing through
  `@astrojs/markdown-remark`, strict external content loaders, static post/page
  routes, and JavaScript-disabled browser evidence.
- `presentation` is currently optional and accepts only `semantic`. Unknown
  public presentations fail validation. M2 may move the closed-set check from
  the metadata shape to the registry boundary, but it must not weaken failure
  behavior.
- Public content is projected once by `getPublicContent()`; routes do not own
  draft, slug, layout, or presentation policy.
- Main-site and experiment dependencies, source, styles, configs, and outputs
  remain isolated. X Core must not know about `experiments/nerv`.
- UUPM research supports a content-first editorial surface, high contrast,
  controlled reading measure, visible focus, semantic headings, and responsive
  overflow handling. Its newsletter CTA, external Google Font, pink branding,
  and route-transition motion are not requirements and conflict with the
  current static/no-external-font baseline.
- On 2026-08-12 the owner selected a restrained editorial treatment for M2. The
  existing neutral palette and system-font foundation should be refined, not
  replaced with a strong final brand treatment.

## Requirements

### R1 — Explicit X Core contracts

- Define typed contracts for normalized document input, document context,
  presentation adapters, diagnostics, and enhancement manifests.
- X Core accepts content that has already passed the authored metadata schema;
  it must not duplicate Astro routing, content loading, or draft policy.
- Outputs must be deterministic for identical content and configuration.

### R2 — Build-time AST pipeline

- Process Markdown through the repository's explicit Unified pipeline at build
  time and expose normalized mdast/hast data to X Core-owned transforms.
- Generate stable heading IDs, a document outline/table of contents, a summary,
  normalized internal-link/resource references, and stable `nodeId` values for
  nodes that can be enhanced.
- Malformed or conflicting transform results must produce actionable diagnostics
  instead of silently emitting partial output.

### R3 — Presentation registry and selection

- A registry resolves the front-matter `presentation`; omission resolves to the
  registered `semantic` default.
- Duplicate adapter IDs and unknown or unsupported presentation selections fail
  with a diagnostic that identifies the document and requested adapter.
- Tests may register a fixture adapter to prove that the same normalized content
  can select a different presentation. No Terminal adapter or Terminal UI ships
  in M2.

### R4 — Semantic presentation

- Implement the registered `semantic` adapter for Markdown-backed post and page
  routes without changing source Markdown. Home and 404 remain shell-level
  regression surfaces rather than synthetic presentations.
- Render native document semantics for headings, paragraphs, links, lists,
  blockquotes, code, images, and tables when those nodes are present.
- Preserve one primary heading, sequential content headings, a visible skip
  path, keyboard-visible focus, direct links, and complete no-JavaScript reading.
- Keep long-form text within a readable measure and prevent document-width
  overflow at the approved desktop and mobile viewports. Wide content may use a
  localized scroll container; it must not be globally clipped.

### R5 — Enhancement manifest boundary

- Define a safely serializable manifest whose entries contain stable `nodeId`,
  feature, module, loading strategy, and JSON-compatible props.
- The semantic adapter may emit an empty manifest. Fixture coverage must prove
  that every non-empty manifest entry references an emitted DOM node and that
  invalid or unsafe values fail before static output.
- M2 adds no browser enhancement loader and no hydration dependency.

### R6 — Main-site integration and isolation

- Existing content collections and routes consume X Core through one shared
  integration boundary; routes remain thin and do not parse Markdown directly.
- Draft exclusion, global slug uniqueness, deterministic ordering, and current
  layout failures remain intact.
- Ordinary site output contains no Terminal, xterm, NERV, experiment CSS,
  browser Markdown parser, hydration directive, external font request, private
  data, local absolute path, or source map.
- NERV remains unchanged and continues to check/build independently.

### R7 — Diagnostics and observability

- Diagnostics have a stable severity/code/message shape plus document/source
  context where available.
- At minimum, tests cover duplicate adapter registration, unknown presentation,
  unsupported document context, transform/node identity conflicts, and manifest
  references to missing nodes.
- Build failures must name the owning document and violated contract closely
  enough to fix the source or registry without debugging generated HTML.

### R8 — Visual scope

- Keep the semantic surface restrained and editorial: neutral paper-like
  surfaces, near-black text, the existing subdued link/focus accents, system
  fonts, generous whitespace, and a controlled reading measure.
- Refine the current M1 design tokens instead of introducing a brand redesign,
  oversized statement typography, external fonts, decorative motion, dark mode,
  or a new icon system.
- Reading structure such as an on-page outline may become visible when useful,
  but content remains primary and the interface must not resemble a dashboard,
  newsletter landing page, or Terminal preview.

## Acceptance Criteria

- [ ] AC1: Unit/fixture tests feed the same validated Markdown document through
      `semantic` and a registered test adapter and observe deterministic,
      adapter-specific output without editing the Markdown body.
- [ ] AC2: Fixture coverage proves stable heading IDs, outline order, summary,
      internal-link/resource normalization, and stable enhancement `nodeId`
      generation across repeated runs.
- [ ] AC3: Duplicate adapter IDs, unknown presentation, unsupported context,
      node-ID collision, unsafe manifest props, and missing manifest DOM targets
      each fail with a typed, document-aware diagnostic.
- [ ] AC4: Existing post and page URLs render the semantic adapter as valid,
      meaningful static HTML; the home and 404 contracts remain functional.
- [ ] AC5: JavaScript-disabled Playwright coverage passes at `1440x900` and
      `375x812` for the existing route classes plus semantic heading, outline,
      table/code overflow, focus, and deep-link behavior introduced by M2.
- [ ] AC6: Content schema and negative-build coverage still reject invalid
      metadata, duplicate public slugs, drafts in public output, unsupported
      layouts, and unregistered presentations.
- [ ] AC7: Main-site check/build, focused/full Playwright, static-artifact scans,
      and unchanged NERV check/build all pass through `./sam`.
- [ ] AC8: Static main-site output contains no client script/hydration, external
      font request, Terminal/xterm/NERV dependency, experiment style, draft,
      private data, local absolute path, or source map.
- [ ] AC9: Durable frontend specs describe the implemented X Core, registry,
      semantic adapter, diagnostics, and validation commands without presenting
      M3/M4 architecture as complete.

## Out of Scope

- Terminal UI, commands, state machine, adapter, or terminal-specific client
  JavaScript (M3).
- Experiment manifests, `/lab/` publication, artifact assembly, Docker/Nginx
  rollout, or changes to NERV (M4 and later).
- Timeline/files final semantics, tags, RSS, sitemap, Open Graph, canonical-domain
  rollout, legacy redirects, comments, or full content migration.
- Runtime Markdown parsing, a client router, shared browser state, an enhancement
  loader, a component framework, MDX, or raw authored HTML.
- Publishing X Core as a general-purpose npm framework.
- Strong final-brand exploration, external web fonts, dark mode, decorative
  animation, subscription UI, or a new icon dependency.
