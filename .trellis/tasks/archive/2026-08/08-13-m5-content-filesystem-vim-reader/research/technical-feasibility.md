# Technical feasibility — workspace, symlinks, routes, and reader

## Current evidence

### Content and routing

- `apps/site/src/content.config.ts` already uses Astro's `glob()` loader with
  `**/*.md`, but `content-schema.mjs`, `content.ts`, Terminal entries, X Core
  context, and both dynamic route files flatten documents to one front-matter
  slug.
- Astro 7.1.6's installed `glob()` implementation accepts an absolute file URL as
  `base`, supports `generateId`, and delegates discovery to tinyglobby 0.2.17.
  That installed tinyglobby defaults `followSymbolicLinks` to `true`.
- The generic glob behavior is not an adequate trust boundary: it does not own
  the required virtual-path safety, cycle/collision policy, link diagnostics,
  guest projection, or stale-stage transaction. A project-owned preflight and
  materialization layer must run before Astro.
- Current post/page routes are `[slug].astro`; nested documents and directory
  indexes require an explicit catch-all route model and collision gate.

### Container boundary

- `sam` mounts only the repository at `/app` and passes only selected environment
  variables. An absolute or out-of-repository symlink is therefore not currently
  readable inside the Node container.
- Mounting the content root at the same absolute path inside the container keeps
  absolute and relative symlink resolution consistent. Recursively discovered
  resolved link targets can be mounted individually at their same absolute paths,
  read-only. A broad home/root mount is unnecessary and forbidden by the PRD.
- Host mount discovery is only a transport preflight. The Node content scanner
  remains authoritative for lstat/realpath type checks, cycles, virtual paths,
  duplicate/case/Unicode collisions, schema, and safe diagnostics.
- The current Dockerfile builds from repository context. External content cannot
  be copied implicitly through that context. The safe packaging path is:
  workspace-aware container build -> validated assembled root `dist/` -> a
  runtime-only Nginx image target that copies only that publication. The existing
  source-building target remains useful for the repository fixture.

### Terminal and document UI

- `presentations/terminal/src/runtime.ts` currently owns one closed command
  switch, flat `slug`/`filename` entries, and pure completion/effects. It can be
  generalized without moving DOM access into the package.
- `TerminalDocument.astro` currently renders an ambiguous command-like nav; it
  has no client script. `TerminalLayout.astro` already supplies route-local raw
  CSS and semantic theme tokens.
- The reader can remain progressive enhancement: semantic content persists;
  one Terminal-document-only controller owns active semantic units, search,
  visual selection, mode status, focus, and reduced-motion scrolling.

## Chosen implementation constraints

- Use `F1REFLY_CONTENT_ROOT` as the optional host-facing workspace setting.
  Absence means the repository fixture `content/posts/`.
- Materialize validated Markdown into an ignored, transactionally replaced site
  staging directory using link-owned virtual paths. Astro reads only that stage,
  so no symlink or absolute source identity enters its content store.
- Do not materialize only the guest projection: validate and parse all documents,
  then project guest content centrally. Publication/static scans prove private
  body/title/path absence.
- Preserve `content/pages/` as the separate page source in this task.
- Keep the default command registry code-defined and immutable. Extension and
  alias APIs are compile-time package interfaces, not runtime plugins or browser
  JSON. Unit fixtures prove a custom command and alias without shipping surprise
  aliases to readers.
- Use one canonical public model containing collection, virtual Markdown path,
  route path, breadcrumbs, metadata, and access decision. Terminal, routes,
  directory indexes, templates, and X Core consume it.
- Treat `~/blog/posts` as Terminal's current directory: relative operands resolve
  inside the configured workspace; leading `/` addresses only the decoded blog
  virtual tree containing `/posts` and `/pages`, never the host filesystem.
- Use a native labeled search/command input for `/`, `?`, and `:` states. Normal
  and visual modes keep focus on one reader region with active-unit state; do not
  add every paragraph to the page Tab order.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Link target changes between host discovery and container scan | Bind mounts are read-only; authoritative in-container scan fails on mismatch. No adversarial multi-user atomicity claim. |
| Link cycle or multiple aliases to one source | Track virtual ancestry and resolved identities; reject cycles but allow distinct link-owned public paths only when they do not collide. |
| Private content leaks through templates/indexes/errors | One guest projection feeds every output; negative-build and byte-scan fixtures include private unique sentinels. |
| File vs directory URL collision | Reserve the complete canonical and directory route set before Astro route generation. |
| Browser key takeover harms native behavior | Reader activates only on Terminal documents, uses protected-target/IME/modifier/selection gates, and keeps real inputs for search/commands. |
| CSS highlight support varies | Search navigation and announcements are authoritative; visual match highlighting uses a capability-gated path with a tested selection fallback. |
| Prebuilt runtime packages stale `dist/` | Require a validated publication manifest/inventory immediately before the runtime-only image target. |
| Linked relative assets break after materialization | Keep arbitrary linked asset ingestion outside this task and report unresolved references rather than broad-copying source trees. |

## Validation implications

- Shell: Bash syntax, ShellCheck, shfmt, exact mount logging/teardown, hostile path
  fixtures, and proof that unrelated host paths are not mounted.
- Node: scanner/link/cycle/collision/staging rollback/access projection/registry
  unit and negative tests.
- Astro: nested static paths, directory indexes, X Core metadata, no private
  output, no absolute paths, exact assets/routes.
- Browser: static directory/document/deep-link/breadcrumb coverage and full
  reader key/search/selection/escape/native-behavior coverage at both viewports.
- Publication: exact updated inventory, mounted app isolation, runtime-only image
  from validated assembled output, route/header/404/non-root/read-only probes,
  and teardown.
