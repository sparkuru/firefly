# Gitignore semantics research

## Sources

- Git's authoritative pattern format and precedence:
  <https://git-scm.com/docs/gitignore>
- `node-ignore` implementation notes and API:
  <https://github.com/kaelzhang/node-ignore>

## Findings

- Git evaluates patterns from the rule file nearest to the candidate after
  inherited higher-level files; the last matching rule within one level wins.
- A rule containing a separator is relative to its `.gitignore` directory;
  an unrooted name-only rule can match at any descendant level.
- A trailing slash makes a rule directory-only. `*` and `?` do not cross a
  slash, ranges use bracket syntax, and the documented `**` forms cover
  arbitrary directory depth.
- `!` can re-include a previous match, but Git cannot re-include a file below
  a parent directory that remains excluded. Traversal therefore needs parent
  state and must not prune policy discovery before that state is known.
- Blank lines, `#` comments, escaped leading literals, escaped characters, and
  unquoted trailing-space handling are part of the pattern format.
- `node-ignore` is designed specifically for `.gitignore` rules and exposes
  `test()` results that distinguish ignored, unignored, and unmatched paths. It
  does not discover files or policies itself, which fits Firefly's scanner-owned
  traversal. Its path API expects relative paths, so Firefly must normalize
  logical POSIX paths before calling it.
- The repository currently has no direct `ignore` dependency. `picomatch` and
  `tinyglobby` appear transitively in `apps/site/package-lock.json`; their
  presence is not a reason to make generic glob behavior the Firefly contract.

## Design implication

Use a direct, pinned Gitignore-compatible dependency behind
`apps/site/scripts/firefly-ignore.mjs`, or implement only the missing parent
state around that adapter. Keep all filesystem discovery, nested-file
precedence, logical path mapping, and diagnostics in Firefly code. Validate the
behavior with a fixture matrix derived from the Git documentation; do not make
production tests depend on a host Git repository or an external blog.
