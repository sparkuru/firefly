# UI/UX Pro Max research: canonical document reader

## Scope

Query: `documentation reader terminal read-only Vim static Astro phosphor`

Design dials used for the project-level recommendation:

- variance: 3/10 — centered/minimal;
- motion: 2/10 — subtle;
- density: 3/10 — spacious.

The project-local `ui-ux-pro-max` database was used. Its generated design-system
recommendation is advisory; existing project contracts remain authoritative.

## Useful findings adopted

- Keep a content-first document composition with a predictable deep-link path.
- Preserve semantic HTML, sequential headings, native links, visible focus, and
  keyboard access for every reader state.
- Use breadcrumbs for the nested document hierarchy and make the current
  location visually and semantically clear.
- Keep the existing JetBrains Mono/Phosphor terminal language, sparse spacing,
  subtle motion, reduced-motion behavior, and the existing 375/768/1024/1440
  responsive checkpoints.
- Treat reader search, selection, mode, and exit feedback as explicit state;
  do not communicate state through color alone.
- Keep Astro static routes and progressive enhancement: no runtime content
  fetch, client-side Markdown parser, or route-level client framework.

## Findings rejected for this project

- The generated Newsletter/content-landing pattern, subscription CTA, and
  social-proof sections do not describe a document reader.
- Exaggerated-minimalism's oversized display typography is not a fit for long
  Markdown reading; the existing bounded title scale and readable prose measure
  remain preferable.
- The generated light neutral/blue palette is not adopted; the existing
  semantic Phosphor tokens and high-contrast dark terminal surface are part of
  the product identity.
- External Google Fonts, icon libraries, GSAP snippets, and router transition
  hooks are rejected because the site uses pinned same-origin fonts, native
  text/links, static output, and no SPA router.
- Generic advice to update URLs for every reader state is not applied to local
  Vim mode/search/selection state. Canonical document identity belongs in the
  URL; transient reader state remains local unless a later product decision
  explicitly defines shareable state.

## Existing visual evidence

- The current breadcrumb already communicates the virtual path clearly and
  keeps the current filename unlinked.
- The article title, outline, and semantic body read as a document rather than
  an editor, which is the desired baseline.
- The active reading unit has a visible focus/active outline.
- Search and mode feedback currently live in the reader status region below the
  document body; discoverability and viewport settlement should be reviewed in
  the next design pass.

## Source constraints

- Project-local skill: `.codex/skills/ui-ux-pro-max/SKILL.md`.
- Search data: `.codex/skills/ui-ux-pro-max/data/`.
- Search scripts: `.codex/skills/ui-ux-pro-max/scripts/`.
- Existing implementation contracts: `.trellis/spec/frontend/` and the archived
  `08-13-m5-content-filesystem-vim-reader` task.
