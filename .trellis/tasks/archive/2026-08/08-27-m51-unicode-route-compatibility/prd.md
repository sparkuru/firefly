# M5.1 Unicode route compatibility

## Goal

Close the remaining Unicode route gap between the site's canonical content
model and the comments protocol. A post whose public route contains Unicode
characters must render its published comments and submit a canonical comments
`postPath` without changing unrelated public-route behavior or enabling
comments in tracked configuration.

## Background and confirmed facts

- The site content model currently represents public post hrefs as readable
  Unicode paths.
- The comments service, export format, and release-derived route catalog use
  canonical uppercase UTF-8 percent-encoded post routes.
- ASCII routes happen to have the same representation at both boundaries, so
  existing unit and browser coverage does not expose the mismatch.
- For a Unicode post, the publication loader currently compares an encoded
  export `postPath` with the raw site href and rejects the comment. The form
  also receives the raw site href, which the service correctly rejects because
  it is not a canonical comments route.
- The production route catalog has already been reconciled. Public comments
  remain disabled, so this task can be completed and validated locally without
  changing the deployment or sending mail.

## Approved compatibility decision

Preserve the existing readable Unicode public URL and
`CanonicalDocument.href`. Convert and validate the route once at the comments
boundary, where the comments protocol takes ownership of `postPath`.

The alternative—percent-encoding the site's canonical href globally—would
change a broader public contract and propagate into routing, canonical/SEO
links, breadcrumbs, aliases, and Terminal paths. The owner approved the
boundary-only conversion on 2026-08-27; a global encoded-URL migration is not
part of this task.

## Requirements

### R1. Preserve the site route contract

- Keep public navigation, canonical links, route generation, breadcrumbs,
  aliases, and Terminal behavior on the existing site-route representation.
- Keep ASCII route behavior unchanged.
- Do not weaken the content model's existing normalization and collision
  checks.

### R2. Own conversion at the comments boundary

- Provide one shared conversion/validation path from a canonical site post
  href to the comments protocol's canonical uppercase UTF-8 percent-encoded
  route.
- Encode path segments without allowing encoded delimiters, traversal,
  malformed escapes, query strings, fragments, or non-canonical spellings.
- Reuse the comments route validator instead of introducing a second route
  grammar.
- Fail closed when a site route cannot be represented as a canonical comments
  route.

### R3. Reconcile publication lookup and form submission

- Match encoded export comments to the corresponding canonical site document,
  while preserving the site-facing result lookup expected by the build
  pipeline.
- Pass the encoded comments `postPath` to top-level and reply forms.
- Do not accept comments for stale, unknown, directory, or otherwise
  non-public post routes.

### R4. Prove the cross-layer behavior

- Add focused tests for a synthetic Unicode post covering export lookup,
  rendered comments, and form `postPath`.
- Cover ASCII compatibility and invalid/unsafe input fail-closed behavior.
- Run the relevant unit, static-build, and browser checks through the
  repository's `./sam` workflow.
- If an enabled projection is needed, use only a sanitized repository-relative
  non-tracked export fixture and keep tracked comments configuration disabled.

### R5. Preserve operational and privacy boundaries

- Do not connect to the deployment, change runtime configuration, send mail,
  rotate credentials, or enable public comments in this task.
- Do not copy account-, host-, release-, or provider-specific operational data
  into source, tests, logs, or Trellis records.

## Acceptance Criteria

- [x] A canonical site href containing Unicode maps deterministically to the
      comments protocol's uppercase UTF-8 percent-encoded route.
- [x] An exported comment using that encoded route renders on the matching raw
      Unicode site post.
- [x] Top-level and reply forms for that post submit the encoded canonical
      comments `postPath`, while the rendered page keeps its existing public
      URL representation.
- [x] ASCII posts continue to render comments and submit unchanged canonical
      routes.
- [x] Malformed, unsafe, stale, unknown, and directory routes remain rejected
      or unmatched without partial publication.
- [x] Focused unit, static-build, and browser checks pass using sanitized local
      fixtures; tracked comments configuration remains disabled.
- [x] The final diff and Trellis records contain no private operational values
      or credentials.

## Out of scope

- Global public-URL migration or redirects.
- Content slug migration or changes to authored content.
- Route-catalog reconciliation, SMTP testing, key rotation, deployment,
  production browser checks, or public enablement.
- Changes to comments persistence, moderation, notification delivery, or the
  external comments API beyond the existing route contract.
