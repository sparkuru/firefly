# Scope find and grep to the current directory

## Goal

Make the Terminal `find` and `grep` commands respect the current virtual
working directory by default, so a command entered from
`~/blog/posts/infra` does not search unrelated public directories.

## Confirmed facts

- `find` currently defaults to the fixed roots `/posts` and `/pages`, even
  when `context.cwd` is nested below one of them.
- `grep` currently does the same when it receives neither stdin nor an
  explicit resource operand.
- The existing `find` contract documents global default search, so the
  contract and tests must change with the implementation.
- Explicit path scoping must remain available for intentional broader
  searches, including `~/blog/posts`.

## Requirements

- Without an explicit path scope, `find <keyword>` recursively searches only
  `context.cwd`.
- `find` also accepts one GNU-style path-first form:
  `find [path] <keyword>`, so `find ~/blog xxxx` searches `~/blog` for the
  filename keyword `xxxx`.
- Without stdin or an explicit path/resource scope, `grep <pattern>` searches
  only `context.cwd` recursively.
- Explicit `find --path <directory>` continues to resolve relative to the
  current virtual cwd and supports `find --path ~/blog/posts <keyword>`.
- `find --path <directory> <keyword>` and `find <path> <keyword>` select the
  same single recursive directory scope; supplying both forms is rejected.
- `grep` keeps the GNU-style positional resource form:
  `grep [options] <pattern> [path ...]`. A trailing directory/resource
  operand explicitly selects the search scope; no new `grep --path` option is
  added.
- The two commands' `-h`/`--help` output includes a concrete
  `~/blog/posts` path-scoping example using each command's syntax:
  `find --path ~/blog/posts xxxx` and `grep a ~/blog/posts`.
- `grep -h`/`grep --help` provides command help, including the positional path
  example, consistent with the other Terminal command help interfaces.
- Existing stdin behavior and explicit document/resource operands remain
  compatible unless required by the new default scope.
- Update the relevant Terminal tests and the frontend workspace contract to
  cover nested cwd isolation and intentional broader scope.

## Out of scope

- Changing filename matching, grep matching, result formatting, VFS path
  safety, work limits, or browser rendering.
- Searching `/lab` or `/.rshell` through the default public-document scope.
- Implementing GNU `find` expressions, predicates, actions, or unrestricted
  multiple-root traversal.

## Acceptance Criteria

- [x] `find <keyword>` from a nested public directory returns matches only
      from that directory's recursive subtree.
- [x] `grep <pattern>` without stdin/resources from a nested public directory
      returns matches only from that directory's recursive subtree.
- [x] Explicit broader `find --path ~/blog/posts <keyword>` still searches
      the posts subtree from any valid cwd.
- [x] `find ~/blog/posts <keyword>` and `find ~/blog <keyword>` provide the
      equivalent path-first behavior, with unsafe/unknown paths rejected.
- [x] Explicit broader `grep <pattern> ~/blog/posts` still searches the posts
      subtree from any valid cwd, while stdin/resource exclusivity remains
      enforced.
- [x] `find -h` and `grep -h` show the corresponding `~/blog/posts` path
      examples (`find --path ~/blog/posts xxxx` and
      `grep a ~/blog/posts`).
- [x] Existing terminal unit/integration tests pass, including path safety,
      stdin pipes, explicit resources, and bounded walking.
