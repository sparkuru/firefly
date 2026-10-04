# Repository findings

## Static site and route boundaries

- `.trellis/spec/frontend/architecture-contract.md` says the site is static;
  canonical authored documents are posts/pages, Lab is separately assembled,
  and the comments runtime is not queried by static site generation.
- `apps/site/src/lib/site-plugin-registry.mjs` currently models post-scoped
  extensions, so a site-wide memo stream needs a separate integration point.
- Main navigation and alternate Terminal presentation live in
  `apps/site/src/layouts/DocumentLayout.astro`,
  `apps/site/src/components/TerminalHome.astro`, and
  `apps/site/src/pages/index.astro`. Sitemap routes are derived from Astro
  output by `apps/site/src/lib/site-seo.mjs`.

## Comments service and publication precedent

- `plugins/comments/README.md` documents the first-party static plugin,
  independent service ownership, plugin config boundary, same-origin proxy,
  and build-time public export.
- `services/comments/src/http.ts` provides public submission/verification and
  Bearer-authenticated private administration endpoints. The service keeps
  write/moderation state separately from the static site.
- `apps/site/src/lib/comments.mjs` reads `FIREFLY_COMMENTS_EXPORT`, validates
  it, and binds records to public post routes during the build.
- `tooling/assemble-publication/src/plugins/comments.ts` verifies the export,
  emitted route, digest, and tombstone metadata before publication promotion.
- `compose.yml` adds comments only through an opt-in profile and shares the
  web container network namespace so Nginx can proxy to loopback without
  publishing the service port. `nginx.conf` owns the same-origin route.
- `plugins/comments/compose.yml` is the operator deployment template for an
  independent host-networked service with loopback binding and persistent
  data.

## Historical-data boundary

- `.trellis/tasks/archive/2026-08/08-14-m51-dynamic-comments-identity/prd.md`
  explicitly keeps historical Typecho memo records private and out of the
  first public release. The new memo stream therefore starts with new visitor
  submissions only.

## Planning implications

- Keep memo records outside post/page collections, X Core, comments, and Lab.
- Give memos a separate domain contract and service even though the workflow
  resembles comments.
- Follow the existing static export handoff so an outage cannot make an
  already-published memo stream unreadable.
- Add a distinct route and publication metadata path; do not add memo fields to
  the comments schema or force the global route into the post-only registry.
