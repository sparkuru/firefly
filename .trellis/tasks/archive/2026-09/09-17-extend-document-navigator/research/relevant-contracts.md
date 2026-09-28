# Relevant existing content-workspace contracts

Snapshot for planning context; original: `.trellis/spec/frontend/content-workspace-contract.md`.
The full file exceeds the context-injection limit. These excerpts retain original
line ranges for later source reads. They describe current behavior; approved
PRD/design changes replace old command/theme/composition/exit contracts.
Refresh excerpts if the source changes before implementation.

## Source lines 180–237


completeCommand(
  input: string,
  entries: readonly TerminalEntry[],
  experiments?: readonly TerminalExperiment[],
  registry?: TerminalCommandRegistry,
  cwd?: string
): CompletionResult

startDocumentNavigator(root: HTMLElement): void

type DocumentNavigatorEntry = 'always' | 'fragment'

interface DocumentNavigatorProfile {
  readonly kind: 'document-navigator';
  readonly entry: DocumentNavigatorEntry;
}

interface PresentationExperience {
  readonly id: string;
  readonly adapter: PresentationAdapter;
  readonly documentKind: 'semantic' | 'terminal';
  readonly documentNavigator: DocumentNavigatorProfile;
}

createPresentationExperienceRegistry(
  definitions: readonly PresentationExperience[]
): readonly PresentationExperience[]

resolvePresentationExperience(id: string): PresentationExperience
```

### 3. Contracts

#### Presentation experience composition

- `PRESENTATION_EXPERIENCES` is the single site-owned definition consumed by
  both X Core registration and Astro document dispatch. Its initial entries
  are `firefly -> terminal + { kind: 'document-navigator', entry: 'always' }`
  and `semantic -> semantic + { kind: 'document-navigator', entry:
  'fragment' }`.
- The adapter ID is authoritative. `createPresentationExperienceRegistry`
  rejects an empty experience ID, an adapter identity mismatch, an unsupported
  document kind, an invalid navigator kind/entry, or duplicate IDs. It returns
  a frozen array containing frozen experience/profile records.
- `resolvePresentationExperience` returns the registered experience or throws
  `Unsupported site presentation "<id>"`. Document components receive the
  resolved profile; they must derive entry attributes, initial region
  `tabindex`, and initial status visibility from that profile rather than
  repeating presentation-specific literals.
- The front-matter contract remains `presentation` plus optional
  `articleTheme`. Navigator profiles are site-owned DOM/runtime data and must
  not enter X Core metadata, content schema, route identity, comments payloads,
  or article-theme resolution.

#### Workspace transport and materialization

- `FIREFLY_CONTENT_ROOT` is optional. It defaults to the blog root

## Source lines 980–1030

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

## Source lines 1187–1270

#### Read-only document navigator

- Canonical document routes load `document-navigator.ts` as progressive
  enhancement. Terminal documents support document navigation when focused; semantic
  documents keep the document navigation status hidden and activate it only for the explicit
  `#document-navigator` entry fragment. Static HTML remains complete and
  navigable without JavaScript; directory indexes, home, lab, and NERV do not
  load the document navigator asset.
- The pure `document-navigation` effect remains fragment-free and carries the
  validated canonical `entry.href`. The browser controller owns the only
  document-navigator intent decoration: `documentNavigatorDestinationHref(href: string)` must accept a
  same-origin absolute or path-like canonical URL, set exactly
  `#document-navigator`, and return only its path/query/hash form. Raw `vim`
  operands never reach this helper, and ordinary breadcrumbs, directory links,
  permalinks, and inline `cat` output remain fragment-free.
- A semantic document uses `data-document-navigator-entry="fragment"`; its status
  stays hidden and its region is not focusable until `window.location.hash ===
  '#document-navigator'`. A Terminal document uses
  `data-document-navigator-entry="always"`; its status is visible on direct entry,
  but it only steals focus for the exact document navigator fragment. Fragment entry waits
  one animation frame after native hash settlement, then calls
  `focus({ preventScroll: true })`; direct canonical routes, other fragments,
  Back/Forward, and JavaScript-disabled pages retain native browser ownership.
- `:q` assigns `/` directly and does not use `history` APIs. Document navigator mode,
  search, selection, active-unit, and generated-unit state remain route-local
  and ephemeral; a route change discards them.
- The document navigator owns local `normal`, `visual`, `search`, and `command` modes. Its
  bounded keys are `j`, `k`, `g`, `G`, `/`, `?`, `n`, `N`, `v`, `Escape`, and
  `:q`. It is a navigator, not an editor.
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
  When supported, CSS Highlights register `document-navigation-search` for all
  cloned ranges and `document-navigation-search-active` for the current clone; the
  unsupported-Highlight fallback keeps status/navigation/scrolling functional
  without inserting `<mark>` or taking browser selection ownership. A
  committed query exposes persistent `data-navigation-search-status` text for the
  current occurrence (or bounded no-results text), while the `/`/`?` prefix,
  direction-specific label, and placeholder identify search direction.
  Occurrence movement settles only the page viewport from the range rectangle,
  never a protected nested scroll region. A committed query also sets
  `data-navigation-search-active` on the complete document navigation status section while the
  document navigator is not editing a search or command form; opening `/` or `?` removes
  that marker temporarily but preserves the prior committed status text until
  the form is submitted or cancelled. The status section is viewport-fixed to
  the block-end whenever it is visible, and follows the rendered document navigator region
  in source order so the document header, outline, and prose remain continuous.
  It uses the presentation's token-backed opaque inverse/contrasting surface;
  the Terminal document provides a conservative no-JavaScript fallback, while
  document navigator startup measures the rendered status height and writes the route-local
  `--navigation-status-reserve` value on the article. A `ResizeObserver` refreshes
  that reservation when search/command chrome or responsive wrapping changes;
  article bottom padding and reading-unit scroll margins keep active and final
  content above the fixed edge. The visible status section may bleed from its
  centered document navigator frame to the viewport edges, while the document header,
  outline, and prose retain their existing readable measure; this full-bleed
  treatment must not create document-level horizontal overflow.
  A non-empty query replaces the query, occurrence records, highlights, and
  committed-search marker as one lifecycle;
  an empty submission or Escape clears the query/highlights without changing
  the permanent fixed status lifecycle. The mode/position row owns document navigator
  orientation, `data-navigation-search-status` owns committed occurrence context,
  and `data-navigation-message` owns the latest visible action feedback. When the
  committed search status owns the current feedback, the generic message is
  hidden to avoid a duplicate line; `data-navigation-announcer` remains the
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


## Source lines 1552–1632

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
