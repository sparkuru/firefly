# Firefly memo site adapter and UI design

## Dependencies and ownership

Consume the completed memo public/config and service HTTP contracts. The site
owns static adaptation, public configuration projection, route, visitor markup
and navigation. Service state, Nginx/Compose, publication promotion and prior
epoch comparison retain their existing owners. Evidence lives in
`research/site-findings.md`.

## Configuration and build flow

Extend `apps/site/src/lib/site-config.mjs` to accept exactly `comments` and
`memos` activation keys. Preserve comments behavior. Use `parseMemosActivation`
and expose only immutable public values through `parseMemosPublicConfig`.
Disabled activation returns public defaults before opening memo config. Add
disabled site config/example entries and a public-only memo config example;
never read secret env files or pass runtime config to Astro/browser props.

The public parser validates the whole supplied TOML but returns only public
values; runtime shape validation is not secret loading. Enabled TOML/export
files must be regular non-symlink files with real paths inside the repository.
Reject symlink path components as well as the final file.

Add the site build adapter at `apps/site/src/plugins/memos/index.mjs` with
matching declarations, consistent with the manifest's site entrypoint. Check
activation first; select a nonempty `FIREFLY_MEMOS_EXPORT` override or configured
`exportPath`. Check lexical and real containment before reading bytes and call
`decodePublicMemosExport(bytes)`. Do not copy comments' missing-file empty
fallback, replacement JSON decoding or lexical-only checks. Expose immutable
`MemoStreamBuildData` containing the public envelope/config only. No database
or network reads occur.

Prevalidate enabled exports before Astro generation in both `build` and
`build:workspace`, alongside the unchanged comments gate. Missing/invalid inputs
fail with bounded diagnostics that do not echo values. This is not publication
promotion or tombstone history enforcement.

The `sam` command boundary must forward `FIREFLY_MEMOS_EXPORT` unchanged into
the container, where the enabled adapter validates the repository-relative
value. Do not probe that file in the wrapper: disabled builds must still ignore
unusable memo overrides. This minimal handoff is site integration, not the
later publication adapter or runtime deployment wiring.

## Conditional static route and registration

Use `apps/site/src/pages/memos/[...stream].astro` with `getStaticPaths()`:
disabled returns no paths; enabled returns only the index path
(`stream: undefined`) with prepared public props. The public URL stays
`/memos/`. Test the emitted inventory/sitemap and absence of arbitrary memo
subroutes, not just invisible component markup.

Keep explicit first-party memo registration separate from the post-extension
registry in `apps/site/src/lib/site-plugins.ts`. Expose a route-owned descriptor
or loader there without making memo a post extension. Do not widen comments'
post/reply model, X Core or Terminal entries.

## Presentation and native form

Use `DocumentLayout.astro` with plugin-owned `MemoStream.astro`,
`MemoForm.astro` and scoped CSS. Render names/bodies/timestamps through text
interpolation, never `set:html` or Markdown. Use semantic headings/list/time
elements, body `white-space: pre-wrap`, long-text wrapping and an empty state.

Form action is `new URL('/v1/memos/submissions', writeOrigin)`. Enabled config
requires an explicit HTTPS origin. The accepted runtime plan sets this to the
site's public origin; null does not mean a relative proxy. No service/config
contract change is required.

Use `method="post"` and `enctype="application/x-www-form-urlencoded"` with:

- Labelled required `displayName`, private `email`, and plain-text `body`.
- Hidden configured `consentVersion`; required, initially unchecked `consent`
  checkbox with value `accepted`.
- Empty `honeypot` compatible with the service, hidden from normal keyboard and
  assistive-technology navigation and excluded from autofill.

State the server limits of 80 Unicode code points for names and 8192 UTF-8 bytes
for bodies. Native `maxlength` counts UTF-16 units; do not treat it as exact
byte/code-point enforcement or exclude valid supplementary-character names.
The service remains authoritative. Email bounds follow the service grammar.
Do not add post/reply fields, credentials, list fetching or submission JavaScript.

The existing service supplies HTML for URL-encoded submissions and verification
results, including a fixed `/memos/` return link. Explain verification, private
pending owner review and publication after a later static release. Do not add
site runtime state inspection or replacement status pages.

## Navigation and privacy

Add one enabled-only ordinary link to `DocumentLayout.astro` and the native
root/recovery navigation in `TerminalHome.astro`. Omit
`data-home-browse-directory` on the memo link so mobile performs native
navigation. Preserve pages/lab/posts ordering, tree semantics and Terminal
lifecycle. Records never enter canonical collections, document navigation,
homepage search, Lab manifests or Terminal filesystem data. An enabled-page
sitemap entry is allowed; disabled output omits it.

Fixture runtime-private sentinels must be absent from HTML/assets/projections.
Use synthetic public records only, never historical Typecho records.

## Validation and rollback

Adapter/config tests cover enabled/disabled selection, public-only projection,
strict byte decoding, file/path attacks, empty exports and immutability.
Isolated enabled/disabled builds cover inventory, sitemap, escaped text,
field/action encoding, privacy and content isolation. Browser checks serve
prebuilt output without JavaScript at desktop/mobile sizes and verify native
navigation, consent, actual URL-encoded requests and readable service-contract
responses using a local fixture/intercept. Those responses prove frontend
compatibility, not deployed proxy/SMTP correctness. Run interactive navigation
regressions and inspect screenshots.

The tracked default remains disabled. Invalid builds produce no accepted site
candidate; the publication child owns release-pair preservation/promotion.
Disabling restores static-only behavior without touching service data. Revert
site integration if needed; never weaken decoding or privacy checks.
