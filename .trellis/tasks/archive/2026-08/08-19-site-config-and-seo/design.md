# Technical Design: Build-time site personalization and SEO configuration

## Boundary

The site application owns repository-root configuration loading and HTML SEO
composition. The framework-neutral Terminal package remains reusable and keeps
its existing defaults, but its state/prompt helpers gain an optional injected
`TerminalIdentity`/working directory so the site does not fork the package or
read files from the package layer.

`config/site.yaml` is public build input. It is copied into the Docker build
context and its selected values are expected to appear in static HTML/JS. No
secret value is accepted as a supported configuration concept.

## Configuration flow

```text
config/site.yaml
  → YAML parser
  → strict site-config schema
  → frozen SiteConfig
  ├─→ layout/head metadata resolver
  ├─→ TerminalHome + browser identity boundary
  ├─→ directory/layout/site chrome
  └─→ build-done robots/sitemap writer

Markdown front matter
  → strict content schema
  → CanonicalDocument
  → DocumentPresentation
  → shared head metadata + selected presentation
```

The loader resolves the repository root from the site package path, reads
`config/site.yaml`, parses with the site's direct `yaml` dependency, validates
with a dedicated Zod schema, and returns a frozen object. The site config
module exposes pure metadata/URL helpers separately from filesystem I/O so unit
tests can exercise validation and URL behavior without rebuilding Astro.

The default config is committed so clone/build works immediately. The example
file is a complete commented template. If a future distribution wants local
overrides, the loader can add an explicit environment-selected path without
changing the default contract; this task does not add implicit secret lookup.

## Site metadata contract

Introduce a shared `SiteHead.astro` (or equivalent site-owned head component)
and a pure resolved metadata type. Both `DocumentLayout.astro` and
`TerminalLayout.astro` call the same resolver/component, while retaining their
stylesheet/theme ownership.

Resolved metadata includes:

- `htmlTitle`: front-matter `htmlTitle`, otherwise visible title plus the
  configured suffix, with the configured site name for home;
- `description`: per-document description or route/global default;
- `canonical`: explicit front-matter URL, otherwise `site.url + pathname` when
  `site.url` exists;
- `robots`: configured default, changed to `noindex,follow` for `noindex`;
- Open Graph/Twitter fields, with relative image paths made absolute only when
  an origin exists;
- article type, author, publication time, and update time for post documents.

All text is passed through Astro's normal escaped attributes/text except the
JSON/XML serialization helpers, which must replace `<`, `>`, `&`, and the
Unicode line/paragraph separators where applicable before embedding data.

The layout receives page-specific metadata through typed props. Document routes
pass `entry.data.htmlTitle`, `canonical`, `seoImage`, `noindex`, collection,
date, and updated date from the already validated entry. Directory, lab, home,
and 404 routes retain their route-local visible titles/descriptions but use the
global site identity, language, suffix, and head contract.

## Terminal identity boundary

Keep `DEFAULT_TERMINAL_IDENTITY` and `DEFAULT_TERMINAL_PROMPT` as package-level
fallbacks for existing package tests/consumers. Add an optional identity to
`createTerminalState` and the home controller's execution path. The site passes
the validated identity through server-rendered `data-terminal-*` attributes
containing only public text; `terminal-home.ts` validates/decodes those values
and uses the same identity for prompt rendering, `executeCommand`, and the
initial cwd. Server-rendered boot/fallback/session labels are generated from
that same object, so JavaScript-disabled and enhanced states cannot diverge.

`ContentDirectoryIndex.astro` reads the site config and formats its prompt from
the configured identity. The Terminal package does not import `config/site.yaml`
or a Node filesystem API.

## Article metadata contract

Extend the shared `sharedMetadata` object in `content-schema.mjs` with:

- `htmlTitle`: optional trimmed safe text;
- `canonical`: optional absolute `http`/`https` URL;
- `seoImage`: optional safe absolute URL or root-relative path;
- `noindex`: optional boolean defaulting to `false`.

Keep `.strict()` on both collection schemas. The existing `description` remains
the article SEO description and `title` remains the visible document title and
Terminal index title.

## robots and sitemap

Register a small site-owned Astro build integration in `astro.config.mjs`.
During `astro:build:done`, it writes `robots.txt` to the main site output and,
when `site.url` is configured, writes `sitemap.xml` from the hook's final public
page pathname list. It excludes `/404/`, redirect-only entries, and any
non-public experiment mount because the main site build owns only its guest
route set; the assembler remains responsible for the mounted publication as a
whole. URLs are normalized to the repository's trailing-slash policy and
serialized with XML escaping.

The hook must not scan source Markdown or filesystem paths. The final `pages`
list is the route evidence after Astro static path generation, so draft/private
documents that never enter `getCanonicalContent()` cannot enter the sitemap.

## Compatibility and migration

- Existing front matter remains valid; all new fields are optional.
- Existing package-level Terminal defaults remain valid for generic runtime
  tests and consumers.
- Existing visible title/description fallbacks remain unchanged when the
  default config is used.
- `site.url` starts unset because the repository's final public canonical domain
  is not established in current project evidence. Users set it before a
  production SEO build.
- The static inventory changes only by the generated `robots.txt` and, when
  configured, `sitemap.xml`; corresponding manifest, output, and runtime probes
  must be updated together.

## Testing design

- Unit tests cover YAML/config parsing, strict unknown-key rejection, safe
  identity text, optional origin, URL joining, metadata fallback/override,
  robots policy, image resolution, and sitemap route filtering.
- Content schema tests cover valid new front matter, invalid canonical/image/
  title/robots values, defaults, and unknown keys.
- Static-output tests read the checked-in config instead of hard-coding the
  prompt/brand, assert metadata on representative routes, assert no private or
  draft leakage, and assert robots/sitemap behavior for the configured-origin
  fixture/helper.
- Terminal package tests cover injected identity/cwd while preserving default
  behavior.
- Focused site Playwright tests cover the configured prompt, `<title>`,
  canonical/robots/Open Graph/Twitter tags, no-JavaScript fallback, and no
  horizontal overflow. The existing full site suite remains required.

## Visual-system research

UUPM research is recorded in `research/ui-ux-pro-max.md`. Its generic
newsletter/Swiss recommendations are not adopted because this is metadata and
build-pipeline work, not a visual redesign. Existing phosphor Terminal tokens,
self-hosted JetBrains Mono, responsive breakpoints, focus states, and reduced
motion behavior remain unchanged.
