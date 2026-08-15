# Read-only rshell knowledge browser

## Goal

Turn the Terminal home into a browser-resident, read-only rshell for exploring
the site's public knowledge base. It must feel like a small shell while staying
a static-site feature: no real shell, server process, browser `eval`, network
content loading, or access to the host filesystem.

## Confirmed Facts

- The existing Terminal runtime is a framework-free TypeScript command registry
  with a quoted-token parser, immutable state, command completion, and strict
  public-entry/experiment decoders.
- The home page already passes a build-projected list of public posts, pages,
  and listed experiments to that runtime. `cat` clones a trusted, build-rendered
  document template; it does not read Markdown in the browser.
- Existing commands are `help`, `ls`, `open`, `cat`, `vim`, `tree`, `about`,
  `pwd`, `whoami`, `date`, `history`, and `clear`. The default identity is the
  public guest and the initial virtual location is `~/blog/posts`.
- Existing contracts reject path traversal, hidden paths, URLs, controls, and
  other unsafe document operands. Browser validation covers desktop/mobile,
  JavaScript/no-JavaScript recovery, keyboard ownership, and public-content
  isolation.

## Requirements

- R1: Keep rshell read-only and browser-local. It may expose only the public
  virtual mounts `posts`, `pages`, and `lab`; it must not reach private content,
  a host filesystem, a server command service, or arbitrary URLs.
- R2: Provide the requested command surface: `help`/`?`, `ls`, `cat`, `cd`,
  `tree`, `pwd`, `whoami`, `id`, `date`, `history`, `clear`, `alias`, `grep`,
  and `|`. Existing `open`, `vim`, and `about` remain available unless a later
  decision explicitly removes them.
- R3: Model session state as a virtual current directory. Relative paths,
  `pwd`, prompt rendering, `ls`, `tree`, `cat`, and `cd` must agree on the same
  canonical public path model.
- R4: `whoami` reports the public session identity. `id` additionally explains
  the identity's read-only access to the public `posts`, `pages`, and `lab`
  resources; it must not imply authentication or hidden/private capabilities.
- R5: `alias` exposes only rshell's built-in aliases. It must not mutate a
  persistent browser profile or evaluate user-defined command text.
- R6: Pipelines follow the familiar Unix mental model: each stage receives the
  preceding stage's normalized text output as stdin and emits normalized text
  for the next stage. More than one `|` is allowed. This is an in-browser,
  deterministic text-stream contract, not process execution, byte-stream I/O,
  shell expansion, or command substitution.
- R6a: `grep` searches normalized visible text from public documents, including
  a document's public title and readable body text. It does not expose raw
  Markdown, HTML, private source paths, or authoring-only metadata. Direct
  `cat` remains the existing trusted rendered-document view; a piped `cat`
  supplies this normalized text to `grep` instead.
- R6b: Every pipeline stage receives stdin, but commands only consume it where
  that has clear public knowledge-browser meaning. `grep` filters stdin when
  present; output-producing commands such as `ls`, `tree`, `pwd`, `whoami`,
  `id`, `date`, `history`, and `alias` can feed later stages. Navigation,
  document-reader, screen-clearing, and current-directory mutations must stay
  standalone rather than gain surprising pipeline side effects.
- R7: Preserve the existing canonical-document experience: direct `cat` keeps
  its trusted inline rendered document behavior, and `vim` remains navigation to
  the read-only document reader.
- R8: Keep no-JavaScript recovery links, accessibility behavior, deterministic
  tests, and public/private content isolation intact.
- R9: The first rshell release must be designed as a capability shell rather
  than a one-off command parser. Its grammar, AST, command contracts, policy
  gate, resource budgets, stdout/stderr rendering, and tests must make future
  safe simulation of selected shell-like features possible without ever
  delegating to Bash, a PTY, a process, a host filesystem, or arbitrary network.
- R9a: Each command is individually capability-scoped. It may receive only the
  public virtual resources, stdin, and/or ephemeral scratch storage that its
  declared contract permits; no command receives ambient host, DOM, network, or
  arbitrary resource authority from the shell router.
- R9b: Nested command substitution is a first-release feature for expressive
  knowledge-blog queries. It may invoke only explicitly marked pure text commands
  under fixed nesting/input/output budgets. State changes, navigation, scratch
  writes, and redirection are forbidden inside `$(...)`.
- R9c: `>` and `>>` are first-release features only for a bounded,
  per-page-session in-memory scratch namespace. They cannot write public
  resources, the browser filesystem, persistent storage, or the host; refresh
  discards the namespace.
- R9d: `grep` has a first-release safe regular-expression mode. It searches only
  stdin or explicitly allowed public/scratch virtual resources, never host/system
  paths or a network response, and uses a bounded non-backtracking regex subset.

## Acceptance Criteria

- [x] `help` and `?` describe every supported rshell command, its accepted
  operands/options, and its built-in aliases.
- [x] The public virtual filesystem supports canonical absolute and relative
  navigation with `cd`, `pwd`, `ls`, `cat`, and `tree`, while rejecting traversal,
  hidden/private paths, URLs, and malformed inputs.
- [x] `whoami` and `id` produce clear guest/read-only/public-resource output
  without exposing private source paths or content.
- [x] `history`, `clear`, `date`, and `alias` have deterministic, accessible
  output and preserve the established session/input behavior.
- [x] `grep` searches only the approved public text surface; `|` passes a
  normalized text stream left-to-right through one or more supported stages and
  rejects malformed syntax or standalone-only state/navigation commands.
- [x] Direct `cat` still produces the current trusted inline document result;
  piped output never uses unsafe HTML insertion or a browser Markdown parser.
- [x] Unit and browser coverage prove the command contract, pipe/error cases,
  keyboard completion/history behavior, public-only access, no-JavaScript
  recovery, and desktop/mobile rendering.
- [x] Every first-release simulated language feature has a written capability
  boundary, deterministic budget/error behavior, and a regression proving it
  cannot cross into host execution, persistent storage, private content, or
  network access.
- [x] Redirection creates or appends only bounded ephemeral scratch resources;
  command substitution accepts only pure command ASTs; hostile nesting,
  resource paths, output sizes, and attempted state/navigation/write effects are
  rejected without partial state.
- [x] Regex grep supports the documented safe subset and flags while rejecting
  unsupported backtracking-only syntax, excessive patterns/results, and every
  resource outside the public/scratch virtual roots.

## Out of Scope

- A real POSIX shell, PTY, Bash/JavaScript evaluation, arbitrary scripts,
  process execution, host filesystem/network access, uploads, real filesystem
  writes/deletes, environment variables, arbitrary redirects or substitution,
  or user-defined persistent aliases. The narrowly bounded in-memory
  redirection and pure command-substitution forms specified in R9b/R9c are in
  scope.
- Authentication, accounts, comments, SSR, APIs, databases, or a remote command
  service.
- Full GNU/POSIX compatibility for any command or arbitrary multi-stage shell
  syntax.

## Key First-Release Decisions

- Rshell uses per-command capability boundaries, not an all-powerful shell
  context. Nested expressions are a deliberate information-expression feature.
- `>`/`>>`, bounded pure `$(...)`, and safe regex `grep` ship in v1 as simulated
  capabilities.
- Grep may enumerate only its explicit stdin or the virtual resource roots it is
  authorized to search. The host/system filesystem, arbitrary process objects,
  private content, browser storage, and network never become grep resources.

## Open Questions

None. Real PTY/process execution, host writes, raw network, raw Markdown/HTML,
and full POSIX compatibility remain out of scope.
