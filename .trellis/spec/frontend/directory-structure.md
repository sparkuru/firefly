# Repository Directory and Ownership Structure

## Scope

Use this map when placing source, adding a Presentation or Experiment, or
changing a build boundary. The cross-module rules are in
[Firefly Architecture](./architecture-contract.md); this file locates their
owners in the repository.

## Directory Layout

```text
content/                         tracked sample Markdown workspace
apps/site/                       Astro static shell, routes, content loading
packages/x-core/                 document and Presentation contracts
presentations/semantic/          semantic document adapter
presentations/terminal/          Terminal document adapter and command engine
experiments/nerv/                independent NERV static project
experiments/majo/                independent MAJO static project
tooling/validate-experiments/    manifest decoder and public catalog
tooling/assemble-publication/    static artifact validation and assembly
tooling/sync-server/             authoring workspace synchronization
plugins/comments/                site-owned comments integration
plugins/memos/                   independent memo public/config contract
services/comments/               private comments write/moderation runtime
config/                          public site and plugin configuration templates
.trellis/spec/                   durable engineering contracts
artifacts/, dist/                ignored repository build outputs
.private/                        ignored private inputs and backups
```

`content/` is a sample input. `FIREFLY_CONTENT_ROOT` can select another blog
root with `posts/` and `pages/`; that external root is not a new source-code
package. Build outputs and private inputs are not public source contracts.

## Placement Rules

- Put a content-schema or canonical-route change in `apps/site/` and update
  [Content Workspace](./content-workspace-contract.md). Keep authored Markdown
  independent of Astro and Presentation implementation files.
- Put framework-neutral document transforms and adapter interfaces in
  `packages/x-core/`. Put concrete rendering in one of the two `presentations/`
  packages. Presentation packages do not import each other.
- Add a complete independent experience under `experiments/<id>/` with its own
  manifest, lockfile, assets, and build. Its public surface is validated and
  mounted by `tooling/`, not imported by `apps/site/`.
- Put public static comments integration under `plugins/comments/` or the site
  bridge, and private write/database work under `services/comments/`. No site
  build reads the private database.
- Put the independent memo wire/config contract under `plugins/memos/`.
  Its consumers own site registration, service behavior, and publication
  integration separately; do not import comments record or route semantics.
- Put shared publication rules in `tooling/validate-experiments/` or
  `tooling/assemble-publication/`, according to whether they validate source
  manifests or built static artifacts. Deployment release switching is outside
  the repository assembler.

## Check Before Moving Code

Inspect package manifests, import graphs, route ownership, and the matching
topic contract. A move is incomplete if it introduces a reverse source import,
changes a public route without reservation checks, or copies private inputs
into a static artifact. Run the affected package checks plus the publication
validation listed in [Development Runtime](./development-runtime.md).
