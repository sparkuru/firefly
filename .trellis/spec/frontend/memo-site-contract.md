# Static Memo Site Integration

## 1. Scope / Trigger

Read this when changing memo site configuration, `apps/site/src/plugins/memos/`,
the `/memos/` route, its visitor form/navigation, or site build gates. The
site imports the pure memo contract, never the private service/database.
Historical Typecho memo data remains outside the new-submission workflow.

The publication/runtime child owns same-origin Nginx/Compose, delivery/proxy
operations, publication metadata, and comparison with prior tombstone epochs.
Frontend fixture responses do not establish those integration checks.

## 2. Signatures

The manifest-aligned `apps/site/src/plugins/memos/index.mjs` and declaration
export:

```ts
loadMemoStream(config: MemoSiteConfig, options?: {
  readonly exportPath?: string;
  readonly repositoryRoot?: string;
}): MemoStreamBuildData | null

interface MemoStreamBuildData {
  readonly public: MemosPublicConfig;
  readonly envelope: PublicMemosExport;
}
```

`apps/site/src/lib/site-plugins.ts` exposes this loader and the independent
`MEMOS_SITE_PLUGIN` descriptor (`id: 'memos'`, `route: '/memos/'`,
`capability: 'site-page'`). It is outside the post-extension registry.
`apps/site/src/lib/contained-file.mjs` supplies
`readContainedFile(relativePath, repositoryRoot, label): Buffer` for memo
config/export inputs as a facade over `tooling/shared/contained-file.mjs`;
the shared utility also accepts an optional maximum byte count. This preserves
the site interface without a reverse assembler-to-Astro dependency.

Site configuration exposes `plugins.memos` activation and `memos` public
values. `parseSiteConfig(value, source?, options?)` accepts a supplied
`options.memosConfig` projection; `loadSiteConfig(filePath?)` reads the
configured plugin file only when enabled.

## 3. Contracts

### Public configuration and input loading

- Activation is exactly `enabled` and repository-relative `configPath`, through
  `parseMemosActivation`. Default activation is disabled. Reject unsupported
  plugin keys; preserve independent comments activation/behavior.
- Enabled config loading validates UTF-8/TOML and uses
  `parseMemosPublicConfig`, which validates the supplied full config shape but
  returns only `writeOrigin`, `exportPath`, and `consentVersion`. Never read a
  secret env file or expose runtime fields in site/browser props.
- Disabled loading returns public defaults before reading memo config, export,
  an override or an injected `options.memosConfig` getter. Invalid unused memo
  files must not make a disabled build fail.
- `FIREFLY_MEMOS_EXPORT` is an optional repository-relative `.json` override;
  an empty/unset override falls back to public `exportPath`. Loader test options
  can supply an explicit override/root. Reject absolute paths, traversal,
  unsafe segments, symlink components, special files and real-path escapes.
  Use a regular-file descriptor with no-follow/nonblocking flags for the read.
  `sam` forwards the raw value into the mounted repository container; it must
  not resolve/probe memo files before the adapter's disabled check.
- Pass bytes to `decodePublicMemosExport` without replacement decoding, sorting
  or normalization. Missing/invalid enabled exports fail; a signed empty export
  is valid. Returned data and contract records are immutable.
- Both site `build` and `build:workspace` run
  `scripts/validate-memos-build.mjs` before Astro generation, alongside the
  independent comments prebuild gate. Diagnostics do not echo export contents
  or private config values. The site does not maintain tombstone history.
- Preserve the complete service template at
  `config/plugins/memos/config.toml.example`; the standalone
  `site-public.toml.example` contains public build settings only. Owner-local
  config and secrets remain outside the public build inputs.

### Route and presentation

- `pages/memos/[...stream].astro` returns no static paths disabled, or only
  `stream: undefined` enabled. The emitted URL is `/memos/`; no placeholder,
  redirect or arbitrary memo child path is emitted disabled.
- While enabled, the content route reservation table also reserves `/memos/`
  for the plugin page; authored aliases cannot overwrite it. This conditional
  reservation does not add memo records to canonical content or reserve a
  disabled plugin route.
- Use the normal static document layout and plugin-owned stream/form components.
  Preserve descending order already validated by the decoder. Display names and
  bodies are escaped text, never HTML/Markdown. Preserve body line breaks and
  wrap long text without horizontal page overflow. A valid empty stream retains
  a readable message and native form.
- The stream receives the full immutable public envelope and emits public
  schema/revision/generated-time/digest/epoch attributes plus each article's
  opaque memo ID. These bind the actual staged DOM to publication input; they
  are not credentials or a trust signature. Publication validates ordered
  displayed fields and the form, rather than trusting a marker alone. See
  [Memo Publication and Runtime](./memo-publication-runtime-contract.md).
- Enabled sitemap inclusion follows the final emitted page set. Disabled output
  omits the memo page, form, links and sitemap URL. No SSR or runtime list fetch.

### Visitor write boundary

- Action is `new URL('/v1/memos/submissions', writeOrigin)`. Enabled public config
  requires an explicit HTTPS origin. The planned proxy topology uses the site's
  public origin; null is not a relative-action shorthand.
- Use native `method="post"` and URL encoding, with exactly `displayName`,
  `email`, `body`, hidden `consentVersion`, required initially unchecked
  `consent=accepted`, and empty hidden `honeypot`. No post/reply fields,
  credential, record state or private service path belongs in the form.
- Label all visitor controls. Explain private email, mailbox verification,
  owner review and publication only after a later static release. Server limits
  remain authoritative: 80 name Unicode code points and 8192 body UTF-8 bytes.
  Do not substitute UTF-16 `maxlength` for these units or prevent valid names
  containing 80 supplementary characters.
- Existing service HTML owns acceptance/verification/error responses and the
  fixed relative `/memos/` return link. Do not add site status endpoints or
  JavaScript submission ownership. A different write host changes where that
  relative link lands; deployment topology must keep the accepted same-origin
  relationship.

### Discovery and document isolation

- Ordinary document navigation and the homepage's native recovery/root surface
  expose enabled-only memo links. Ensure desktop recovery remains visible even
  though existing root-directory navigation has a mobile-only presentation.
- The mobile memo link is ordinary navigation, without
  `data-home-browse-directory`; pages/lab/posts retain their existing order and
  inline browse behavior. Disabled builds preserve existing navigation.
- Memo records do not enter canonical content, post extensions, X Core,
  document search/navigation, Lab manifests or the Terminal virtual filesystem.
  The standalone public route may appear in ordinary site SEO.

## 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| Disabled with missing/bad memo config/export/override | No memo read or route; normal static build |
| Enabled without usable config or write origin | Fail before accepted site output |
| Missing, symlinked, escaping or non-regular export/config | Bounded file error before read |
| Invalid UTF-8/TOML, private keys, bad digest/order or envelope | Fail without repair or value-bearing diagnostics |
| Valid empty export | Empty-state page with native form |
| HTML-like name/body | Escaped text with preserved body line breaks |
| Authored alias collides with enabled `/memos/` | Content route collision aborts build |
| Unchecked consent | Native browser validation prevents submission |
| Submitted native form | Exactly six supported URL-encoded fields |
| Memo navigation from mobile home | Native route transition, no directory interception |
| Service absent | Last built stream remains readable; runtime writes are separate |

## 5. Good / Base / Bad Cases

- **Good:** a strict service export supplies immutable public records; the site
  renders the standalone list and posts visitor fields to the configured HTTPS
  write origin without JavaScript.
- **Base:** disabled activation needs no memo file/service; enabled empty export
  displays a useful empty state and form.
- **Bad:** copy comments' optional-export fallback, decode malformed bytes as
  repaired text, use raw HTML interpolation, read service SQLite, or classify
  memo as a homepage directory or post extension.

## 6. Tests Required

Run Node/site commands through `./sam` and diagram-capable builds through
`./render.sh`, with tracked content selected. Focused scripts are
`test:memos`, `prepare:test:memos`, and `test:e2e:memos` in `apps/site`.
Browser commands use the pinned image/IPC profile from
[Development Runtime](./development-runtime.md).

- Adapter/config tests assert public-only immutable projection, disabled file
  and getter short-circuit, strict UTF-8/digest/order/private-field rejection,
  missing/symlink/component/traversal/special-file errors, and valid empty data.
- Isolated enabled/empty/disabled builds assert real route/sitemap inventory,
  text escaping, field/action/consent values, public output privacy and absence
  of memo records from document/search/Lab projections.
  Include an authored-alias collision fixture for the enabled plugin route.
- Static desktop/mobile browser tests assert native recovery links, no inline
  directory marker, readable escaped multiline content, no page overflow,
  unchecked-consent blocking, exact URL-encoded POST including supplementary
  Unicode names, service-contract status HTML and return links. Serve prebuilt
  output and retain screenshots; do not rebuild in the browser server.
- Run ordinary site content/X Core/check/build and affected interactive
  navigation regressions, then the repository gate. Integrate the focused
  adapter tests into maintained validation so loader regressions cannot be
  missed by the default gate.
- Use synthetic local records/config/responses. Private sentinels must never
  reach HTML/assets. Mocked frontend responses are not deployed service,
  SMTP, moderation, proxy or publication evidence.
- The fixture server serves prebuilt contained regular files only. Malformed
  URL encoding/escaped paths return 400; missing, symlinked or special files
  return 404. A failed request must not terminate later valid requests. Importing
  its server factory must not start a listener; lifecycle tests own and close
  their loopback ephemeral listener.

## 7. Wrong vs Correct

Wrong: always emit `memos/index.astro` with an empty disabled body, parse the
export with repairing UTF-8 conversion, then trust a sorted copy of its records.

Correct: return no static paths disabled; enabled loading checks file containment
and passes raw bytes to the pure decoder before providing immutable public props
to text-only Astro components. Keep the native form/service and document models
independent.
