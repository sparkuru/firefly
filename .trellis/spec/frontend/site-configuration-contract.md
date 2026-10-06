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
parseSiteConfig(value: unknown, source?: string, options?: { commentsConfig?: unknown }): Readonly<SiteConfig>
loadSiteConfig(filePath?: string): Readonly<SiteConfig>
resolveSiteConfigOverridePath(value: unknown, repositoryRoot?: string): string | null
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
promptMarker = "@"

[[terminal.friends]]
name = "Example"
desc = "A short public description."
url = "https://example.com"

[seo]
titleSuffix = " | firefly"
robots = "index, follow"
twitterCard = "summary"
# image = "/social-card.png"

# Optional site-owned document-navigation composition overrides.
# [documentNavigation.semantic]
# navigator = "none"

[plugins.comments]
enabled = false
configPath = "config/plugins/comments/config.toml"

[plugins.memos]
enabled = false
configPath = "config/plugins/memos/config.toml"

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
- `terminal.promptMarker` is optional for backward compatibility and defaults
  to `@`. When supplied, it must be non-empty, trimmed, safe
  single-line public text that is safe to transport through the browser
  identity payload.
- `terminal.friends` is an optional strict array. Each record contains `name`,
  `url`, and optional `desc`; descriptions are trimmed, non-empty, safe
  single-line public text. URLs preserve list order, must be absolute `http(s)`
  URLs without credentials, fragments, whitespace, or controls, and must be
  unique.
  The omitted and empty forms both normalize to a deeply frozen empty list.
- `documentNavigation` is an optional strict table keyed only by registered
  presentation IDs. Each entry contains exactly one trimmed `navigator` ID;
  omission preserves the desktop Firefly/`always` and semantic/`fragment`
  defaults, while `navigator = "none"` is an explicit all-device disabled composition.
  Navigator IDs are resolved by the site-owned registry before document
  rendering; unknown presentations, unknown navigators, malformed entries, and
  extra keys fail early. The mobile opt-in is `supportsMobile` on the site-owned
  presentation experience's navigator profile, defaults to `false`, and is not
  a TOML field. This setting controls navigator composition only and
  never enters X Core metadata, content front matter, routes, comments, or
  plugin payloads.
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
- `FIREFLY_SITE_CONFIG_PATH` is an optional, repository-relative `.toml` path
  for contained build/test projections. It must resolve to a regular,
  non-symlink file inside the repository and never accepts absolute paths,
  traversal, backslashes, empty segments, or unsafe names. A config stored as
  `<projection-root>/config/site.toml` resolves its plugin `configPath` from
  `<projection-root>` so sanitized fixtures do not read the owner-local
  repository config.
- The statically registered `comments` plugin owns `[plugins.comments]`.
  `enabled` and `configPath` are the only activation fields. The plugin file
  `config/plugins/comments/config.toml` contains `[public]` and `[runtime]`;
  the site parser projects only `writeOrigin`, `exportPath`, and
  `consentVersion` into `config.comments`. The private service reads the full
  validated runtime projection. A top-level `[comments]` namespace is
  unsupported and fails strict validation as an unknown field. The core site
  table is validated before the comments projection, so an old top-level
  namespace cannot be masked by a missing or malformed canonical plugin file.
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
- The independent Memo publisher uses `[plugins.memos]` strictly for navigation
  and sitemap discovery. Its activation field names remain compatible, but
  neither enabled nor disabled loading reads a Memo config/source/export or
  projects content/runtime settings. `/memos/` and descendants remain reserved
  regardless of visibility. Optional pure Memo config allows only the fixed
  public route; source and deployment configuration belong to its owner-local
  publisher. See [Memo Site](./memo-site-contract.md) for independence/gates.
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
`terminal.cwd`, `terminal.about`, and `terminal.promptMarker` to
`TerminalIdentity`. The server renders the same identity into the prompt,
`about`, `whoami`, `pwd`, and inert recovery markup. `terminal.about` is
URL-encoded when placed in a `data-*` attribute; `terminal-home.ts` decodes the
payload and then calls strict `decodeTerminalIdentity()`. The browser never
fetches configuration or Markdown.

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
`seoImage`, `noindex`, and the site-owned `contentTheme` ID. Omitted
`contentTheme` defaults to the registered ID `default`; the exact registered
IDs are `default` and `paper`. Explicit `default` and `paper` are accepted and
every other or malformed value is rejected by the shared post/page schema. The
theme is a content-boundary styling seam only: it is emitted as
`data-content-theme="<id>"` on the existing `[data-article-content]` root,
never as a stylesheet URL, arbitrary selector, class, or website-chrome
setting. The shipped `paper` variant provides a warm paper reading surface,
serif editorial text, monospace code, muted brown text, and restrained
terracotta/ochre accents inside that root only; there is no picker or runtime
switcher. Unknown keys remain schema errors. These fields do not change route
ownership or draft/private filtering.

#### Terminal palette boundary

`TerminalLayout.astro` selects `data-terminal-theme="firefly"` on the page
root. `apps/site/src/styles/terminal.css` owns the shared structure and the
exact reference primitives under that selector:
`--terminal-palette-slate: #616c8c`,
`--terminal-palette-teal: #568c87`, `--terminal-palette-green: #b2d59b`,
`--terminal-palette-yellow: #f2de79`, and
`--terminal-palette-orange: #d95f18`. Components consume the
`--terminal-color-*` semantic tokens instead of repeating raw colors. Dark
canvas/surface layers and brighter derived teal/orange text tokens preserve
legibility where the reference swatches are too dim on raised surfaces.

The `firefly` root selects `data-terminal-palette="firefly-dark"` by default.
Each `apps/site/src/styles/terminal-themes/*.css` file owns one named palette
and supplies the complete `--terminal-color-*` semantic token set. The
build-time registry discovers these files, validates their root selector and
required tokens, then inlines their CSS and publishes their filenames as the
available names. Adding a valid CSS file registers another palette without
editing the command or switcher. The palette file also selects the Shiki token
colors for code blocks. Keep ordinary code text at 4.5:1 contrast against its
code surface. Components consume semantic tokens for every palette.

Highlighting browser fixtures must reproduce the real root's palette attribute
and load both structural `terminal.css` and the selected palette CSS. Loading
the structural file alone cannot establish token-color behavior. Exercise the
maintained dark/white token selections while preserving distinct colors inside
the Terminal root and color isolation from canonical markup outside it.

The default article content inherits the Terminal root's mapped
`--article-content-*` tokens; authored `paper` content overrides only its
content root. The mobile homepage consumes the same colors for native
browsing/search but does not start a command Terminal. When changing this
palette, keep the root token contract checked by
`apps/site/tests/static-output.test.mjs` and verify representative text,
controls, document navigation, and mobile surfaces in browser tests; normal
text should reach 4.5:1 contrast and visible control boundaries/focus 3:1.

#### Terminal appearance selection contract

##### 1. Scope / Trigger

Use this contract when changing Firefly Terminal palette files, selection
controls, stored preference, or the `theme` command. The authored
`contentTheme` registry and Semantic presentation are outside this browser
appearance state.

##### 2. Signatures

```text
theme <theme-config-name>
window.fireflySetTerminalAppearance(name: string): boolean
localStorage['firefly-terminal-appearance'] = '<theme-config-name>'
<html data-terminal-theme="firefly" data-terminal-palette="firefly-white" data-terminal-theme-names="firefly-dark firefly-white">
```

`firefly-dark` is the default and required palette. `TerminalLayout.astro`
defines the site-owned update function and early head restoration.
`terminal-theme-registry.ts` derives names from valid CSS filenames at build
time and optional mobile display labels from `--terminal-theme-label` in each
palette file; without a label, the filename is shown. `terminal-home.ts`
registers `theme` through the presentation runtime's command registry seam;
Tab completion uses the derived configuration names.

##### 3. Contracts

- The shared layout's `[data-terminal-quick-toolbar]` is visible only when
  `(hover: none) and (pointer: coarse)` matches. Its bottom-right `+` button
  expands direct child actions for each registered theme and back-to-top;
  the selected theme is marked. A light viewport backdrop closes on click;
  child actions reveal with short staggered motion, while reduced-motion mode
  presents them immediately. Closed actions are noninteractive and absent from
  keyboard navigation. There is no nested theme menu. Desktop
  home and desktop documents have no visible switch. The desktop home Terminal
  accepts every registered `theme <theme-config-name>`; `help theme` describes
  the command.
- The command is standalone, not pure text, and does not support redirects.
  Invalid operands and attempted pipeline, substitution, or redirect use do
  not change appearance. Tab fills or lists valid operands; Enter executes a
  complete command.
- The head reads a stored registered name before page styles are parsed.
  Legacy `dark` and `light` values migrate to `firefly-dark` and
  `firefly-white`. Unknown stored names remain at the default. Successful
  selection updates the root and writes the exact name. A failed storage read
  starts dark; a failed write still changes the current page. With JavaScript
  disabled, the toolbar stays hidden and the dark static reading surface
  remains usable.
- Terminal appearance changes the root's semantic colors, including native
  mobile browsing and default article content. Authored `paper` overrides
  remain scoped to their article content root.

##### 4. Validation & Error Matrix

| Condition | Result |
| --- | --- |
| `theme firefly-white` or `theme firefly-dark` | change palette and persist the name |
| `theme ` plus Tab | list discovered CSS palette names; no change until command submission |
| missing or unknown operand | show usage error; preserve appearance |
| pipeline, substitution, or redirect | reject the side-effecting command; preserve appearance |
| storage denied | current-page selection works; reload falls back to dark |
| JavaScript disabled | static dark reading remains; toolbar is hidden |
| touch-primary media changes | toolbar visibility follows the shared input predicate; focus leaves it before hiding |
| valid new CSS palette file | build discovers the name for CSS, command completion, and mobile chooser |
| mobile speed dial | opening focuses a child action; theme selection updates the root, closes the dial, and restores focus; Escape/backdrop/outside input closes it; rapid toggles leave focus and child visibility coherent |

##### 5. Good / Base / Bad Cases

- Good: desktop `theme firefly-wh` plus Tab, then Enter, selects white and
  survives a canonical document navigation; a touch-primary reader can switch
  back from the floating toolbar.
- Base: no stored preference renders the dark appearance.
- Bad: `theme amber` or a piped `theme firefly-dark` changes the page despite a
  command error.

##### 6. Tests Required

Run the site check/build and static-output contract, focused home/document/
mobile Playwright checks, and the Terminal command suite. Assert command help,
completion, invalid-operand safety, storage restoration/migration/failure,
desktop switch absence, mobile toolbar actions and clearance, no-JavaScript
reading, `paper` focus isolation, and representative 4.5:1 text and code / 3:1
boundary and focus contrast.

##### 7. Wrong vs Correct

Wrong: add a visible desktop page switch or treat a front matter
`contentTheme` value as a Terminal appearance command.

Correct: discover palette names and CSS from the same files, register `theme`
in the site-owned Terminal command registry, and update the root via the shared
site appearance function; show the floating toolbar only under the
touch-primary input predicate.

#### content theme registry contract

##### 1. Scope / Trigger

- Trigger: adding or consuming an author-selected article-content theme.
- Scope: the site-owned registry and shared post/page front matter schema;
  X Core, presentation adapters, routes, and the synchronizer do not consume
  this metadata.

##### 2. Signatures

`apps/site/src/lib/content-theme.mjs` owns these interfaces:

```js
DEFAULT_CONTENT_THEME_ID: 'default'
CONTENT_THEME_IDS: readonly ContentThemeId[]
isContentThemeId(value: unknown): value is ContentThemeId
resolveContentThemeId(value: unknown): ContentThemeId
```

The post and page schemas expose `contentTheme?: ContentThemeId`; omitted
values are normalized to `DEFAULT_CONTENT_THEME_ID`. The current registry is
`['default', 'paper']` in that order.

##### 3. Contracts

- Author input: optional front matter `contentTheme`, matching an exact ID in
  the frozen site registry.
- Render output: the normalized ID is passed independently of `presentation`
  and emitted as `data-content-theme="<id>"` only on the existing
  `[data-article-content]` root.
- Forbidden outputs: no theme ID becomes a CSS selector, class name,
  stylesheet URL, executable configuration, website chrome setting, X Core
  context member, X Core metadata member, route input, or plugin payload.
- Registry evolution: a later theme adds a registered ID and site-owned,
  content-scoped CSS under
  `apps/site/src/styles/content-themes/<theme-id>.css`; selectors stay below
  `[data-article-content][data-content-theme="<theme-id>"]`. Theme IDs are
  validated before rendering and never become dynamic stylesheet URLs. This
  does not change Markdown syntax or the presentation contract.

##### 4. Validation & Error Matrix

| Input condition | Required result |
| --- | --- |
| field omitted or explicitly `default` | normalize to `default` |
| exact registered ID | accept and emit that ID at the content boundary |
| legacy `articleTheme`, alone or alongside `contentTheme` | reject before rendering as an ordinary unknown field |
| unknown, empty, whitespace-padded, traversal-like, URL-like, or selector-like string | schema/resolver failure before rendering |
| non-string, `null`, array, object, boolean, or number | schema/resolver failure before rendering |
| attempted dynamic stylesheet, selector, or arbitrary class derived from input | forbidden; no dynamic asset or chrome styling is emitted |

##### 5. Good / Base / Bad Cases

- Good: `contentTheme: default` or `contentTheme: paper` is accepted and
  appears once on the content root in both document presentations.
- Base: omitting `contentTheme` for legacy content is accepted and renders as
  the same `default` output.
- Bad: `contentTheme: ../default` or
  `contentTheme: https://example.test/theme.css` fails closed and never reaches
  the renderer.

##### 6. Tests Required

- Registry/schema tests assert the frozen ID list, omission fallback, explicit
  registered IDs, unknown/unsafe/wrong-type rejection, and strict unknown-key
  behavior.
- Static source/build tests assert that the paper CSS is present in the
  semantic compiled stylesheet and Terminal inline style, with every rule
  rooted at `[data-article-content][data-content-theme='paper']` and no
  website-chrome selectors.
- Static-output tests assert exactly one theme attribute on semantic and
  Terminal content roots and none on home, lab, 404, comments, or other
  website chrome.
- X Core context/integration tests assert that `contentTheme` is absent from
  context and exact metadata while presentation, headings, node IDs, and
  sanitizer behavior remain unchanged.
- The external workspace build must pass through `./sam` with no authored
  workspace edits.

##### 7. Wrong vs Correct

Wrong:

```js
const stylesheet = `/themes/${frontmatter.contentTheme}.css`;
```

Correct:

```js
const contentTheme = resolveContentThemeId(entry.data.contentTheme);
// Pass contentTheme to the document component; scope styling to
// [data-article-content][data-content-theme="default"] in site-owned CSS.
```

#### Public discovery files

The `astro:build:done` integration always writes `robots.txt`. It writes
`sitemap.xml` only when `site.url` is configured. Sitemap paths are normalized
from Astro's final build page records: the root may be `''`, route names may
lack a leading slash, and `index.html`/`.html` forms become trailing-slash
routes. `/404` is excluded; `/lab/` is retained, while non-main `/lab/*`
experiment routes are excluded. Paths are deduplicated and sorted before XML
generation. The final public static route set supplies ordinary entries. When
`plugins.memos.enabled` is true, the owning SEO integration also adds the
reserved external `/memos/` route served by the independent static mount. No
Memo source/state is loaded for discovery. Drafts,
private documents, source paths, and unlisted/non-main experiment routes must
not be added manually.

#### Public favicon assets

`apps/site/public/favicon.png` and `favicon.ico` are copied unchanged to the
site root during the Astro build. The shared `SiteHead.astro` emits one
`<link rel="icon" type="image/png" href="/favicon.png">` for both Terminal
and Semantic routes. Adding or removing a root `public/` asset changes the
published file inventory: update the exact allowlist in
`apps/site/tests/static-output.test.mjs` along with the asset and any head
reference, then verify the built files and route heads. A successful Astro
page-generation phase alone does not mean the strict static-output gate passed.

### 4. Validation & Error Matrix

| Condition | Required result |
| --- | --- |
| missing/malformed TOML, duplicate key, unknown key, missing field | fail with source and field context before rendering |
| unsafe, missing, non-regular, symlinked, or escaping `FIREFLY_SITE_CONFIG_PATH` | fail before the site config or owner-local plugin config is read |
| control character, empty text, unsafe prompt token, traversal cwd, or non-NFC path | fail config/content validation |
| empty, multiline, control-containing, or browser-unsafe `terminal.promptMarker` | fail config validation with the source and `terminal.promptMarker` field |
| missing, absolute, traversal, symlink-escaping, or malformed comments `configPath` | fail before site/service projection; an enabled plugin cannot fall back to defaults |
| literal SMTP password or non-secret `COMMENTS_*` setting in plugin secrets.env | fail before service startup without exposing the value |
| comments runtime path has traversal, backslash, whitespace, control, or empty interior segment | fail the shared comments namespace before site/service projection |
| non-http(s), origin with path/query/fragment/credentials, or unsafe image | fail validation; never emit it into HTML |
| friend link with non-http(s), credentials, fragment, controls, unknown fields, invalid desc, or duplicate URL | fail `terminal.friends` validation with record/field context |
| omitted or empty `terminal.friends` | normalize to `[]`; render the bounded `No friend links.` recovery/command state |
| omitted `site.url` (normalized as `null`) | emit robots only; omit automatic canonical, `og:url`, and sitemap |
| explicit safe `htmlTitle`/`canonical`/`seoImage` | use the validated override for that document only |
| `noindex: true` | emit `noindex, follow` for the document |
| malformed `data-terminal-identity-about`, `data-terminal-identity-prompt-marker`, or identity shape | browser enhancement fails closed; native recovery remains usable |
| root/no-leading-slash/`.html` sitemap input | normalize to one canonical trailing-slash path |
| `/404` or non-main `/lab/<experiment>/` sitemap input | exclude from sitemap |
| missing public route in final build | do not invent source-path entries; enabled external `/memos/` is the explicit owning-integration exception |
| favicon missing from build or shared head | fail the static-output inventory or shared-head assertion |

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
  loading and malformed input; prompt-marker default/custom/unsafe cases; strict unknown,
  duplicate, friend-link, control, URL, image, cwd, and identity rejection;
  metadata fallback/override behavior; robots and sitemap normalization/filtering;
  plugin activation/path loading and public-only projection from a separate
  comments config file; contained `FIREFLY_SITE_CONFIG_PATH` acceptance plus
  traversal, absolute, wrong-extension, missing-file, and symlink rejection.
- `apps/site/tests/content-schema.test.mjs`: valid and invalid optional SEO
  front matter, unknown-key rejection, safe canonical/image validation, and
  `noindex` default.
- `./sam npm --prefix apps/site run check`: Astro props and both layouts consume
  the shared head without diagnostics.
- `./sam npm --prefix apps/site run build`: default output contains robots and
  omits sitemap when the default origin is omitted; metadata and terminal prompt
  match the active TOML.
- Static output asserts both root favicon files and exactly one PNG icon link
  on home, Terminal document, and Semantic document routes.
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
const identity = decodeTerminalIdentity({ user, host, workingDirectory, about, promptMarker });
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
