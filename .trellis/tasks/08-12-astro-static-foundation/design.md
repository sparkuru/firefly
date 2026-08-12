# M1 Technical Design

## 1. Architecture and Boundaries

M1 adds one autonomous main-site package without introducing a workspace:

```text
content/posts/*.md ─┐
                    ├─ glob loaders + strict schemas
content/pages/*.md ─┘             │
                                  ▼
                        public content queries
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
        apps/site/src/      posts/[slug].astro  pages/[slug].astro
        pages/index.astro          │                   │
              └───────────────────┴───────────────────┘
                                  │
                                  ▼
                       static apps/site/dist/
```

`apps/site/` owns Astro 7, Tailwind 4, its lockfile, checks, and browser tests.
`experiments/nerv/` remains an independent Astro 4 package. Neither package
imports the other's source, assets, styles, configuration, or dependencies.

The root `package.json` remains a thin command delegator. It is not converted to
an npm workspace, and `dev.sh`, deployment files, Nginx, and publication assembly
are untouched.

## 2. Planned Layout

```text
content/
├── posts/hello-static-foundation.md
└── pages/about.md
apps/site/
├── package.json
├── package-lock.json
├── astro.config.mjs
├── tsconfig.json
├── playwright.config.ts
├── src/
│   ├── content.config.ts
│   ├── lib/
│   │   ├── content-schema.mjs
│   │   └── content.ts
│   ├── layouts/DocumentLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── 404.astro
│   │   ├── posts/[slug].astro
│   │   └── pages/[slug].astro
│   └── styles/global.css
└── tests/
    ├── content-schema.test.mjs
    └── site.spec.ts
```

Only directories with an authored M1 file are created. No empty future
`packages/`, `presentations/`, `tooling/`, `timeline`, `files`, `tags`, or `lab`
structure is added.

## 3. Dependency and Runtime Contract

Direct versions are exact in `apps/site/package.json` and its lockfile:

| Package | Version | Purpose |
| --- | --- | --- |
| `astro` | `7.1.6` | Static site and Content Collections |
| `@astrojs/markdown-remark` | `7.2.2` | Astro 7 Unified processor |
| `@astrojs/check` | `0.9.10` | Astro/type/content diagnostics |
| `typescript` | `6.0.3` | Latest line accepted by `@astrojs/check` |
| `tailwindcss` | `4.3.3` | Main-site CSS utilities/tokens |
| `@tailwindcss/vite` | `4.3.3` | Tailwind 4 Vite integration |
| `@playwright/test` | `1.62.0` | Version-matched browser validation |

Astro 7.1.6 requires Node `>=22.12.0`; `./sam` currently supplies Node
`22.23.1`. Normal commands use `node:22-alpine`. Browser commands use
`mcr.microsoft.com/playwright:v1.62.0-noble` with `SAM_IPC=host`.

`astro.config.mjs` configures:

- `output: 'static'`;
- directory-format routes with trailing slashes;
- `markdown.processor: unified()`;
- Tailwind through `@tailwindcss/vite` in `vite.plugins`.

Astro 7's default Sätteri processor is intentionally not used because the root
architecture reserves the remark/rehype ecosystem for later X Core work.

## 4. Content Contract

`src/lib/content-schema.mjs` exports shared runtime Zod schemas used by both
Content Collections and Node's schema tests. Keeping one runtime schema avoids a
test-only reimplementation.

Shared fields:

| Field | Runtime rule |
| --- | --- |
| `title` | required non-empty string |
| `slug` | required non-empty single URL segment; no slash, query/hash marker, or whitespace; Unicode is retained |
| `date` | required coercible date |
| `updated` | optional coercible date, not earlier than `date` |
| `description` | required non-empty string |
| `tags` | optional array of non-empty strings |
| `draft` | required boolean |
| `presentation` | optional literal `semantic`; later milestones expand the registered set |
| `aliases` | optional array of absolute-path strings; emission is deferred |

The posts collection requires `layout: 'post'`. The pages collection accepts
`layout: 'page' | 'timeline' | 'files'`; M1 authors only the `page` fixture and
does not generate routes for future specialized layouts. Both schemas reject
unknown front-matter keys so unsupported intent does not silently disappear.

`src/lib/content.ts` loads both collections, removes drafts, asserts globally
unique public slugs, sorts deterministic lists, and returns the inputs used by
the home and static-route generators. Routes use `entry.data.slug`, not a title
or filename-derived value. A duplicate slug or unsupported public layout fails
the build with an actionable message.

## 5. Static Routing and Rendering

- `/` lists the authored public post and page with ordinary deep links and a
  short explanation that this is the static foundation.
- `/posts/[slug]/` and `/pages/[slug]/` use `getStaticPaths()`, receive a content
  entry as a prop, call `render(entry)`, and place `<Content />` inside an
  `<article>`.
- `404.astro` produces `404.html` with a visible path back to `/`.
- Drafts are absent from `getStaticPaths()` and the home lists.
- No client script or hydration directive is introduced. Markdown becomes HTML
  during the Astro build.

`DocumentLayout.astro` owns the HTML shell, title/description metadata, skip link,
header navigation, `<main id="main-content">`, and footer. Route files own only
data loading and page-specific semantic content.

## 6. Approved UI Context

The UUPM research recommends a content-first editorial structure with high
contrast, controlled line length, mobile-first spacing, visible focus, and
restrained motion. M1 promotes only those stable signals:

- neutral system fonts; no external font request;
- semantic surface/text/link/focus tokens in `global.css`;
- long-form measure around 65–75 characters;
- 16px-or-larger body text and approximately 1.6–1.75 line height;
- a skip link, sequential headings, visible keyboard focus, and native links;
- responsive behavior verified at `375x812` and `1440x900` with no horizontal
  document overflow;
- no decorative animation, icon dependency, newsletter CTA, marketing hero, or
  final brand palette.

Tailwind utilities may express page/layout styling, while Markdown typography is
anchored by a small semantic `.prose` layer in global CSS. This is a replaceable
M1 scaffold and does not establish the M2 semantic presentation's final look.

## 7. Tests and Evidence

### Content contract

`node --test tests/content-schema.test.mjs` imports the same schemas used by
Astro and proves:

- valid post/page metadata parses and coerces dates;
- invalid date, slug, layout, presentation, chronological update, and unknown
  field are rejected.

### Astro checks

- `astro check` validates source, collection config, and content.
- `astro build` must emit `index.html`, post/page `index.html` files, and
  `404.html` under `apps/site/dist/`.
- A post fixture with `draft: true` may be included only if needed to prove route
  exclusion; it must not appear in output or navigation.

### Browser checks

The site owns a Playwright config with `javaScriptEnabled: false`, desktop
`1440x900`, and mobile `375x812` Chromium projects. Tests cover all four M1 route
classes and assert semantic headings/body, deep-link navigation, visible keyboard
focus, and document-width containment. Reports and traces stay under the app's
ignored `playwright-report/` and `test-results/` paths.

Focused command precedes the full site suite:

```bash
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host \
  ./sam npm --prefix apps/site run test:e2e -- tests/site.spec.ts

SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host \
  ./sam npm --prefix apps/site run test:e2e
```

The unchanged NERV package is checked and built after the new site to prove
package isolation.

## 8. Compatibility, Failure, and Rollback

- No production route changes until a later assembler/deployment task consumes
  `apps/site/dist/`; the running NERV-only image is unaffected.
- Install or peer-dependency failures stop implementation before source work is
  claimed complete. Do not use `--force`, `--legacy-peer-deps`, or audit-force
  upgrades.
- Content schema and build errors are blocking evidence, not candidates for
  weakened validation.
- Browser-image unavailability is recorded exactly and triggers the Trellis Plus
  submit-ready gate; it is never converted into a pass.
- Rollback is a normal revert of the new `apps/site/`, sample `content/`, root
  delegation scripts, and app-specific ignore entries. NERV and deployment files
  remain intact throughout.
