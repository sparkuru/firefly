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
FIREFLY_CONTENT_ROOT=/absolute/path/to/blog ./sam npm --prefix apps/site run build:workspace
FIREFLY_CONTENT_ROOT=/absolute/path/to/blog ./sam npm run build:m4
./sam npm run check:m4
./sam npm run test:m4
./sam npm run build:m4
./verify.sh
./package-runtime.sh

cp config.dev.example config.dev
```

Materialization and access:

```js
scanMarkdownWorkspace(sourceRoot, options?: {
  collection?: 'posts' | 'pages';
  policyRoot?: string | null;
  policyPrefix?: readonly string[];
  policyContext?: FireflyIgnorePolicyContext;
}): Promise<readonly ScannedMarkdownFile[]>
materializeMarkdownWorkspace(options?: {
  sourceRoot?: string;
  targetRoot?: string;
  policyRoot?: string | null;
  policyContext?: FireflyIgnorePolicyContext;
  beforeCopy?: () => Promise<void> | void;
  beforePromote?: () => Promise<void> | void;
}): Promise<readonly string[]>

interface FireflyIgnorePolicyContext {
  readonly rootPath: string;
  readonly rootPolicy: unknown;
}

scanContentWorkspace(sourceRoot?: string): Promise<{
  readonly posts: readonly ScannedMarkdownFile[];
  readonly pages: readonly ScannedMarkdownFile[];
}>
materializeContentWorkspace(options?: {
  sourceRoot?: string;
  targetRoot?: string;
  beforeCopy?: () => Promise<void> | void;
  beforePromote?: () => Promise<void> | void;
}): Promise<{
  readonly posts: readonly string[];
  readonly pages: readonly string[];
}>

projectContentForPrincipal(documents, principal): readonly CanonicalDocument[]
```

Canonical content:

```ts
type ContentPrincipal =
  | { readonly kind: 'guest' }
  | { readonly kind: 'user'; readonly subject: string }
  | { readonly kind: 'admin' };

interface ContentMarker {
  readonly id: string;
  readonly label: string;
  readonly tone: string;
}

interface CanonicalDocument {
  readonly entry: PublicDocumentEntry;
  readonly collection: 'posts' | 'pages';
  readonly relativePath: string;
  readonly virtualPath: string;
  readonly filename: `${string}.md`;
  readonly displayName: string;
  readonly href: string;
  readonly directoryHrefs: readonly string[];
  readonly breadcrumbs: readonly CanonicalBreadcrumb[];
  readonly aliases: readonly string[];
  readonly markers: readonly ContentMarker[];
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
  /** Present only when this row is non-matching context. */
  readonly context?: true;
  /** Present only when a `--` separator precedes this row. */
  readonly separatorBefore?: true;
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
  friendLinks?: readonly TerminalFriendLink[];
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

- `FIREFLY_CONTENT_ROOT` is optional. It defaults to the blog root
  `<repo>/content`, which must contain readable `posts/` and `pages/` children.
  `sam` and `dev.sh` load the ignored `config.dev` shell defaults file when it
  exists; explicit environment variables take precedence. When configured, the
  value must name an absolute readable blog root with the same shape.
- `verify.sh` is the deterministic repository-fixture entry point. It fixes the
  tracked `<repo>/content` root before `sam` loads `config.dev`; its inner
  `verify:m51` command uses `/app/content` for every phase and runs the complete
  non-browser and browser gate. The explicit owner-workspace `build:workspace`
  command remains an authoring check and is not fixture evidence.
- `sam` mounts the resolved root and every recursively discovered symlink hop and
  final target below only the `posts/` and `pages/` source trees at the same
  absolute container path, read-only. It rejects `/`, a broad system/home
  ancestor, a repository ancestor, broken/cyclic links, and targets other than
  regular files or directories. It never mounts an entire home directory merely
  to satisfy one link.
- The Node scanner is the publication authority. It walks deterministically,
  skips hidden ordinary entries, rejects hidden/unsafe linked paths, and accepts
  only ordinary `.md` files with content. Zero-byte `.md` placeholders are
  ignored as non-articles; linked regular non-Markdown files, FIFOs, sockets,
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
  `apps/site/.generated-content/`, copies both collections, then atomically
  promotes one complete stage. A copy or promote failure removes the candidate
  and restores the prior stage. The resulting `posts/` and `pages/` trees
  contain ordinary Markdown files and no symlinks.
- The generated stage keeps source Markdown content but applies the legacy body
  compatibility rule that demotes ATX `# ` headings outside fenced code blocks
  to `## `; the document title owns the rendered h1. New authored documents
  should write body headings from level two and do not rely on this migration
  rule.
- A non-empty Markdown source with absent front matter or an empty first
  front-matter block receives compatibility metadata only in the generated
  stage. The fallback uses the physical filename stem for `title` and
  `description`, the source mtime's UTC calendar date for `date`, `draft: false`,
  `post`/`page` layout by collection, and a normalized filename slug for pages.
  Authored sources are never rewritten by this build fallback. Zero-byte
  Markdown placeholders remain ignored, while malformed or partially authored
  front matter remains an error for the normal schema pipeline.
- An optional `.fireflyignore` at the blog root and in safe nested directories
  is the only source-path publication filter. Root patterns receive logical
  `posts/...` or `pages/...` paths; a nested policy receives paths relative to
  its containing directory. Rules are ordered Gitignore patterns, and the
  nearest lower-directory policy overrides inherited matches only when the
  parent directory is not blocked. A blocked parent cannot be re-included by a
  descendant negation.
- The scanner loads `.fireflyignore` as a regular control file, rejects a
  symlinked, special, unreadable, undecodable, or malformed policy with its
  logical policy path and line where available, and never materializes the
  control file. `.gitignore`, global Git excludes, and repository state have no
  publication effect. Attachments remain outside this Markdown-only filter and
  are deferred.
- Policy decisions occur after Markdown type/empty-file and link-safety checks
  but before collision reservation and inventory insertion. Excluded files and
  directories therefore reserve no public path or route, while included files
  retain their source-relative identity and existing race-safe copy behavior.
- Every Astro command that reads content runs `prepare:content` first. The posts
  and pages collections load only `.generated-content/{posts,pages}/**/*.md`;
  authored workspace paths are not Astro loader bases.
- `node apps/site/scripts/blog-meta.mjs <path-to-markdown>` is the host-side
  authoring boundary for normalizing front matter. It defaults to a contained
  save-as below the selected blog root; `--write-back` is explicit, and
  `--preview` performs no write. It may use `--blog-root` or the configured
  content-root convention, but it is not run through the read-only `./sam`
  build mount for source editing.

#### Metadata, projection, and canonical routes

- `access` is an exact discriminated union: omitted means
  `{ visibility: 'public' }`; private requires a safe non-empty `owner`; public
  cannot carry an owner. Unknown keys are rejected.
- The optional strict `firefly` metadata namespace contains an ordered
  `markers` list of safe NFC-normalized lowercase kebab-case identifiers.
  Duplicate identifiers are reduced to their first declaration. Unknown but
  safe identifiers remain accepted metadata for a future checker, but ordinary
  builds resolve only registry-supported descriptors and render no effect for
  unsupported IDs. The current supported marker is `featured`; its label and
  presentation tone come from the site registry, never from authored HTML/CSS.
- `firefly.markers` is presentation/editorial metadata only. It cannot publish
  drafts, bypass `access`, change routes, replace `tags`/`noindex`, or alter
  the `.fireflyignore` source-path publication filter.
  `createCanonicalDocument()` is the single projection boundary: consumers
  use immutable `CanonicalDocument.markers` and do not parse raw front matter
  independently.
- Projection is draft-first. `guest` sees public documents; future
  `user(subject)` additionally sees private documents owned by the exact subject;
  future `admin` sees every non-draft document. Production calls only the frozen
  `GUEST_PRINCIPAL`; environment variables, URLs, storage, and browser input do
  not select identity.
- The staged relative Markdown path is the physical source identity shown in the
  content tree. A post's optional `slug`, when present, is its canonical route
  segment and may differ from the physical filename stem; without it, the stem
  remains the route segment. Pages use their physical staged path for the tree
  and their required front-matter `slug` for the canonical route.
- The canonical document projection exposes one metadata-first `displayName`:
  a non-empty trimmed front-matter `title`, otherwise the physical filename
  stem without `.md`. It does not strip an `index-` prefix. Directory indexes
  and Terminal tree/list/find output use this display name, while `filename`,
  virtual paths, and routes retain physical identity. User-facing document
  operands and accessible path labels use the shared shell-visible
  `~/blog/<virtualPath>` projection; compact child names such as `posts/` and
  `characters/` remain structural directory labels. Directory ordering remains
  based on the physical virtual path, so an `index-*` filename can remain an
  ordering key without becoming the visible title.
- The legacy optional `source` field is accepted only as a safe relative Markdown
  reference with an optional safe fragment. It is provenance metadata only and
  never contributes to a route, public link, or rendered body. New content omits
  it. A legacy slug run containing whitespace is normalized to `-` before the
  existing safe-segment checks; new authored slugs and source filenames use
  the no-whitespace convention. A legacy physical Markdown filename may retain
  whitespace as source identity; its canonical route comes from the normalized
  slug.
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
  `guest@firefly:~/blog $ / posts / characters / nahida.md` for the nested
  fixture. The root and every parent are native underlined links; the current
  filename is underlined non-link `aria-current="page"` text. Separators are
  presentation-only. Visible whitespace uses explicit non-collapsible `1ch` flex
  gap elements rather than leading/trailing text spaces. Literal `cd`, `/ /posts`,
  glued `/posts`, and a self-link on the current document are invalid.

## Scenario: Single-document blog metadata organizer

### 1. Scope / Trigger

- Trigger: authoring or updating one Markdown document's front matter outside
  the read-only build/test container.
- Scope: `apps/site/scripts/blog-meta.mjs`; it does not bulk-rewrite the
  configured blog or change `tooling/format-content.sh`.

### 2. Signatures

- CLI: `blog-meta <source.md> [--blog-root ROOT] [--collection posts|pages]
  [--category PATH] [--output PATH] [--write-back] [--preview]`.
- Programmatic test boundary: `main(argv, io?) -> Promise<number>` and
  `organizeDocument({ sourcePath, root, collection, options, now? })`.

### 3. Contracts

- Root resolution is `--blog-root`, then `FIREFLY_CONTENT_ROOT`, then the
  repository `content/` fixture; it must contain regular `posts/` and
  `pages/` directories.
- Save-as is the default and must resolve below the root. External sources
  map to `<root>/<collection>/<category?>/<safe-slug>.md`; in-root sources
  retain their relative filename unless `--output` or `--category` changes it.
- `--write-back` is the only mode that replaces the source; it is mutually
  exclusive with `--output`. `--preview` emits normalized Markdown and never
  writes. Existing save-as targets require `--overwrite`.
- Output is one YAML 1.2 front-matter mapping between `---` delimiters,
  validated by the selected Firefly post/page schema. The body bytes after the
  original closing delimiter are preserved exactly; absent front matter is
  treated as an empty mapping.
- The output uses ordinary Markdown/YAML syntax. Firefly-specific values stay
  under the validated `firefly` mapping and do not alter body semantics.

### 4. Validation & Error Matrix

- Missing/non-UTF-8/non-Markdown/non-regular/symlink source -> error, no write.
- Missing closing delimiter, invalid YAML, duplicate keys, unknown schema keys,
  or invalid dates/routes/access metadata -> error, no write.
- Absolute or relative save-as destination outside root, unsafe path segment,
  symlink parent/target, or non-regular target -> error, no write.
- Existing target without `--overwrite`, or save-as resolving to the source ->
  error; use `--write-back` or a different `--output`.
- Source replacement detected during write-back -> error; original remains the
  expected source and the temporary file is removed.

### 5. Good/Base/Bad Cases

- Good: external `draft.md` with an H1 saves as a draft under `posts/` with a
  schema-valid title/date/layout and byte-preserved body.
- Base: an existing valid front matter mapping is normalized while authored
  metadata and body remain semantically intact.
- Bad: `--output ../outside.md`, a symlink source, or an unsupported metadata
  key is rejected before the destination is created.

### 6. Tests Required

- Assert inferred title/description/date/draft/layout and exact body bytes for
  a no-front-matter save-as.
- Assert page slug/category routing, metadata overrides, existing metadata,
  preview/no-write, collision/overwrite, explicit write-back, malformed YAML,
  symlink rejection, and root containment.
- Run `npm --prefix apps/site run test:blog-meta`, relevant materializer and
  metadata tests, and `git diff --check`; run full `./sam` checks when Docker
  access is available.

### 7. Wrong vs Correct

#### Wrong

```sh
node apps/site/scripts/blog-meta.mjs draft.md --output ../published.md
```

#### Correct

```sh
node apps/site/scripts/blog-meta.mjs draft.md \
  --blog-root /path/to/blog --collection posts --output posts/draft.md
```

#### Terminal registry and virtual filesystem

- A `TerminalEntry` contains exactly `kind`, `virtualPath`, `relativePath`,
  `filename`, `title`, `href`, and `date`. Its href must equal the route derived
  from its virtual `.md` path. The descriptor-safe decoder rejects accessors,
  sparse/decorated arrays, unknown fields, hidden/dot/traversal/percent/
  backslash/non-NFC paths, noncanonical hrefs, and folded path collisions.
- `TerminalEntry.title` is the canonical `displayName`, not a second route or
  filename projection. Commands may show it first, but physical path fields
  remain the only operands and route identities.
- Each built-in command module under `presentations/terminal/src/commands/`
  exports a complete `CommandSpec` for each command it owns: safe canonical
  name/aliases, usage and summary, group/order, explicit
  pipeline/substitution/redirect policy, argv
  parser, executor, optional completion callback, and optional typed Help
  examples. `commands/registry.ts` is only the explicit, reviewable allowlist
  and composition point; it validates the global token/metadata invariants and
  freezes the imported specs. It must not discover modules dynamically or
  duplicate command-specific metadata.
- Command specs execute against `ProcessContext` (`stdin?`, virtual `cwd`,
  read-only `ReadonlyVirtualFs`, immutable session, clock, and signal) and
  return `ProcessResult` (`status`, `stdout`, `stderr`, optional state
  patch/control events, and a neutral value). The runtime registry remains a
  compatibility projection for `executeCommand`/`completeCommand` and custom
  legacy handlers; completion delegates to the descriptor callback rather than
  a runtime command-name switch.
- Registry records are cloned and frozen; names and aliases are safe command
  tokens and globally unique. Metadata is safe text, `usage` starts with the
  canonical name, `execute` is required, and `complete` is optional but must be
  callable. The neutral command specs are the source of truth for every built-in
  command, including `ls`, `cat`, `grep`, `find`, `tree`, session commands, and
  their aliases; do not add a second built-in switch or raw-index dispatch
  branch.
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
- Help metadata is projected from the active registry. `help` keeps its compact
  grouped list, while `help <command>` resolves canonical names and built-in or
  session aliases and exposes that command's usage, summary, aliases, and
  descriptor-owned examples. The neutral Help value, runtime effect, bounded
  stdout projection, and browser renderer must carry this detail as one generic
  shape; adding a command must not require a command-name DOM branch or a
  hardcoded Help row.
- **Scenario: module-owned command descriptors and Help detail**

  **1. Scope / Trigger**

  - Trigger: adding or changing a built-in Terminal command, its completion, or
    its Help metadata.
  - Scope: neutral command modules, the explicit registry, Rshell Help data,
    the Terminal adapter, and the browser Help renderer.

  **2. Signatures**

  ```ts
  interface CommandSpec {
    readonly name: string;
    readonly aliases: readonly string[];
    readonly usage: string;
    readonly summary: string;
    readonly group: CommandGroup;
    readonly order: number;
    readonly policy: CommandPolicy;
    readonly parse: CommandArgumentParser;
    readonly execute: (context: ProcessContext, args: ParsedCommandArguments) => ProcessResult;
    readonly complete?: (context: CompletionContext, operand: string) => CompletionResult;
    readonly examples?: readonly { command: string; description: string }[];
  }

  createCommandSpecRegistry(specs: readonly CommandSpec[]): CommandSpecRegistry
  ```

  **3. Contracts**

  - A command module exports its complete descriptor, including parser, executor,
    policy, completion callback, and optional example records.
  - `commands/registry.ts` explicitly imports and composes the allowlist; it
    validates and freezes descriptors but never scans modules or duplicates
    command metadata.
  - `help` returns a grouped compact list. `help <command>` returns the same
    groups plus `detail` for the canonical command resolved from a canonical
    name, built-in alias, or session alias. Detail contains `name`, `usage`,
    `summary`, `aliases`, and optional `examples`.
  - The neutral shell, runtime adapter, bounded stdout/announcement projection,
    and browser renderer preserve this shape. Completion calls the descriptor's
    callback directly with a neutral VFS/cwd context.

  **4. Validation & Error Matrix**

  | Condition | Required result |
  | --- | --- |
  | unsafe name/alias, metadata, policy, or handler | registry `TypeError` |
  | malformed, accessor-backed, sparse, or extra-field examples | registry `TypeError` |
  | duplicate canonical token or alias | registry `TypeError` |
  | `help` with more than one operand | bounded usage error with `help [command]` |
  | unknown `help <command>` target | bounded `No command named "<target>".` error |
  | missing descriptor completion | completion returns `none`; no runtime name switch |

  **5. Good / Base / Bad Cases**

  - Good: `grep.ts` exports `GREP_COMMAND_SPEC` with `-w`/`-E` parser options
    and examples; `help grep` renders those examples without renderer changes.
  - Base: a command has no examples or completion; it still appears in compact
    Help and executes through the same registry path.
  - Bad: adding a command row in `terminal-home.ts`, or adding a `name === ...`
    completion branch in `runtime.ts`, creates a second source of truth.

  **6. Tests Required**

  - Neutral unit tests assert compact grouping/order, canonical and alias detail,
    unknown-target errors, custom descriptors/examples, and immutable validation.
  - Runtime tests assert descriptor-owned completion parity and Help detail
    projection through stdout/effects.
  - Browser tests assert generic Help detail/examples for `grep` and responsive
    layout; no command-name-specific DOM selector is permitted in the renderer.

  **7. Wrong vs Correct**

  ```ts
  // Wrong: metadata or completion drifts in a second runtime table.
  if (name === 'grep') return grepCompletion;

  // Correct: the imported descriptor owns the behavior and Help data.
  const spec = GREP_COMMAND_SPEC;
  const result = spec.complete?.(completionContext, operand);
  ```
- `ReadonlyVirtualFs.list(path)` returns a direct-child `DirectoryListing`:
  `directories` contains only immediate directory names and `documents`
  contains only documents whose parent is `path`. Recursive consumers must
  explicitly traverse `list(...).directories` and enforce their own visited and
  work-limit rules; they must not restore a descendant-document projection to
  make `ls` or grep convenient.

### Terminal `find` Command Contract

#### 1. Scope / Trigger

Use this contract when adding or changing the Terminal command that discovers
public Markdown documents by their user-visible filename. `find` is metadata
discovery; `grep` remains the line-oriented body-text search command.

#### 2. Signature

```ts
const FIND_USAGE =
  'find [--path <directory>] [--after YYYY-MM-DD] [--before YYYY-MM-DD] [path] <keyword>';
const FIND_SUMMARY = 'find public documents by filename substring';

executeFind(context: ProcessContext, args: ParsedCommandArguments): ProcessResult;

interface PublicDocumentWalk {
  readonly paths: readonly string[];
  readonly complete: boolean;
}

walkPublicDocuments(fs: ReadonlyVirtualFs, root: VirtualPath): PublicDocumentWalk;

publicDocumentSearchRoots(path: VirtualPath): readonly VirtualPath[] | undefined;
```

#### 3. Contracts

- The positional keyword is a case-insensitive NFC-normalized substring of
  `PublicDocument.filename`; it does not search title, body, tags, or other
  front matter.
- Without an explicit path scope, search starts at the current virtual cwd and
  recursively searches only that subtree. `--path` resolves one safe public
  directory using the current virtual cwd and recursively searches below it.
  The GNU-style positional form `find [path] <keyword>` uses the same resolver
  and scope rules. A root path maps to `/posts` and `/pages`; neither default
  nor explicit public-document search traverses `/lab` or `/.rshell`.
- `--path <directory>` and the positional path form are mutually exclusive.
  Supplying both path scopes is a usage error. With either form, `~/blog/posts`
  selects the posts subtree and `~/blog` selects both public document mounts.
- Results are sorted by canonical virtual path and use the plain-text row format
  `<title> — <date> — ~/blog/<virtualPath>`. The shell-visible resource path is
  the same for posts and pages, remains available to pipelines and scratch
  redirects, and can be passed directly to `cat` or `vim`.
- A successful direct search also carries a closed neutral `document-search`
  value with the bounded keyword and validated public documents. The runtime
  adapter maps it by exact virtual path to a closed `find` effect containing
  decoded `TerminalEntry` records; it never constructs a browser URL from the
  keyword or shell operand.
- The direct Terminal renderer displays each find match as a native anchor to
  the entry's already validated canonical `href`, with the complete display
  path, date, and title. The anchor remains keyboard reachable and native
  modified activation is preserved. The directory-only `data-terminal-cd-path`
  handler must not intercept document links.
- In a pipeline, substitution, or redirect, only the bounded deterministic
  text projection crosses the shell boundary. Structured find metadata and
  HTML anchors never enter `stdin` or scratch output.
- A text-policy redirect may carry a structured find value at the command
  boundary; the neutral runner must write only `stdout` to scratch and discard
  that value. Navigation controls remain non-redirectable.
- `--after` and `--before` are inclusive canonical calendar-date filters.
  `find -h` and `find --help` return the complete usage/options block without a
  keyword, including `find --path ~/blog/posts <keyword>` and the positional
  `find ~/blog/posts <keyword>` examples; the grouped `help` command derives
  its row from the registry.
- Recursive collection is bounded by a visited-directory work limit. A walker
  returns `complete: false` when the limit is exceeded, and every caller must
  fail closed instead of consuming partial paths. The same rule applies when
  the walker is shared by `grep`.

#### 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| Missing keyword, extra operand, unknown option, empty/control-character keyword | Return the usage error without scanning. |
| Invalid or missing option value | Return the usage error. |
| Unknown, non-public, document, experiment, scratch, or unsafe `--path` or positional path | Reject with a bounded public-directory error. |
| Both `--path` and a positional path are supplied | Return the usage error without scanning. |
| Invalid date or `after > before` | Reject before walking the VFS. |
| Walker work limit exceeded | Return a non-zero bounded scope-limit error; never return partial search results. |
| No matching filename | Return a successful no-match message and no document rows. |

#### 5. Good / Base / Bad Cases

- Good: `find alpha` from a nested cwd, `find --path ~/blog/posts alpha`,
  `find ~/blog/posts alpha`, and inclusive date filters return deterministic
  rows for public documents only.
- Base: a keyword with no matches returns `No matches for "<keyword>".`.
- Bad: `find --path ~/blog/lab alpha`, `find --after 2026-02-30 alpha`, or a
  search over an incomplete walk must not expose experiment/scratch data or
  silently omit documents.

#### 6. Tests Required

- Unit: filename-only matching, case folding, nested cwd isolation,
  root/cwd-relative/absolute public paths, recursive nested documents,
  inclusive date bounds, invalid paths/dates/operands, mutually exclusive path
  forms, no-match output, and command-specific help.
- Integration: registry/grouped-help metadata, terminal adapter output,
  completion candidates, `find | cat`, and the existing `grep` behavior after
  sharing the bounded document walker.

#### 7. Wrong vs Correct

```ts
// Wrong: a bounded walk can be partial; returning it silently hides matches.
const walked = walkPublicDocuments(fs, '/posts');
return successResult(walked.paths.map(render));

// Correct: fail closed before projecting any partial result.
const walked = walkPublicDocuments(fs, '/posts');
if (!walked.complete) return failureResult('Search scope exceeds the work limit.');
return successResult(walked.paths.map(render));
```

### Terminal `grep` Scope Contract

#### 1. Scope / Trigger

Use this contract when changing where Terminal `grep` reads public document
text, how positional resource operands are resolved, or how its command help
describes those scopes. Matching, highlighting, limits, and stdin projection
remain the existing grep contracts.

#### 2. Signature

```ts
const GREP_USAGE = 'grep [-inFwE] [-A NUM] [-B NUM] [-C NUM] <pattern> [path ...]';
const GREP_SUMMARY = 'filter stdin or public text';

executeGrep(context: ProcessContext, args: ParsedCommandArguments): ProcessResult;
```

#### 3. Contracts

- When stdin is absent and no positional resource follows the pattern, grep
  recursively walks only `context.cwd`. A cwd of `/` maps to `/posts` and
  `/pages`; a nested cwd maps to that public subtree only.
- A positional directory/resource operand is resolved relative to the current
  virtual cwd, or absolutely through `~/blog`; `grep <pattern> ~/blog/posts`
  selects the posts subtree and `grep <pattern> ~/blog` selects both public
  mounts. Multiple explicit resources remain supported and deduplicated.
- Explicit resources may be public documents/directories or
  `~/blog/.rshell/tmp` scratch files. Non-public documents, experiments, and
  other host-like paths are rejected. Stdin and positional resources remain
  mutually exclusive.
- `grep -h` and `grep --help` return the complete usage/options block and a
  concrete `grep a ~/blog/posts` example; `help grep` derives its metadata from
  the command descriptor.
- `-A/--after-context`, `-B/--before-context`, and `-C/--context` accept only
  ASCII decimal values from `0` through `256`. Explicit `-A`/`-B` values
  override the corresponding direction from `-C`; any context option enables
  block separators, including a value of zero.
- A matching row keeps its existing `:` location delimiter and match ranges.
  A non-matching context row carries `context: true`, an empty frozen `ranges`
  array, and uses `-` as its location delimiter when a path or line number is
  present. The first row after a non-contiguous block carries
  `separatorBefore: true`; text projections emit a standalone `--` line before
  that row. Context rows never cross resource boundaries or count toward the
  reported match summary.

#### 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| No stdin/resources with a public nested cwd | Walk only that cwd's recursive subtree. |
| No stdin/resources with `/`, `/lab`, or `/.rshell` cwd | Map `/` to public mounts; reject non-public default scopes without walking them. |
| Valid positional public path | Resolve from cwd or `~/blog` and walk only the selected public scope. |
| Scratch file/directory operand | Read only the listed scratch file(s) under `~/blog/.rshell/tmp`. |
| Non-public/unknown/unsafe resource or document-shaped path | Return the bounded public-resource error without host access. |
| Stdin combined with any resource operand | Return the existing stdin/resource exclusivity error. |
| Context option has no value | Return the parser's required-value usage diagnostic. |
| Context value is negative, signed, non-decimal, empty, or above `256` | Return a bounded `grep option --<name> expects an ASCII decimal value from 0 through 256` diagnostic with usage. |
| `-h`/`--help` with a pattern or other option | Return usage; with no other operand/option, return command help. |

#### 5. Good / Base / Bad Cases

- Good: `grep marker` from `~/blog/posts/infra` sees only that subtree, while
  `grep marker ~/blog/posts` intentionally includes sibling post directories.
- Base: `grep marker ~/blog` searches both public mounts. Its structured report
  preserves canonical `/posts/...` and `/pages/...` source paths, while its
  text and browser projections use the copyable `~/blog/<virtualPath>` form.
- Bad: default grep from `/` recursively walking the whole VFS, or an explicit
  `grep marker ~/blog/lab/leaked.md`, exposes experiment/host data.

#### 6. Tests Required

- Unit: nested cwd isolation, root/public-mount mapping, positional directory
  and file operands, multiple resources, non-public rejection, scratch files,
  stdin exclusivity, context option parser forms and validation, A/B/C windows,
  merged intervals, separators, match-only summaries, and `-h`/`--help` output.
- Integration: terminal adapter cwd propagation, descriptor Help examples,
  structured context/separator markers, matching delimiters and ranges, plain
  direct/pipeline/substitution/redirect projections, and browser rendering
  without context highlights or horizontal overflow.

#### 7. Wrong vs Correct

```ts
// Wrong: every no-operand grep reads fixed global roots.
const paths = ['/posts', '/pages'].flatMap((root) => walkPublicDocuments(fs, root).paths);

// Correct: derive bounded public roots from the process cwd.
const roots = publicDocumentSearchRoots(context.cwd);
if (roots === undefined) return failureResult('grep can search only listed public documents or ~/blog/.rshell/tmp scratch files.');
```

- `shell/runner.ts` is the neutral owner of stage expansion, pipe wiring,
  stderr/status handling, state-patch application, and bounded session scratch
  redirects. Its `runRshellInput` wrapper delegates to `parseRshell`; it must
  not introduce a second tokenizer or expose structured values/control events
  as stdin. Until all legacy handlers are retired, the runtime may select this runner only
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
- The neutral `tree` value carries both its stable text projection and aligned
  navigation metadata: `{ kind: 'tree', root, lines, nodes }`, where each
  `TreeLine` is `{ prefix, node }` and each public `TreeNode` is a validated
  directory, document, experiment, or session file with its virtual `path`.
  `lines` remains the only stdout/pipeline projection; the runtime adapter
  carries `nodes` to the browser without parsing tree glyphs back into paths.
- The closed effect union includes structured `help` groups, structured `grep`
  results, and structured `find` results. `help` carries command metadata for
  semantic group rendering; `grep` carries the original line, canonical source
  path, optional one-based line number, bounded match ranges, optional
  `context` and `separatorBefore` row markers, `noResults`, and `truncated`;
  `find` carries the bounded keyword and decoded public entries for native
  document links. A grep match summary counts rows without `context`, while
  plain projections emit `:` for matching rows, `-` for context rows, and a
  standalone `--` before rows marked with `separatorBefore`. The browser
  renderer creates text nodes for context rows and does not highlight them.
  `links` carries validated `{ name, desc?, url }` friend records for direct
  browser rendering; its deterministic `name — url` or `name — desc — url`
  projection is used for pipes and scratch redirects. Plain stdout is derived from those effects only for
  pipes/substitution; the browser renderer creates text nodes and bounded
  `<mark>` ranges, never HTML from command output.
- `friends` is a zero-operand Explore command backed only by injected
  `friendLinks`. It never probes, fetches, or adds external URLs to the VFS;
  empty input produces `No friend links.`. Direct output is structured, while
  pipeline/redirect output is plain bounded text.
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
  renders the current public subtree; `tree ~/blog` renders `lab/`, `pages/`,
  and `posts/`; `~/blog/posts` and `~/blog/pages` narrow it. The optional `TerminalTextDocument`
  corpus contains normalized visible title/prose lines from already validated
  public templates; it is never raw Markdown or HTML. Template `<pre>` blocks
  become one document line per source line and retain indentation, blank lines,
  and meaningful spacing. Prose metadata may be normalized to one readable line,
  but a renderer must not flatten a whole source block into one whitespace run.
  Directories precede files and peers use deterministic code-point order.
- `/` is the canonical internal VFS root; `~/blog` is the sole user-visible
  absolute shell root. A user-entered operand is either relative to the current
  cwd or `~/blog` / `~/blog/<path>`; reject `/...`, bare `~`, and bare `~/`
  before resolution. Thus `lab/nerv` is valid from the root cwd, but is not a
  cross-cwd alias once the cwd is `~/blog/lab`; there the experiment is opened
  as `open nerv`, `open ./nerv`, or `open ~/blog/lab/nerv`. Internal VFS paths,
  decoded metadata, and browser hrefs remain slash-rooted. Every displayed
  document/resource identity uses the shared `~/blog/<virtualPath>` projection
  (with `/` displayed as `~/blog` and `-` retained for stdin); directory/tree
  child labels remain compact structural names. Terminal document title bars
  use the same projection as grep, find, ls, and the no-JavaScript recovery
  index; the document body does not render a second `.terminal-path` marker.
  Directory-mode `resolve('.', '/')` must produce `/` rather than `//.`, and
  resource-mode `..` traversal remains rejected.
- When the prompt input is focused, the controller prevents the default action
  for every Tab event, including modifiers and IME/composition events. Only an
  unmodified, non-composing Tab may rewrite input through completion. Safe `cd`
  completion reports only immediate children of the current virtual directory
  and explicitly refocuses the prompt. At the virtual root, `cd ` shows
  `lab/`, `pages/`, and `posts/` rather than nested descendants. Tab outside
  the prompt remains native page/control navigation.
- Entry-list display is a user-facing resource view, not an internal-path dump:
  document rows from `ls` (including exact and wildcard results), `find`, and
  the recovery index use `~/blog/<virtualPath>` for both posts and pages,
  regardless of cwd. Directory and tree child labels may remain relative
  structural names. Help and not-found errors describe the input grammar, while
  structured routes and VFS metadata retain slash-rooted paths.
- A standalone `ls` entries effect carries the canonical public `directory` it
  resolved and contains only that directory's immediate children. The browser
  renders directories and documents as one flat shell-style list: directory
  rows come first, followed by direct document rows, with no synthetic `/`
  heading, nested indentation, or directory divider. Directory rows use a
  canonical trailing-slash native href plus a `data-terminal-cd-path` carrying
  the already validated virtual directory. An unmodified primary activation is
  intercepted by the home controller and submits the equivalent safe `cd
  ~/blog<virtual-path>/`; modified activations remain native browser links. Document
  rows keep stable name, date, and title columns on wide screens; the mobile
  layout keeps the name/date pair and moves the title below them. The bounded
  plain `stdout` projection remains one deterministic entry per line so pipes
  and substitutions do not consume layout text. Root listings use this same
  structured link boundary.
- The browser renders a structured `tree` by appending each `TreeLine.prefix` as
  text and the node as a native link or text node: documents use their decoded
  canonical `href`, experiments use their validated listed `href`, directories
  use the same `data-terminal-cd-path`/safe-click contract as `ls`, and files
  remain text. The visible root, branch glyphs, ordering, and `lines` stdout
  must remain unchanged. The delegated click handler owns only unmodified
  primary clicks inside the transcript; it never constructs a destination from
  raw command input or exposes a host path.
- Direct-listing contract: the structured effect carries immediate
  `directories`; `documents` contains only files whose parent is the current
  directory. Descendant documents do not appear until that directory is
  entered. The plain projection includes the direct directory and document lines
  in deterministic order.
- `ls` accepts at most one safe public/session operand in the shell grammar.
  Standalone listing, exact operands, completion, and bounded `*` matching share
  the same visible-path model: `~/blog` exposes only `lab/`, `pages/`, and `posts/`; public
  mounts expose their immediate directories and decoded documents; and an
  exact visible document such as `ls ~/blog/pages/about.md` returns a one-entry
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
  optional trailing slash and resolve relative to the current cwd. The lab mount
  lists only the decoded Experiment
  catalog; a listed `/lab/<id>` path does not expose an experiment's host/build
  files and instead reports the cwd-correct `open` form, such as `open nerv`
  from `~/blog/lab`. The browser renders lab entries with the same flat,
  no-marker terminal row treatment as public document listings. Other ambiguous
  command/list completion leaves the input unchanged; prompt Tab is still
  controller-owned.
- The safe empty operand form `ls ` keeps the prompt focused while showing path
  candidates; the command form `ls` itself still completes to `ls `. Ordinary
  ambiguous operands such as `ls p` leave input unchanged and show the
  normalized directory candidates `pages/` and `posts/`, while prompt Tab is
  still prevented by the controller. A unique prefix such as `ls pa` completes
  to `ls pages/`.
- `cat` and `vim` share one resolver and segment-aware completer. Bare
  relative paths resolve from the current cwd; `~/blog/<path>` is the explicit
  cross-cwd form. Experiments use the same resolver and an exact listed leaf:
  for example, `open nerv` from `~/blog/lab`, not a special `open lab/<id>`
  compatibility form. Hidden/dot/traversal/percent/
  backslash/URL/control/non-NFC/unknown-root operands never resolve or consume
  Tab, and directory/experiment operands return actionable command errors.
- `cat` returns a validated `document` effect for trusted template cloning.
  `vim` returns `document-navigation` containing the decoded canonical entry;
  the DOM controller uses `entry.href` directly and never concatenates raw input.
- An inline `cat` stream ends after its trusted document content. It does not
  append a `Return to prompt` control because the active prompt remains directly
  below the stream and receives focus according to the normal document-settlement
  contract.
- Syntactically safe `cat`/`vim` path completion owns the rewrite decision for
  every result count. Unique completion inserts the next segment; ambiguity
  keeps prompt focus and shows candidates with the user's `./` or `~/blog/`
  prefix;
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
- `grep` accepts only bounded `-i`, `-n`, `-F`, `-w`, and `-E` flags, plus their
  long aliases `--ignore-case`, `--line-number`, `--fixed-strings`,
  `--word-regexp`, and `--extended-regexp`. Its default and explicit `-E` mode
  use the same safe literal/regular subset; `-E` combined with `-F` is rejected.
  `-w` accepts only matches whose adjacent characters are absent or outside the
  ASCII `[A-Za-z0-9_]` word set, for both fixed and safe-regex modes; zero-width
  matches do not count. The boundary check runs during candidate search so a
  rejected occurrence cannot hide a later valid one. Validated public or
  `~/blog/.rshell/tmp` user operands preserve source line boundaries. Named
  resource text and browser projections report the copyable
  `~/blog/<virtualPath>` form; stdin remains `-`, while structured match
  metadata retains `/posts/...`, `/pages/...`, or `/.rshell/tmp/...` source
  paths. These projections return a safe no-result effect instead of
  conflating “no matches” with an invalid resource. Without stdin or positional
  resource operands, grep recursively searches only the current virtual cwd.
  Positional `grep <pattern> [path ...]` operands explicitly select one or more
  public document/resource scopes, including `grep <pattern> ~/blog/posts`; no
  `grep --path` option exists.
  `grep -h` and `grep --help` return command help with that positional path
  example. Resource, scanned-line, match-count, and output-size limits remain
  enforced before rendering.
- **Terminal grep matcher performance and equivalence**

  **1. Scope / Trigger**

  - Trigger: changing safe grep matching, whole-word boundaries, highlight
    ranges, or the per-line performance of grep -w or grep -Ew.
  - Scope: the private safe parser/NFA and bounded literal matcher inside
    presentations/terminal/src/commands/grep.ts; command options, VFS
    walking, output limits, and browser effects remain outside this optimization.

  **2. Signatures**

  ~~~ts
  interface SafeRegexMatcher {
    readonly test: (line: string) => boolean;
    readonly ranges: (line: string) => readonly (readonly [number, number])[];
  }

  compileSafeRegex(
    pattern: string,
    insensitive: boolean,
    wholeWord: boolean
  ): SafeRegexMatcher | undefined;

  literalMatcher(
    pattern: string,
    insensitive: boolean,
    wholeWord: boolean
  ): SafeRegexMatcher;
  ~~~

  **3. Contracts**

  - Parse the existing safe language first. A parsed AST consisting only of
    literal atoms in concatenation, including decoded escaped literals, may
    delegate to literalMatcher; raw source text must not be used as the
    decoded value.
  - A general safe NFA with wholeWord enabled must run one left-to-right
    state-set scan. Add a new start closure only at an absent/non-word left
    boundary, accept only at an absent/non-word right boundary, and never
    accept before consuming one character.
  - test(line) is the hit precheck. ranges(line) may use bounded detailed
    collection after a hit, but must preserve every accepted range, cap output
    at 64 ranges, and must not be called as an all-line precheck.
  - ASCII word classification, case folding, anchors, alternation, repetition,
    classes, parser limits, NFA state limits, and all command/resource/output
    limits remain unchanged. Native JavaScript regular expressions are not a
    user-pattern execution engine.

  **4. Validation & Error Matrix**

  | Condition | Required result |
  | --- | --- |
  | literal-only AST, including an escaped literal | use the bounded literal matcher with unchanged source-pattern reporting |
  | operator/class/anchor/repetition AST | use the safe NFA compiler and existing state bound |
  | whole-word candidate with a word character on either side | reject it and continue searching later candidates |
  | zero-width whole-word candidate | do not report a line or range |
  | unsafe syntax, empty/overlong pattern, or excessive NFA states | preserve the existing bounded error |
  | matching line after the precheck | collect bounded ranges and preserve structured highlighting |

  **5. Good / Base / Bad Cases**

  - Good: grep -Ew '\+' matches a standalone plus sign through the decoded
    literal fast path.
  - Base: grep -w x+z over a long run of x characters returns no result after
    one scan, while grep -w x+ still discovers a later boundary-valid candidate.
  - Bad: call collectRanges(line) from test(line) for every line, or execute a
    user pattern with the host RegExp engine.

  **6. Tests Required**

  - Unit tests assert escaped literal matching, invalid-then-valid boundaries,
    long absent whole-word input, zero-width anchors/repetition, -E/-Ew
    compatibility, and exact structured ranges.
  - Terminal type/test, site check/build, focused browser, task validation, and
    whitespace checks run through the repository wrapper.
  - A repeatable benchmark uses the same configured public corpus and records
    before/after samples as evidence; timing is not a test threshold.

  **7. Wrong vs Correct**

  ~~~ts
  // Wrong: every non-matching line pays for a full search from each position.
  if (wholeWord) return collectRanges(line).length > 0;

  // Correct: candidates share one advancing NFA state set.
  if (wholeWord) return hasWholeWordMatch([...line]);
  ~~~
- Non-document command output settles the newest record and fresh prompt as one
  centered reading band when the group fits the viewport. Oversized output keeps
  the fresh prompt focused and visible at the viewport's lower edge while earlier
  lines may remain above the fold. Document output still settles its title at the
  reading start. Motion is smooth normally and immediate under reduced motion;
  repeated prior transcript must not clip the new output's first line at the
  viewport top.
- A non-document settlement measures the record-to-prompt span before scrolling:
  it centers the group within the readable band when it fits, otherwise it
  scrolls the fresh prompt to the viewport end. Empty startup and `clear`/`Ctrl+L`
  return to the centered empty-session placement. The connecting startup surface
  and ready boot session share a bounded tall-viewport offset so relocating the
  boot log does not change its geometry. This responsive fallback is required at
  the mobile profile as well as desktop.

#### Read-only Vim reader

- Canonical document routes load `terminal-reader.ts` as progressive
  enhancement. Terminal documents are reader-capable when focused; semantic
  documents keep the reader status hidden and activate it only for the explicit
  `#terminal-reader` entry fragment. Static HTML remains complete and
  navigable without JavaScript; directory indexes, home, lab, and NERV do not
  load the reader asset.
- The pure `document-navigation` effect remains fragment-free and carries the
  validated canonical `entry.href`. The browser controller owns the only
  reader-intent decoration: `readerDestinationHref(href: string)` must accept a
  same-origin absolute or path-like canonical URL, set exactly
  `#terminal-reader`, and return only its path/query/hash form. Raw `vim`
  operands never reach this helper, and ordinary breadcrumbs, directory links,
  permalinks, and inline `cat` output remain fragment-free.
- A semantic document uses `data-terminal-reader-entry="fragment"`; its status
  stays hidden and its region is not focusable until `window.location.hash ===
  '#terminal-reader'`. A Terminal document uses
  `data-terminal-reader-entry="always"`; its status is visible on direct entry,
  but it only steals focus for the exact reader fragment. Fragment entry waits
  one animation frame after native hash settlement, then calls
  `focus({ preventScroll: true })`; direct canonical routes, other fragments,
  Back/Forward, and JavaScript-disabled pages retain native browser ownership.
- `:q` assigns `/` directly and does not use `history` APIs. Reader mode,
  search, selection, active-unit, and generated-unit state remain route-local
  and ephemeral; a route change discards them.
- The reader owns local `normal`, `visual`, `search`, and `command` modes. Its
  bounded keys are `j`, `k`, `g`, `G`, `/`, `?`, `n`, `N`, `v`, `Escape`, and
  `:q`. It is a reader, not an editor.
- Movement uses semantic top-level reading units and scrolls the active unit to
  a centered reading band; reduced motion changes smooth scrolling to immediate.
- Visual mode owns a real `Range` only while the browser selection has exactly
  the same boundaries. A user-replaced selection is never cleared or captured.
- Search uses a labeled native input, literal case-insensitive matching, and a
  route-local occurrence record `{ unitIndex, range }` for every non-overlapping
  match. The collector walks text nodes within one reading unit, maps folded
  text offsets back to the original DOM boundaries, and never crosses units or
  rewrites authored content. `n`/`N` navigate those occurrence records with
  wraparound, including repeated matches inside one paragraph or `<pre>`.
  When supported, CSS Highlights register `terminal-reader-search` for all
  cloned ranges and `terminal-reader-search-active` for the current clone; the
  unsupported-Highlight fallback keeps status/navigation/scrolling functional
  without inserting `<mark>` or taking browser selection ownership. A
  committed query exposes persistent `data-reader-search-status` text for the
  current occurrence (or bounded no-results text), while the `/`/`?` prefix,
  direction-specific label, and placeholder identify search direction.
  Occurrence movement settles only the page viewport from the range rectangle,
  never a protected nested scroll region. A committed query also sets
  `data-reader-search-active` on the complete reader status section while the
  reader is not editing a search or command form; opening `/` or `?` removes
  that marker temporarily but preserves the prior committed status text until
  the form is submitted or cancelled. The status section is viewport-fixed to
  the block-end whenever it is visible, and follows the rendered reader region
  in source order so the document header, outline, and prose remain continuous.
  It uses the presentation's token-backed opaque inverse/contrasting surface;
  the Terminal document provides a conservative no-JavaScript fallback, while
  reader startup measures the rendered status height and writes the route-local
  `--reader-status-reserve` value on the article. A `ResizeObserver` refreshes
  that reservation when search/command chrome or responsive wrapping changes;
  article bottom padding and reading-unit scroll margins keep active and final
  content above the fixed edge. The visible status section may bleed from its
  centered reader frame to the viewport edges, while the document header,
  outline, and prose retain their existing readable measure; this full-bleed
  treatment must not create document-level horizontal overflow.
  A non-empty query replaces the query, occurrence records, highlights, and
  committed-search marker as one lifecycle;
  an empty submission or Escape clears the query/highlights without changing
  the permanent fixed status lifecycle. The mode/position row owns reader
  orientation, `data-reader-search-status` owns committed occurrence context,
  and `data-reader-message` owns the latest visible action feedback. When the
  committed search status owns the current feedback, the generic message is
  hidden to avoid a duplicate line; `data-reader-announcer` remains the
  separate polite live channel for the same updates. Each visible
  search/command form is a flex row with one
  continuous inset bottom rule and `:focus-within` focus treatment; its fixed
  `1ch` prefix and native input keep an explicit gap at mobile width without
  weakening the 44px target or visible focus.
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
| missing `.fireflyignore` | preserve the existing Markdown inventory and generated stage behavior |
| malformed, undecodable, unreadable, special, or symlinked `.fireflyignore` | fail with the logical policy path/line and preserve the prior generated stage |
| excluded Markdown or directory | omit it before collision reservation, inventory, generated output, Astro loading, and route generation |
| `.gitignore` without `.fireflyignore` | no publication filtering; `.gitignore` remains repository tracking policy only |
| private entry without owner, public entry with owner, or unknown access key | schema failure |
| draft/private guest entry | valid authored input but absent from every public artifact |
| unsafe or colliding canonical slug/route | canonical-model build failure |
| alias collides with root, directory, document, or alias | route-reservation build failure |
| permalink breadcrumb contains `cd`, duplicate/glued slash, dead parent, or current self-link | static/browser failure |
| breadcrumb normalized text is correct but gap boxes collapse to zero | browser geometry failure at both viewports |
| accessor, sparse input, unknown field, unsafe Terminal path | decoder `TypeError` before shell reveal |
| command token/alias collision or invalid metadata/handler | registry `TypeError` at creation |
| missing command argv parser or unsafe option definition | neutral registry rejects the command before execution |
| duplicate hardcoded command dispatch or help metadata | implementation review failure; definitions must be the single execution/help source |
| slash-rooted, bare-tilde, invalid `tree`, `cat`, or `vim` operand | usage/not-found effect or no completion; no host access/navigation |
| direct-child `ls` projection | root and public mounts expose only immediate directory names and documents; descendant documents appear only after entering the child directory |
| structured `tree` metadata drift | `root`, `lines`, and `nodes` stay aligned; stdout remains the exact text tree while browser links consume only validated node metadata |
| unmodified public directory link activation | submit safe `cd ~/blog<virtual-path>/`, update cwd/prompt, retain the transcript, and keep the URL on the Terminal home |
| modified directory-link activation or document/experiment link activation | do not intercept; preserve the canonical native browser link |
| mixed-depth `ls` result | keep only immediate children in one flat directory-first list, align document name/date/title columns, and keep pipeline stdout unchanged |
| `ls` option, visible-path prefix, or empty-operand Tab | `-h`/`--help` show usage; a unique safe directory prefix adds `/`, a unique document prefix does not, and either completion retains focus; every Tab is prevented in the focused prompt, while ordinary ambiguous `ls p` leaves input unchanged |
| option ordering/cluster/terminator | the command parser accepts options before or after operands, short clusters such as `-inF`, and `--` for dash-prefixed operands; invalid options stop before execution |
| no-operand directory command at virtual root | `.` resolves internally to `/` exactly once; `ls` equals `ls ~/blog` and never reports a `//.` path error |
| nested cwd command | after `cd`, prompt focus remains usable; `ls` renders entries relative to the resolved directory and `cat`/`vim` completion and execution resolve relative operands under that cwd |
| safe ambiguous `cd` completion | leave input unchanged, show immediate child directories only, and retain prompt focus at the virtual root and nested cwd; the focused prompt prevents Tab |
| `ls` wildcard | only bounded `*` matching against known public directory or document paths at the requested segment depth; no match gives a clear bounded diagnostic, while multiple same-directory matches produce one deterministic direct-child listing |
| listed experiment leaf | resolves by cwd; `open nerv` works in `~/blog/lab`, root-relative intent uses `open ~/blog/lab/nerv`, and no compatibility alias bypasses cwd semantics |
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
| long help after prior output | fitting record/prompt group centered in the readable band; oversized output keeps the fresh prompt usable/visible without top-clipping the new record |
| JavaScript unavailable or reader startup cannot initialize | full document/breadcrumb remains usable |
| empty reader search | cancel the input without creating or replacing a committed query |
| committed literal search with matches | one exact DOM range per non-overlapping occurrence; persistent current/total status; all/active CSS Highlights when supported |
| repeated matches within one reading unit | `n`/`N` changes the active occurrence and status even when the active unit ID is unchanged |
| committed literal search with no matches | clear prior ranges and show bounded `No results for “…”` status/announcement |
| CSS Highlights unavailable | retain occurrence count, active unit, keyboard navigation, and page settlement without DOM wrappers or selection mutation |
| protected reader target, IME, modifier, or user-owned selection | preserve native behavior; no reader movement/mode takeover |
| unsupported ex command | stay on document and announce bounded error |
| `:q` | navigate to `/` exactly |

### 5. Good / Base / Bad Cases

- Good: an authored `characters/nahida.md` or linked Markdown subtree is copied
  as ordinary files, guest-projected, listed by `tree`, completed by `cat`/`vim`,
  routed under `/posts/characters/`, and published without a host path.
- Good: a test-only custom command with alias is visible in active-registry help,
  executes through either token, and completes without changing default logic.
- Good: `help` renders sparse semantic groups and a fixed-string `grep` against
  a document with repeated visible body text returns multiple canonical lines
  with bounded highlight ranges; a missing pattern produces an explicit
  no-result state.
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
- Good: from `~/blog/lab`, `ls nerv/`, `open nerv`, and `open ./nerv` resolve
  the listed experiment; `open lab/nerv` fails rather than acting as a hidden
  root alias, while `open ~/blog/lab/nerv` remains explicit. The catalog row has no
  default list marker while following the document-list alignment language.
- Good: `grep -i a`, `grep a -i`, `grep -inF a`, and `grep -Ew a` share one
  argv parser; `grep -- -pattern` keeps the dash-prefixed value as an operand.
- Good: after `cd ../` reaches `~/blog`, `ls` and `ls ~/blog` produce the same
  immediate root mount listing without exposing a synthetic `//.` path.
- Good: `ls posts` and `tree ~/blog` expose canonical document/experiment links;
  clicking a public directory with an unmodified primary activation submits a
  safe `cd ~/blog/posts/characters/`, updates the prompt, and leaves the home URL
  unchanged. Ctrl/Cmd/Alt/Shift activation remains a native directory link.
- Base: omitted `FIREFLY_CONTENT_ROOT` and `config.dev` builds the repository fixture; omitted
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
  promote rollback; `.fireflyignore` matcher grammar, nested precedence,
  parent blocking, control-file exclusion, `.gitignore` isolation, malformed
  diagnostics, and prior-stage preservation; access projection; schema;
  negative Astro builds; marker schema defaults/validation, registry
  resolution, unsupported-marker no-op behavior, canonical marker projection,
  and duplicate ordering.
- Terminal unit tests: exact entry decoder, custom command/alias/help/execute/
  completion, collision rejection, definition-owned default dispatch, shell and
  command argv parser compatibility/order/cluster/`--` behavior, virtual-root
  resolution, structured help/grep effects, preserved multiline
  source lines and safe ranges, exact default/full tree content, executable list
  formatting, flat mixed-depth `ls` rendering plus flat pipeline stdout,
  direct-child list projections and recursive grep discovery, ls prefix/option/
  wildcard execution and empty-operand completion/focus ownership,
  final-pipeline grep effects plus downstream plain stdout, shared nested `cat`/`vim` resolver/completion ownership,
  cwd-relative `cd`/`ls`/`cat`/`open` behavior, `~/blog` absolute paths,
  slash/bare-tilde rejection, structured tree node paths/kinds with
  unchanged line/stdout projections, and safe directory-link path derivation,
  mount aliases, trailing-slash normalization, document-prefix rejection, and
  listed-experiment leaf handling, cancellation state, Ctrl+L transcript
  clearing, built-in `l`/`ll`/`cls` plus session alias resolution/query/output, and
  hostile operand rejection. Multi-match wildcard tests assert a structured
  direct-child listing rather than a multiplicity error.
  They also cover root ambiguous `cd` completion ownership and inline `cat`
  prompt adjacency.
- Site build/static tests: canonical document/directory routes, breadcrumbs,
  exact route-owned scripts/styles/fonts/licenses, guest-only templates/indexes,
  marker badges on supported public surfaces, no source/private sentinel, no
  maps/symlinks/unknown files.
- Site Playwright at `1440x900` and `375x812`: static/no-JS route and breadcrumb
  coverage; tree/cat/vim plus native document/experiment links and directory
  link-to-`cd` prompt/cwd updates; grouped-help usage readability; root ambiguous `cd`
  Tab focus; inline `cat` prompt adjacency; Ctrl+C and modifier/IME exclusions;
  safe ambiguous and zero-result path Tab focus plus prompt-wide Tab prevention;
  repeated help settlement; all reader modes/keys; Ctrl+L clear and `ls lab`
  row presentation; exact reader search ranges and current/total status;
  same-unit `n`/`N` wraparound; backward-search prefix/label/placeholder;
  Range ownership; reduced motion; overflow and focus.
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

```ts
// Wrong: reconstruct a path by parsing branch glyphs and executing visible text.
const path = line.replaceAll('├──', '').trim();
```

```ts
// Correct: preserve aligned metadata and let the existing safe cd command
// validate the absolute virtual path again at execution time.
const { prefix, node } = effect.nodes[index];
pre.append(document.createTextNode(`\n${prefix}`));
appendTreeNode(pre, node);
```

### Design Decision: Definition-Owned Command Execution

**Context**: Help grouping, aliases, execution policy, completion, and built-in
behavior had to evolve together without a second dispatch table drifting out of
sync.

**Options Considered**:
1. Keep a built-in name switch plus separate metadata arrays.
2. Store metadata and the actual handler in one registry definition.

**Decision**: Use option 2. Each command module owns its complete descriptor;
registry creation validates and freezes the explicit imported allowlist; all
built-ins are definitions, and full Rshell parsing remains in one parser path.
Help enumerates the active definitions and renders optional descriptor examples
through a generic detail view. This keeps custom-registry tests representative
and makes adding a command a single bounded module plus one explicit registry
entry.

**Extensibility**: Add a command module with a safe token, group/order, parser,
handler, policy, and optional completion/examples, then add one explicit import
and list entry in the registry. Do not add a parallel command list, dynamic
discovery, or name-based completion/DOM switch.

### Design Decision: Structured Search and Help Effects

**Context**: The browser needed readable grouped help and safe grep highlighting,
while pipelines still need bounded plain text.

**Decision**: Runtime returns closed structured `help`/`grep` effects. The DOM
controller renders text nodes and bounded marks; `stdoutForEffect()` is the only
plain-text projection for Rshell composition.

**Extensibility**: A new structured effect must update the exhaustive runtime
effect union, stdout/announcement projection, DOM renderer, CSS, unit tests, and
browser tests together.

### Design Decision: Structured Navigable Tree Lines

**Context**: `tree` already knew each child's virtual path, but reducing those
children to display strings made browser links impossible and tempted the DOM
layer to parse branch glyphs back into paths.

**Options Considered**:
1. Parse the rendered tree strings in the browser.
2. Carry aligned node metadata alongside the stable text/stdout projection.

**Decision**: Use option 2. The neutral command returns `{ root, lines, nodes }`;
`nodes` carries validated VFS paths and document/experiment metadata, while
`lines` remains the sole pipeline/stdout representation. The browser renders
`prefix` as text and chooses native links from the node kind. Public directory
links carry canonical route hrefs for recovery, but an unmodified primary click
is delegated to the existing safe `cd` command so the Terminal cwd remains the
source of truth.

**Extensibility**: Any future structured Terminal output that needs browser
navigation must add a closed typed payload, retain a deterministic plain
projection for pipelines, and update the runtime adapter, DOM renderer, safe
native-link boundary, unit tests, and browser tests together.

## Scenario: Metadata-aware Terminal Document Completion

### 1. Scope / Trigger

Use this contract whenever changing `cat`, `vim`, or `ls` completion for public
Markdown documents, document display titles, or the browser completion panel.
The Terminal may expose a metadata title as the user-facing label, but command
resolution and execution must continue to use the canonical virtual path.

### 2. Signatures

```ts
type CompletionResult =
  | { readonly kind: 'unique'; readonly value: string; readonly candidates: readonly string[] }
  | {
    readonly kind: 'ambiguous';
    readonly value: string;
    readonly candidates: readonly string[];
    readonly candidateValues: readonly string[];
    readonly candidateLabels?: readonly string[];
    readonly ownsTab: boolean;
  }
  | { readonly kind: 'no-match'; readonly candidates: readonly []; readonly ownsTab: true }
  | { readonly kind: 'none'; readonly candidates: readonly [] };

completeCommand(
  input: string,
  entries: readonly TerminalEntry[],
  experiments?: readonly TerminalExperiment[],
  registry?: TerminalCommandRegistry,
  cwd?: string
): CompletionResult
```

### 3. Contracts

- `cat`, `vim`, and `ls` document completion search both the canonical physical
  operand and the document display name returned by `documentDisplayName()`.
- Display-name matching is case-insensitive. Physical path matching remains
  case-sensitive and preserves the existing relative, `./`, and `~/blog/`
  operand forms.
- `candidateValues` and unique `value` are complete command strings containing
  only the safe physical operand. They are the only values the controller may
  insert when a candidate is selected.
- `candidateLabels`, when present, is aligned with `candidates` and is only a
  presentation label; duplicate titles include enough physical-path context,
  for example `Shared Note — one.md`.
- Empty or absent metadata title data uses the filename stem as the display-name
  fallback. Directory and experiment completion never uses document titles.
- The browser renders `candidateLabels` when present but keeps
  `candidateValues` for Enter/Space selection.

### 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| unique title prefix | return a unique result whose inserted value is the physical operand |
| case variation in title prefix | match the same document as the canonical title |
| duplicate title prefix | return ambiguous physical candidates plus aligned human-readable labels |
| physical filename/path prefix | preserve the existing completion result and insertion form |
| empty title | use the filename stem for display-name matching |
| directory or experiment prefix | use path/id matching only; do not add title aliases |
| unsafe, non-NFC, unknown-root, or no-match input | preserve the existing `none`/`no-match` distinction and never expose a host path |

### 5. Good / Base / Bad Cases

- Good: `cat do` in `~/blog/posts/infra` matches a document titled `Docker
  Handbook` and inserts `cat 07-docker-handbook.md`.
- Base: `vim 07-do` still completes from the physical filename exactly as it
  did before metadata aliases were added.
- Bad: render `Docker Handbook` as the command candidate and insert that title,
  or use a title alias as a VFS path during execution.

### 6. Tests Required

- Terminal unit tests assert unique title matching, case-insensitive matching,
  `ls` parity, nested and root-relative forms, physical-path completion,
  duplicate-title labels, filename-stem fallback, and the exact physical
  `candidateValues` used for selection.
- Browser completion tests assert that the visible option uses the title/path
  label while selecting an option commits the corresponding physical command
  value.
- Type-check and site/Terminal checks must cover both completion result type
  copies (`commands/contracts.ts` and the runtime adapter) and the DOM panel.

### 7. Wrong vs Correct

```ts
// Wrong: the visible title becomes the shell operand.
const value = `cat ${documentDisplayName(document)}`;

// Correct: title is only a matching/display alias; execution receives the path.
const value = `cat ${physicalOperand}`;
const label = `${documentDisplayName(document)} — ${physicalOperand}`;
```

## Scenario: Deterministic Terminal home boot lifecycle

### 1. Scope / Trigger

Use this contract when changing the static Terminal home boot surface, its
inline startup marker, the home controller's first-load transition, or the
startup Playwright/static-output tests. It exists because a fast cached module
can otherwise relocate the server-rendered boot DOM before a visitor observes
its CSS animation.

### 2. Signatures

```ts
startTerminalHome(root: HTMLElement, seams?: TerminalControllerSeams): void

// Static DOM contract on [data-terminal-home].
data-terminal-startup-state: 'connecting' | 'ready' | 'failed'
data-terminal-controller-initialized?: 'true'
data-terminal-boot-duration: non-negative milliseconds
```

### 3. Contracts

- The server-rendered home emits all 12 boot lines and the prompt before the
  controller module runs. The line delays are 0..1100 ms in 100 ms steps, the
  line duration is 180 ms, and the prompt runs at 1400..1580 ms.
- `data-terminal-boot-duration` is derived from those same component timing
  constants; the controller must not duplicate the 1580 ms literal as its
  source of truth.
- The inline marker sets `connecting` and prevents Escape while connecting. Its
  DOMContentLoaded failure check only fails when the controller has not set
  `data-terminal-controller-initialized="true"`; an initialized controller may
  still be waiting for the visual gate.
- In normal motion, `startTerminalHome()` binds the runtime and keeps the boot
  surface visible, the session hidden, and shell submission/typing inert until
  the prompt's `terminal-boot-prompt-reveal` `animationend` or a bounded timer.
  It then moves the existing boot surface into exactly one transcript boot
  record and sets `ready` without replaying line animations.
- Reduced motion and a prompt whose computed visibility is already complete are
  immediate gate paths. Failure uses the existing recovery surface and never
  leaves the root indefinitely in `connecting`.

### 4. Validation & Error Matrix

| Condition | Required result |
| --- | --- |
| normal motion, controller faster than 1580 ms | retain the static boot surface until the named prompt animation completes |
| module arrives while the animation is running | attach the gate, then complete on the existing prompt event |
| module arrives after the prompt animation | detect completed computed style and transition once without replay |
| prompt animation event is unavailable | bounded duration fallback completes the transition |
| reduced motion requested | reveal/open the shell immediately after valid controller initialization |
| missing/invalid boot-duration attribute | fail through Terminal recovery; do not guess a timing contract |
| controller fails before initialization marker | retain the native recovery links and set `failed` |
| key/submit/click before `ready` | do not mutate shell state; ordinary page keys remain unprevented |

### 5. Good / Base / Bad Cases

- Good: cached HTML and a cached module both expose `connecting`; the 12 static
  lines animate once, the prompt ends while the session is hidden, then one
  boot record and one interactive command row appear.
- Base: a delayed module finds the already-finished prompt, preserves the
  completed boot surface, and opens the shell once without a second animation.
- Bad: call `preserveBootLog()` immediately during module evaluation, let a
  hidden input submit while the boot surface is visible, or mark `failed` at
  DOMContentLoaded merely because the controller is still in its visual gate.

### 6. Tests Required

- Static output asserts the 12-line count, 100 ms delay contract, 1580 ms
  duration attribute, inline marker ordering, and controller-initialized guard.
- Desktop and mobile Chromium tests observe all 12 line animation starts and
  the single prompt animation end while the root is still `connecting`; then
  assert one boot record, one command row, `ready`, and no replay.
- Browser regression tests delay the module, exercise reduced motion, test
  Escape before/after readiness, refresh, recovery, focus, overflow, and prove
  hidden shell input is blocked while an ordinary body key is not prevented.
- Run site `check`, static `build`, content/X Core tests, focused Playwright,
  `task.py validate`, and `git diff --check` through the repository wrapper.

### 7. Wrong vs Correct

```ts
// Wrong: a fast module load makes the visitor miss the only animated surface.
preserveBootLog(nodes);
setStartupState(nodes.root, 'ready');

// Correct: retain the server-rendered surface until its named visual gate ends.
cancelBootGate = createTerminalBootGate(nodes, completeStartup).cancel;
```

## Scenario: Unified shell-visible resource paths

### 1. Scope / Trigger

- Trigger: a cross-layer Terminal/site contract change fixed the misleading
  `/posts/...` and cwd-relative document paths emitted by grep, find, ls, and
  static recovery views.
- Scope: project the validated internal VFS identity into one copyable shell
  resource label without changing lookup, browser routes, or host boundaries.

### 2. Signatures

- `displayVirtualPath(path: VirtualPath): string` owns the internal-to-shell
  root projection in `presentations/terminal/src/vfs/paths.ts`.
- `formatResourcePath(path: VirtualPath): string` exposes that projection at
  the Terminal runtime boundary for site code.
- `formatDocumentOperand(entry: TerminalEntry): string` projects a validated
  document entry through `formatResourcePath`.
- `formatDocument(document: PublicDocument): string` uses the same projection
  for neutral `ls`/document rows.

### 3. Contracts

- Validated `/posts/...`, `/pages/...`, and `/.rshell/tmp/...` identities are
  displayed as `~/blog/<path>`; `/` is displayed as `~/blog`.
- Named grep matches, find rows, ls document rows, title bars, accessibility
  labels, and no-JavaScript directory/home recovery views use that display.
- Stdin grep remains `-`; structured VFS values remain slash-rooted; browser
  links remain canonical route `href` values and never come from display text.

### 4. Validation & Error Matrix

| Condition | Required result |
| --- | --- |
| validated public or scratch VFS path reaches a formatter | prefix with `~/blog` and preserve the validated suffix |
| grep match has `path === '-'` | keep `-` and its existing line-number form |
| raw command input is slash-rooted or host-like | reject it through the existing resolver; do not call the formatter as a parser |
| unknown/unsafe path reaches a resource-producing command | fail closed; never manufacture a plausible shell path |
| structured value or browser navigation is rendered | retain internal path or canonical `href`, respectively |

### 5. Good / Base / Bad Cases

- Good: copy `~/blog/posts/infra/docker-handbook.md` from grep output into
  `cat` and read the same validated document.
- Base: a nested cwd still shows the document's full `~/blog/<virtualPath>`;
  `posts/` and `characters/` remain compact child directory labels.
- Bad: print `/posts/infra/docker-handbook.md` or `infra/docker-handbook.md`
  as a document identity, or accept `/posts/...` merely because it was printed.

### 6. Tests Required

- Terminal unit tests assert the root/document formatter, post/page ls/find
  rows, named grep, `-n`, stdin, scratch, pipelines, redirects, and retained
  slash-rooted input rejection.
- Site tests assert interactive grep/find/tree output, copy the named grep
  location into `cat`, and verify home/directory static recovery labels and
  canonical links.
- Static output tests assert title bars and recovery/document labels use one
  shell-visible path while templates and structured metadata keep VFS keys.

### 7. Wrong vs Correct

```ts
// Wrong: a printed internal path looks like a command operand but is rejected.
const label = match.path;

// Correct: validated VFS identity is projected once for user-facing text.
const label = match.path === '-' ? '-' : formatResourcePath(match.path);
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
