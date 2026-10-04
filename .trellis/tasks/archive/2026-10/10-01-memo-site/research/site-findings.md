# Memo site planning evidence

## Current deliverables

Contract child `c9885e6` and service child `bcbca34` are implemented and archived.
This investigation prepares only the site child; it does not claim site,
publication or deployment validation. Parent progress remains 2/4.

## Configuration and file loading

- `apps/site/src/lib/site-config.mjs:240` accepts only comments activation;
  line 245 rejects every other plugin key. Lines 254–271 assemble/parse public
  site config; lines 281–332 load plugin TOML. Integrate memo activation and
  public projection here, preserving comments behavior.
- `plugins/memos/config.mjs:28` defines public config; line 31 requires an
  explicit HTTPS write origin when enabled. Lines 81 and 95 expose activation
  and public projection. The latter validates the supplied runtime shape but
  returns no runtime values and reads no secrets. Disabled site consumers must
  stop before loading config/export files.
- `apps/site/src/lib/comments.mjs:29` performs lexical export containment only;
  lines 42–48 allow a missing nonexplicit file and decode through JSON text.
  These are precedent for ownership, not sufficient memo validation. Use real
  containment, regular-file/symlink checks and raw-byte memo decoding instead.
- `plugins/memos/public.mjs:89` provides the strict wire decoder. Limits at
  lines 5–6 are 80 name code points and 8192 body UTF-8 bytes. Browser-native
  length attributes cannot be treated as exact server-contract enforcement.
- `plugins/memos/plugin.json:8` names the future site entrypoint as
  `apps/site/src/plugins/memos/index.mjs`; implement that path, rather than
  introducing an unaligned adapter facade.

## Service form and response contract

- `services/memos/src/validation.ts:11` accepts exactly `displayName`, `email`,
  `body`, `consentVersion`, `consent`, optional `honeypot`; line 19 requires
  `consent=accepted`, configured version, and absent/empty honeypot.
- `services/memos/src/http.ts:32` accepts URL-encoded or JSON bodies and rejects
  repeated fields/bad UTF-8. Line 64 selects HTML for URL-encoded submissions;
  lines 72–74 enforce allowed Origin and return generic acceptance. Verification
  also returns HTML. Line 29 includes a fixed relative `/memos/` return link.
- `services/memos/tests/http.test.ts:48` covers form/validation behavior; its
  native-form assertion is around line 69. These tests already cover service
  behavior; the site child must prove its rendered form emits that contract.
- A distinct write host makes the relative return link target that host. The
  accepted parent topology uses the site's public origin through a proxy.
  Preserve explicit HTTPS `writeOrigin`; actual same-origin routing and SMTP
  remain publication/runtime acceptance, not frontend fixture claims.

## Route, navigation and output

- `apps/site/astro.config.mjs` keeps `output: 'static'` and trailing slashes.
  `apps/site/src/pages/posts/[...path].astro:15` is an existing build-time
  `getStaticPaths` example. Use a memo rest route that returns no paths disabled,
  or only the index path enabled. Rendering nothing in a fixed page would not
  prove absence of its emitted route.
- Astro's [official rest-parameter reference](https://docs.astro.build/en/reference/errors/get-static-paths-invalid-route-param/)
  confirms an undefined rest parameter maps to the parent/index URL. The planned
  `memos/[...stream].astro` uses that documented mechanism; actual emitted-route
  behavior must still be checked against the repository's pinned Astro build.
- `apps/site/src/lib/site-plugins.ts` currently registers only a post extension
  for comments. Register memo explicitly as a separate standalone site capability;
  do not adapt records into post extension contexts.
- `apps/site/src/layouts/DocumentLayout.astro:33` owns ordinary navigation.
  `apps/site/src/components/TerminalHome.astro:226` owns native recovery/root
  navigation. Lines 243–245 mark existing directories for inline home browsing;
  memo must be a normal link without that directory interception marker.
- `apps/site/src/lib/site-seo.mjs` builds its sitemap from emitted pages; disabled
  acceptance must check both output inventory and sitemap, not only link markup.
- `apps/site/scripts/validate-comments-build.mjs` is invoked by both `build`
  and `build:workspace` in `apps/site/package.json`. Add an independent memo
  prevalidation gate without changing the comments export handoff requirements.

## Validation shape

Existing site scripts provide content, X Core, check/build, static-output and
four-project browser gates. The ordinary browser config has explicit test-name
patterns, so a new memo suite must be deliberately wired rather than assumed
to run. Use a dedicated enabled memo fixture/config, prebuilt static output,
desktop/mobile no-JavaScript checks and ordinary navigation regressions.

Synthetic local response fixtures prove the native form's payload/action and
readable service contract only. They do not prove deployed proxy, email, owner
moderation or publication rollback. Never claim those later gates from this
child. Add no historical data, credentials or operational identities.
