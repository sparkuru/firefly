# Implementation plan: `.fireflyignore` publication filter

## Preconditions and review gate

- Keep the task in `planning` until the final planning summary is explicitly
  approved. Do not run `task.py start` from this planning pass.
- Before editing product code, load `trellis-before-dev` and the frontend
  content-workspace, quality, development-runtime, and directory-structure
  guidance. Work through `./sam` for every Node/npm command.
- Preserve unrelated workspace changes and never inspect or modify an
  owner-controlled external blog beyond isolated temporary fixtures.

## Ordered checklist

### 1. Confirm the matcher dependency and adapter contract

- Verify the direct dependency choice against the Gitignore pattern matrix;
  prefer a pinned direct `ignore` dependency over transitive `picomatch`.
- Update `apps/site/package.json` and `apps/site/package-lock.json` only if the
  direct dependency is needed; install through
  `./sam npm --prefix apps/site ci`.
- Create `apps/site/scripts/firefly-ignore.mjs` with a small adapter that
  accepts policy text/path context and returns Firefly-owned decisions and
  diagnostics. Do not expose the third-party matcher type to the scanner.
- Decide and test the exact parent-directory state handling before integrating
  it into the recursive scanner.

### 2. Add matcher unit coverage first

- Add a focused matcher test module under `apps/site/tests/` or extend the
  existing content materializer tests without duplicating fixtures.
- Cover comments/blank lines, escapes, trailing spaces, rooted/unrooted
  patterns, directory-only patterns, `*`, `?`, ranges, `**`, ordered
  negation, lower-directory precedence, and blocked-parent re-inclusion.
- Assert malformed patterns report the policy logical path and line, while
  source pattern text and host absolute paths are not leaked in diagnostics.

### 3. Integrate policy state into scanning

- Extend the scanner options with an explicit blog/policy-root context while
  preserving the legacy single-tree helper's no-policy behavior.
- Load root and nested `.fireflyignore` files as special regular control files;
  never materialize them and retain hidden ordinary node/symlink rejection.
- Carry logical virtual segments, active policy chain, resolved ancestors, and
  blocked-parent state through deterministic recursive traversal.
- Apply the decision after ordinary Markdown/type/empty-file checks but before
  collision reservation and inventory insertion.
- Keep both `posts` and `pages` on the same policy contract and ensure root
  policies receive collection-prefixed paths while nested policies receive
  local paths.
- Keep symlink realpath checks, inode race checks, collision keys, heading
  normalization, candidate staging, and promotion behavior unchanged except
  for the earlier filter decision.

### 4. Add materializer integration and regression tests

- Verify included paths are copied byte-for-byte except for the existing
  heading normalization and excluded source files remain untouched.
- Verify excluded files/directories never enter either inventory or generated
  tree and cannot create route/collision reservations.
- Verify `.gitignore` alone has no effect and no `.fireflyignore` preserves
  current behavior.
- Verify policy files are absent from the generated stage.
- Verify malformed/unreadable policy input preserves an existing target stage.
- Retain existing draft/private, schema, symlink, special-file, collision,
  race, and promotion rollback coverage.

### 5. Document the public contract

- Add a concise `.fireflyignore` section to `readme.md` with root and nested
  examples, path bases, precedence, negation, and the attachment deferral.
- Update `.trellis/spec/frontend/content-workspace-contract.md` with the
  durable scanner/policy/materializer invariants and the validation matrix.
- Keep `.gitignore` documentation and behavior separate; do not add a
  repository `.fireflyignore` fixture that changes the default demo inventory
  unless a test specifically needs it.

### 6. Run focused validation and review

- Run `git diff --check` and inspect the complete task/product diff.
- Run the site content suite, type check, and build through `./sam`.
- Run a focused temporary external-blog build if the wrapper and Docker
  boundary are available; record exact unavailable errors rather than calling
  them passes.
- Review that Astro content configuration has no duplicate ignore logic and
  that no policy/source/host path appears in static output.
- Run the Trellis quality check after implementation, then perform the
  required spec update and final task review before commit/archive.

## Validation commands

```sh
./sam npm --prefix apps/site ci
./sam npm --prefix apps/site run test:content
./sam npm --prefix apps/site run check
./sam npm --prefix apps/site run build
git diff --check
```

If the task adds a separate matcher test file, ensure it is included in the
`apps/site` `test:content` script or run it through the same `./sam` package
boundary. No Playwright run is required for this build-time-only change unless
the generated-route integration reveals a browser-visible regression.

## Risk points and rollback

| Point | Risk | Rollback |
| --- | --- | --- |
| Direct matcher dependency | Lockfile/API drift or incomplete Git semantics | Remove the direct dependency and adapter change; retain baseline behavior |
| Nested policy traversal | Incorrect precedence, missed policy, or premature pruning | Revert scanner policy-context changes; generated stage remains atomic |
| Negation handling | Accidental publication below an excluded parent | Keep parent-block state and add a failing fixture before proceeding |
| Hidden control files | Policy file copied or hidden-link safety weakened | Restore special-case boundary and hidden-entry regression tests |
| Diagnostics | Host paths or policy contents leak into errors/output | Restrict messages to logical policy path, line, and stable error class |
| Documentation/spec | User contract drifts from matcher behavior | Reconcile README/spec against the final test matrix before commit |

## Completion gate before activation

- PRD is converged with no unresolved product decisions.
- `design.md` and this `implement.md` agree on nested discovery, Gitignore
  precedence, parent blocking, attachment deferral, and scanner ownership.
- `implement.jsonl` and `check.jsonl` contain real frontend spec/research
  entries rather than seed placeholders.
- The latest planning summary has been presented and explicitly approved.
