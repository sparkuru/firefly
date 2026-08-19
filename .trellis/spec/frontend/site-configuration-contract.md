# Site Configuration and SEO Contract

## Scenario: Public Build-Time Site Configuration

### 1. Scope / Trigger

Use this contract whenever changing `config/site.yaml`, the site identity,
Terminal prompt/about output, document head metadata, Markdown SEO front matter,
or build-generated `robots.txt`/`sitemap.xml`. The configuration is a public,
repository-tracked build input; it is not a secret store or runtime service.

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

`config/site.yaml` must contain exactly these nested objects and fields:

```yaml
site:
  name: string
  description: string
  language: string       # BCP 47-style tag
  url: string | null     # absolute http(s) origin only
  author: string | null
terminal:
  user: string           # one prompt token
  host: string            # one prompt token
  cwd: string             # ~/blog or ~/blog/<safe-segment>/...
  about: string           # non-empty public text, may be multiline
seo:
  titleSuffix: string
  robots: index|noindex + follow|nofollow
  twitterCard: summary | summary_large_image
  image: string | null    # absolute http(s) URL or safe root-relative path
```

- `config/site.yaml.example` is the complete commented template. The tracked
  `config/site.yaml` is the active public input and is loaded at build time.
- YAML duplicate keys, malformed YAML, unknown keys, missing required fields,
  control characters, unsafe prompt/path tokens, and unsafe URLs fail with an
  error naming the config source and field.
- Parsed values are normalized where specified and deeply frozen before they
  cross the site/Terminal boundary. `site.url: null` is supported: automatic
  canonical URLs, `og:url`, and `sitemap.xml` are omitted, while `robots.txt`
  is still emitted.
- The loader resolves the config from the current repository/build context and
  known source-root fallback paths. Do not replace it with a package-relative
  path that breaks negative Astro builds using an alternate same-filesystem
  `--outDir`.
- This file may contain public identity and attribution only. Do not add
  credentials, private author data, host filesystem paths, or runtime secrets.

#### Terminal identity boundary

`terminalIdentityFromConfig()` maps `terminal.user`, `terminal.host`,
`terminal.cwd`, and `terminal.about` to `TerminalIdentity`. The server renders
the same identity into the prompt, `about`, `whoami`, `pwd`, and inert recovery
markup. `terminal.about` is URL-encoded when placed in a `data-*` attribute;
`terminal-home.ts` decodes it and then calls strict `decodeTerminalIdentity()`.
The browser never fetches configuration or Markdown.

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
| missing/malformed YAML, duplicate key, unknown key, missing field | fail with source and field context before rendering |
| control character, empty text, unsafe prompt token, traversal cwd, or non-NFC path | fail config/content validation |
| non-http(s), origin with path/query/fragment/credentials, or unsafe image | fail validation; never emit it into HTML |
| `site.url: null` | emit robots only; omit automatic canonical, `og:url`, and sitemap |
| explicit safe `htmlTitle`/`canonical`/`seoImage` | use the validated override for that document only |
| `noindex: true` | emit `noindex, follow` for the document |
| malformed `data-terminal-identity-about` or identity shape | browser enhancement fails closed; native recovery remains usable |
| root/no-leading-slash/`.html` sitemap input | normalize to one canonical trailing-slash path |
| `/404` or non-main `/lab/<experiment>/` sitemap input | exclude from sitemap |
| missing public route in final build | do not invent a sitemap entry from source paths |

### 5. Good / Base / Bad Cases

- **Good:** copy `config/site.yaml.example` to `config/site.yaml`, set a public
  origin only when known, customize terminal identity, and add a validated
  `htmlTitle`/`seoImage` to one article. A static build emits matching escaped
  head metadata and final discovery files.
- **Base:** keep `site.url: null`; the clone still builds with relative links,
  robots, configured prompt/about output, and no misleading canonical origin.
- **Bad:** read config in browser code, put a secret in the YAML, interpolate
  raw about text into an HTML attribute, concatenate arbitrary canonical URLs,
  include `/lab/nerv/` or `/404` in the sitemap, or derive sitemap entries by
  walking source Markdown instead of final Astro pages.

### 6. Tests Required

- `apps/site/tests/site-config.test.mjs`: valid/frozen defaults; strict unknown,
  duplicate, control, URL, image, cwd, and identity rejection; metadata
  fallback/override behavior; robots and sitemap normalization/filtering.
- `apps/site/tests/content-schema.test.mjs`: valid and invalid optional SEO
  front matter, unknown-key rejection, safe canonical/image validation, and
  `noindex` default.
- `./sam npm --prefix apps/site run check`: Astro props and both layouts consume
  the shared head without diagnostics.
- `./sam npm --prefix apps/site run build`: default output contains robots and
  omits sitemap when the default origin is null; metadata and terminal prompt
  match the active YAML.
- Custom-config smoke: temporarily use a safe non-default origin/identity,
  build, assert `lang`, title, prompt, canonical, OG/Twitter image, robots
  Sitemap, and non-empty final sitemap, then restore the default YAML and rerun
  the default build.
- Negative content builds use ignored same-filesystem output directories and
  clean them in `finally`; config-path resolution must work in those builds.
- Main site focused/full Playwright evidence remains required for visible
  Terminal startup/recovery and document behavior; static output is the source
  of truth for metadata and route isolation.

### 7. Wrong vs Correct

#### Wrong

```js
// Treat source filenames as final URLs and inject raw config into HTML.
const sitemap = sourceMarkdownFiles.map((file) => `<loc>${file}</loc>`);
root.dataset.about = config.terminal.about;
```

#### Correct

```js
// Normalize final Astro page records, then escape generated XML.
const paths = publicSitemapPaths(finalBuildPages);
const sitemap = createSitemapXml(paths, config.site.url);

// Transport multiline public text safely; decode and validate at the browser boundary.
root.dataset.terminalIdentityAbout = encodeURIComponent(identity.about);
const identity = decodeTerminalIdentity({ user, host, workingDirectory, about });
```

## Reference Files

- `config/site.yaml`
- `config/site.yaml.example`
- `apps/site/src/lib/site-config.mjs`
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
