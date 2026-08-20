# Terminal relative resource paths — Design

## User operand contract

Every path-aware Terminal command resolves ordinary relative operands from the
immutable virtual cwd, then enforces its own resource type boundary. `open`
therefore accepts only a resolved, listed experiment leaf; it does not create a
destination from the typed operand. This makes a leaf displayed in the current
lab listing executable as `open <id>` while retaining all existing public-VFS
validation.

The only absolute operand spellings are `~/blog` and `~/blog/<safe path>`. A
leading slash, bare `~`, and `~/` are rejected as user syntax; `cd` without an
operand separately returns to `~/blog`. The internal VFS and HTTP route layer
continue to use slash-rooted paths, but those representations never become an
accepted Terminal operand.

## Path semantics

`open` has no cwd-independent experiment shorthand. At the virtual root,
`open lab/<id>` is naturally a relative path; in the lab directory, `open <id>`
and `open ./<id>` are the matching relative forms. Cross-directory navigation
uses the `~/blog` absolute form. This task does not broaden global mount
aliases, document traversal, or experiment access.

Scratch resources follow the same display grammar. Their internal hidden VFS
location is unchanged, but command-visible redirects and errors use the
`~/blog/.rshell/...` form and remain hidden from public directory traversal.

## Completion

`open` completion follows the same contract as execution. In the lab cwd it
offers a safe relative experiment leaf; explicit absolute prefixes retain their
matching forms. Completion remains experiment-only,
preserves user prefixes, and keeps the prompt/focus ownership rules unchanged
for ambiguous, unsafe, modified, or composing input.

A shared operand-prefix classifier owns absolute/relative completion syntax so
the generic, directory, list, tree, and compatibility paths cannot retain
different slash-root behavior.

## UX and accessibility

The change is semantic rather than visual. It preserves native recovery links,
keyboard-first command entry, visible focus, no-focus-loss error behavior, and
the existing Terminal presentation. Browser coverage exercises the behavior at
desktop and mobile through the actual prompt, not an implementation detail.
