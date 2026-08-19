# Build-time site personalization and SEO configuration

## Goal

Make a fresh clone usable as a personalized f1refly site without editing
framework source for ordinary identity and metadata changes. Public site
configuration must be read at build time, validated, and rendered into the
static publication; no runtime configuration service or secret-bearing config
is introduced.

## Background and confirmed constraints

- The repository is a multi-package static Astro publication. The root
  `Dockerfile` builds the validator, X Core, both presentations, the site, the
  NERV experiment, and the assembled release.
- `sam` is the supported development-command boundary and requires Docker,
  while `dev.sh` requires dependencies installed through `./sam npm run
  install:m4`.
- `content/posts` and `content/pages` are the authored Markdown inputs. Draft
  and private entries are excluded from the guest publication, but any tracked
  source file remains visible to a Git clone.
- Terminal `user`, `host`, working directory, and `about` currently live in
  `presentations/terminal/src/runtime.ts`; site components consume the package
  defaults directly.
- Both site layouts currently hard-code the brand name, title suffix, language,
  and only emit `description` plus `<title>` metadata. There is no canonical,
  Open Graph, Twitter Card, robots, or sitemap interface.
- Article front matter is strict. `title` and `description` are already
  required; an independent browser/HTML title and SEO overrides require an
  explicit schema change.
- The existing root `f1refly.yaml` is a Docker Compose file and must not be
  repurposed as site configuration.

## Requirements

### R1. Clone and customization documentation

Document the required clone/build/development commands, the source folders that
must remain present, generated/ignored directories that are recreated, and the
fact that tracked draft/private Markdown is not hidden from Git users. Explain
that ordinary customization is performed through `config/site.yaml` and
Markdown front matter.

### R2. Build-time site configuration

Add a tracked `config/site.yaml` with the current safe defaults and a complete
`config/site.yaml.example` template. The schema must cover at least:

- site name, default description, language, optional canonical origin, and
  optional author;
- Terminal user, host, working directory, and multi-line `about` text;
- SEO title suffix, robots default, Twitter card default, and optional default
  social image.

The loader must parse YAML, validate types and unsafe/control characters, reject
unknown top-level and nested keys, normalize/freeze the resulting config, and
fail the build with an actionable error for invalid values. The optional
canonical origin is intentionally allowed to be unset for a clone whose public
domain has not yet been chosen; canonical URLs and sitemap locations are then
omitted instead of being invented.

### R3. Use configuration consistently

Use the config as the single site-owned source for the Terminal identity and
global site metadata. Preserve the framework-neutral Terminal package defaults
for generic consumers, but allow the site to inject its validated identity into
the server-rendered prompt, browser controller, `about`, `whoami`, `id`, and
initial working directory. Replace site-level hard-coded brand/language/title
suffix values in both layouts and visible site chrome with config-derived
values where the value is global.

### R4. Independent article HTML title

Add an optional strict front-matter field named `htmlTitle`. When present it
controls the document `<title>` for both semantic and Terminal article/page
routes. When absent, preserve the current fallback: visible title followed by
the configured site title suffix, with the home page using the configured site
name.

### R5. Core static SEO output

Add a shared head/metadata contract used by both layouts:

- title and description;
- canonical URL when a configured origin or an explicit article canonical is
  available;
- `robots` with per-document `noindex` override;
- Open Graph title, description, URL, type, and optional image;
- Twitter Card title, description, and optional image;
- article publication/update timestamps and author when available.

Add build-time `robots.txt` and sitemap output from the public built route set.
The sitemap must contain only guest-visible main-site routes, use absolute URLs,
and be emitted only when a canonical origin is configured. No private, draft,
source path, or local filesystem data may enter metadata or the publication.

### R6. Per-document SEO overrides

Extend the strict article/page metadata contract with optional `canonical`,
`seoImage`, and `noindex` fields. Relative image paths may be resolved against
the site origin when available; unsafe/control-bearing values must fail schema
validation. Existing `description` remains the per-document SEO description.

## Out of scope

- Runtime/server-side configuration, database access, or a client-side config
  fetch.
- Secrets, credentials, private author data, or a user/account system in YAML.
- Changing Markdown routing, presentation selection, content access semantics,
  Terminal command behavior, or the NERV experiment's independent config.
- A CMS/editor for site configuration.
- Historical comments or the deferred M5.1 identity service.
- RSS, JSON-LD structured data, analytics, or search-engine verification files
  beyond the core metadata, robots, and sitemap contract above.

## Acceptance criteria

- [ ] A fresh clone can follow the documented Docker-only development path and
      production Compose path without manually recreating generated folders.
- [ ] `config/site.yaml.example` documents every supported config key, and the
      checked-in default config reproduces the current Terminal identity and
      site title/description behavior.
- [ ] Invalid YAML shape, unknown keys, unsafe identity text, invalid origin,
      and invalid SEO override values fail the relevant test/build with a useful
      diagnostic.
- [ ] Changing only `config/site.yaml` changes the Terminal prompt, `about`,
      `whoami`, global site name/language/title suffix, and default description
      in the built site without editing presentation source.
- [ ] An article with `htmlTitle` emits that exact escaped `<title>` in both
      layout paths; an article without it retains the configured fallback.
- [ ] Configured origin and per-document SEO overrides produce correct
      canonical, robots, Open Graph, Twitter, and article metadata; missing
      origin omits absolute-only fields rather than emitting a fake domain.
- [ ] `robots.txt` and sitemap output contain only public built routes, and the
      sitemap is omitted when no canonical origin is configured.
- [ ] Existing draft/private exclusion, no-JavaScript fallback, Terminal
      identity commands, route inventory, accessibility, and presentation
      isolation tests remain green.
- [ ] README, content/schema tests, static-output tests, and focused browser
      coverage describe the new contract; `git diff --check` is clean.

## Evidence anchors

- Root build and runtime boundary: `Dockerfile`, `sam`, `dev.sh`, `f1refly.yaml`.
- Current identity: `presentations/terminal/src/runtime.ts:188-202` and
  `apps/site/src/scripts/terminal-home.ts:739-764`.
- Current layouts: `apps/site/src/layouts/DocumentLayout.astro` and
  `apps/site/src/layouts/TerminalLayout.astro`.
- Current strict content metadata: `apps/site/src/lib/content-schema.mjs:35-73`.
- Current guest projection: `apps/site/src/lib/content-access.mjs:3-16`.
