# Frontend Type Safety

## Compiler Baseline

All frontend units are private ESM packages with local exact lockfiles. Keep
compiler/framework versions local:

- `packages/x-core/`: TypeScript `6.0.3`, framework-neutral.
- `presentations/semantic/`: TypeScript `6.0.3`, type-level X Core dependency.
- `presentations/terminal/`: TypeScript `6.0.3`; adapter root plus an independent
  framework-neutral runtime export.
- `apps/site/`: Astro `7.1.6`, TypeScript `6.0.3`.
- `experiments/nerv/`: Astro `^4.16.18`, TypeScript `^5.9.3`.

Do not weaken strict settings or synchronize versions merely for consistency.

## Scenario: Executable Content Metadata Contract

### 1. Scope / Trigger

Use this contract whenever adding/changing content metadata, loaders, public
filters, or generated post/page routes. It prevents authored YAML values from
silently becoming invalid dates, routes, layouts, or presentations.

### 2. Signatures

```js
postSchema.parse(metadata)
pageSchema.parse(metadata)
```

```ts
getPublicContent(): Promise<{ posts: PublicPost[]; pages: PublicPage[] }>
getPublicPosts(): Promise<PublicPost[]>
getPublicPages(): Promise<PublicPage[]>
```

Collections import the same `postSchema` / `pageSchema` objects that Node tests
exercise. Do not create a test-only schema.

### 3. Contracts

| Field | Contract |
| --- | --- |
| `title`, `description` | required, trimmed, non-empty strings |
| post `slug` | optional canonical safe URL segment; when absent, the physical filename stem is used |
| page `slug` | required canonical safe URL segment; NFC, non-hidden, no whitespace, slash, percent, backslash, query, fragment, control, or dot segment |
| `date` | required valid `Date` or non-empty string coercible to a valid date |
| `updated` | optional same input boundary; cannot precede `date` |
| `tags` | optional array of trimmed non-empty strings |
| `draft` | required boolean |
| post `layout` | exactly `post` |
| page `layout` | schema accepts `page`, `timeline`, `files`; current public projection accepts only `page` |
| `presentation` | optional lowercase kebab-case adapter ID; omission resolves to the shared `DEFAULT_PRESENTATION_ID` (`f1refly`); explicit `semantic` remains available; registry membership is a build-time X Core check |
| `aliases` | optional canonical absolute trailing-slash directory routes; every segment passes the safe route-segment gate |
| `access` | optional exact public/private-owner union; omission defaults public; private requires a safe subject owner |
| unknown keys | rejected by strict schemas |

Canonical document/directory/alias routes must be unique under the shared
Unicode/case collision key. Drafts never enter any identity projection.

### 4. Validation & Error Matrix

| Condition | Required result |
| --- | --- |
| malformed/empty date string | schema failure |
| date input is `null`, boolean, or number | schema failure before coercion |
| `updated < date` | schema failure at `updated` |
| invalid/non-NFC/hidden/percent slug or alias | schema failure |
| private without owner, public with owner, or malformed subject | schema failure |
| unknown layout, malformed presentation ID, or unknown key | schema/public-projection failure |
| valid but unregistered presentation ID | X Core build failure naming document and requested adapter |
| duplicate/colliding canonical path, directory, or alias | build failure naming both owners |
| draft entry | valid input but excluded from links/routes/output |
| public `timeline`/`files` before its route exists | build failure naming the current route/layout boundary |

`z.coerce.date()` alone is insufficient: JavaScript coercion accepts values such
as `null`, booleans, and numbers. First restrict input to a valid `Date` or
non-empty string, then pipe to date coercion.

### 5. Good / Base / Bad Cases

- Good: valid framework-neutral Markdown keeps a safe staged relative path for
  physical identity; a post may use an explicit safe route slug and a page uses
  its required stable slug; both become typed routes.
- Base: a valid draft parses but is absent from the public projection.
- Bad: using raw `z.coerce.date()`, deriving a route from title/filename, or
  filtering drafts independently in each page.

### 6. Tests Required

- `./sam npm --prefix apps/site run test:content`: valid metadata plus malformed
  string, scalar date, slug, layout, presentation, chronology, and unknown-key
  cases.
- `./sam npm --prefix apps/site run check` and `run build`: collection and route
  integration.
- Negative builds when changing public invariants: duplicate/colliding route,
  unsupported public layout, unregistered adapter, private leakage, and raw HTML
  must fail with actionable
  owner/details. Use ignored same-filesystem `apps/site/test-results/` output and
  `finally` cleanup so failed Astro staging cannot damage normal `dist/`.
- Inspect `apps/site/dist/` to assert the public routes exist and drafts do not.

### 7. Wrong vs Correct

#### Wrong

```js
date: z.coerce.date()
```

#### Correct

```js
const dateInput = z.union([z.date(), z.string().trim().min(1)]);
const strictDate = dateInput.pipe(z.coerce.date());
```

The concrete helper name may differ; the input restriction and regression tests
are the contract.

## Scenario: Terminal Index, Registry, and Effects

### 1. Scope / Trigger

Use this contract when changing the Terminal browser index, command definitions,
aliases, state/effects, completion, or DOM controller. The runtime remains pure;
native recovery remains available when enhancement validation fails.

### 2. Signatures

```ts
decodeTerminalEntries(value: unknown): readonly TerminalEntry[]
decodeTerminalExperiments(value: unknown): readonly TerminalExperiment[]
createTerminalCommandRegistry(
  definitions: readonly TerminalCommandDefinition[]
): TerminalCommandRegistry

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

interface ReadonlyVirtualFs {
  resolve(input: string, cwd: string, mode: 'directory' | 'resource' | 'pattern'): PathResolution;
  stat(path: string): VfsNode | undefined;
  list(path: string): DirectoryListing | undefined;
  glob(pattern: string): readonly string[];
  read(path: string): ReadableResource | undefined;
}

interface ShellIdentity {
  readonly user: string;
  readonly host: string;
  readonly workingDirectory: string;
  readonly about: string;
}

interface ReadonlyShellScratchFile {
  readonly name: string;
  readonly lines: readonly string[];
}

interface ReadonlyShellAlias {
  readonly name: string;
  readonly target: string;
}

interface ReadonlyShellSession {
  readonly history: readonly string[];
  readonly scratch: readonly ReadonlyShellScratchFile[];
  readonly aliases?: readonly ReadonlyShellAlias[];
}

interface ShellCommandMetadata {
  readonly name: string;
  readonly aliases: readonly string[];
  readonly usage: string;
  readonly summary: string;
  readonly group: TerminalCommandGroup;
  readonly order: number;
}

interface ProcessContext {
  readonly stdin?: TextStream;
  readonly cwd: string;
  readonly fs: ReadonlyVirtualFs;
  readonly session: ReadonlyShellSession;
  readonly clock: () => Date;
  readonly signal: ShellSignal;
  readonly commands?: readonly ShellCommandMetadata[];
  readonly identity?: ShellIdentity;
}

type CommandOptionValue = true | string;

interface ParsedCommandArguments {
  readonly options: Readonly<Record<string, CommandOptionValue>>;
  readonly operands: readonly string[];
}

type CommandArgumentParser =
  (argv: readonly string[]) =>
    | { readonly ok: true; readonly arguments: ParsedCommandArguments }
    | { readonly ok: false; readonly message: string };

interface CommandSpec {
  readonly name: string;
  readonly aliases: readonly string[];
  readonly usage: string;
  readonly summary: string;
  readonly group: TerminalCommandGroup;
  readonly order: number;
  readonly policy: CommandPolicy;
  readonly parse: CommandArgumentParser;
  readonly execute: (context: ProcessContext, args: ParsedCommandArguments) => ProcessResult;
}

interface ProcessResult {
  readonly status: number;
  readonly stdout: TextStream;
  readonly stderr: TextStream;
  readonly statePatch?: ShellStatePatch;
  readonly controls?: readonly ShellControlEvent[];
  readonly value?: CommandValue;
}

interface ShellRunnerOptions {
  readonly stages: readonly RshellStage[];
  readonly cwd: string;
  readonly fs: ReadonlyVirtualFs;
  readonly session: ReadonlyShellSession;
  readonly clock: () => Date;
  readonly signal: ShellSignal;
  readonly registry: CommandSpecRegistry;
  readonly pure?: boolean;
  readonly depth?: number;
}

runRshell(options: ShellRunnerOptions): ProcessResult
runRshellInput(input: string, options: Omit<ShellRunnerOptions, 'stages'>): ProcessResult

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

interface TerminalEntriesEffect {
  readonly kind: 'entries';
  readonly directories: readonly string[];
  readonly entries: readonly TerminalEntry[];
  readonly label: string;
  readonly directory: string;
}
interface TerminalState {
  readonly history: readonly string[];
  readonly historyCursor: number | null;
  readonly draftInput: string;
  readonly cwd: string;
  readonly scratch: readonly ReadonlyShellScratchFile[];
  readonly aliases: readonly ReadonlyShellAlias[];
}
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
completeCommand(
  input: string,
  entries: readonly TerminalEntry[],
  experiments?: readonly TerminalExperiment[],
  registry?: TerminalCommandRegistry,
  cwd?: string,
  aliases?: readonly ReadonlyShellAlias[]
): CompletionResult
startTerminalHome(root: HTMLElement, seams?: TerminalControllerSeams): void
```

### 3. Contracts

- `TerminalEntry` contains exactly `kind`, `virtualPath`, `relativePath`,
  `filename`, `title`, `href`, and `date`; the virtual/relative fields identify
  the physical `.md` source while `href` is the independently validated
  canonical route. `TerminalExperiment` remains exact `{ id, title, href }`.
- Decoders inspect only own data descriptors in plain dense arrays and exact
  plain/null-prototype objects. They reject accessors, unknown fields, hidden/
  traversal/percent/backslash/non-NFC paths, route drift, and Unicode/case-folded
  duplicates without invoking user behavior.
- Neutral `CommandSpec` records in `commands/registry.ts` own the migrated
  command's canonical name, aliases, summary, usage, group/order, explicit
  pipeline/substitution/redirect policy, argv parser, and `ProcessContext`
  executor. The parser returns frozen options/operands before execution; the
  runtime's `TerminalCommandDefinition` registry is a compatibility projection
  that adds legacy completion and `TerminalEffect` adaptation. Creation still
  validates safe unique tokens, safe metadata, callable parser/handlers, clones/freeze
  records, and supplies the active definition list to `help`, execution, and
  completion.
- The neutral spec list is the source of truth for migrated builtins. Do not add
  a parallel dispatch map, hardcoded help list, raw-index command branch, or
  canonical-name switch. Legacy commands may remain in the facade only while
  their neutral port is being migrated.
- `parseRshell` is authoritative for full Rshell grammar. `tokenizeCommand` is a
  compatibility wrapper over it for one-stage callers and must reject pipes or
  redirects rather than drift into a second tokenizer.
- After shell parsing, every neutral command runs its definition-owned argv
  parser. Boolean short options may be clustered (`-inF`), long/short aliases
  may be interspersed with operands (`grep -i a` and `grep a -i` are equivalent),
  and `--` ends option parsing. Unknown options, missing/extra operands, and
  invalid option values fail before the command handler receives control; the
  command handler receives only frozen `options` and `operands`.
- Rshell execution resolves aliases to the canonical definition and the runner
  passes migrated commands only a `ProcessContext`: optional stdin, virtual cwd,
  read-only VFS, immutable session snapshot, clock, and signal. Pipeline
  position is not a command input. stdout alone reaches the next stage; stderr
  remains separate. The compatibility registry may still expose raw fields to
  legacy custom handlers until that API is retired. Neutral policy rejects
  forbidden pipelines, substitutions, or redirects before execution.
- `shell/runner.ts` owns parser-stage expansion, stage scheduling, stdin/stdout
  wiring, stderr accumulation, non-zero short-circuiting, state-patch
  application, and bounded `/.rshell/tmp/<safe-name>` replace/append writes.
  It returns the final neutral `ProcessResult`; controls and structured values
  are never serialized into pipe input. `runRshellInput` is only a convenience
  parse-and-run wrapper and must not grow a second grammar.
- During legacy-handler retirement, `runtime.ts` may route only the default registry's fully
  neutral core stages through `shell/runner.ts`. Custom registries and stages
  whose commands remain legacy must stay on the compatibility path so custom
  handlers and `tree`/`help`/session behavior do not silently change.
- Neutral `tree`, `help`, `pwd`, `history`, `alias`, and identity/time commands
  consume only injected VFS/session/metadata/identity ports. `tree` filters the
  hidden `/.rshell` mount from public output; `help` groups the injected command
  metadata by declared group/order, so adding a command updates its spec and
  tests rather than a formatter switch.
- `friends` consumes only the immutable `friendLinks` port. Its direct result is
  a closed `links` effect with exact `{ name, desc?, url }` records; the
  runtime's stdout projection is `name — url` or `name — desc — url` per line
  for text pipelines and redirects.
  The browser decoder revalidates safe `http(s)` URLs, rejects duplicate URLs,
  unknown fields, accessors, sparse arrays, and decorated objects, and the DOM
  renderer creates anchors with properties/text nodes rather than HTML strings.
  Direct link rows use the same aligned responsive grid language as `ls`: the
  columns are name, optional description, and URL; an absent description still
  occupies its column so URLs do not shift between rows. The mobile layout
  stacks those cells without changing the order or native-link semantics.
- `ls`, `cat`, `grep`, `cd`, `open`, `vim`, and `clear` execute through isolated
  command modules and `commands/registry.ts`. `vfs/public-index.ts` is the only
  adapter from decoded Terminal arrays to `ReadonlyVirtualFs`; command modules
  must not import `runtime.ts`, `apps/site`, DOM types, or host filesystem APIs.
- `DirectoryListing.directories` and `DirectoryListing.documents` are both
  immediate-child projections. `documents` contains only documents whose
  parent is the listed directory; a consumer that needs a recursive corpus
  (such as grep) must explicitly walk those directories through the VFS and
  keep its own visited/work-limit boundary.
- `ShellStatePatch` carries cwd/session updates and `ShellControlEvent` carries
  clear/document/experiment actions. Neither is stdout and neither may enter a
  pipeline. `ProcessResult.status !== 0` exposes bounded stderr and stops the
  current pipeline.
- Effects are closed: `lines`, structured `help`, structured `grep`, `entries`,
  `experiments`, `navigation`, `document`, `document-navigation`, `tree`, and
  `clear`. Help groups contain renderable command metadata. Grep matches contain
  canonical source paths, optional one-based line numbers, original lines, safe
  bounded ranges, and explicit `noResults`/`truncated` state. Navigation effects
  contain decoded records; raw input never becomes a URL.
- Pipeline execution keeps bounded plain `stdout` as the inter-stage contract,
  but the final grep stage retains its structured effect even when it consumed
  stdin. Thus `cat file | grep a` can highlight in the DOM while
  `grep a | cat` still receives deterministic text.
- `TerminalTextDocument.lines` remains line-oriented. Build extraction preserves
  `<pre>` indentation, blank lines, and internal spacing so structured grep can
  identify the original source line; prose metadata may use one normalized line.
  The DOM controller renders command output through text nodes and bounded marks,
  never `innerHTML` or an HTML parser.
- The standalone `entries` effect carries the canonical public `directory`,
  immediate child `directories`, and direct decoded `entries`. The renderer
  shows directories and documents in one flat directory-first list, with no
  synthetic `/` file group or nested indentation, then renders native links plus
  typed date/title fields in stable grid columns on wide viewports; narrow
  viewports retain name/date on the first row and place the title below.
  `directories` and document rows are both included in the deterministic plain
  stdout projection.
- `ls` accepts zero or one safe virtual path operand. Its `-h` and `--help`
  branches derive usage text from the active definition. Standalone listing,
  exact operands, completion, and a single-segment `*` wildcard use the same
  bounded public-path set: mount roots list only virtual directories, public
  directories list only immediate decoded documents/directories, and an exact
  document such as `/pages/about.md` returns a one-entry `entries` effect whose
  `directory` is `/pages`. A unique directory prefix completes with `/`, while
  a unique document prefix completes without one (for example `ls he` to
  `ls hello-static-foundation.md`); both retain focus. Wildcards are deterministic
  and never host filesystem globs. Multiple matches in one virtual directory
  aggregate into one deterministic `entries` effect, so `ls *.md` lists all
  matching documents instead of returning a multiplicity error. `posts`, `pages`, and `lab` aliases accept
  one optional trailing slash and normalize to their absolute mounts. `/lab/`
  returns the validated Experiment catalog; `/lab/<listed-id>` is a catalog
  leaf, not a host/build resource, and returns a bounded `open lab/<id>` hint
  for either slash form. With no operand, safe `ls ` completion keeps the
  prompt focused while showing candidates; every Tab in the focused prompt is
  prevented, while ordinary ambiguous path completion leaves input unchanged.
- Completion handlers receive the immutable current cwd. `cd` completion is
  relative to that cwd, while `cat`/`vim` completion and execution resolve
  relative operands under it; after `cd characters`, `cat n` therefore completes
  and reads `nahida.md`. After `cd characters`, `ls` returns a structured
  entries effect for `/posts/characters` so the DOM renders the direct directory
  contents as a flat list with entry metadata instead of synthetic groups or
  bare filenames. The active prompt remains focused after a unique `cd` Tab and
  after the submitted directory change, including when a narrow viewport must
  wrap a long prompt.
- When the prompt is focused, every Tab event is prevented, including modified
  and IME/composing variants; only an unmodified, non-composing event may
  rewrite input. Safe `cd` completion returns only immediate child directories
  for the current cwd and explicitly refocuses the prompt. The virtual root
  case `cd ` must report `lab/`, `pages/`, and `posts/` without exposing nested
  descendants in the completion hint. Tab outside the prompt remains native.
- The canonical VFS root is `/`, while the prompt's `~/blog` is its display
  alias. Directory commands resolve `.` against `/` without producing `//.`;
  therefore `cd ../` from `~/blog/posts` followed by `ls` is equivalent to
  `ls /`. Resource-relative document paths retain the existing contract that
  ordinary relative documents resolve under the posts workspace and pages use
  `/pages/<path>.md`.
- The `ls` definition owns `l` and `ll`, and `clear` owns `cls`; help, alias
  output, command lookup, and completion all derive these mappings from the
  same frozen registry records. `alias` lists mappings with no operand and
  queries one mapping with `alias l`, `alias ll`, or `alias cls`. Safe
  `alias name=command` creates a session-only alias that resolves through the
  active registry and disappears on refresh; it is never persisted.
- The controller intercepts only an unmodified, non-composing `Ctrl+L` on the
  active prompt. It clears the visible transcript through the same path as the
  `clear` effect, resets input/completion, preserves submitted history for
  ArrowUp, and leaves modified or IME-composed variants native.
- `cat`/`vim` share the virtual resolver/completer from
  `content-workspace-contract.md`. Safe zero-result paths use a distinct
  `no-match` result; safe ambiguity marks rewrite ownership explicitly. Other
  ambiguity and unsafe input leave the input unchanged, while the focused
  prompt still prevents Tab's default action.
  Template validation/cloning and global typing retain the existing
  descriptor, fallback, focus, ID scoping, IME, ARIA, and reduced-motion gates.

### 4. Validation & Error Matrix

| Condition | Required result |
| --- | --- |
| accessor, sparse/decorated array, custom prototype, unknown field | decoder `TypeError`; behavior not invoked |
| unsafe/noncanonical/fold-colliding path or href | decoder `TypeError` before shell reveal |
| unsafe/colliding command or alias, bad metadata/handler | registry `TypeError` at creation |
| missing command parser or unsafe parser metadata | command-spec registry rejects the definition before execution |
| duplicate hardcoded command/help dispatch | implementation review failure; registry definitions must remain the single source |
| empty command | unchanged state, null effect, empty announcement |
| unknown command or bad operand | error-line effect; no throw/shell interpretation |
| mixed-depth `entries` rendering | render immediate directories and documents in one flat directory-first list, align name/date/title, and preserve flat stdout |
| `ls` option, directory prefix, or empty-operand Tab | definition-owned help for `-h`/`--help`; unique safe prefix such as `ls pa` completes to `ls pages/`; ambiguous `ls p` leaves input unchanged and reports only `pages/`, `posts/`; prompt Tab is always prevented |
| `ls lab` DOM presentation | experiments use the same flat no-marker terminal list row treatment as document listings while retaining validated native destinations |
| safe `cd` completion | own Tab for safe unique/ambiguous/no-match results, explicitly refocus the prompt, and show only immediate directory candidates at the virtual root and nested virtual directories |
| inline `cat` document stream | render trusted content without a redundant `Return to prompt` footer while preserving document focus/settlement |
| `Ctrl+L` and `cls` | unmodified Ctrl+L clears the transcript without erasing command history; `cls` resolves to clear through the canonical registry and appears in help/alias output |
| direct directory listing | root and public mounts return only immediate directory names and documents; nested documents appear only after entering the child directory |
| nested cwd command | after `cd`, prompt focus remains usable; `ls` renders entries relative to the resolved directory and `cat`/`vim` completion and execution resolve relative operands under that cwd |
| `ls` wildcard | only known public directory segments are matched with bounded `*`; no matches return a typed bounded diagnostic, while multiple same-directory matches return one structured direct-child listing |
| `ls` mount alias or experiment leaf | optional one trailing slash is normalized for `posts`/`pages`/`lab`; `/lab/<listed-id>` gives `open lab/<id>` guidance and never exposes host/build files |
| `ls` question mark or document prefix | typed safe-path error for `?`; document filenames are excluded from directory completion and wildcard matching |
| options before/after operands or short-option cluster | command parser normalizes both orders into the same frozen option/operand result; `--` preserves following dash-prefixed operands |
| relative directory command at virtual `/` | resolve `.` against `/` exactly once; never construct `//.`; `ls` with no operand equals `ls /` |
| invalid grep flag/pattern/resource or mixed stdin and operands | bounded error-line effect; no partial result or host access |
| grep has no matches | `grep` effect with `noResults: true`, empty matches, and a bounded announcement |
| grep matches | `grep` effect preserves canonical path, source line, optional line number, and safe ranges |
| final piped grep | structured effect is rendered; its bounded plain stdout remains available to later stages |
| multi-line `<pre>` template | one resource line per source line; no whitespace flattening before matching |
| hostile/unknown-root `cat` or `vim` path | not-found/usage or no completion; no navigation or completion rewrite, and focused-prompt Tab remains prevented |
| safe ambiguous `cat`/`vim` path | `ambiguous` with `ownsTab: true`; retain focus and prefixed candidates |
| safe zero-result `cat`/`vim` path | exhaustive `no-match` with `ownsTab: true`; retain exact input/focus and status |
| non-path command ambiguity | `ambiguous` with `ownsTab: false`; leave input unchanged while the focused prompt still prevents Tab's default action |
| any ambiguous completion rendering | show normalized candidates followed by `input unchanged by design; type more to complete.`; treat it as a normal multi-candidate state, not an error |
| custom registry alias in a pipeline | execute the canonical custom definition with bounded text stdin; do not fall back to a legacy single-command path |
| custom non-text effect in a pipeline/substitution | typed error; no navigation, DOM effect, or partial scratch mutation |
| malformed template or controller exception | retain/restore recovery and hide partial session |

### 5. Good / Base / Bad Cases

- Good: a custom test definition and alias appear in active-registry help,
  execute through either token, and complete without changing a central switch.
- Good: grouped `help` is a semantic effect, and `grep -nF "# "` returns more
  than one original source line with bounded ranges; a missing pattern is an
  explicit no-result state rather than an error.
- Good: `ls posts` renders a `characters/` directory row plus only the root-level
  document rows in one flat list, while its pipeline output remains the
  deterministic direct-child lines; entering `characters/` then reveals
  `nahida.md`.
- Good: `ls charac` completes to `ls characters/` with focus retained, and
  `ls cha*`, `ls *cha*`, and `ls --help` have deterministic safe results.
- Good: `alias` lists `l=ls`, `ll=ls`, and `cls=clear`; each queried alias
  executes the canonical command, and `ls *.md` renders every matching direct
  document in one flat listing.
- Good: `cd charac` completes to `cd characters/` and keeps focus; after
  entering that directory, `ls` renders `nahida.md` under `/` with its date and
  title, and `cat n` completes and reads `nahida.md` relative to the cwd.
- Good: `ls lab/` and `ls /lab/` have the same catalog effect, the DOM uses
  flat no-marker terminal rows, and `ls /lab/nerv` and `ls /lab/nerv/` show the
  bounded `open lab/nerv` guidance without traversing the experiment's host
  files.
- Good: `cat ./characters/nahida.md` and virtual absolute form resolve the same
  decoded entry; `vim` returns that entry's canonical href.
- Good: `grep -i a`, `grep a -i`, and `grep -iF a` use the same command parser;
  `grep -- -pattern` treats `-pattern` as an operand rather than an option.
- Good: a configured `friends` list preserves order and descriptions for direct
  native-anchor output, while `friends | grep example` and scratch redirection
  receive the deterministic `name — url` or `name — desc — url` text projection;
  an empty list announces
  `No friend links.`.
- Good: after `cd ../` reaches the display alias `~/blog`, `ls` lists the
  canonical virtual root exactly as `ls /` does.
- Base: absent JavaScript or validation failure leaves native recovery links.
- Bad: assert datasets, invoke getters, register behavior in parallel switches,
  flatten `<pre>` text before matching, parse HTML strings, resolve host paths,
  or concatenate operands into URLs.

### 6. Tests Required

- Unit: hostile descriptors, registry validation/custom alias/help/execution/
  completion, definition-owned default dispatch, shell/parser compatibility,
  per-command argv parser order/cluster/`--` behavior and parser rejection,
  virtual-root relative directory resolution,
  structured help/grep effects and safe ranges, final-pipeline grep plus
  downstream stdout, all commands/effects, l/ll/cls alias execution/query/help/
  completion, ls options/prefixes/wildcards including multi-match listings,
  direct-child list projections and recursive grep discovery, tree variants, history,
  nested/absolute cat/vim completion, cwd-relative `cd`/`ls`/`cat` behavior,
  root ambiguous `cd` Tab ownership and inline `cat` prompt adjacency,
  mount aliases, trailing-slash normalization, document-prefix rejection,
  listed-experiment leaf handling, `friends` safe-link decoding/direct-vs-
  neutral/text projections, Ctrl+L/cls and lab-row behavior, and hostile path
  rejection.
- Static output: exact serialized fields/template bijection, canonical nested
  routes, bodies absent from index/JS, home-only command asset, canonical-
  document-only reader asset, and package/style graph closure.
- Playwright: prompt/history/IME/Tab/recovery/global typing, grouped help,
  flat mixed-depth `ls`/responsive columns, ls completion focus/options/
  wildcard rendering, multiline grep/no-result rendering,
  tree/cat/vim, Ctrl+L/cls and lab-row behavior, canonical navigation, clone
  scoping, settlement, reduced motion, and protected native/ARIA/local-scroll
  behavior at both viewports.

### 7. Wrong vs Correct

```ts
// Wrong: trust raw values and construct a route from an operand.
const entry = (value as TerminalEntry[])[0];
window.location.assign(`/posts/${operand}/`);

// Correct: decode records, resolve through the registry, then use the closed effect.
const entries = decodeTerminalEntries(value);
const result = executeCommand({ state, input, entries, registry });
if (result.effect?.kind === 'document-navigation') {
  window.location.assign(result.effect.entry.href);
}
```

### Design Decision: Closed Structured Effects

Help and grep are typed runtime effects rather than preformatted HTML or an
untyped string side channel. This keeps the pure engine useful to pipelines while
letting the DOM controller render semantic groups and safe match marks. A new
effect must update the exhaustive union, stdout/announcement projections, DOM
renderer, CSS, and unit/browser assertions in one change. Entry listing follows
the same boundary: the decoded `entries` effect remains data, the controller
owns the flat directory-first presentation and responsive columns, and
`stdoutForEffect()` remains the pipeline projection.

## Local Types and Narrowing

Workspace, access, canonical-path, registry, and reader contracts are detailed
in `content-workspace-contract.md`. Experiment manifest and publication types live in
`@f1refly/validate-experiments`, not in Astro routes or the assembler. Raw JSON
must pass the exact descriptor-safe decoder before narrowing; downstream code
accepts frozen `ExperimentManifest` / `PublicExperiment` values. Terminal narrows
again to exact canonical `{ id, title, href }` data at the browser boundary.
Path types do not prove containment: validate normalized syntax, lexical
containment, and resolved realpath containment before reading, copying, or
executing an Experiment-owned path. The full executable matrix is in
`publication-contract.md`.

- Keep one-consumer Astro props in a local `interface Props`.
- Use `CollectionEntry<'posts'>` / `CollectionEntry<'pages'>` instead of
  redefining loaded entry shapes.
- Let clear local primitives infer; use literal unions for closed variants.
- Type DOM elements at query boundaries and guard optional elements.
- Keep Terminal command/effect unions exhaustive; a new variant must update the
  pure engine, DOM renderer, announcements, and unit/browser tests together.
- Use Astro/Playwright `defineConfig` helpers for contextual typing.

## Avoid

- No `any`, broad assertions, relaxed compiler settings, or duplicated metadata
  interfaces to bypass the source contract.
- Do not accept `remarkPluginFrontmatter.xCore` by assertion. Parse exact fields,
  version, adapter ID, references, outline, and enhancements at the site bridge.
- Do not treat a JSON/Markdown shape as validated merely because it parses.
- Do not cast `experiment.json`, duplicate its interface in a consumer, trust a
  template-literal path type as filesystem containment, or construct a Terminal
  Experiment href from raw command text.

## Reference Files

- `apps/site/src/lib/content-schema.mjs`
- `apps/site/src/lib/content.ts`
- `apps/site/src/content.config.ts`
- `apps/site/tests/content-schema.test.mjs`
- `apps/site/tests/content-build-negatives.test.mjs`
- `packages/x-core/src/contracts.ts`
- `packages/x-core/src/metadata.ts`
- `apps/site/tsconfig.json`
- `experiments/nerv/tsconfig.json`
- `experiments/nerv/src/modules/nerv/components/WarningStripe.astro`
- `presentations/terminal/src/runtime.ts`
- `tooling/validate-experiments/src/index.ts`
- `tooling/assemble-publication/src/index.ts`
- `.trellis/spec/frontend/publication-contract.md`
- `.trellis/spec/frontend/content-workspace-contract.md`
- `presentations/terminal/tests/terminal.test.ts`
- `apps/site/src/scripts/terminal-home.ts`
- `apps/site/src/scripts/terminal-reader.ts`
