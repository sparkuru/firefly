# Friend links

## Goal

Add a maintainable friend-links surface to the Markdown-first static site. A
visitor should be able to discover a curated list of other sites, understand
what each link is, and open the external site through ordinary native HTML
links. The feature must preserve the current static build, Terminal recovery,
publication isolation, and strict build-time validation model.

## Confirmed repository facts

- `apps/site/` is an Astro static application. It has no runtime database,
  server-side request path, remote JSON fetch, or client-side content loader.
- `config/site.toml` is a public, strictly parsed build-time configuration for
  site identity and SEO. Unknown keys fail validation.
- `content/pages/` is the existing authoring boundary for standalone pages;
  `pages/[slug].astro` and both layouts already publish those pages in the
  semantic or Terminal presentation.
- `getCanonicalContent()` is the single guest/public projection and owns
  content filtering, route reservations, directory trees, and collision checks.
- The shared `SiteHead.astro` already provides page metadata. The current site
  has no friend-links route, schema, config, or prior task for this feature.
- M5.1's dynamic comments/identity service is deferred and is not part of the
  current release path. Friend links must not implicitly revive that service or
  convert the site to SSR.

## Initial architecture options

1. **Markdown-only page** — add `content/pages/friends.md` and author ordinary
   Markdown links. This has the lowest implementation cost and keeps the page
   maximally editable, but offers weak per-link validation and makes future
   structured rendering, icons, grouping, or link-maintenance checks harder.
2. **Structured public configuration** — validate an exact array of link
   records at build time and expose it to a dedicated Terminal command. The
   records live under the existing `config/site.toml`. This keeps the
   clone-time customization surface in one public config file while allowing
   deterministic ordering, safe external URLs, and future checks without
   introducing a content collection.
3. **New content collection** — add a `links` collection under
   `content/links/`. This makes each link a first-class content object, but it
   expands the canonical content model, Terminal index, route reservation, and
   publication tests for a resource that does not need document routing.
4. **Remote or submitted links** — fetch a registry or accept applications at
   runtime. This conflicts with the current static publication boundary and
   requires an owner-approved service, trust/abuse policy, availability model,
   and likely SSR or a separate build ingestion job.

## Confirmed decisions

The first version is **a manually curated static list committed to the
repository**. This preserves the existing Docker-only static build, keeps
review and rollback in Git, and avoids introducing service, moderation,
failure, and deployment concerns. Remote, submitted, or dynamic links remain
out of scope.

The list is stored in the existing public build-time configuration at
`config/site.toml` under `terminal.friends`; the same shape is documented in
`config/site.toml.example`. TOML is the only site-config source of truth: it
keeps a fresh clone's normal customization in one hand-editable file and
avoids YAML's implicit typing/indentation pitfalls while preserving strict
unknown-key validation.

Friend links are exposed by a no-argument `friends` Terminal built-in command,
like `about`. It is registered in the existing help and completion registry,
and its interactive output produces structured native external links. The
feature does not create a standalone route, Markdown page, or public document
VFS mount.

Each record has these public fields, with optional `desc`:

```toml
[[terminal.friends]]
name = "Example"
desc = "A short public description."
url = "https://example.com"
```

`name` and optional `desc` are safe single-line public text. `url` must be an
absolute `http` or `https` URL without credentials, fragments, whitespace, or
control characters; the existing safe HTTP URL policy is reused. Records
retain configuration order, duplicate URLs are rejected, and an empty list is
valid.

The Terminal home recovery surface also renders the same list as ordinary
native links, so the links remain reachable without JavaScript. This is a
recovery/catalog section only; it is not added to `ls`, `tree`, `cat`, or the
virtual filesystem. Interactive command output and recovery output use the
existing Terminal visual language: aligned name/description/URL columns on
wide screens, the same cell order stacked on narrow screens, same-tab
navigation, visible focus, and no new fonts, remote assets, animation,
tracking, or link probing.

## Acceptance criteria for the eventual MVP

- The approved source of truth is explicit and can be validated before Astro
  rendering.
- Only safe, intentional external URLs and public text reach the generated
  HTML; malformed records fail the build with field context.
- The link surface is reachable through native HTML without JavaScript, and the
  `friends` command is available through help and completion when JavaScript is
  enabled; nothing leaks into private/source workspace data or experiment
  mounts.
- Ordering and rendered output are deterministic, and empty/invalid lists have
  defined behavior.
- `friends` can participate in text pipelines and scratch-file redirection by
  using a deterministic plain-text serialization; direct interactive output
  remains native clickable links.
- The feature has package-local/static-output/browser evidence appropriate to
  the chosen presentation and does not regress current route or publication
  contracts.

## Out of scope until separately approved

- Runtime database, SSR conversion, remote registry, public submission API, or
  moderation dashboard.
- Automatic HTTP health checks, link scraping, reciprocal-link checks, or
  scheduled jobs.
- Analytics, click tracking, sponsored links, rel-policy experiments, or
  generated social/avatar images.

## Planning status

- Task created: `.trellis/tasks/08-19-friend-links`
- `task.py start friend-links` has been run; implementation is authorized and
  complete.
- Product and presentation decisions are converged; design and implementation
  manifests are the implementation source of truth. The friend-link feature,
  TOML migration, and quality gate are complete; normal commit/archive handling
  remains pending.
