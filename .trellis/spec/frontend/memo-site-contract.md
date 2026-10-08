# Memo Public Activation and Independent Static Reading

Status: retained version-1 recovery behavior. The current coordinated reader is
defined by [Memo Documents](./memo-document-contract.md). New releases own
`/pages/memos/` and `/memos/` compatibility inside the site, use comments-only
version-2 access, and ignore the deprecated Memo flag for document visibility.
The independent activation/rendering statements below describe retained releases
and historical fixtures; they are not the new site build contract.

## 1. Scope / Trigger

Read when changing site Memo activation/navigation/sitemap, reserved routes,
independent static-page browser tests or explicit combined preview. The blog
build owns discovery and public activation evidence; Memo content and rendering belong to
`tooling/publish-memos/`. There is no visitor form or browser publishing UI.

## 2. Signatures

`parseSiteConfig` retains strict `plugins.memos` activation parsing.
`loadSiteConfig` never loads a physical Memo config or export. Site props expose
activation, not a Memo content envelope. `MEMOS_SITE_PLUGIN` describes
`id: 'memos'`, `route: '/memos/'`, `capability: 'external-static-page'` outside
post extensions. The former `loadMemoStream` and Astro Memo route are removed.

The separate publisher builds `public/index.html`; explicit combined preview
selects a validated candidate with `FIREFLY_MEMOS_CANDIDATE`. See the
[publisher/runtime contract](./memo-publication-runtime-contract.md).

## 3. Contracts

- `[plugins.memos]` has `enabled` and legacy-compatible `configPath` only.
  Default is disabled. Neither activation value creates a Memo file read,
  runtime request, export loader, database query or site route generation.
- Enabled activation adds a native `/memos/` link to ordinary document and
  home recovery/mobile navigation, and advertises the same-origin static mount
  in sitemap. Link handling never becomes a home-directory interception.
  Disabled activation omits discovery and makes the public runtime return 404
  for the exact path and descendants, even with retained published bytes.
  It does not free the namespace or delete content/history. See the
  [shared plugin-access contract](./plugin-public-access-contract.md).
- Always reserve `/memos/` and its descendants against article/page aliases
  regardless of activation. Memo records never enter content collections,
  X Core, post extensions, search, Terminal filesystem, RSS or Lab.
- Blog builds remain usable with Memo config/source/export absent or invalid.
  Enabled activation expects the independent static mount. Local static preview
  and runtime packaging require an explicit validated candidate when enabled;
  disabled blog-only preview/package needs no Memo input.
- The separate static page uses semantic chronological entries, configured owner
  name, UTC time, stable fragment links and home/blog navigation. Empty output
  says no Memo has been published. No form/email/consent/status/write script.
- Sanitized build-time Markdown supports native links, lists, code, tables and
  owned media. The immutable wire body preserves significant authored whitespace
  and Unicode. Public media/style URLs belong to `/memos/`, independent of blog
  hash filenames. Reading needs no JavaScript or private process.
- Narrow mobile and text zoom retain readable content without page overflow;
  long code/table content scrolls inside its own container. Native links show
  keyboard focus. No new animation, font fetch or UI library is required.
- Combined preview consumes already validated `public/` only, read-only. Missing
  selected artifacts fail explicitly; no silent rebuilding, download or empty
  fallback. Public runtime mounts exclude receipt/source/owner configuration.
  Astro `dev` explicitly refuses a selected combined Memo candidate; use static
  `start` or `preview` for that composition.

## 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| Enabled/disabled with missing or corrupt Memo source/config/export | Normal blog build; no physical Memo read |
| Authored alias uses Memo namespace or descendant | Reject content route collision |
| Enabled discovery | Native external-static link and sitemap entry, no site-owned Memo output |
| Disabled activation with a retained Memo mount | 404 for HTML, public JSON, CSS/media and relevant methods; preserve receipt/history |
| Empty Memo publication | Honest static empty state and navigation |
| Unsafe Markdown or incomplete asset closure | Publisher rejects/sanitizes before reading surface is accepted |
| Selected combined artifact missing/invalid | Combined-input error, no empty fallback |
| Legacy HTTP/mail service stopped | Static reading remains available |

## 5. Good / Base / Bad Cases

Good: enable public activation once, then independently publish Memo edits while
all blog bytes remain unchanged. Base: disabled activation and independent blog
build with no Memo input. Bad: read Memo TOML when enabling navigation, render
a placeholder Memo route in Astro, or classify Memo as a document directory.

## 6. Tests Required

Use maintained site Memo tests and browser fixtures through `./sam` or the
pinned `preview.sh render` profile. Assert enabled and disabled independence
with unavailable Memo files/getters; permanent namespace reservation; navigation
and sitemap without owned output; document/search/Lab isolation; publisher empty
and nonempty static reading on desktop and narrow mobile with JS disabled;
keyboard focus, text zoom, code/table overflow and exact asset closure. Serve an
already built artifact, never rebuild in the browser server. Public output must
contain no private sentinel, form, email control or retired write URL.

Run ordinary site/content/X Core/assembler regressions and full maintained
verification. Synthetic fixture/browser evidence and actual HTTPS/deployment
acceptance remain separate. Real devices and assistive technology are human
residuals, not implied by emulation.

## 7. Wrong vs Correct

Wrong: enable the link by loading an export and emitting `memos/index.html`
inside the blog release, or reserve the path only while discovery is visible.

Correct: always reserve the namespace, emit release-bound public activation,
and gate the independent static mount before redirects or reads.
