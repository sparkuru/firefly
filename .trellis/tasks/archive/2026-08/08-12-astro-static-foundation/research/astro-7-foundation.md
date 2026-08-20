# Astro 7 Foundation Research

## Repository Evidence

- Root architecture and milestone boundary: `prd.md`, especially sections 5–10,
  14–16, and 18–19.
- Current runnable frontend: `experiments/nerv/` on Astro `^4.16.18`, isolated by
  its own package and lockfile.
- Runtime command boundary: `.trellis/spec/frontend/development-runtime.md` and
  root `sam`.
- Docker readiness on 2026-08-12: `./sam node --version` returned `v22.23.1`.
- Current repository is not configured as a Trellis multi-package project and the
  root npm manifest is an orchestration manifest, not a workspace.

## Current Official Astro Facts

- Astro stable package version observed on 2026-08-12: `7.1.6`.
  Source: <https://www.npmjs.com/package/astro>
- npm compatibility metadata observed through `./sam npm view`:
  - `astro@7.1.6` requires Node `>=22.12.0` and declares
    `@astrojs/markdown-remark` `7.2.2` as its peer.
  - `@astrojs/check@0.9.10` accepts TypeScript `^5 || ^6`, so the latest
    compatible TypeScript line is pinned at `6.0.3`, not current TypeScript 7.
  - `@tailwindcss/vite@4.3.3` accepts Vite 8, which Astro 7 uses.
- Astro 7 uses Vite 8, reserves `src/fetch.ts`, defaults Markdown to Sätteri, and
  changes default HTML whitespace handling to JSX semantics.
  Source: <https://docs.astro.build/en/guides/upgrade-to/v7/>
- Keeping the Unified Markdown pipeline requires installing
  `@astrojs/markdown-remark`, importing `unified`, and setting
  `markdown.processor: unified()`.
  Source: <https://docs.astro.build/en/guides/upgrade-to/v7/#new-default-markdown-processor-satteri>
- Build-time collections are registered from `src/content.config.ts`; an explicit
  `glob({ pattern, base })` loader can read Markdown from another filesystem
  directory, while a Zod schema validates and types entry data.
  Source: <https://docs.astro.build/en/guides/content-collections/>
- Static content pages use `getCollection()`, `getStaticPaths()`, `render(entry)`,
  and the returned `<Content />` component.
  Source: <https://docs.astro.build/en/guides/content-collections/#building-for-static-output-default>
- Tailwind 4 support uses the `@tailwindcss/vite` Vite plugin and a global CSS
  `@import "tailwindcss"`; the legacy `@astrojs/tailwind` integration is not the
  Tailwind 4 path.
  Source: <https://docs.astro.build/en/guides/styling/#tailwind>

## UUPM Planning Baseline

Command:

```text
python3 .codex/skills/ui-ux-pro-max/scripts/search.py \
  'personal developer blog content-first editorial minimal static reading' \
  --design-system --variance 3 --motion 1 --density 4 -p 'firefly M1'
```

Reusable M1 signals:

- Content-first, high-contrast, restrained motion, generous but not landing-page
  scale spacing, and controlled reading measure.
- Preserve visible focus, heading order, mobile-first layout, and no horizontal
  overflow at `375px` through `1440px`.
- Do not adopt the generated newsletter CTA, external Google Fonts, oversized
  marketing hero, or accent palette: those are unrelated to the milestone and
  would pre-empt later presentation/brand work.

## Planning Consequences

- Treat `apps/site/` as a new independent package and leave NERV on Astro 4.
- Use exact direct dependency versions plus an app-local lockfile.
- Keep M1 markup deliberately semantic and replaceable; it proves the content
  pipeline rather than defining the final presentation language.
- Browser evidence is required because M1 creates reachable pages. Test with
  JavaScript disabled so readability is proved rather than inferred.
