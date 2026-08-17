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
  readonly group?: TerminalCommandGroup;
  readonly order?: number;
  readonly summary: string;
  readonly usage: string;
  readonly execute: CommandHandler;
  readonly complete?: CompletionHandler;
  readonly pureText?: boolean;
  readonly standalone?: boolean;
  readonly redirect?: 'text' | 'forbidden';
  readonly recoverable?: boolean;
}

type TerminalCommandGroup =
  | 'Explore'
  | 'Read & navigate'
  | 'Identity & time'
  | 'Session'
  | 'Other';

interface TerminalHelpCommand {
  readonly name: string;
  readonly aliases: readonly string[];
  readonly summary: string;
  readonly usage: string;
}

interface TerminalHelpGroup {
  readonly name: TerminalCommandGroup;
  readonly commands: readonly TerminalHelpCommand[];
}

interface TerminalGrepMatch {
  readonly path: string;
  readonly lineNumber?: number;
  readonly line: string;
  readonly ranges: readonly (readonly [number, number])[];
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

type CommandHandlerResult = TerminalEffect | {
  readonly state: TerminalState;
  readonly effect: TerminalEffect;
};

completeCommand(
  input: string,
  entries: readonly TerminalEntry[],
  experiments?: readonly TerminalExperiment[],
  registry?: TerminalCommandRegistry,
  cwd?: string
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
- Neutral migrated `CommandSpec` records in
  `presentations/terminal/src/commands/registry.ts` own safe names/aliases,
  metadata, completion, and explicit pipeline/substitution/redirect policy.
  They execute against `ProcessContext` (`stdin?`, virtual `cwd`, read-only
  `ReadonlyVirtualFs`, immutable session, clock, and signal) and return
  `ProcessResult` (`status`, `stdout`, `stderr`, optional state patch/control
  events, and a neutral value). The runtime registry remains a compatibility
  projection for `executeCommand`/`completeCommand` and custom legacy handlers.
- Registry records are cloned and frozen; names and aliases are safe command
  tokens and globally unique. Metadata is safe text, `usage` starts with the
  canonical name, `execute` is required, and `complete` is optional but must be
  callable. The neutral core specs are the source of truth for `ls`, `cat`,
  `grep`, `cd`, `open`, `vim`, and `clear`; do not add a second built-in switch
  or raw-index dispatch branch.
- `parseRshell` is the authoritative parser for full execution, including
  quoting, substitutions, pipes, and redirects. `tokenizeCommand` is only a
  compatibility adapter for callers that need one simple stage; it delegates to
  `parseRshell` and rejects pipeline/redirect syntax rather than defining a
  second grammar.
- Each neutral `CommandSpec` also owns a frozen argv parser. It separates
  boolean/value options from operands after shell tokenization, accepts short
  option clusters and interspersed options (`grep -i a` equals `grep a -i`),
  honors `--`, and rejects unknown options or bad operand counts before the
  command executor runs.
- Rshell execution resolves an alias to its canonical registry definition before
  dispatch. Neutral commands receive only `ProcessContext`; pipeline position
  is runner policy, not a command boolean. stdout alone reaches the next stage,
  stderr remains separate, non-zero status stops the pipeline, and forbidden
  redirect/substitution/pipeline policies are rejected before execution.
  Compatibility custom handlers may still use the old context until that public
  surface is retired.
- `ReadonlyVirtualFs.list(path)` returns a direct-child `DirectoryListing`:
  `directories` contains only immediate directory names and `documents`
  contains only documents whose parent is `path`. Recursive consumers must
  explicitly traverse `list(...).directories` and enforce their own visited and
  work-limit rules; they must not restore a descendant-document projection to
  make `ls` or grep convenient.
- `shell/runner.ts` is the neutral owner of stage expansion, pipe wiring,
  stderr/status handling, state-patch application, and bounded session scratch
  redirects. Its `runRshellInput` wrapper delegates to `parseRshell`; it must
  not introduce a second tokenizer or expose structured values/control events
  as stdin. Until migration finishes, the runtime may select this runner only
  for the default fully-neutral core path and must preserve custom/legacy
  registry dispatch.
- Neutral session commands receive command metadata and identity through the
  process context. `help` derives grouped rows from that metadata, `pwd` and
  `tree` render the virtual cwd, and `history`/`alias` read the immutable
  session snapshot. A session alias has the exact shape `{ name, target }` and
  is carried by `ReadonlyShellSession.aliases?` and `TerminalState.aliases`; it
  is not persisted. `alias name=command` accepts only safe command tokens,
  rejects built-in name collisions/unknown targets, returns a session state
  patch, and resolves through the active registry before dispatch. `tree` must
  enumerate only public VFS children and filter the hidden `/.rshell` mount
  rather than reconstructing a tree from Terminal entry arrays.
- Neutral handlers return `ProcessResult` and never access the DOM, host
  filesystem, shell, dynamic imports, or unchecked URLs. The compatibility
  adapter is the only place that projects neutral values/control events into
  `TerminalEffect` navigation, document, clear, or structured list/grep output.
- The closed effect union includes structured `help` groups and structured
  `grep` results. `help` carries command metadata for semantic group rendering;
  `grep` carries the original matched line, canonical source path, optional
  one-based line number, bounded match ranges, `noResults`, and `truncated`.
  Plain stdout is derived from those effects only for pipes/substitution; the
  browser renderer creates text nodes and bounded `<mark>` ranges, never HTML
  from command output.
- `completeCommand(..., cwd?, aliases?)` receives the current immutable session
  aliases for command-name and operand completion. The DOM controller prevents
  the default action for every Tab while the prompt is focused, then lets only
  an unmodified non-composing event apply that completion result; page/control
  Tab navigation outside the prompt remains native.
- In a multi-stage Rshell command, every stage still exposes bounded plain
  `stdout` to the next stage. The final `grep` stage may retain its structured
  effect even when it consumed stdin, so a command such as `cat file | grep a`
  receives browser highlighting without changing `grep ... | cat` or
  substitution output.
- `vfs/public-index.ts` is the only adapter from decoded Terminal
  Entry/Document/Experiment arrays to the read-only virtual namespace. It owns
  safe path resolution, stat/list/glob/read behavior, and session scratch
  visibility; neutral commands must not reconstruct virtual paths from raw
  arrays.
- The working directory is immutable session state, initially `~/blog/posts`;
  `cd` updates only that virtual path and the prompt derives from it. All
  relative directory and document completion receives the same current cwd:
  `cd characters` followed by `cat n` completes to `cat nahida.md`, and
  `cd charac` completes to `cd characters/` without changing focus. `tree`
  renders the current public subtree; `tree /` renders `lab/`, `pages/`, and
  `posts/`; `/posts` and `/pages` narrow it. The optional `TerminalTextDocument`
  corpus contains normalized visible title/prose lines from already validated
  public templates; it is never raw Markdown or HTML. Template `<pre>` blocks
  become one document line per source line and retain indentation, blank lines,
  and meaningful spacing. Prose metadata may be normalized to one readable line,
  but a renderer must not flatten a whole source block into one whitespace run.
  Directories precede files and peers use deterministic code-point order.
- `/` is the canonical VFS root and `~/blog` is only its prompt/display alias.
  Directory-mode `resolve('.', '/')` must produce `/` rather than `//.`; after
  `cd ../` from `~/blog/posts`, no-operand `ls` therefore has the same listing
  as `ls /`. Resource-relative documents retain the posts-relative rule, while
  pages continue to require `/pages/<path>.md`.
- When the prompt input is focused, the controller prevents the default action
  for every Tab event, including modifiers and IME/composition events. Only an
  unmodified, non-composing Tab may rewrite input through completion. Safe `cd`
  completion reports only immediate children of the current virtual directory
  and explicitly refocuses the prompt. At the virtual root, `cd ` shows
  `lab/`, `pages/`, and `posts/` rather than nested descendants. Tab outside
  the prompt remains native page/control navigation.
- Entry-list display is an executable operand view, not an internal-path dump:
  posts use cwd-relative paths such as `characters/nahida.md`; pages use virtual
  absolute paths such as `/pages/about.md`. Help and not-found errors state that
  relative paths resolve under posts and pages require `/pages/<path>.md`.
- A standalone `ls` entries effect carries the canonical public `directory` it
  resolved and contains only that directory's immediate children. The browser
  renders directories and documents as one flat shell-style list: directory
  rows come first, followed by direct document rows, with no synthetic `/`
  heading, nested indentation, or directory divider. Document rows keep stable
  name, date, and title columns on wide screens; the mobile layout keeps the
  name/date pair and moves the title below them. The bounded plain `stdout`
  projection remains one deterministic entry per line so pipes and substitutions
  do not consume layout text.
- Direct-listing contract: the structured effect carries immediate
  `directories`; `documents` contains only files whose parent is the current
  directory. Descendant documents do not appear until that directory is
  entered. The plain projection includes the direct directory and document lines
  in deterministic order.
- `ls` accepts at most one safe public/session virtual path operand. Standalone
  listing, exact operands, completion, and bounded `*` matching share the same
  visible-path model: `/` exposes only `lab/`, `pages/`, and `posts/`; public
  mounts expose their immediate directories and decoded documents; and an
  exact visible document such as `ls /pages/about.md` returns a one-entry
  structured listing using the document's parent directory. A unique directory
  prefix completes to its canonical slash-terminated name, while a unique
  document prefix completes without a slash (`ls he` →
  `ls hello-static-foundation.md`); both retain prompt focus. A bounded `*`
  wildcard may match a known public directory or document at the requested
  virtual path depth; it never expands host paths, crosses a path segment, or
  exposes hidden session roots. Multiple matches in one virtual directory are
  aggregated into one deterministic direct-child listing, so `ls *.md` lists
  every matching document instead of treating multiplicity as an error. A
  submitted partial name reports its suggested completion. Public mount aliases `posts`, `pages`, and `lab` accept one
  optional trailing slash and resolve to the same virtual mount as `/posts/`,
  `/pages/`, and `/lab/`. The lab mount lists only the decoded Experiment
  catalog; a listed `/lab/<id>` path does not expose an experiment's host/build
  files and instead reports that the destination should be entered with
  `open lab/<id>`. The browser renders lab entries with the same flat,
  no-marker terminal row treatment as public document listings. Other ambiguous
  command/list completion leaves the input unchanged; prompt Tab is still
  controller-owned.
- The safe empty operand form `ls ` keeps the prompt focused while showing path
  candidates; the command form `ls` itself still completes to `ls `. Ordinary
  ambiguous operands such as `ls p` leave input unchanged and show the
  normalized directory candidates `pages/` and `posts/`, while prompt Tab is
  still prevented by the controller. A unique prefix such as `ls pa` completes
  to `ls pages/`.
- `cat` and `vim` share one resolver and segment-aware completer. Relative paths
  resolve under posts and may have one exact `./`; virtual absolute operands may
  start only `/posts/` or `/pages/`. Hidden/dot/traversal/percent/backslash/URL/
  control/non-NFC/unknown-root/directory operands never resolve or consume Tab.
- `cat` returns a validated `document` effect for trusted template cloning.
  `vim` returns `document-navigation` containing the decoded canonical entry;
  the DOM controller uses `entry.href` directly and never concatenates raw input.
- An inline `cat` stream ends after its trusted document content. It does not
  append a `Return to prompt` control because the active prompt remains directly
  below the stream and receives focus according to the normal document-settlement
  contract.
- Syntactically safe `cat`/`vim` path completion owns the rewrite decision for
  every result count. Unique completion inserts the next segment; ambiguity
  keeps prompt focus and shows candidates with the user's `./` or `/` prefix;
  zero candidates returns a distinct exhaustive `no-match` result, retains
  exact input/focus, and shows bounded `No matches.`. Command/list ambiguity
  and unsafe/control/non-NFC paths do not rewrite the input, but their Tab event
  is still prevented while the prompt is focused.
- Every `ambiguous` completion result uses the same two-line controller
  presentation: the normalized `Matches: ...` line followed by
  `input unchanged by design; type more to complete.`. This is a
  normal multi-candidate state, not an execution error; unique results are the
  only completion state that rewrites the prompt.
- Exact unmodified `Ctrl+C` at the active prompt cancels its input/completion,
  resets history traversal cursor/draft, preserves submitted history/transcript,
  refocuses the prompt, and announces cancellation. Alt/Meta/Shift variants and
  composition remain native.
- Exact unmodified `Ctrl+L` at the active prompt clears the visible command
  transcript through the same presentation path as `clear`, resets the draft and
  completion display, preserves submitted command history for ArrowUp, and
  refocuses the prompt. Alt/Meta/Shift variants and composition remain native.
- The `ls` command definition owns the built-in `l` and `ll` aliases, and the
  `clear` definition owns `cls`; `help`, `alias`, command resolution, and
  completion derive these mappings from the same frozen registry metadata.
  `alias` without an operand lists mappings, while `alias l`, `alias ll`, and
  `alias cls` query one mapping. Safe `alias name=command` creates an
  in-memory session alias; it may resolve only to a known command/alias, is
  visible to help and alias queries, and disappears when the session refreshes.
- `grep` accepts only bounded `-i`, `-n`, and `-F` flags, a safe literal/regular
  subset, and validated public or `/.rshell/tmp` resources. It preserves source
  line boundaries, reports `/posts/...`, `/pages/...`, `/.rshell/tmp/...`, or `-`
  for stdin, and returns a safe no-result effect instead of conflating “no
  matches” with an invalid resource. Resource, scanned-line, match-count, and
  output-size limits remain enforced before rendering.
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
| missing command argv parser or unsafe option definition | neutral registry rejects the command before execution |
| duplicate hardcoded command dispatch or help metadata | implementation review failure; definitions must be the single execution/help source |
| invalid `tree`, `cat`, or `vim` operand | usage/not-found effect or no completion; no host access/navigation |
| direct-child `ls` projection | root and public mounts expose only immediate directory names and documents; descendant documents appear only after entering the child directory |
| mixed-depth `ls` result | keep only immediate children in one flat directory-first list, align document name/date/title columns, and keep pipeline stdout unchanged |
| `ls` option, visible-path prefix, or empty-operand Tab | `-h`/`--help` show usage; a unique safe directory prefix adds `/`, a unique document prefix does not, and either completion retains focus; every Tab is prevented in the focused prompt, while ordinary ambiguous `ls p` leaves input unchanged |
| option ordering/cluster/terminator | the command parser accepts options before or after operands, short clusters such as `-inF`, and `--` for dash-prefixed operands; invalid options stop before execution |
| no-operand directory command at virtual `/` | `.` resolves to `/` exactly once; `ls` equals `ls /` and never reports a `//.` path error |
| nested cwd command | after `cd`, prompt focus remains usable; `ls` renders entries relative to the resolved directory and `cat`/`vim` completion and execution resolve relative operands under that cwd |
| safe ambiguous `cd` completion | leave input unchanged, show immediate child directories only, and retain prompt focus at the virtual root and nested cwd; the focused prompt prevents Tab |
| `ls` wildcard | only bounded `*` matching against known public directory or document paths at the requested segment depth; no match gives a clear bounded diagnostic, while multiple same-directory matches produce one deterministic direct-child listing |
| `ls` mount alias or experiment leaf | `lab`/`lab/` and `/lab`/`/lab/` list the same validated catalog; `/lab/<listed-id>` with or without one trailing slash gives a bounded `open lab/<id>` hint and never reads host/build files |
| `ls` question mark or unsafe/document path | reject `?` and unsafe paths; visible document prefixes and wildcard matches use the same bounded public-path model as directory candidates |
| invalid grep flags/pattern/resource or mixed stdin and operands | bounded error-line effect; no partial grep effect or host access |
| safe grep with no matches | structured `grep` effect with `noResults: true`, empty matches, and a bounded announcement |
| grep match | structured canonical path/line/range data; preserve the original source line |
| final grep stage consumed stdin | retain structured grep rendering; downstream stages still receive deterministic plain stdout |
| source template block with multiple lines | one matchable resource line per source line; indentation/blank lines remain observable |
| safe ambiguous `cat`/`vim` completion | prevent native Tab traversal, retain prompt focus, render prefixed candidates |
| safe zero-result `cat`/`vim` completion | typed `no-match`; prevent traversal, retain exact input/focus, show `No matches.` |
| prompt Tab, including list/command ambiguity, unsafe/control/non-NFC, modifiers, or composition | prevent the default action; only safe unmodified non-composing completion may rewrite input; Tab outside the prompt remains native |
| exact unmodified prompt `Ctrl+C` | clear current input/completion and traversal draft; preserve transcript/history |
| exact unmodified prompt `Ctrl+L` | clear the visible transcript through the `clear` presentation path, reset input/completion, preserve command history, and refocus the prompt |
| built-in `clear` alias | `help`, `alias`, execution, and completion all expose `cls=clear` from the canonical registry definition |
| `ls lab` presentation | render listed experiments as flat no-marker terminal rows with native links and readable titles; preserve catalog navigation |
| inline `cat` stream footer | end at the trusted document content without a redundant `Return to prompt` control; keep the prompt below and focused |
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
- Good: `help` renders sparse semantic groups and `grep -nF "# "` returns
  multiple canonical source lines with bounded highlight ranges; a missing
  pattern produces an explicit no-result state.
- Good: `ls posts` renders `characters/` and the two root-level documents in one
  flat directory-first list, aligns the filename/date/title fields, keeps each
  document row a native canonical link, and collapses only the title column on a
  narrow viewport; it does not render `characters/nahida.md` until
  `ls characters/` is entered.
- Good: `ls charac` completes to `ls characters/` without leaving the prompt;
  `ls cha*` and `ls *cha*` resolve the bounded public directory pattern, while
  `ls --help` explains the accepted path/pattern form.
- Good: `cd charac` completes to `cd characters/` and keeps focus; after
  entering that directory, `ls` renders `nahida.md` under `/` with its date and
  title, and `cat n` completes and reads `nahida.md` relative to the cwd.
- Good: `ls lab/` and `ls /lab/` render the same listed experiment catalog;
  `ls /lab/nerv` and `ls /lab/nerv/` show the bounded `open lab/nerv` guidance
  without traversing the experiment's host files, and the catalog row has no
  default list marker while following the document-list alignment language.
- Good: `grep -i a`, `grep a -i`, and `grep -inF a` share one argv parser;
  `grep -- -pattern` keeps the dash-prefixed value as an operand.
- Good: after `cd ../` reaches `~/blog`, `ls` and `ls /` produce the same
  immediate root mount listing without exposing a synthetic `//.` path.
- Base: omitted `F1REFLY_CONTENT_ROOT` builds the repository fixture; omitted
  `access` is public; JavaScript-disabled permalinks remain normal documents.
- Bad: mount `$HOME`, let Astro follow the authored link directly, serialize all
  documents then hide private ones in the browser, derive a URL from a `vim`
  operand, flatten a `<pre>` block before grep sees it, or keep a second
  built-in dispatch/help switch beside the definitions.

### 6. Tests Required

- Shell: `bash -n`, ShellCheck, shfmt, Node wrapper, exact RO chain mounts,
  write-denial, broad/broken/cycle/FIFO rejection, labels, and cleanup.
- Content Node tests: native and linked files/directories; hidden/unsafe/special/
  broken/cyclic paths; Unicode/case/file-directory collisions; scan-copy race;
  promote rollback; access projection; schema; negative Astro builds.
- Terminal unit tests: exact entry decoder, custom command/alias/help/execute/
  completion, collision rejection, definition-owned default dispatch, shell and
  command argv parser compatibility/order/cluster/`--` behavior, virtual-root
  resolution, structured help/grep effects, preserved multiline
  source lines and safe ranges, exact default/full tree content, executable list
  formatting, flat mixed-depth `ls` rendering plus flat pipeline stdout,
  direct-child list projections and recursive grep discovery, ls prefix/option/
  wildcard execution and empty-operand completion/focus ownership,
  final-pipeline grep effects plus downstream plain stdout, shared nested `cat`/`vim` resolver/completion ownership,
  cwd-relative `cd`/`ls`/`cat` behavior,
  mount aliases, trailing-slash normalization, document-prefix rejection, and
  listed-experiment leaf handling, cancellation state, Ctrl+L transcript
  clearing, built-in `l`/`ll`/`cls` plus session alias resolution/query/output, and
  hostile operand rejection. Multi-match wildcard tests assert a structured
  direct-child listing rather than a multiplicity error.
  They also cover root ambiguous `cd` completion ownership and inline `cat`
  prompt adjacency.
- Site build/static tests: canonical document/directory routes, breadcrumbs,
  exact route-owned scripts/styles/fonts/licenses, guest-only templates/indexes,
  no source/private sentinel, no maps/symlinks/unknown files.
- Site Playwright at `1440x900` and `375x812`: static/no-JS route and breadcrumb
  coverage; tree/cat/vim; grouped-help usage readability; root ambiguous `cd`
  Tab focus; inline `cat` prompt adjacency; Ctrl+C and modifier/IME exclusions;
  safe ambiguous and zero-result path Tab focus plus prompt-wide Tab prevention;
  repeated help settlement; all reader modes/keys; Ctrl+L clear and `ls lab`
  row presentation; Range ownership; reduced motion; overflow and focus.
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

```ts
// Correct: make structured effects the browser boundary; do not split a whole
// source block into a whitespace-normalized string or inject command text.
if (effect.kind === 'grep') {
  appendHighlightedText(lineElement, effectMatch.line, effectMatch.ranges);
}
```

### Design Decision: Definition-Owned Command Execution

**Context**: Help grouping, aliases, execution policy, and built-in behavior had
to evolve together without a second dispatch table drifting out of sync.

**Options Considered**:
1. Keep a built-in name switch plus separate metadata arrays.
2. Store metadata and the actual handler in one registry definition.

**Decision**: Use option 2. Registry creation validates and freezes the complete
definition; all built-ins are definitions, and full Rshell parsing remains in one
parser path. This keeps custom-registry tests representative and makes adding a
command a single bounded change.

**Extensibility**: Add a definition with a safe token, group/order, handler, and
optional completion/policy flags. Do not add a parallel command list or switch.

### Design Decision: Structured Search and Help Effects

**Context**: The browser needed readable grouped help and safe grep highlighting,
while pipelines still need bounded plain text.

**Decision**: Runtime returns closed structured `help`/`grep` effects. The DOM
controller renders text nodes and bounded marks; `stdoutForEffect()` is the only
plain-text projection for Rshell composition.

**Extensibility**: A new structured effect must update the exhaustive runtime
effect union, stdout/announcement projection, DOM renderer, CSS, unit tests, and
browser tests together.

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
