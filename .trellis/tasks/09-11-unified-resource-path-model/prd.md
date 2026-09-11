# Unify resource paths across the website CLI

## Goal

Make every document location shown to a website Terminal user use the same
copyable shell-visible resource path. A result such as
`~/blog/posts/infra/06-docker-handbook.md` must be usable directly with
`cat`, `vim`, or another command that accepts a resource operand.

## Background

The current implementation exposes three related but different path forms:

- the read-only VFS and structured Terminal values use slash-rooted internal
  paths such as `/posts/infra/06-docker-handbook.md`;
- canonical browser URLs also use slash-rooted paths, normally with a trailing
  slash, such as `/posts/infra/06-docker-handbook/`;
- the shell accepts `~/blog/<virtual-path>` as its explicit absolute operand,
  while `grep` and some document listings currently print internal paths or
  cwd-relative paths.

This makes the path printed by `grep` look like an absolute command operand,
but `cat /posts/...` fails even though `cat ~/blog/posts/...` succeeds. The
fix must remove that user-facing ambiguity without leaking host paths or
changing canonical browser routes.

## Requirements

### R1. One shell-visible resource display form

Use `~/blog/<virtual-path>` for every user-facing document/resource identity
that appears in Terminal command output, structured Terminal result rendering,
static recovery listings, accessible path labels, or document listing rows.
The root itself remains `~/blog`; stdin remains `-`; directory names such as
`posts/` in a direct child listing remain compact directory labels rather than
document resource identities.

### R2. Grep output is directly reusable

`grep` must display a matched public document as
`~/blog/posts/<path>.md[:line]:<text>` in both its pipeline/stdout projection
and its interactive browser rendering. Scratch matches must use the same
prefix (`~/blog/.rshell/tmp/<name>`), while stdin matches keep the existing
`-` form. The structured match still carries the validated internal source
path for programmatic routing and highlighting.

### R3. Other resource-producing views use the same model

`find` rows, exact/wildcard document output from `ls`, document operand labels,
and the no-JavaScript Terminal recovery index must use the same
`~/blog/<virtual-path>` representation for posts and pages. No collection- or
renderer-specific conditional may turn a post into a relative path or a page
into a slash-rooted internal path.

### R4. Keep path boundaries explicit

The internal VFS identity remains slash-rooted, and canonical browser `href`
values remain ordinary site routes such as `/posts/.../`. The existing shell
input grammar remains supported: relative operands resolve from the current
cwd and `~/blog/...` is the explicit cross-cwd form. This task does not make
`/...` a new shell alias and does not broaden access to host filesystem paths.

### R5. Keep projections consistent and safe

All text, pipeline, structured, and browser projections must derive their
visible resource path from one shared formatter. The formatter may consume
only validated internal VFS paths (or the stdin sentinel) and must not build
browser URLs or expose raw command input.

## Acceptance Criteria

- [ ] From a nested cwd, `grep` output and its browser rendering show
      `~/blog/posts/...` or `~/blog/pages/...`, and the displayed path can be
      copied into `cat` to read the same document.
- [ ] `grep -n`, stdin grep, scratch-file grep, pipelines, and redirect text
      preserve their existing line-number, stdin, and bounded-output behavior
      while using the new visible path only for named resources.
- [ ] `find`, exact/wildcard `ls`, and the static no-JavaScript home index show
      the same `~/blog/<virtual-path>` document identity for both collections;
      no post/page conditional remains in these display projections.
- [ ] Structured values retain internal slash-rooted paths, document links
      retain validated canonical browser `href` values, and shell resolution
      continues to reject `/...`, bare `~`, traversal, unsafe segments, and
      host-like paths.
- [ ] Presentation-terminal unit tests and site Terminal/browser tests cover
      the direct-copy scenario, both collections, stdin/scratch edge cases,
      pipelines, and static fallback output.
- [ ] The relevant package checks, tests, site build/static checks, and
      `git diff --check` pass through the repository's `./sam` boundary.

## Out of Scope

- Do not change canonical site URLs, route generation, entry decoding, or
  internal VFS keys.
- Do not accept slash-rooted `/posts/...` as a new shell input alias; making
  output copyable is the selected compatibility strategy.
- Do not redesign relative directory names, tree branch labels, prompt/cwd
  semantics, command parsing, or the host workspace/materialization boundary.
- Do not add a new renderer-specific path table or duplicate formatter logic.

## Open Questions

None blocking. The implementation will preserve relative directory/tree labels
where they are intentionally child names, while standardizing every displayed
document/resource identity.
