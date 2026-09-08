# Implementation plan

## Phase A — shared metadata and generated-content fallback

1. Add a framework-neutral content metadata helper for display-name fallback,
   safe filename stems, and generated compatibility metadata.
2. Extend the materializer copy path to detect absent/empty first front matter
   blocks and prepend runtime-only fallback metadata using the collection,
   physical path, and scanned file mtime.
3. Preserve zero-byte placeholder filtering, existing front matter bytes, body
   heading normalization, race checks, transactional staging, and source
   read-only behavior.
4. Add content/materializer tests for no-frontmatter, empty-frontmatter,
   Unicode/space filenames, page slug fallback, body preservation, malformed
   front matter, and zero-byte placeholders.

## Phase B — metadata-first labels

5. Add `displayName` to the canonical document projection and replace repeated
   raw `entry.data.title`/filename fallback logic with that projection.
6. Update static directory indexes, the home recovery index, Terminal tree and
   document formatting so metadata is the primary visible label while physical
   paths remain available for route/path discovery.
7. Update focused Terminal/site assertions for title-first labels, missing-meta
   fallback labels, and unchanged route/physical filename identity.

## Phase C — single-file Markdown metadata CLI

8. Add an explicit `yaml` dependency and `blog:meta` package script to the site
   package. Keep the existing shell formatter's batch presence-only contract.
9. Implement `apps/site/scripts/blog-meta.mjs` with safe argument parsing,
   blog-root/collection/category inference, YAML front matter parsing, metadata
   defaults and overrides, Firefly schema validation, preview, default
   contained save-as, explicit write-back, no-overwrite behavior, and atomic
   writes.
10. Add CLI tests using temporary blog roots and source files for existing,
    absent, and empty metadata; save-as destination inference; explicit output;
    write-back; body/Unicode/code-fence preservation; schema failures;
    symlink/escape/overwrite rejection; and `--preview` no-write behavior.
11. Document install/run examples, defaults, safe write modes, and the
    read-only `./sam` build boundary in the repository README and relevant
    frontend content spec.

## Phase D — review and verification

12. Run focused formatter syntax checks and the new CLI/content tests first.
13. Run through `./sam` the affected package checks/tests, site Astro check,
    external-workspace content/build checks where available, and the relevant
    Terminal/browser/static-output suites.
14. Run the normal cross-layer quality gate, inspect generated output and exact
    routes, review the final diff for source-path/private-data leakage, and run
    `git diff --check`.
15. Update the durable frontend content-workspace contract with the fallback,
    label, and authoring CLI rules before archive/commit.

## Validation commands

```sh
bash -n tooling/format-content.sh
./sam npm --prefix apps/site run test:content
./sam npm --prefix apps/site run check
./sam npm --prefix apps/site run test:x-core
./sam npm --prefix presentations/terminal run check
./sam npm --prefix presentations/terminal run test
./sam npm --prefix apps/site run build
./sam npm --prefix apps/site run test:e2e
git diff --check
```

The exact browser/build commands may be narrowed or expanded after the changed
surface is known. Any unavailable Docker/browser/dependency gate must be
reported with its original diagnostic rather than replaced by an unrecorded
host-side success claim.

## Risk and rollback points

- **Fallback metadata risk:** a generated block could alter X Core context or
  route inventory. Roll back the materializer/helper first; authored sources are
  unaffected.
- **Label risk:** changing title/path ordering can break no-JavaScript recovery
  and Terminal browser selectors. Keep physical path data attributes and route
  hrefs stable; revert only presentation label changes if needed.
- **CLI write risk:** destination containment, source symlink rejection, and
  temp-file replacement must be tested before any real blog path is used. A
  failed write must leave the original unchanged.
- **Dependency risk:** `yaml` must be declared and locked in the site package;
  do not rely on a transitive Astro dependency.
- **Spec drift risk:** update the content-workspace contract only after tests
  demonstrate the actual fallback and label behavior.

## Pre-start review gate

Before `task.py start`, confirm:

- the accepted save-as destination rule is present in `prd.md`;
- `prd.md` has no unresolved product decisions;
- `design.md` and this plan agree on no-prefix-stripping, physical-route
  preservation, and host-side write behavior;
- both context manifests contain real spec/research entries;
- no external blog source files have been modified during planning.
