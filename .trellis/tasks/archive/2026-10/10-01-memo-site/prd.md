# Build Firefly memo site adapter and UI

## Goal

Expose the approved memo stream and visitor submission form from Firefly while
keeping the site static, JavaScript-independent for the core flow, and
strictly separated from the private memo service.

## Dependencies and Boundaries

- Depends on the accepted contract, archived in
  `.trellis/tasks/archive/2026-10/10-01-memo-contract/` (commit `c9885e6`).
- The service is also complete, archived in
  `.trellis/tasks/archive/2026-10/10-01-memo-service/` (commit `bcbca34`). Use
  its implemented HTTP/form contract; no deployed service is needed to build.
- Owns `apps/site/src/plugins/memos/`, the memo route/adapter, site plugin
  registration, public config/types/examples, navigation, and focused site
  tests. It must not change the
  comments schema or put memo records into posts/pages/Lab/search data.
- The publication/runtime child validates the final emitted output and proxy
  wiring after this child passes.

## Requirements

### R1 — Validated static stream

When enabled, load only the repository-contained sanitized export through
  `FIREFLY_MEMOS_EXPORT` or the configured public export path and validate it
  with `plugins/memos/public.mjs`. Missing/malformed enabled exports fail the
  build. Reject symlinks, real-path escapes and non-regular files before
  reading bytes. Invalid UTF-8 must not be repaired. An empty approved export
  remains readable and keeps the submission form.

### R2 — Disabled independence

When disabled, omit the memo route and form, do not read the export or
  private runtime settings, and allow a normal static build without the memo
  service or secrets. Short-circuit before opening memo config or resolving an
  export override. Default activation remains disabled.

### R3 — Plain-text presentation

Add a standalone `/memos/` route rendering approved records newest-first.
  Render `displayName`, body, and timestamps as text nodes; never interpret
  memo body as HTML or Markdown. Preserve line breaks and wrap long text on
  desktop/mobile. Do not infer moderation state or repair invalid ordering.

### R4 — Native visitor submission

Add a no-JavaScript form with display name, private verification email,
  plain-text body, explicit publication consent, and a direct action to the
  configured memo submission endpoint. Do not embed admin/service credentials.
  Send only `displayName`, `email`, `body`, `consentVersion`,
  `consent=accepted`, and an empty `honeypot`. Consent is initially unchecked
  and required. Explain private email, verification, owner review and the later
  static release.

### R5 — Existing service responses

Use native URL-encoded submission so the existing service supplies readable
  acceptance/verification/error HTML and its fixed `/memos/` return link.
  Enabled config requires an explicit HTTPS `writeOrigin`; do not introduce
  nullable/relative-origin semantics. The planned runtime sets this to the
  site's public origin so the return link leads back to the site.

### R6 — Discovery without document-model expansion

Add the enabled route to primary navigation and the Terminal recovery links
  without adding memo entries to the virtual filesystem, post/page collections,
  X Core, or search index. The mobile native homepage link performs ordinary
  navigation rather than inline document-directory browsing.

## Out of Scope

- Service logic, API authentication, email delivery, moderation UI, SQLite, or
  runtime memo reads.
- Historical Typecho import, public replies, accounts, or SSR.
- Publication promotion, Nginx, Compose, and production deployment.

## Acceptance Criteria

- [x] AC1 (R1, R3): Enabled builds render `/memos/` from a validated approved-only
  export newest-first; an empty stream is readable and keeps the form.
- [x] AC2 (R1): Enabled builds reject missing, malformed, private-field,
  invalid-UTF-8, wrong-digest/order, symlinked, escaped or non-regular exports before
  output is considered valid; publication promotion separately rejects a
  tombstone epoch lower than the last promoted epoch.
- [x] AC3 (R2): Disabled builds neither require nor read memo config, export,
  service or secrets, even with absent/unusable memo inputs, and emit no memo
  route, form, navigation entry or sitemap URL.
- [x] AC4 (R4, R5): Without JavaScript, the form sends the six supported fields
  to the configured endpoint using URL encoding; consent is required and
  initially unchecked. Service-owned acceptance/error HTML is readable and
  provides a return link, with no credential in the payload.
- [x] AC5 (R3): HTML-like body/name fixtures render as escaped text with body
  line breaks, without horizontal page overflow on desktop/mobile. Private
  fixture values are absent from generated HTML/assets.
- [x] AC6 (R6): Navigation/recovery links work without Terminal, including the
  native mobile homepage. Records stay absent from post/page/search/Experiment
  projections; existing comments/navigation tests continue to pass.

## Deferred Validation

This child proves the static form/service contract using synthetic local
fixtures. Same-origin Nginx routing, trusted proxy/rate behavior, SMTP delivery,
publication metadata and stale-epoch refusal belong to
`10-01-memo-publication-runtime`. Production credentials/deployment are not
needed to accept the site child.

## Acceptance Evidence

All six site criteria passed on 2026-10-04, with an independent full-scope
review and no remaining findings. Exact gate/limitation details are in
`research/validation-findings.md`. The owner confirmed the commit/archive plan
on 2026-10-05; the verified work batch is committed as `f5bc47c` and this child
is ready for its site-only archive.
