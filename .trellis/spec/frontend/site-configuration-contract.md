# Site Configuration and SEO Contract

## Scenario: Public Build-Time Site Configuration

### 1. Scope / Trigger

Use this contract whenever changing `config/site.toml`, the site identity,
Terminal prompt/about output, document head metadata, Markdown SEO front matter,
or build-generated `robots.txt`/`sitemap.xml`. The site consumes a public
projection of this repository-local configuration; plugin-owned namespaces may
also contain non-secret runtime settings. It is never a secret store.

### 2. Signatures

```js
parseSiteConfig(value: unknown, source?: string): Readonly<SiteConfig>
loadSiteConfig(filePath?: string): Readonly<SiteConfig>
terminalIdentityFromConfig(config?: SiteConfig): Readonly<TerminalIdentity>

resolveSiteMetadata(options: SiteMetadataOptions, config?: SiteConfig): SiteMetadata
normalizePublicPath(pathname: unknown): string | undefined
publicSitemapPaths(pages: readonly { pathname: string }[]): readonly string[]
createRobotsText(config?: SiteConfig): string
createSitemapXml(paths: readonly string[], origin: string | null): string | undefined
```

`apps/site/src/components/SiteHead.astro` is the single shared document-head
consumer for both `DocumentLayout.astro` and `TerminalLayout.astro`.

### 3. Contracts

#### Configuration shape

`config/site.toml` must contain these nested objects and fields:

```toml
[site]
name = "string"
description = "string"
language = "en"
# url = "https://example.com"
# author = "Public author"

[terminal]
user = "guest"
host = "firefly"
cwd = "~/blog"
about = "Public text"

[[terminal.friends]]
name = "Example"
desc = "A short public description."
url = "https://example.com"

[seo]
titleSuffix = " | firefly"
robots = "index, follow"
twitterCard = "summary"
# image = "/social-card.png"

[plugins.comments]
enabled = false
configPath = "config/plugins/comments/config.toml"

# The comments plugin owns its non-secret public/runtime TOML separately.
# The site loader reads only its [public] projection; the private service may
# read the complete file, while secrets remain in secrets.env.
```

- `config/site.toml.example` is the complete commented template. The tracked
  example is copied to the owner-local `config/site.toml` input and loaded at
  build time; the active file is intentionally ignored because it contains
  site-specific public identity.
- TOML duplicate keys, malformed TOML, unknown keys, missing required fields,
  control characters, unsafe prompt/path tokens, and unsafe URLs fail with an
  error naming the config source and field.
- `terminal.friends` is an optional strict array. Each record contains `name`,
  `url`, and optional `desc`; descriptions are trimmed, non-empty, safe
  single-line public text. URLs preserve list order, must be absolute `http(s)`
  URLs without credentials, fragments, whitespace, or controls, and must be
  unique.
  The omitted and empty forms both normalize to a deeply frozen empty list.
- TOML optional values use omission rather than a null literal: omitted
  `site.url`, `site.author`, or `seo.image` normalize to `null`.
- Parsed values are normalized where specified and deeply frozen before they
  cross the site/Terminal boundary. Omitted `site.url` normalizes to `null`:
  automatic canonical URLs, `og:url`, and `sitemap.xml` are omitted, while
  `robots.txt` is still emitted.
- The loader resolves the config from the current repository/build context and
  known source-root fallback paths. Do not replace it with a package-relative
  path that breaks negative Astro builds using an alternate same-filesystem
  `--outDir`.
- The statically registered `comments` plugin owns `[plugins.comments]`.
  `enabled` and `configPath` are the only activation fields. The plugin file
  `config/plugins/comments/config.toml` contains `[public]` and `[runtime]`;
  the site parser projects only `writeOrigin`, `exportPath`, and
  `consentVersion` into `config.comments`. The private service reads the full
  validated runtime projection. A legacy `[comments]` namespace is accepted
  only during the migration window and cannot coexist with `[plugins.comments]`.
- `config/plugins/comments/config.toml.example` and
  `config/plugins/comments/secrets.env.example` are tracked templates. The
  owner-local `config.toml` is non-secret plugin configuration and is ignored;
  `secrets.env` contains only secret values, is ignored, and must be a regular
  owner-readable file with no group/other permissions. `passwordEnv` names the
  secret; literal passwords and non-secret `COMMENTS_*` settings in
  `secrets.env` are rejected.
- Runtime SMTP, route, origin, storage, and outbox settings never cross the
  public site projection. Explicit service environment variables may override
  file values at the runtime boundary; the static build does not read the
  secret file.
- Plugin-owned private runtime paths use the same strict decoder as the public
  projection: absolute or relative slash-separated paths are allowed, but
  backslashes, traversal segments, empty interior segments, controls, and
  whitespace are rejected. This keeps the service's outbox inside an explicit
  mounted/private boundary without weakening the public export-path checks.
- This file may contain public identity, plugin-owned non-secret settings, and
  plugin-defined private paths only. Do not add credentials, private author
  data, or runtime secrets; `passwordEnv` names a secret that must be injected
  separately.

### Design Decision: TOML as the single site-config source

The clone-time site configuration uses `config/site.toml` and
`config/site.toml.example`. TOML was chosen for hand-editing because it keeps
comments and explicit scalar types without YAML's indentation/implicit-type
surprises; JSON remains intentionally unsupported as a second source of truth.
TOML has no null literal, so omitted optional keys (`site.url`, `site.author`,
and `seo.image`) are normalized to `null` by the strict schema. Do not add a
fallback YAML/JSON loader: two editable formats would make build behavior and
documentation drift.

#### Terminal identity boundary

`terminalIdentityFromConfig()` maps `terminal.user`, `terminal.host`,
`terminal.cwd`, and `terminal.about` to `TerminalIdentity`. The server renders
the same identity into the prompt, `about`, `whoami`, `pwd`, and inert recovery
markup. `terminal.about` is URL-encoded when placed in a `data-*` attribute;
`terminal-home.ts` decodes it and then calls strict `decodeTerminalIdentity()`.
The browser never fetches configuration or Markdown.

`terminal.friends` remains separate from `TerminalIdentity`. `TerminalHome.astro`
renders the validated records as native recovery links and a strict
`data-terminal-friend-*` payload; `terminal-home.ts` decodes the payload before
passing immutable records to `executeCommand({ friendLinks })`. The `friends`
command is the only interactive consumer and does not add records to the
content index or virtual filesystem. Direct command/recovery rows use aligned
name, optional description, and URL columns on wide screens and stack in the
same order on narrow screens; omitted descriptions reserve an empty cell so
URLs remain aligned.

`createTerminalState(identity)` initializes the configured virtual cwd, and all
execution calls receive the same identity. `DEFAULT_TERMINAL_IDENTITY` remains
the framework-neutral fallback for package consumers and tests.

#### Document metadata boundary

`resolveSiteMetadata()` applies these rules:

- Home uses `site.name` as the HTML title. Other routes use visible `title` plus
  `seo.titleSuffix`; front matter `htmlTitle` overrides that fallback exactly.
- Description falls back to `site.description`; `SiteHead` emits escaped
  description, robots, Open Graph, Twitter, canonical, article date, modified
  date, and public author metadata where applicable.
- Canonical is an explicit front matter `canonical` when supplied, otherwise
  `site.url + pathname`. No origin means no automatic canonical or `og:url`.
- `noindex: true` forces `noindex, follow` for that document. Otherwise the
  configured `seo.robots` policy is used.
- `seo.image` or per-document `seoImage` may be an absolute safe URL or a
  root-relative public path. A root-relative image becomes absolute only when
  `site.url` exists.
- Post metadata includes ISO UTC publication/modified timestamps and
  `article:author` when `site.author` is configured.

Supported strict optional Markdown front matter is `htmlTitle`, `canonical`,
`seoImage`, and `noindex`. Unknown keys remain schema errors. These fields do
not change route ownership or draft/private filtering.

#### Public discovery files

The `astro:build:done` integration always writes `robots.txt`. It writes
`sitemap.xml` only when `site.url` is configured. Sitemap paths are normalized
from Astro's final build page records: the root may be `''`, route names may
lack a leading slash, and `index.html`/`.html` forms become trailing-slash
routes. `/404` is excluded; `/lab/` is retained, while non-main `/lab/*`
experiment routes are excluded. Paths are deduplicated and sorted before XML
generation. Only the final public static route set is an input; drafts,
private documents, source paths, and unlisted/non-main experiment routes must
not be added manually.

### 4. Validation & Error Matrix

| Condition | Required result |
| --- | --- |
| missing/malformed TOML, duplicate key, unknown key, missing field | fail with source and field context before rendering |
| control character, empty text, unsafe prompt token, traversal cwd, or non-NFC path | fail config/content validation |
| missing, absolute, traversal, symlink-escaping, or malformed comments `configPath` | fail before site/service projection; an enabled plugin cannot fall back to defaults |
| literal SMTP password or non-secret `COMMENTS_*` setting in plugin secrets.env | fail before service startup without exposing the value |
| comments runtime path has traversal, backslash, whitespace, control, or empty interior segment | fail the shared comments namespace before site/service projection |
| non-http(s), origin with path/query/fragment/credentials, or unsafe image | fail validation; never emit it into HTML |
| friend link with non-http(s), credentials, fragment, controls, unknown fields, invalid desc, or duplicate URL | fail `terminal.friends` validation with record/field context |
| omitted or empty `terminal.friends` | normalize to `[]`; render the bounded `No friend links.` recovery/command state |
| omitted `site.url` (normalized as `null`) | emit robots only; omit automatic canonical, `og:url`, and sitemap |
| explicit safe `htmlTitle`/`canonical`/`seoImage` | use the validated override for that document only |
| `noindex: true` | emit `noindex, follow` for the document |
| malformed `data-terminal-identity-about` or identity shape | browser enhancement fails closed; native recovery remains usable |
| root/no-leading-slash/`.html` sitemap input | normalize to one canonical trailing-slash path |
| `/404` or non-main `/lab/<experiment>/` sitemap input | exclude from sitemap |
| missing public route in final build | do not invent a sitemap entry from source paths |

### 5. Good / Base / Bad Cases

- **Good:** copy `config/site.toml.example` to `config/site.toml`, set a public
  origin only when known, customize terminal identity, add validated friend
  links, and add a validated `htmlTitle`/`seoImage` to one article. A static
  build emits matching escaped head metadata and final discovery files.
- **Base:** omit `site.url`; the clone still builds with relative links,
  robots, configured prompt/about output, and no misleading canonical origin.
- **Bad:** put runtime secrets in `site.toml` or plugin TOML, put non-secret
  settings in `secrets.env`, read private plugin runtime fields in browser code,
  interpolate raw about text into an HTML attribute, concatenate arbitrary
  canonical URLs, interpolate friend-link records into HTML strings, include
  `/lab/nerv/` or `/404` in the sitemap, or derive sitemap entries by walking
  source Markdown instead of final Astro pages.

### 6. Tests Required

- `apps/site/tests/site-config.test.mjs`: valid/frozen defaults; strict TOML
  loading and malformed input; strict unknown,
  duplicate, friend-link, control, URL, image, cwd, and identity rejection;
  metadata fallback/override behavior; robots and sitemap normalization/filtering;
  plugin activation/path loading and public-only projection from a separate
  comments config file.
- `apps/site/tests/content-schema.test.mjs`: valid and invalid optional SEO
  front matter, unknown-key rejection, safe canonical/image validation, and
  `noindex` default.
- `./sam npm --prefix apps/site run check`: Astro props and both layouts consume
  the shared head without diagnostics.
- `./sam npm --prefix apps/site run build`: default output contains robots and
  omits sitemap when the default origin is omitted; metadata and terminal prompt
  match the active TOML.
- Custom-config smoke: temporarily use a safe non-default origin/identity,
  build, assert `lang`, title, prompt, canonical, OG/Twitter image, robots
  Sitemap, and non-empty final sitemap, then restore the default TOML and rerun
  the default build.
- Negative content builds use ignored same-filesystem output directories and
  clean them in `finally`; config-path resolution must work in those builds.
- `services/comments/tests/config.test.ts`: owner-only secrets-file checks,
  plugin activation/config loading, named-secret resolution, non-secret-key
  rejection, literal-password rejection, and runtime path containment.
- Main site focused/full Playwright evidence remains required for visible
  Terminal startup/recovery and document behavior; static output is the source
  of truth for metadata and route isolation.

### 7. Wrong vs Correct

#### Wrong

```js
// Treat source filenames as final URLs and inject raw config into HTML.
const sitemap = sourceMarkdownFiles.map((file) => `<loc>${file}</loc>`);
root.dataset.about = config.terminal.about;
record.innerHTML = `<a href="${config.terminal.friends[0].url}">${config.terminal.friends[0].name}</a>`;
```

#### Correct

```js
// Normalize final Astro page records, then escape generated XML.
const paths = publicSitemapPaths(finalBuildPages);
const sitemap = createSitemapXml(paths, config.site.url);

// Transport multiline public text safely; decode and validate at the browser boundary.
root.dataset.terminalIdentityAbout = encodeURIComponent(identity.about);
const identity = decodeTerminalIdentity({ user, host, workingDirectory, about });
const links = decodeTerminalFriendLinks(friendRecords);
renderFriendLinksWithNativeAnchors(links);
```

## Reference Files

- `config/site.toml`
- `config/site.toml.example`
- `apps/site/src/lib/site-config.mjs`
- `plugins/comments/config.mjs`
- `services/comments/src/config.ts`
- `apps/site/src/lib/site-meta.mjs`
- `apps/site/src/lib/site-seo.mjs`
- `apps/site/src/components/SiteHead.astro`
- `apps/site/src/layouts/DocumentLayout.astro`
- `apps/site/src/layouts/TerminalLayout.astro`
- `apps/site/src/lib/content-schema.mjs`
- `presentations/terminal/src/runtime.ts`
- `apps/site/src/components/TerminalHome.astro`
- `apps/site/src/scripts/terminal-home.ts`
- `apps/site/tests/site-config.test.mjs`
- `apps/site/tests/content-schema.test.mjs`
- `apps/site/tests/static-output.test.mjs`
