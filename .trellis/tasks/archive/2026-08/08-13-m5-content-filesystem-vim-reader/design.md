# M5 content filesystem and Vim reader — Technical Design

## 1. Boundary and dependency

This is an M5-prelude integration task. M4 must be committed and archived before
implementation begins because the task changes the same Terminal, site,
assembler, container, shell, specification, and exact-inventory surfaces that M4
currently owns.

The work remains one task rather than two children: workspace paths change the
Terminal entry decoder, route model, permalink markup, reader controller, static
inventory, and browser fixtures together. Splitting the reader would force two
overlapping migrations of the same document component and Playwright suite.

## 2. Architecture

```text
owner workspace + authored symlinks
              │
              ▼
host mount planner (`sam`)
  exact root + discovered targets, same absolute paths, read-only
              │
              ▼
content preflight/materializer
  lstat/realpath → virtual paths → link/cycle/collision checks
  → transactional ordinary-Markdown staging
              │
              ▼
Astro collections + strict metadata schema
              │
              ▼
canonical document model ── identity projection (fixed guest build)
       │                    │
       ├── directory routes/breadcrumbs
       ├── document routes/X Core
       ├── Terminal index/tree/cat/templates
       └── static-output/private-leak checks
              │
              ▼
assembled `dist/` → runtime-only Nginx packaging target
```

Astro, Terminal, and the browser never receive the workspace root or resolved
host paths. The publication assembler continues to accept ordinary static files
only and rejects symlinks.

## 3. Workspace ingestion

### 3.1 Configuration and mount transport

- Optional host variable: `FIREFLY_CONTENT_ROOT`.
- Default host root: `<repo>/content/posts`.
- `sam` resolves the root, verifies it is a readable directory, and mounts it at
  the same absolute container path, read-only.
- The shell preflight recursively discovers symlink nodes from the root and from
  linked directory targets. Each resolved target is mounted at its same absolute
  path, read-only. Visited resolved directories bound traversal; broken links and
  hostile path forms stop before Docker starts.
- Only exact discovered roots/targets are mounted. The wrapper never solves link
  access by mounting `/`, `$HOME`, or a broad ancestor.
- `sam` passes the normalized `FIREFLY_CONTENT_ROOT` into the container. Existing
  repo/user/IPC/port/label/teardown contracts remain unchanged.

The shell layer establishes container visibility, not publication validity. The
Node preflight repeats authoritative checks after the container starts.

### 3.2 Scanner and transactional stage

The site owns a framework-neutral scanner/materializer that:

1. walks directory entries through `lstat` in deterministic name order;
2. validates every virtual segment and rejects hidden/control/backslash/dot/
   traversal/query/fragment forms;
3. resolves symlink chains, accepts only regular `.md` files or directories, and
   tracks resolved ancestry to reject cycles;
4. derives the public candidate from the link-owned relative path;
5. rejects exact, Unicode-normalized, case-fold, file/directory-route, and legacy
   alias collisions;
6. copies dereferenced Markdown bytes into a unique ignored candidate stage;
7. validates the complete candidate inventory, then atomically replaces the
   prior generated stage with rollback/cleanup on failure.

Non-Markdown regular files are not public content in this task. Hidden directories
and files are skipped by an explicit documented rule; unsafe symlink targets are
errors rather than silent skips. The stage contains ordinary files only and
mirrors the workspace-relative hierarchy.

Astro's posts collection loads this generated stage with `**/*.md` and an exact
`generateId` that retains the relative Markdown path. Astro's installed glob
loader may follow links, but the generated stage contains none; project safety
does not depend on tinyglobby defaults.

## 4. Canonical document and access model

### 4.1 Access contracts

```ts
type ContentPrincipal =
  | { readonly kind: 'guest' }
  | { readonly kind: 'user'; readonly subject: string }
  | { readonly kind: 'admin' };

type DocumentAccess =
  | { readonly visibility: 'public' }
  | { readonly visibility: 'private'; readonly owner: string };

projectContent(
  documents: readonly CanonicalDocument[],
  principal: ContentPrincipal
): readonly CanonicalDocument[];
```

The strict schema defaults omitted access to public, requires a safe owner for
private, and rejects owner on public. Draft filtering runs first. The production
site imports a frozen `GUEST_PRINCIPAL`; identity is not selected by environment,
URL, storage, serialized data, or command input. `user` and `admin` branches exist
only as pure future-facing model behavior and tests.

### 4.2 Post paths and routes

For staged `characters/nahida.md`:

| Field | Value |
| --- | --- |
| collection | `posts` |
| virtual Markdown path | `posts/characters/nahida.md` |
| relative post path | `characters/nahida.md` |
| route path | `/posts/characters/nahida/` |
| directory routes | `/posts/`, `/posts/characters/` |
| current filename | `nahida.md` |

Post route identity derives from the normalized staged ID. Optional legacy post
`slug` must equal the filename stem; it cannot override a directory or route.
Pages retain the existing schema/slug route in this task and enter the same
canonical model as `pages/<slug>.md`.

Before route generation, build a reserved route table containing every document,
every guest-visible directory, and every alias. Reject:

- file `a.md` plus directory `a/`;
- case-fold or Unicode-normalized path equality;
- duplicate canonical routes or aliases;
- an alias equal to any canonical document/directory route;
- noncanonical trailing-slash/query/fragment forms.

`index.md` maps to `/.../index/`; directory indexes are generated independently.

## 5. Directory tree and navigation

One immutable tree derives only from the guest canonical model:

```ts
interface ContentDirectory {
  readonly kind: 'directory';
  readonly name: string;
  readonly virtualPath: string;
  readonly href: string;
  readonly children: readonly (ContentDirectory | ContentFile)[];
}
```

Directories sort before files; peers use Unicode code-point order over normalized
names. Empty private-only ancestors are absent. The frozen Terminal identity uses
`~/blog/posts` as its working directory; `/` below is a virtual blog root, never
the host root.

- `tree` renders the current `/posts` workspace without an extra `posts/` wrapper.
- `tree /` renders the virtual root (`posts/`, `pages/`).
- `tree /posts` / `tree /pages` render one explicit mount.
- `cat characters/nahida.md` and `cat ./characters/nahida.md` resolve relative to
  `/posts`; `cat /posts/characters/nahida.md` resolves the same canonical file.
- `cat /pages/about.md` resolves a page through the same virtual tree.
- Completion walks directory segments, returns directory candidates with a
  trailing slash, consumes Tab only when unique, and never completes hidden,
  unknown virtual roots, host paths, traversal, URL, backslash, or ambiguous
  input. It preserves the user's relative/absolute spelling.
- Existing `ls posts|pages|lab` and Experiment behavior remain supported.

Directory routes use semantic static HTML: heading, current path, immediate child
directory/document lists, native links, empty-state protection, home link,
sequential headings, readable measure, and no JavaScript.

## 6. Command registry and aliases

Replace the command switch with a code-defined registry:

```ts
interface TerminalCommandDefinition {
  readonly name: string;
  readonly aliases: readonly string[];
  readonly summary: string;
  readonly usage: string;
  readonly execute: CommandHandler;
  readonly complete?: CompletionHandler;
}

createTerminalCommandRegistry(
  definitions: readonly TerminalCommandDefinition[]
): TerminalCommandRegistry;
```

Creation validates safe tokens and rejects duplicate canonical names, duplicate
aliases, and name/alias collisions. It clones/freezes definitions and exposes
lookup, ordered help, execution, and completion through readonly methods. The
default registry contains current commands plus `tree` and `vim` and ships no surprising
aliases. Unit fixtures register a custom command with an alias and prove that
help, execution, usage, history echo, and completion stay consistent.

Handlers receive only frozen command context (state, canonical guest entries,
tree, experiments, identity, clock) and return the existing closed effect family
plus a structured tree effect if needed. They cannot access DOM/filesystem/shell,
parse HTML, dynamically import code, or construct unchecked navigation.

`vim` and `cat` share one path resolver and completion provider. `cat` returns a
closed inline-document effect; `vim` returns a closed document-navigation effect
containing the already decoded canonical document route. The DOM controller uses
that route directly. It never constructs a destination from the operand.

`vim ./characters/nahida.md` therefore navigates to
`/posts/characters/nahida/`; `vim /pages/about.md` navigates to
`/pages/about/`. Direct permalink entry and command entry load the identical
reader controller and both exit to `/` through `:q`.

## 7. Permalink breadcrumb

Terminal document routes render a native breadcrumb navigation. For the example:

```text
guest@firefly:~/blog $ / posts / characters / nahida.md
                       └links───────────┘  └underlined current text┘
```

- `/` links to Terminal home.
- `posts` and every parent link to its real directory index.
- separators are presentation text with `aria-hidden` where appropriate; root
  owns its `/` token, so no extra separator creates `/ /posts` or `/posts`.
- the current Markdown filename is underlined `aria-current="page"` text, not a
  self-link.
- the navigation owns one descriptive label and an ordered list in the
  accessibility tree; CSS supplies terminal-like inline appearance, wrapping,
  underline-only link affordance, and existing semantic focus tokens.

The titlebar path and article metadata consume the same canonical model; literal
`cd` and the old synthetic `/ / post/...` string are removed.

## 8. Read-only Vim progressive enhancement

### 8.1 Ownership and modes

Only canonical Terminal document routes load `terminal-reader.ts`. Directory
indexes, semantic documents, Terminal home, `/lab/`, and NERV do not. Without
JavaScript, the entire semantic document and breadcrumb remain readable.

The controller owns four local modes:

- `normal`: reader region owns active semantic unit;
- `visual`: a real Selection/Range is anchored to a unit;
- `search`: a visible native labeled input owns `/` or `?` query entry;
- `command`: a visible native labeled input owns ex input; only `:q` is valid.

Mode, active-unit position, search direction/query/result count, and errors are
shown in a compact status line and announced through a polite atomic live region.
No state is persisted across routes.

### 8.2 Semantic movement and selection

The document component identifies stable reading units (headings, paragraphs,
list items, blockquotes, pre/code regions, tables, and other top-level rendered
blocks) without adding them all to Tab order. The reader region keeps focus and
uses active-descendant/status semantics.

- `j` / `k`: next/previous unit.
- `g` / `G`: first/last unit, matching the owner's approved bounded key set.
- `v`: enter visual mode at current unit.
- visual `j` / `k`: extend or shrink a real Range between unit boundaries.
- `Escape`: cancel search/command/visual state and clear owned selection.

Movement scrolls the target into a useful reading band, is interruptible, and is
immediate under reduced motion. It never creates a nested document scroller.

### 8.3 Search and command input

- `/` opens forward search; `?` opens backward search.
- Enter commits a literal, case-insensitive text query; empty input cancels.
- `n` repeats in the current direction; `N` reverses it.
- Search reports no-results explicitly. Matching/navigation is authoritative;
  visual highlighting is capability-gated and may use CSS Highlights with a
  real-selection fallback without rewriting Markdown DOM.
- `:` opens the command input. `:q` plus Enter navigates directly to `/`.
  Unsupported commands remain on the page with a clear bounded error.

The controller ignores modified keys, composition/IME, native/editable targets,
links, local-scroll regions, browser-owned selections it did not create, and
unsupported keys. Tab order, browser shortcuts, page zoom, native Back, touch
scrolling, link activation, and assistive-technology commands remain native.

## 9. Publication and runtime packaging

Local/default builds and `dev.sh` use the workspace-aware `sam` path. Assembly
still produces an immutable root `dist/` with a deterministic manifest and no
source paths, private sentinels, or symlinks.

The Dockerfile gains a runtime-only target that copies an already validated root
publication, while retaining the source-building target for the repository
fixture. A root packaging delegate performs:

1. workspace-aware M5 build and assembly through `sam`;
2. publication manifest/inventory validation;
3. runtime-only image build from that exact root `dist/`;
4. existing Nginx route/header/404/non-root/read-only probes and teardown.

This prevents external or private authoring sources from entering Docker build
context/history. The final image contains only guest static output. M6 may build
deployment automation on this packaging seam; no live rollout happens here.

## 10. Compatibility and rollback

- Existing flat fixture posts keep their URLs because filenames match their
  current slugs.
- Pages, `/lab/`, NERV, X Core adapter selection, presentation isolation, theme,
  font/license assets, reduced motion, recovery, and safe global Terminal-home
  typing remain compatible.
- Generated workspace stages, Playwright output, and root release artifacts stay
  ignored and are transactionally replaceable.
- Rollback is source-level: revert this task to restore flat slug routes and the
  M4 18-file baseline. No database or irreversible migration is performed.
- Linked source files/directories are read-only and are never changed, moved, or
  copied back by the build.

## 11. UI direction

The approved `research/ui-ux-pro-max.md` decisions apply: extend phosphor semantic
tokens and self-hosted JetBrains Mono, preserve content-first HTML, use native
breadcrumbs/inputs, visible focus and status, controlled measure, mobile wrapping,
predictable escape routes, and reduced-motion behavior. Do not introduce a new
font, theme picker, third-party editor, canvas terminal, or marketing chrome.
