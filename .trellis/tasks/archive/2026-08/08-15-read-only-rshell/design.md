# Read-only rshell design

## Architecture

Rshell extends the existing Terminal command interpreter rather than adding a
shell runtime, backend, or package. The `@f1refly/presentation-terminal/runtime`
subpath remains pure and DOM-free; `terminal-home.ts` remains the only browser
controller and DOM owner.

```text
public Astro entries + trusted public templates
  -> controller validates index/template bijection
  -> controller extracts normalized visible text from title/prose nodes
  -> pure rshell parser and registry execute a virtual cwd + text pipeline
  -> final direct effect or final text lines
  -> controller clones a trusted document or renders text with textContent
```

No stage creates a process, evaluates arbitrary host command text, opens a URL,
reads host files, fetches content, parses Markdown/HTML strings, or sees private
content.

## Per-command capability boundary

The router parses only a restricted AST and invokes registered command handlers.
It does not give them ambient authority. Every definition declares and receives
only the capabilities its own contract needs:

```text
stdin text             -> allowed only for declared consumers
public resource view   -> canonical guest posts/pages/lab only
session scratch view   -> only for declared scratch readers/writers
clock / identity       -> immutable injected values
stdout / stderr budget -> bounded line/text collectors
```

The pure runtime has no DOM, host filesystem, network, storage, dynamic import,
or process API to begin with. Command-specific facades make the product boundary
explicit: `grep` receives a closed public/scratch resource resolver; `cd` gets a
virtual directory resolver; `>`/`>>` get only a scratch writer; no command gets
a general resource accessor. An attempted capability use outside that command's
declared boundary becomes a typed error before it can mutate session state.

## Virtual filesystem and state

The public virtual root is `~/blog` with only `posts/`, `pages/`, and `lab/`
children. `posts` and `pages` contain only decoded guest-projected entries;
`lab` contains only decoded listed experiments. State adds a canonical cwd below
that root, initially `~/blog/posts`. The visible prompt derives from state, for
example `guest@f1refly:~/blog/posts $`, so `cd`, `pwd`, relative `ls`, `tree`,
and document operands agree.

`cd` accepts only canonical public directories plus `~`, `/`, `.`, and bounded
parent traversal within the virtual root. It has no effect on the host, and an
invalid target leaves state unchanged. `cd`, `clear`, `open`, and `vim` are
standalone operations: using any of them in a pipeline, redirection, or command
substitution is a usage error, rather than an ambiguous state/navigation side
effect.

## Command and identity contract

| Command | Rshell behavior |
| --- | --- |
| `help`, `?` | `?` is the one built-in alias for `help`; output comes from the active registry. |
| `ls [path]` | Lists the cwd or an explicit public directory, with usable canonical operands and native links for known destinations. |
| `cat <path>` | Standalone: clone the existing trusted rich document. In a pipe: emit the document's normalized public visible text. With stdin and no operand, behave as a text pass-through. |
| `cd [path]` / `pwd` | Change or print only the canonical virtual cwd. `cd` without an operand goes to `~/blog/posts`. |
| `tree [path]` | Deterministically prints a public subtree relative to cwd or by canonical path. |
| `whoami` / `id` | Report `guest`; `id` also reports read-only access to public `posts`, `pages`, and `lab`, plus denial of private/draft/host/network resources. |
| `date` | Prints the injected UTC clock. |
| `history` / `clear` | Preserve the established bounded-history and clear-to-fresh-prompt semantics. |
| `alias [name]` | Lists or queries baked-in aliases only; it cannot create persistent/user-defined aliases. |
| `grep [-inF] <pattern> [path ...]` | With stdin, filters its lines. Without stdin, searches normalized visible text of named public documents or approved resource roots. Default patterns use the documented safe regular subset; `-F` is literal, `-i` is case-insensitive, and `-n` adds line numbers. |

`about` remains as an existing standalone/text-producing command. No command is
removed by this task.

## Unix-like pipeline contract

The grammar accepts one or more stages separated by unquoted `|`; quotes keep a
literal pipe inside an argument. Every nonempty stage receives the preceding
stage's normalized `stdout` line stream as stdin. It either consumes that stream
(`grep`, and `cat` pass-through) or behaves like a Unix producer that ignores it
and emits its own deterministic public output (`ls`, `tree`, `pwd`, `whoami`,
`id`, `date`, `history`, `alias`, `help`, `about`).

The parser rejects a leading/trailing/consecutive pipe, unbalanced quote,
redirection, command substitution, and standalone-only commands inside a pipe.
An error aborts the pipeline and remains an error effect; it never becomes stdin
for a later stage. The final stage in any pipeline renders only text lines. This
preserves direct `cat` as rich trusted DOM while making `cat path | grep term`,
`ls | grep term`, `tree | grep term`, and chained filters familiar.

The runtime represents a stage result as both its existing render effect and a
normalized immutable stdout line stream. The controller renders the final
effect; it never treats stdout as markup. A fixed stage/result ceiling prevents
an accidental long command or broad search from creating an unbounded transcript
record, with a deterministic truncation notice when needed.

## Simulated substitution and redirection

`$(...)` is parsed as a nested AST, never passed to a JavaScript or shell
evaluator. Only commands marked `pureText` may run there: their output is
captured under the same budgets, trailing line boundaries are normalized, and
the result substitutes as one argument value without a second round of shell
word splitting. The evaluator rejects unbalanced forms, nested pipelines that
contain non-pure commands, redirection, and a fixed maximum nesting depth.

`>` replaces and `>>` appends to a safe leaf below `/.rshell/tmp/`, a bounded
in-memory namespace that exists only for one live page session. A scratch entry
has a safe NFC name, byte/line cap, and file-count cap; it is never serialized,
saved to browser storage, exposed through the static public artifact, or mapped
to a host path. `cat`, `ls`, and `grep` may read a named scratch entry only via
their own capability-scoped resolver. Redirection applies only to final text
stdout; document/navigation effects and errors cannot be redirected.

## Safe regex grep

Grep uses an rshell regular-language engine rather than JavaScript `RegExp`.
Its syntax follows a documented RE2-like subset: literals/escapes, `.`, anchors,
character classes, grouping, alternation, and bounded repetition. Backreferences,
lookaround, dynamic flags, and other non-regular/backtracking constructs are
rejected. The engine compiles into an iterative finite-state representation;
pattern length, repeat bounds, input bytes, results, and total work are capped.
This produces deterministic failure instead of ReDoS.

Unquoted `|` remains a pipeline delimiter, so regex alternation is quoted in the
familiar shell style (`grep 'nahida|furina'`). With stdin, grep can see only that
stream. Without stdin, it can scan only canonical guest text documents and
explicitly named session scratch entries; no host, private, process, network,
or browser-storage object is representable as a grep operand.

## Public visible-text corpus

The controller derives a frozen corpus only after successful template/index
validation. For each decoded public entry it reads the trusted template's public
metadata/title/prose text nodes, omitting the terminal's permalink and return
chrome, then normalizes whitespace into deterministic lines. The corpus is not
a new serialized index, raw Markdown payload, or HTML parser input: all source
text already exists in the public static template and crosses into the pure
runtime only as plain immutable lines.

Direct `grep` identifies corpus matches by canonical virtual path and line
number. Piped `grep` emits matching stdin lines (and optional line numbers), so
both forms have conventional, predictable output without exposing authoring
syntax.

## UI and accessibility decisions

The UUPM research applies only its relevant recommendations: retain the existing
content-first high-contrast Terminal design, visible focus, logical keyboard
order, explicit text error/recovery, responsive wrapping/local overflow, and
immediate behavior under reduced motion. It does not add landing-page CTAs,
external fonts, decorative animation, new icons, or a client router.

The accessible input label and polite latest-result announcer update with the
derived cwd/prompt. Expanded output must not steal focus from the fresh prompt;
existing IME, modified-key, native-control, ARIA-widget, selection, and mobile
Enter protections remain unchanged. No-JavaScript fallback still exposes the
same native public links.

## Compatibility, rollout, and rollback

This is an additive browser enhancement. Initial static HTML/recovery and
canonical document routes do not change. A startup validation or controller
failure restores the existing recovery surface. Session scratch disappears on
refresh or failure. Rollback is a single task-commit revert; no database,
deployment state, or user profile migration exists.
