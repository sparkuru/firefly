# Astro Static Foundation

## Goal

Deliver M1 from the root `prd.md`: a self-contained Astro 7 main-site package
that loads repository-root Markdown through validated Content Collections and
emits readable static HTML for the first content routes.

The value of this milestone is a trustworthy content-to-HTML foundation. It
does not implement X Core, the final semantic presentation, the Terminal home,
or experiment publication.

## Background and Confirmed Facts

- M0 and the frontend-spec bootstrap are complete. The only runnable frontend
  today is the autonomous Astro 4 experiment under `experiments/nerv/`; M1 must
  not upgrade it or import its source.
- The root product architecture places the main site under `apps/site/` and
  source Markdown under repository-root `content/`, outside Astro's package
  directory convention.
- The repository Docker wrapper is ready and reports Node `v22.23.1`.
- Astro `7.1.6` is the current stable release as of 2026-08-12. Astro 7 uses
  Sätteri by default; the approved architecture requires the Unified pipeline,
  so `@astrojs/markdown-remark` and `markdown.processor: unified()` are explicit
  dependencies/configuration.
- Astro's build-time Content Collections support an explicit `glob()` loader
  with a filesystem `base`, a Zod schema, `getCollection()`, `render()`, and
  static route generation.
- Tailwind 4 is integrated through the `@tailwindcss/vite` Vite plugin. The M1
  UI is a neutral content-first scaffold, not the final visual identity.

Research evidence is recorded in `research/astro-7-foundation.md`.

## Requirements

### R1 — Autonomous Main-Site Package

- Create `apps/site/` as a private, ESM Astro package with its own exact
  dependency declarations and lockfile.
- Pin the researched compatible set: Astro `7.1.6`,
  `@astrojs/markdown-remark` `7.2.2`, `@astrojs/check` `0.9.10`, TypeScript
  `6.0.3`, Tailwind / `@tailwindcss/vite` `4.3.3`, and Playwright `1.62.0`;
  do not convert the repository into an npm workspace and do not change NERV's
  Astro 4 dependency boundary.
- Configure `output: 'static'` and keep the site build output local to
  `apps/site/dist/`. Publication assembly remains a later milestone.

### R2 — Framework-Neutral Content Source

- Create repository-root `content/posts/` and `content/pages/` only when adding
  real sample Markdown; do not add empty future directories.
- Add one sample post and one sample page using `.md`, not `.mdx`.
- Sample bodies must not import Astro/framework components, contain hydration
  directives, or depend on presentation-specific CSS classes.

### R3 — Validated Content Collections

- Define build-time collections in `apps/site/src/content.config.ts` with
  explicit `glob()` loaders pointed at the repository-root content directories.
- Validate the root product front matter contract: `title`, stable `slug`,
  `date`, optional `updated`, `description`, optional `tags`, required `draft`,
  required `layout`, optional `presentation`, and optional `aliases`.
- Reject unknown layout/presentation values and invalid dates during check/build.
- Filter drafts from generated public routes.
- Use the explicit Unified Markdown processor required by the root architecture;
  no browser-side Markdown parsing is allowed.

### R4 — Static Route Foundation

- Generate content routes from collection entries with `getStaticPaths()` and
  render Markdown to semantic HTML at build time.
- Route files remain thin; a shared document layout owns metadata, navigation,
  global Tailwind import, and the main-content boundary.
- Implement exactly `/`, `/posts/<slug>/`, `/pages/<slug>/`, and the static
  `404` page. The user selected this minimal M1 route set on 2026-08-12.

### R5 — Readable, Replaceable Scaffold

- Provide a neutral content-first shell suitable for later replacement by M2/M3
  presentations: semantic landmarks, one primary heading, visible navigation,
  visible focus, mobile-first layout, no horizontal overflow, and readable
  long-form measure.
- Use Tailwind 4 through its Vite plugin and semantic CSS tokens. Do not add a
  client UI framework, hydration, external font request, decorative animation,
  newsletter flow, or final brand styling.
- Preserve useful static content and navigation when JavaScript is disabled.

### R6 — Repository Commands and Isolation

- Add root scripts that delegate install/check/build/test to `apps/site/` without
  removing the existing NERV scripts.
- All Node and browser commands run through `./sam`; host Node and raw-Docker
  alternatives are not part of the contract.
- Do not modify the current deployment image, Nginx routing, experiment manifest,
  or publication assembler in M1.

### R7 — Automated Evidence

- Add site-owned Playwright configuration and the smallest semantic browser test
  covering the approved M1 routes at desktop `1440x900` and mobile `375x812`.
- Assert readable headings/body content, deep-link navigation, and absence of
  document-width overflow with JavaScript disabled.
- Run focused Playwright coverage before the full site browser suite using the
  repository's pinned Playwright package/image contract.

## Acceptance Criteria

- [x] `apps/site/` installs from its lockfile through `./sam` and pins Astro 7
      plus compatible direct dependencies.
- [x] `./sam npm --prefix apps/site run check` passes with zero diagnostics.
- [x] `./sam npm --prefix apps/site run build` emits only static output.
- [x] Repository-root sample post and page pass the explicit collection schema;
      a targeted invalid fixture or equivalent check proves malformed front
      matter fails validation.
- [x] `/`, the sample `/posts/<slug>/`, the sample `/pages/<slug>/`, and
      `404.html` are emitted as independent files; the content routes display
      sample Markdown as semantic, readable HTML.
- [x] Draft entries are excluded from public route generation.
- [x] The main-site HTML contains no NERV source/style import and the NERV package
      remains independently checkable/buildable.
- [x] Focused and full site Playwright commands pass in desktop and mobile
      projects with JavaScript disabled and no horizontal overflow.
- [x] Existing NERV commands and its pinned Astro 4 package remain unchanged.

## Out of Scope

- X Core normalization, AST transforms, diagnostics, adapter registry, heading
  contract, and Enhancement Manifest (M2).
- Final semantic design, Terminal Presentation, commands, and terminal state
  machine (M2–M3).
- Experiment discovery, `/lab/` generation, NERV publication assembly, and root
  deployment redirect changes (M4+).
- Full Typecho migration, comments, attachments, aliases/redirect emission, RSS,
  sitemap, canonical production domain, Open Graph images, staging, and production
  rollout (M5–M7).

## Key Product Decision

The M1 route surface is deliberately minimal: `/`, one generated post route, one
generated page route, and `404`. `/timeline/`, `/files/`, `/tags/`, and `/lab/`
remain absent until their content semantics or experiment pipeline is implemented;
M1 will not create misleading placeholders.
