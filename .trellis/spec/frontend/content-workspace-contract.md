# Content Workspace, Virtual Filesystem, and Reader Contract

## Scenario: Workspace-Backed Static Content

### 1. Scope / Trigger

Use this contract whenever changing the Markdown posts root, symbolic-link
handling, content materialization, access metadata, canonical document paths,
directory routes, Terminal document commands, or the read-only document reader.

The repository publishes one static `guest` projection. A configured host
workspace and any linked targets are authoring inputs only: host paths, hidden
documents, and symlinks must not cross into Astro's content model, browser data,
the assembled release, or the runtime image.

### 2. Signatures

Build and packaging entry points:

```bash
F1REFLY_CONTENT_ROOT=/absolute/notebook/posts ./sam npm --prefix apps/site run build:workspace
F1REFLY_CONTENT_ROOT=/absolute/notebook/posts ./sam npm run build:m5
./sam npm run check:m5
./sam npm run test:m5
./sam npm run build:m5
./package-runtime.sh
```

Materialization and access:

```js
scanMarkdownWorkspace(sourceRoot): Promise<readonly ScannedMarkdownFile[]>
materializeMarkdownWorkspace(options?: {
  sourceRoot?: string;
  targetRoot?: string;
  beforeCopy?: () => Promise<void> | void;
  beforePromote?: () => Promise<void> | void;
}): Promise<readonly string[]>

projectContentForPrincipal(documents, principal): readonly CanonicalDocument[]
```

Canonical content:

```ts
type ContentPrincipal =
  | { readonly kind: 'guest' }
  | { readonly kind: 'user'; readonly subject: string }
  | { readonly kind: 'admin' };

interface CanonicalDocument {
  readonly entry: PublicDocumentEntry;
  readonly collection: 'posts' | 'pages';
  readonly relativePath: string;
  readonly virtualPath: string;
  readonly filename: `${string}.md`;
  readonly href: string;
  readonly directoryHrefs: readonly string[];
  readonly breadcrumbs: readonly CanonicalBreadcrumb[];
  readonly aliases: readonly string[];
}

getCanonicalContent(): Promise<CanonicalContent>
projectContent(
  documents: readonly CanonicalDocument[],
  principal: ContentPrincipal
): readonly CanonicalDocument[]
```

Terminal command extension point:

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
): TerminalCommandRegistry

executeCommand(options: {
  state: TerminalState;
  input: string;
  entries: readonly TerminalEntry[];
  experiments?: readonly TerminalExperiment[];
  documents?: readonly TerminalTextDocument[];
  identity?: TerminalIdentity;
  now?: () => Date;
  registry?: TerminalCommandRegistry;
}): CommandResult

interface TerminalTextDocument {
  readonly virtualPath: TerminalEntry['virtualPath'];
  readonly lines: readonly string[];
}

completeCommand(
  input: string,
  entries: readonly TerminalEntry[],
  experiments?: readonly TerminalExperiment[],
  registry?: TerminalCommandRegistry
): CompletionResult

startTerminalReader(root: HTMLElement): void
```

### 3. Contracts

#### Workspace transport and materialization

- `F1REFLY_CONTENT_ROOT` is optional. It defaults to `<repo>/content/posts` and,
  when set, must be an absolute readable directory.
- `sam` mounts the resolved root and every recursively discovered symlink hop and
  final target at the same absolute container path, read-only. It rejects `/`, a
  broad system/home ancestor, a repository ancestor, broken/cyclic links, and
  targets other than regular files or directories. It never mounts an entire
  home directory merely to satisfy one link.
- The Node scanner is the publication authority. It walks deterministically,
  skips hidden ordinary entries, rejects hidden/unsafe linked paths, and accepts
  only ordinary `.md` files. Linked regular non-Markdown files, FIFOs, sockets,
  devices, broken links, cycles, and unsafe virtual names are errors.
- Public identity is the link-owned path below the workspace. A link to
  `/host/secret/location/note.md` at `characters/note.md` becomes only
  `posts/characters/note.md`; the resolved host path is never serialized.
- Path collision keys use NFC input validation and an NFKC/case fold that also
  equates `ß` with `ss` and final sigma with sigma. Exact, case/Unicode, and
  file-versus-directory-route collisions abort the build.
- Scan-to-copy is race checked. Each source is opened with `O_NOFOLLOW`; the
  opened file must remain a regular file with the scanned device/inode before
  its bytes are copied.
- Materialization writes a unique candidate below
  `apps/site/.generated-content/`, then atomically promotes it. A copy or promote
  failure removes the candidate and restores the prior stage. The resulting
  tree contains ordinary Markdown files and no symlinks.
- Every Astro command that reads posts runs `prepare:content` first. The posts
  collection loads only `.generated-content/posts/**/*.md`; authored workspace
  paths are not an Astro loader base.

#### Metadata, projection, and canonical routes

- `access` is an exact discriminated union: omitted means
  `{ visibility: 'public' }`; private requires a safe non-empty `owner`; public
  cannot carry an owner. Unknown keys are rejected.
- Projection is draft-first. `guest` sees public documents; future
  `user(subject)` additionally sees private documents owned by the exact subject;
  future `admin` sees every non-draft document. Production calls only the frozen
  `GUEST_PRINCIPAL`; environment variables, URLs, storage, and browser input do
  not select identity.
- Post identity derives from the staged relative Markdown path. Optional legacy
  post `slug` must equal the current filename stem and cannot override a route.
  Pages remain repository-local and use `pages/<slug>.md` in this milestone.
- `posts/characters/nahida.md` maps to
  `/posts/characters/nahida/`; its directory routes are `/posts/` and
  `/posts/characters/`. `index.md` remains `/.../index/` rather than replacing
  its directory index.
- The single canonical model owns virtual path, permalink, directory tree,
  breadcrumbs, aliases, Terminal entries, templates, and route generation.
  Consumers do not reinterpret raw collection IDs or operands.
- The route reservation table includes `/`, every directory, document, and
  alias. All routes are canonical trailing-slash paths and reject case/Unicode,
  file/directory, canonical/alias, and duplicate-alias collisions.
- Directory indexes list only immediate guest-visible children. Private-only
  branches do not create empty directories, routes, templates, completion
  candidates, or tree nodes.
- Terminal permalinks render the exact token order
  `guest@f1refly:~/blog $ / posts / characters / nahida.md` for the nested
  fixture. The root and every parent are native underlined links; the current
  filename is underlined non-link `aria-current="page"` text. Separators are
  presentation-only. Visible whitespace uses explicit non-collapsible `1ch` flex
  gap elements rather than leading/trailing text spaces. Literal `cd`, `/ /posts`,
  glued `/posts`, and a self-link on the current document are invalid.

#### Terminal registry and virtual filesystem

- A `TerminalEntry` contains exactly `kind`, `virtualPath`, `relativePath`,
  `filename`, `title`, `href`, and `date`. Its href must equal the route derived
  from its virtual `.md` path. The descriptor-safe decoder rejects accessors,
  sparse/decorated arrays, unknown fields, hidden/dot/traversal/percent/
  backslash/non-NFC paths, noncanonical hrefs, and folded path collisions.
- Command definitions are cloned and frozen at registry creation. Names and
  aliases are safe command tokens; every token is globally unique. Metadata is
  safe text, `usage` starts with the canonical name, `execute` is required, and
  `complete` is optional but must be callable.
- `help`, execution, and completion resolve through the active registry supplied
  to `executeCommand`/`completeCommand`. A custom registry and aliases therefore
  require no unrelated switch edit. There is no runtime plugin loader.
- Rshell execution resolves an alias to its canonical registry definition before
  dispatch. Custom definitions receive only immutable state, public entries,
  declared stdin, identity/clock, and `piped`/`stdinProvided` flags; their text
  effects can participate in pipelines and `pureText: true` definitions can
  participate in bounded substitution. Non-text effects are rejected in a
  pipeline or substitution instead of being coerced into navigation or DOM
  behavior.
- Handlers are pure and return only the closed `TerminalEffect` union. They do
  not access the DOM, filesystem, shell, dynamic imports, or unchecked URLs.
- The working directory is immutable session state, initially `~/blog/posts`;
  `cd` updates only that virtual path and the prompt derives from it. `tree`
  renders the current public subtree; `tree /` renders `lab/`, `pages/`, and
  `posts/`; `/posts` and `/pages` narrow it. The optional `TerminalTextDocument`
  corpus contains normalized visible title/prose lines from already validated
  public templates; it is never raw Markdown or HTML.
  Directories precede files and peers use deterministic code-point order.
- Entry-list display is an executable operand view, not an internal-path dump:
  posts use cwd-relative paths such as `characters/nahida.md`; pages use virtual
  absolute paths such as `/pages/about.md`. Help and not-found errors state that
  relative paths resolve under posts and pages require `/pages/<path>.md`.
- `cat` and `vim` share one resolver and segment-aware completer. Relative paths
  resolve under posts and may have one exact `./`; virtual absolute operands may
  start only `/posts/` or `/pages/`. Hidden/dot/traversal/percent/backslash/URL/
  control/non-NFC/unknown-root/directory operands never resolve or consume Tab.
- `cat` returns a validated `document` effect for trusted template cloning.
  `vim` returns `document-navigation` containing the decoded canonical entry;
  the DOM controller uses `entry.href` directly and never concatenates raw input.
- Syntactically safe `cat`/`vim` path completion owns Tab for every result count.
  Unique completion inserts the next segment; ambiguity keeps prompt focus and
  shows candidates with the user's `./` or `/` prefix; zero candidates returns a
  distinct exhaustive `no-match` result, retains exact input/focus, and shows
  bounded `No matches.`. Command/list ambiguity, unsafe/control/non-NFC paths,
  modified Tab, and IME-composed Tab remain native.
- Exact unmodified `Ctrl+C` at the active prompt cancels its input/completion,
  resets history traversal cursor/draft, preserves submitted history/transcript,
  refocuses the prompt, and announces cancellation. Alt/Meta/Shift variants and
  composition remain native.
- Non-document command output settles from the current record start while keeping
  the fresh prompt focused and visible when viewport geometry permits. Document
  output still settles its title. Motion is smooth normally and immediate under
  reduced motion; repeated prior transcript must not clip the new output's first
  line at the viewport top.
- A non-document settlement measures the record-to-prompt span before scrolling:
  it uses the record start when both fit in the viewport, otherwise it scrolls
  the fresh prompt to the viewport end. This responsive fallback is required at
  the mobile profile as well as desktop.

#### Read-only Vim reader

- Only Terminal document routes load `terminal-reader.ts`. Static HTML remains
  complete and navigable without JavaScript; directory indexes, semantic
  documents, home, lab, and NERV do not load the reader asset.
- The reader owns local `normal`, `visual`, `search`, and `command` modes. Its
  bounded keys are `j`, `k`, `g`, `G`, `/`, `?`, `n`, `N`, `v`, `Escape`, and
  `:q`. It is a reader, not an editor.
- Movement uses semantic top-level reading units and scrolls the active unit to
  a centered reading band; reduced motion changes smooth scrolling to immediate.
- Visual mode owns a real `Range` only while the browser selection has exactly
  the same boundaries. A user-replaced selection is never cleared or captured.
- Search uses labeled native input, literal case-insensitive text matching,
  wraparound `n`/`N`, and optional CSS Highlights without rewriting content.
  Command mode accepts only `q`; successful `:q` navigates deterministically to
  `/` and does not depend on history.
- Key handling preserves composition/IME, modifiers, unsupported keys, native
  controls, links, editables, media controls, standard ARIA widgets/containers,
  local-scroll regions, and user-owned selections. Generated reading-unit IDs
  must avoid every existing document ID.

### 4. Validation & Error Matrix

| Condition | Required result |
| --- | --- |
| relative, missing, unreadable, broad, or repository-ancestor workspace root | `sam` fails before Docker with a bounded diagnostic |
| broken/cyclic chain, broad hop, or special linked target | wrapper/materializer fails; no build or partial stage |
| hidden/unsafe/non-NFC path or Unicode/case/file-directory collision | materialization/canonical build fails naming only the virtual path |
| source changes to a symlink or different inode after scan | `Content source changed during materialization`; prior stage restored |
| private entry without owner, public entry with owner, or unknown access key | schema failure |
| draft/private guest entry | valid authored input but absent from every public artifact |
| legacy post slug differs from filename stem | canonical-model build failure |
| alias collides with root, directory, document, or alias | route-reservation build failure |
| permalink breadcrumb contains `cd`, duplicate/glued slash, dead parent, or current self-link | static/browser failure |
| breadcrumb normalized text is correct but gap boxes collapse to zero | browser geometry failure at both viewports |
| accessor, sparse input, unknown field, unsafe Terminal path | decoder `TypeError` before shell reveal |
| command token/alias collision or invalid metadata/handler | registry `TypeError` at creation |
| invalid `tree`, `cat`, or `vim` operand | usage/not-found effect or no completion; no host access/navigation |
| safe ambiguous `cat`/`vim` completion | prevent native Tab traversal, retain prompt focus, render prefixed candidates |
| safe zero-result `cat`/`vim` completion | typed `no-match`; prevent traversal, retain exact input/focus, show `No matches.` |
| list/command ambiguity, unsafe/control/non-NFC/modified/composing Tab | preserve native Tab behavior |
| exact unmodified prompt `Ctrl+C` | clear current input/completion and traversal draft; preserve transcript/history |
| long help after prior output | first new record line not top-clipped; fresh prompt usable/visible when geometry permits |
| JavaScript unavailable or reader startup cannot initialize | full document/breadcrumb remains usable |
| protected reader target, IME, modifier, or user-owned selection | preserve native behavior; no reader movement/mode takeover |
| unsupported ex command | stay on document and announce bounded error |
| `:q` | navigate to `/` exactly |

### 5. Good / Base / Bad Cases

- Good: an authored `characters/nahida.md` or linked Markdown subtree is copied
  as ordinary files, guest-projected, listed by `tree`, completed by `cat`/`vim`,
  routed under `/posts/characters/`, and published without a host path.
- Good: a test-only custom command with alias is visible in active-registry help,
  executes through either token, and completes without changing default logic.
- Base: omitted `F1REFLY_CONTENT_ROOT` builds the repository fixture; omitted
  `access` is public; JavaScript-disabled permalinks remain normal documents.
- Bad: mount `$HOME`, let Astro follow the authored link directly, serialize all
  documents then hide private ones in the browser, derive a URL from a `vim`
  operand, or implement Vim by cancelling every keydown.

### 6. Tests Required

- Shell: `bash -n`, ShellCheck, shfmt, Node wrapper, exact RO chain mounts,
  write-denial, broad/broken/cycle/FIFO rejection, labels, and cleanup.
- Content Node tests: native and linked files/directories; hidden/unsafe/special/
  broken/cyclic paths; Unicode/case/file-directory collisions; scan-copy race;
  promote rollback; access projection; schema; negative Astro builds.
- Terminal unit tests: exact entry decoder, custom command/alias/help/execute/
  completion, collision rejection, exact default/full tree content, executable
  list formatting, shared nested `cat`/`vim` resolver/completion ownership,
  cancellation state, and hostile operand rejection.
- Site build/static tests: canonical document/directory routes, breadcrumbs,
  exact route-owned scripts/styles/fonts/licenses, guest-only templates/indexes,
  no source/private sentinel, no maps/symlinks/unknown files.
- Site Playwright at `1440x900` and `375x812`: static/no-JS route and breadcrumb
  coverage; tree/cat/vim; Ctrl+C and modifier/IME exclusions; safe ambiguous and
  zero-result path Tab focus plus native unsafe/list Tab; repeated help settlement; all reader
  modes/keys; Range ownership; reduced motion; overflow and focus.
- External workspace E2E: native Markdown plus chained file/directory links,
  exact read-only mounts, built routes, zero stage symlinks, no private or host
  path in output, then restore the default build.
- Publication/container: exact manifest/release/image inventory, nested routes,
  canonical redirects, distinct site/NERV 404s, security and immutable reader/
  font headers, non-root/read-only confinement, and exact teardown.

### 7. Wrong vs Correct

#### Wrong

```bash
docker run -v "$HOME:$HOME:ro" ...
```

```ts
window.location.assign(`/posts/${rawVimOperand.replace('.md', '')}/`);
const publicDocuments = allDocuments; // hide private entries later with CSS
```

#### Correct

```text
sam: exact configured root + recursively discovered link hops/targets, all RO
materializer: lstat/realpath -> O_NOFOLLOW inode check -> candidate -> promote
Astro/browser/publication: ordinary guest-projected files and virtual paths only
```

```ts
const result = executeCommand({ state, input, entries, registry });
if (result.effect?.kind === 'document-navigation') {
  window.location.assign(result.effect.entry.href);
}
```

## Reference Files

- `sam`
- `apps/site/scripts/materialize-content.mjs`
- `apps/site/src/content.config.ts`
- `apps/site/src/lib/content-schema.mjs`
- `apps/site/src/lib/content-access.mjs`
- `apps/site/src/lib/content.ts`
- `presentations/terminal/src/runtime.ts`
- `apps/site/src/scripts/terminal-home.ts`
- `apps/site/src/scripts/terminal-reader.ts`
- `apps/site/src/pages/posts/index.astro`
- `apps/site/src/pages/posts/[...path].astro`
- `apps/site/src/pages/pages/index.astro`
- `apps/site/src/components/ContentDirectoryIndex.astro`
- `apps/site/src/components/TerminalDocument.astro`
- `package-runtime.sh`
