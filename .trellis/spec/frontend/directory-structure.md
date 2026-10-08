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
presentations/memo/              Memo document adapter; site owns reader shell/time control
experiments/nerv/                independent NERV static project
experiments/majo/                independent MAJO static project
tooling/validate-experiments/    manifest decoder and public catalog
tooling/assemble-publication/    static artifact validation and assembly
tooling/publish-memos/           retained independent candidate/history recovery
tooling/memo-documents/          offline verified import and exclusive authoring/install
tooling/shared/                  framework-independent contained build-input files
tooling/sync-server/             authoring workspace synchronization
plugins/comments/                site-owned comments integration
plugins/memos/                   independent Markdown public/config contract
plugins/public-access*           shared activation projection and marker closure
plugins/tests/                  shared public-access contract tests
services/comments/               private comments write/moderation runtime
config/                          public site and plugin configuration templates
.trellis/spec/                   durable engineering contracts
artifacts/, dist/                ignored repository build outputs
.private/                        ignored private inputs and backups
content/memos/                  optional document sources; shared site processor
.firefly/memos/                  ignored Memo candidates and private local publication state
tooling/private/                ignored owner adapters; excluded from Docker build context
```

`content/` is a sample input. `FIREFLY_CONTENT_ROOT` can select another blog
root with `posts/` and `pages/`; that external root is not a new source-code
package. Build outputs and private inputs are not public source contracts.

## Placement Rules

- Put a content-schema or canonical-route change in `apps/site/` and update
  [Content Workspace](./content-workspace-contract.md). Keep authored Markdown
  independent of Astro and Presentation implementation files.
- Put framework-neutral document transforms and adapter interfaces in
  `packages/x-core/`. Put concrete rendering in its owning `presentations/`
  package (Semantic, Terminal or Memo). Presentation packages do not import each other.
- Add a complete independent experience under `experiments/<id>/` with its own
  manifest, lockfile, assets, and build. Its public surface is validated and
  mounted by `tooling/`, not imported by `apps/site/`.
- Put public static comments integration under `plugins/comments/` or the site
  bridge, and private write/database work under `services/comments/`. No site
  build reads the private database.
- Keep retained Memo wire/config/history recovery under `plugins/memos/` and
  `tooling/publish-memos/`. The visitor service and active independent push are
  retired. New sources live under the selected workspace's optional `memos/`
  and use the shared site processor. Offline candidates/correspondence/history
  stay ignored and private; never put real owner content in tracked fixtures.
- The site owns the Memo aggregate/details/assets and legacy compatibility page;
  `presentations/memo/` owns only the framework-neutral adapter. Offline import
  and exclusive installation belong to `tooling/memo-documents/`. Private
  receipts/sources/SSH inputs never enter a web image. Shared sanitation and
  contained-file helpers remain under `tooling/shared/`. See
  [Memo Documents](./memo-document-contract.md) and retained legacy contracts.
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
