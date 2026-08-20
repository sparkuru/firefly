# M5 content filesystem and Vim reader

## Goal

Turn the blog's flat Terminal document index into a safe, path-addressable,
read-only content filesystem. Readers should be able to discover public Markdown
through `tree`, open a nested document with familiar shell syntax, follow an
explicit linked path on its permalink, and read that document with a restrained
Vim-like keyboard layer. The architecture must remain extensible for new commands,
command aliases, and future authenticated identities without pretending that
client-side filtering is authorization.

## Background

The current static site loads `content/posts/**/*.md` and `content/pages/**/*.md`,
but its public model flattens every entry to one globally unique single-segment
`slug`. Terminal commands are implemented in one closed switch and operate on
`${slug}.md`. Canonical document routes are `/posts/<slug>/` and
`/pages/<slug>/`. A Terminal permalink currently displays a shell-like `cd /`
line whose remaining path is plain text and whose meaning is unclear.

The requested future content source may be a configured directory containing a
nested Markdown collection, including a directory outside the repository such as
`/home/wkyuu/cargo/repo/04-flyMe2theStar/03-genshin/`. That host path is an
authoring/build input only; it must never appear in public HTML, JavaScript,
routes, errors, artifacts, or the Terminal filesystem.

M4 remains a separately reviewed publication task. This task may be implemented
only after M4 is committed and archived; planning it now does not reopen M4's
Experiment-pipeline scope.

## Requirements

### R1 — Configured content root and virtual paths

- Support one documented build-time Markdown notebook/workspace root for the
  nested `posts` collection. Authors maintain documents directly below that root
  and its subdirectories. Repository-local `content/pages/` remains a separate
  collection in this task.
- When configured, an external root such as `/home/.../03-genshin/` replaces the
  repository-local `content/posts/` source. A source file
  `characters/nahida.md` has virtual path `posts/characters/nahida.md`. When no
  external root is configured, keep a repository-local fixture/default suitable
  for clean builds and tests.
- Derive a normalized relative virtual path from the configured root. Public
  models and browser data use only that virtual path, never the host source path.
- The blog exposes a validated virtual root `/` containing `/posts/` and
  `/pages/`. Terminal's current directory is `~/blog/posts`, mapped to the
  configured workspace. Virtual absolute operands may begin only from that
  decoded tree; they never address the host filesystem.
- Reject `..` segments, repeated/empty interior segments, backslashes,
  query/fragment markers, control characters, duplicate normalized paths, and
  source entries not reached through a real workspace child or an explicitly
  authored workspace symlink. Accept only one exact optional leading `./` for a
  relative operand and one leading `/` for a virtual absolute operand.
- Keep content framework-neutral: no Astro imports, hydration directives, or
  presentation classes in authored Markdown.

### R1a — Explicit symbolic-link inclusion

- Treat a symbolic link authored inside the Markdown root as an explicit request
  to include its source after validation. The public virtual path is the link's
  location and name inside the notebook, never the resolved host path.
- Support links to one Markdown file or a directory subtree. Resolve every hop,
  reject broken links, cycles, non-file/non-directory targets, unsafe virtual
  names, duplicate/case-colliding public paths, and resolved targets not reached
  through the recursively discovered authored link chain.
- The presence of a symlink inside the owner-controlled workspace is itself the
  explicit inclusion authorization; no second per-target allowlist is required.
  The build wrapper exposes only the workspace and the exact discovered resolved
  targets to its container, read-only. It must not mount a broad home directory
  merely to make absolute links work.
- Traverse and validate source links at build time, then emit only ordinary
  static files. No symlink may survive into site output, assembly artifacts, or
  the Nginx runtime image.
- A link validation failure aborts the build with the safe virtual link path and
  reason; diagnostics must not publish a sensitive resolved host path into the
  browser or final artifacts.

### R2 — Guest projection and identity extension point

- Current publication builds exactly one `guest` projection. Only entries visible
  to `guest` may produce routes, indexes, inert templates, completion candidates,
  tree nodes, sitemap-like outputs, or other public artifacts.
- Define a strict identity/visibility model and a pure projection boundary that
  can later accept `user` or `admin` identities without changing the command,
  tree, or route consumers.
- Extend document front matter with an optional exact access record. Omission is
  equivalent to `{ visibility: public }`; private content requires both
  `{ visibility: private, owner: <subject> }`. Public content cannot name an
  owner. `draft: true` excludes a document before every identity projection.
- The model semantics are: `guest` sees public documents; future
  `user(subject)` sees public documents plus private documents whose owner exactly
  matches the subject; future `admin` sees every non-draft document. The current
  application must invoke only the frozen guest principal—no environment flag or
  browser input may select another identity.
- Do not implement login, sessions, credentials, client-side role switching, or
  runtime authorization in this task.
- Never serialize a hidden entry and then conceal it with CSS or JavaScript.

### R3 — Extensible commands and aliases

- Replace the monolithic command-name switch boundary with a typed, immutable
  command registry whose records own a canonical name, zero or more aliases,
  usage/help metadata, completion behavior, and execution handler.
- Resolve canonical names and aliases deterministically. Reject duplicate names,
  alias collisions, unsafe tokens, and ambiguous registrations before the
  Terminal starts.
- `help`, execution, history echo, error messages, and completion must agree on
  canonical names and aliases. Adding a command must not require editing an
  unrelated central switch in multiple places.
- Preserve the existing pure runtime / DOM-controller separation. A command
  handler returns a closed typed effect and cannot execute a shell, access the
  filesystem, inject HTML, import browser APIs, or construct unchecked URLs.

### R4 — Public tree and nested document commands

- Add `tree` to render the guest-visible virtual Markdown hierarchy in stable,
  deterministic order with recognizable directory/file branches.
- Terminal `pwd` reports `~/blog/posts`. `tree` defaults to the current posts
  workspace. `tree /` renders the full virtual root containing `/posts/` plus the
  guest-visible `/pages/` collection; `tree /posts` and `tree /pages` may narrow
  that same model. Directories sort before files and peers sort by one documented
  code-point rule.
- `tree` must represent only paths available in the current projection and must
  not leak empty private-only directories or source-root information.
- Extend `cat` and completion from flat filenames to validated nested virtual
  paths. Relative `cat ./genshin/characters/nahida.md` resolves from the posts
  workspace; `/posts/genshin/characters/nahida.md` is its virtual absolute form.
  Pages use virtual absolute paths such as `/pages/about.md`. Exact normalization
  and traversal/URL/unknown-root rejection remain mandatory; input is never
  interpreted as a host path.
- Add `vim <virtual-path>.md` with the same guest-only path normalization and
  segment-aware Tab completion as `cat`. It resolves one canonical document
  record, then navigates to that record's permanent route and activates the same
  read-only Vim reader. Raw command input is never concatenated into a URL.
- `vim` rejects private/draft/unknown, broken, traversal, host/unknown-root, URL,
  backslash, ambiguous, and directory-only operands without navigation. Once
  opened, `:q` returns to `/` exactly as it does for a directly opened permalink.
- Existing list, history, clear, Experiment, IME, safe-global-typing, recovery,
  and no-JavaScript contracts remain intact.

### R5 — Path-addressable static document routes

- Generate one canonical static permalink per guest-visible Markdown document,
  preserving its nested virtual path under the owning public collection while
  removing the terminal `.md` extension. For example, virtual
  `posts/genshin/characters/nahida.md` maps to
  `/posts/genshin/characters/nahida/`.
- Generate useful static directory indexes at every guest-visible parent path,
  such as `/posts/`, `/posts/genshin/`, and `/posts/genshin/characters/`.
  Directory indexes expose only the guest projection and provide the destinations
  for permalink breadcrumbs.
- Every canonical route remains directly loadable, JavaScript-free readable, and
  statically generated. Draft/private paths produce no route or browser index.
- Route decoding and `cat` resolve through the same canonical public document
  model; they must not independently reinterpret raw paths.
- Post identity and route derive from the normalized relative workspace path,
  not from a title. Existing post `slug` front matter becomes an optional legacy
  assertion: when present it must equal the current filename stem. Page slugs
  retain their existing contract.
- Define collision behavior for a Markdown file and directory that would map to
  the same route: reject file/directory route collisions, Unicode-normalized and
  case-fold collisions, duplicate aliases, and alias/canonical/directory
  collisions. An `index.md` remains the ordinary `/.../index/` document rather
  than silently becoming its parent directory index. Canonical routes use one
  trailing slash.

### R6 — Explicit permalink path navigation

- Replace the ambiguous permalink command strip with an accessible breadcrumb:
  the Terminal prompt followed by a linked root, linked parent path segments, and
  one unlinked current `<filename>.md` segment.
- The exact visual order for the nested fixture is
  `guest@firefly:~/blog $ / posts / characters / nahida.md`. Do not render
  literal `cd`, `/ /posts`, or glued `/posts`. Root/parents and the current token
  are underlined; only root/parents are links. Separators are not links.
- Each parent destination must have real, useful static semantics; do not emit
  dead breadcrumb links merely to imitate a filesystem.
- For `posts/genshin/characters/nahida.md`, link `/`, `posts`, `genshin`, and
  `characters` to their static destinations and render `nahida.md` as the
  unlinked current item.
- Preserve visible keyboard focus, narrow-screen wrapping, and screen-reader
  labeling.

### R7 — Read-only Vim-like document reader

- Terminal permalinks gain a progressive-enhancement reading mode rather than a
  text editor. The full document remains semantic and readable without
  JavaScript.
- Support a bounded, documented key set: `j` / `k`, `g` / `G`, `/` and `?`
  search, `n` / `N` result navigation, `v` visual-selection mode, `Escape`, and
  `:q`.
- Movement operates on semantic reading units such as headings, paragraphs,
  list items, tables, and code blocks rather than simulated screen pixels or
  individual characters. `v` anchors the current unit; `j` / `k` extend or
  shrink a real browser `Selection` / `Range` so the selected text can be copied.
  `Escape` clears that selection and returns to normal mode.
- The reader must expose mode/status/search feedback accessibly, preserve native
  link and local-scroll behavior, avoid stealing modified keys or text input,
  respect IME and active selections, and honor reduced motion.
- `:q` exits the enhanced reader through a deterministic native destination; its
  destination is `/`, returning to the Terminal home prompt. It does not depend
  on browser history, so a directly opened permalink cannot exit the site.
- Editing, saving, arbitrary ex commands, macros, registers, plugins, shell
  escapes, and full Vim emulation are out of scope.

### R8 — Static publication and compatibility

- Keep the site deployable as immutable static output through the existing M4
  assembler and non-root Nginx image.
- Update exact inventories and route/reference validation for nested routes and
  any new route-owned reader asset.
- Do not add a client router, runtime Markdown parser, remote content fetch, font
  CDN, database, or application server.
- Preserve `/lab/`, NERV mount/404 ownership, security/cache headers, safe
  publication scanning, and deterministic assembly.
- Local images/attachments reached through linked Markdown are intentionally
  deferred to the broader M5 asset migration unless an existing Astro-supported
  reference continues to work unchanged; this task must not silently publish an
  unvalidated arbitrary linked asset tree.

## Acceptance Criteria

- [x] A clean build using the repository fixture and a build using a configured
      nested Markdown root both produce deterministic guest-only public models;
      host absolute paths never occur in output.
- [x] Valid linked Markdown files/directories appear under their link-owned
      virtual paths; broken, cyclic, non-content, colliding, or undiscovered
      targets fail before publication, and no output symlink remains.
- [x] Unsafe, duplicate, case-colliding, route-colliding, escaping, hidden, and
      traversal-derived inputs fail before publication with actionable diagnostics.
- [x] The command registry proves canonical-name/alias execution, help, and
      completion consistency and rejects collisions/unsafe registrations.
- [x] `tree` prints only the guest-visible nested hierarchy in deterministic
      order at desktop and mobile widths; default output is the posts workspace,
      while `tree /` includes the virtual posts/pages mounts.
- [x] `cat <nested/path.md>` and Tab completion open only an exact guest-visible
      document from current-posts-relative or decoded virtual-absolute syntax;
      traversal, host/unknown roots, URLs, hidden paths, and ambiguous candidates
      are not consumed or exposed.
- [x] `vim ./<nested/path.md>` completes from the same guest tree, navigates only
      through the resolved canonical record, enters the permalink reader, and
      returns to `/` through `:q`.
- [x] Every guest document has one directly loadable nested static route derived
      from the shared canonical model; hidden entries have no route or index edge.
- [x] The permalink breadcrumb links root and every meaningful parent, leaves the
      current Markdown filename unlinked, wraps safely, and has visible focus.
- [x] With JavaScript disabled, every document remains complete, semantic, and
      navigable.
- [x] With JavaScript enabled, the bounded Vim keys work across desktop/mobile
      browser projects without breaking links, selection, IME, local scrolling,
      browser shortcuts, search accessibility, or reduced motion.
- [x] `:q` exits to `/` and restores a normal native page
      state without history traps.
- [x] Terminal/package/site checks, content negative tests, full site Playwright,
      publication Playwright, exact assembly, production-shaped container probes,
      Trellis validation, and `git diff --check` pass.
- [x] Focused desktop/mobile screenshots are presented for human review before
      commit or archive.

## Out of Scope

- Real authentication, sessions, per-request authorization, or publishing
  `user` / `admin` projections.
- Editing Markdown in the browser or persisting Vim changes.
- Browser-side browsing of arbitrary host filesystem paths or sources not
  explicitly placed/linked inside the configured Markdown workspace.
- Full M5 migration counts, historical comments, attachment migration, and all
  legacy URL redirects unless separately brought into this task.
- Production rollout, DNS/TLS, or live release switching.
