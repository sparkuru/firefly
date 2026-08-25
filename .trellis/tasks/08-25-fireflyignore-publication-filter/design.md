# Technical design: `.fireflyignore` publication filter

## Design outcome

Keep publication filtering in the existing scanner/materializer boundary. The
scanner will load a hierarchical Firefly policy while walking the logical
blog tree, decide whether each Markdown candidate is publishable, and only
then reserve collision paths and copy the file. Astro remains unchanged and
continues to load only the filtered ordinary-file stage.

The rule behavior follows the [Gitignore pattern
format](https://git-scm.com/docs/gitignore#_pattern_format), including the
documented lower-directory precedence and the rule that a file below an
excluded parent directory cannot be re-included.

## Boundaries and ownership

| Boundary | Owner | Responsibility |
| --- | --- | --- |
| Blog source tree | Owner-controlled external input | Markdown, nested `.fireflyignore`, and authored layout |
| `firefly-ignore` adapter | `apps/site/scripts/firefly-ignore.mjs` | Parse policy files, normalize rule paths, evaluate inherited rules, expose diagnostics |
| Scanner | `apps/site/scripts/materialize-content.mjs` | Safe traversal, symlink/collision/race checks, policy decision before inventory reservation |
| Materializer | `apps/site/scripts/materialize-content.mjs` | Atomic candidate copy and promotion; receives already-filtered inventory |
| Astro | `apps/site/src/content.config.ts` | Load all Markdown present in the generated stage; no ignore logic |
| Documentation/spec | `readme.md`, `.trellis/spec/frontend/content-workspace-contract.md` | Publish the user-facing rule contract and durable engineering invariants |

The new adapter is deliberately framework-neutral and build-time only. It must
not import Astro, content collections, route modules, or browser code.

## Input and rule discovery

`FIREFLY_CONTENT_ROOT` remains the blog root containing `posts/` and `pages/`.
The scanner seeds a policy chain from the root `.fireflyignore`, then reads a
`.fireflyignore` in each safe directory while descending through each
collection. A missing file is normal. `.gitignore`, Git global excludes, and
repository state are never read.

Policy files are special control-plane entries:

- only a regular file is accepted; a symlinked `.fireflyignore` is rejected by
  the existing hidden-link safety rule;
- the file is read as UTF-8 and is never considered a Markdown candidate;
- a read, decode, or pattern-parse failure reports the policy's logical path
  and line number where available;
- ordinary hidden files/directories retain the existing skip behavior;
- policy discovery follows the scanner's logical link-owned path, so a policy
  inside a validated linked directory applies to that directory's public
  virtual subtree rather than leaking the resolved host path.

The root and nested policies are loaded once per scan and represented as an
ordered chain. `scanContentWorkspace()` shares the root policy context across
the `posts` and `pages` scans. The legacy single-tree helper keeps its current
default behavior and accepts an explicit policy-root/context option when the
caller needs a blog-root policy.

## Matching contract

Each policy instance is associated with the virtual directory containing its
`.fireflyignore`. Candidate paths passed to that instance are relative,
POSIX-separated paths from that directory. A directory is evaluated with its
trailing `/` marker so directory-only patterns remain distinguishable from
file patterns.

The adapter applies policy instances from the blog root toward the candidate's
nearest directory. Within one file, the last matching rule wins; a matching
rule in a lower directory overrides an inherited matching result. It exposes a
small result rather than leaking the dependency API:

```ts
type FireflyIgnoreDecision = {
  ignored: boolean;
  blockedByIgnoredParent: boolean;
  matchedPolicyPath?: string;
  matchedLine?: number;
};
```

The adapter must support the product contract's Gitignore features:

- blank lines and `#` comments;
- escaped leading `#` and `!`, escaped characters, and Git-style trailing
  whitespace handling;
- `/`-anchored and unanchored patterns relative to the policy file;
- directory-only patterns with a trailing `/`;
- `*`, `?`, character ranges, and Git's `**` forms;
- ordered negation with `!`;
- the parent-directory restriction on re-inclusion.

The implementation should add `ignore` as a direct production dependency if
the implementation spike confirms the pinned version covers this contract.
Its public API is hidden behind `firefly-ignore.mjs`; the existing transitive
`picomatch` package is not a supported substitute because generic glob syntax
does not define Gitignore semantics. If a dependency cannot represent the
required parent-state behavior, retain the adapter boundary and add the
smallest local state machine around it rather than spreading pattern logic
through the scanner.

## Traversal and data flow

```text
blog root
  ├─ load root .fireflyignore
  ├─ walk posts/ and pages/ deterministically
  │    ├─ load directory .fireflyignore
  │    ├─ evaluate directory state (including parent blocking)
  │    ├─ descend safe directories even when needed for policy discovery
  │    └─ for non-empty .md: evaluate → skip or reserve → inventory
  └─ materialize filtered inventories atomically
       └─ Astro glob loads only resulting .generated-content/**/*.md
```

The scanner carries these values through recursion:

1. physical path and logical virtual segments;
2. resolved ancestor set for cycle detection;
3. active policy chain from the blog root;
4. whether an ancestor directory is blocked by an ignored parent.

An ignored directory is not copied and creates no route. Traversal may still
inspect it when necessary to discover control files and preserve deterministic
diagnostics, but `blockedByIgnoredParent` prevents a descendant negation from
publishing a file unless the parent directory itself has been re-included by a
valid earlier decision. This keeps the result aligned with Git's documented
parent rule without pruning away policy files too early.

Filtering happens after file safety/type/empty checks but before
`reservePath()`. An ignored file therefore cannot create a collision with an
included file or directory route. Included files continue through the existing
inode check, heading normalization, and atomic stage promotion unchanged.

## API shape

Keep the public helpers and add only an explicit policy context where needed:

```js
scanMarkdownWorkspace(sourceRoot, {
  collection: 'posts',
  policyRoot,
  policyContext
})

scanContentWorkspace(blogRoot)
materializeContentWorkspace({ sourceRoot: blogRoot, targetRoot })
```

`scanContentWorkspace()` is the production path: it validates the blog root,
loads/threads the policy context, scans both collections, and returns the same
inventory shape. `materializeMarkdownWorkspace()` remains available for
single-tree callers/tests; without `policyRoot` it treats its source root as
the policy root, preserving existing behavior for callers that have no blog
parent. No route or Astro loader API changes are required.

## Error and rollback behavior

- Policy parse/read errors occur during scanning, before the generated stage
  candidate is promoted.
- Existing `replaceStage()` behavior remains the rollback boundary: candidate
  and backup paths are removed/restored on copy or promotion failure.
- Diagnostics use logical collection-relative paths and line numbers, never
  resolved host paths or source file contents.
- A missing policy is not an error; it means no additional source-path
  exclusion. A malformed policy is an error rather than a fail-open rule set.

## Compatibility and migration

- Existing source trees without `.fireflyignore` produce the same inventory,
  generated paths, draft projection, and routes.
- Existing `.gitignore` files continue to affect Git only and cannot alter the
  Firefly publication inventory.
- Existing hidden-entry, unsafe-link, collision, race, and atomic-promotion
  behavior remains authoritative.
- No source or generated attachment behavior changes; non-Markdown files
  continue to be ignored by the scanner and attachment policy remains deferred.
- The README and content-workspace spec gain examples for root and nested
  policies, precedence, negation, and the deferred attachment boundary.

## Test design

Use isolated temporary blog roots with both collections and assert observable
inventory/stage outcomes. Cover:

- absent policy and `.gitignore`-only fixtures;
- root patterns with `posts/` and `pages/` prefixes;
- nested policies with local path bases and lower-level overrides;
- `*`, `?`, ranges, rooted/unrooted patterns, directory patterns, `**`,
  escaped literals, comments/blank lines, trailing spaces, and `!`;
- ignored-parent re-inclusion rejection and valid directory re-inclusion;
- policy files not materialized, source files unchanged, exact included paths,
  both collections, and no route candidate for excluded files;
- malformed/unreadable policy diagnostics and prior-stage preservation;
- existing symlink, hidden-node, collision, race, draft, schema, and atomic
  regression tests.

The matcher unit matrix should use expected results derived from the Git
contract and, where the local environment permits, compare representative
cases with `git check-ignore`; production tests must not depend on an external
blog, Git repository, or host absolute path.

## Rollback and operational notes

The change is local to the site package and task documentation. If the direct
dependency or matcher adapter is unsuitable, revert the adapter/package-lock
change and retain the no-policy baseline; no source content needs migration.
If a policy causes an unexpected publication result, remove or correct the
policy file in the owner-controlled blog and rebuild—the source tree remains
unchanged and the prior generated stage remains protected on failed builds.
