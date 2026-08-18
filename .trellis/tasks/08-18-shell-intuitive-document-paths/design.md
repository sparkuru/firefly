# Technical Design: Shell-Intuitive Document Paths

## Boundaries

The change stays inside the Terminal presentation and its site-facing browser
coverage:

- `presentations/terminal/src/vfs/paths.ts` remains the single path-resolution
  boundary.
- `presentations/terminal/src/commands/cat.ts` classifies known non-document
  nodes so experiment navigation is actionable.
- `presentations/terminal/src/commands/session.ts` updates the stale `vim`
  failure wording that currently claims pages require absolute paths.
- Neutral-command, runtime, and site Terminal tests lock the contract.

No content model, Astro route, host filesystem, publication manifest, or web
permalink changes are required.

## Resolution contract

`resolveVirtualPath(input, cwd, mode)` will preserve its current security and
cwd rules, with one narrow addition for `mode === 'resource'`:

1. Only when `cwd === '/'`, inspect the operand after an optional leading
   `./`.
2. If the remaining operand is exactly `posts`, `pages`, or `lab`, or begins
   with one of those names followed by `/`, treat it as root-relative and build
   `/<operand-without-./>`.
3. Otherwise retain the current root resource fallback of
   `/posts/<input>`. This preserves `cat hello.md` and `cat ./characters/x.md`
   as post-oriented conveniences.
4. Absolute paths, exact mount aliases, nested cwd resolution, unsafe segment
   rejection, and resource-mode rejection of `..` remain unchanged.

Directory and pattern modes already resolve non-resource paths from `/` at the
virtual root, so they need no new alternate rule. They continue to share the
same normalization and known-root validation.

This makes `cat pages/about.md`, `cat ./pages/about.md`,
`grep about pages/about.md`, and `vim pages/about.md` resolve to
`/pages/about.md`, while `cat lab/nerv` resolves to the existing experiment
node rather than the nonexistent `/posts/lab/nerv` path.

## Error behavior

`cat` will inspect `context.fs.stat(resolution.path)` before attempting to read:

- a known experiment returns an error naming the operand and suggesting
  `open lab/<id>`;
- a known directory returns a directory-specific error suggesting `ls`;
- unknown or unreadable resources retain a safe generic error, without host
  paths or hidden nodes.

The generic `cat` and `vim` messages will no longer claim that pages require
absolute paths. They will point users toward the public virtual tree instead.

## Completion and compatibility

The existing root-aware completion already emits `pages/...`, `./pages/...`,
absolute page paths, and `lab/<id>` candidates. Tests will verify execution
matches those candidates. No completion grammar or support for parent
traversal is added.

Existing callers are preserved:

| Input context | Example | Result |
| --- | --- | --- |
| Root, bare post | `cat hello.md` | `/posts/hello.md` |
| Root, explicit page | `cat pages/about.md` | `/pages/about.md` |
| Root, dotted explicit page | `cat ./pages/about.md` | `/pages/about.md` |
| Root, absolute page | `cat /pages/about.md` | `/pages/about.md` |
| Nested posts cwd | `cat characters/nahida.md` | Existing nested resolution |
| Root, experiment | `cat lab/nerv` | Experiment-specific navigation error |

## Validation and rollback

The implementation is small and reversible by reverting the resolver branch,
the two error-message changes, and their tests. Validate the Terminal package
first, then the focused main-site Terminal browser test. No migration or
runtime data rollback is involved.
