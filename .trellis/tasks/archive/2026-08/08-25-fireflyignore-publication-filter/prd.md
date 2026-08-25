# Add `.fireflyignore` publication filter

## Goal and user value

Add a Firefly-owned publication filter before Astro content loading. An
external blog can keep source Markdown, drafts, archives, and its authored
directory layout, while `.fireflyignore` determines which Markdown candidates
are published.

The publication boundary is:

```text
external blog → Firefly scanner/materializer → .generated-content → Astro
```

This keeps Firefly publication policy separate from Git tracking policy and
makes the scanner/materializer, rather than Astro routes or collections, the
single authority for source-path exclusion.

## Product contract and decisions

- The policy file is named `.fireflyignore`, not `.astroignore`.
- The MVP applies only to Markdown candidates under the `posts/` and `pages/`
  collections. Attachment copying/publication is explicitly deferred to a
  later policy and must not change accidentally in this task.
- Firefly discovers an optional `.fireflyignore` at the blog root and in
  nested directories under that root. A rule file applies to its directory
  subtree; rules in lower directories override inherited rules according to
  the Gitignore model.
- Patterns are relative to the directory containing their rule file. A root
  rule can therefore use `posts/...` or `pages/...`, while a rule inside
  `posts/protocol/` can use paths local to that subtree.
- The rule grammar targets Gitignore-level behavior: blank lines and comments,
  escaped leading `#`/`!`, trailing-space handling, directory-only patterns,
  rooted and unrooted patterns, `/`, `*`, `?`, character ranges, `**`, and
  ordered `!` negation. A file cannot be re-included below an excluded parent
  directory, matching Git's traversal rule.
- When no `.fireflyignore` exists, Firefly retains the current inclusion
  behavior. `.gitignore` is never a fallback or input to publication filtering.
- Excluded Markdown remains in the source blog but is absent from the scan
  inventory, generated stage, Astro collection, and generated routes.
- Included Markdown retains its exact source-relative path in
  `.generated-content/{posts,pages}`.
- `.fireflyignore` files are control-plane inputs, not Markdown candidates, and
  are never copied into the generated stage. Existing hidden-path and unsafe
  symlink protections remain in force for all other hidden nodes.
- A malformed or unreadable policy is a deterministic publication error. It
  must not silently broaden publication, and an error before promotion must
  preserve the previous generated stage.

## Existing repository constraints

- `apps/site/scripts/materialize-content.mjs` recursively scans configured
  `posts/` and `pages/` trees, rejects unsafe/colliding paths, and atomically
  promotes the generated stage. Its scan result is the materializer input.
- `apps/site/src/content.config.ts` loads only
  `.generated-content/posts/**/*.md` and `.generated-content/pages/**/*.md`.
  Astro must not gain a second ignore implementation.
- `apps/site/src/lib/content-access.mjs` filters drafts and private entries
  after content loading. That front-matter projection remains separate from
  source-path publication filtering.
- `sam` accepts an absolute `FIREFLY_CONTENT_ROOT` blog root containing
  readable `posts/` and `pages/` directories and mounts the source trees
  read-only. The policy files must remain within this same input boundary.
- Existing scanner behavior skips ordinary hidden entries, ignores zero-byte
  Markdown placeholders, dereferences validated links, checks source inode
  identity before copy, and restores the prior stage on promotion failure.

## In scope

- Nested `.fireflyignore` discovery and deterministic rule inheritance for the
  blog root, `posts`, and `pages` trees.
- Gitignore-compatible matching for Markdown publication candidates before
  collision reservation and materialization.
- Scanner/materializer API changes needed to carry the blog-root policy into
  both collections while preserving the legacy single-tree helper contract.
- Unit/content tests, negative/error tests, documentation, and the durable
  content-workspace contract.

## Out of scope

- Copying, publishing, or filtering non-Markdown attachments.
- Using or merging `.gitignore`, global Git excludes, or repository Git state.
- Runtime filtering after Astro collection loading, browser-side filtering, or
  route-local policy checks.
- Changing draft/access/front-matter semantics.
- Changing source files, source symlink targets, or authored directory layout.

## Acceptance criteria

- [ ] A root `.fireflyignore` can exclude a Markdown path using a path that
      includes `posts/` or `pages/`, while the source file remains unchanged.
- [ ] A nested `.fireflyignore` applies to its subtree with local path bases,
      and a lower-level rule can override an inherited matching rule when the
      Gitignore traversal contract permits it.
- [ ] Representative Gitignore patterns work: comments/blank lines,
      escaped literals, `*`, `?`, ranges, rooted/unrooted paths, directory
      patterns, `**`, and ordered `!` negation.
- [ ] A directory exclusion removes all Markdown candidates below it and
      produces no corresponding Astro routes; re-inclusion cannot bypass an
      excluded parent directory.
- [ ] Excluded paths are absent from both scanner inventories and generated
      `.generated-content`, while non-matching paths retain exact relative
      structure in both `posts` and `pages`.
- [ ] `.fireflyignore` files are never materialized, and `.gitignore` has no
      effect on publication output.
- [ ] No policy file preserves current behavior, and malformed/unreadable
      policy input fails with a path/line-oriented diagnostic without replacing
      the prior generated stage.
- [ ] Existing draft/private projection, path collision, symlink safety,
      schema, and materializer atomicity tests remain passing.
- [ ] Documentation states the `.fireflyignore` discovery/precedence model,
      supported Gitignore grammar, and deferred attachment behavior.

## Risks and deferred technical items

- Gitignore matching has details that generic glob libraries do not implement;
  implementation must use a direct Gitignore-compatible dependency or a
  purpose-built adapter, never the existing transitive `picomatch` API.
- The implementation must traverse enough directory structure to discover
  nested policy files and honor negation without weakening existing path and
  symlink safety checks. The design must make the traversal/pruning rule
  explicit and test it against the Gitignore contract.
- The exact direct dependency version and adapter shape are technical choices
  for the design/implementation phase; they do not change the product
  behavior above.
