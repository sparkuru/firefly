# Documentation authority matrix

## Evidence snapshot

| Topic | Current evidence | Stale/conflicting authority | Planned resolution |
| --- | --- | --- | --- |
| Repository tree | `directory-structure.md:13-94` and current package manifests | `prd.md:165-198` lists nonexistent `content/assets`, `packages/content-contract`, and `tooling/validate-content` as current | Replace the PRD diagram with implemented top-level ownership |
| Default Presentation | `packages/x-core/src/contracts.ts:4`; Terminal adapter registers `firefly`; `x-core-contract.md:30-47` | `prd.md:250-259` says Semantic is default; `prd.md:574` calls Terminal non-default | State `firefly`/Terminal default and explicit `semantic` opt-in |
| X Core signature | `packages/x-core/src/contracts.ts:42-63` | `prd.md:239-252` passes tree/context separately and leaves enhancement props unconstrained | Use `NormalizedDocumentInput`, readonly enhancements, and JSON-safe props |
| M5.1 state | archived service/site/publication/provisioning/catalog/Unicode tasks; commits `d6c0cd4` and `bb7ee81` | `prd.md:591`, `.trellis/mainline.md:28,103-113` still describe deferred work or an incompatible Unicode route | Mark implemented/provisioned, tracked-disabled, Unicode gap closed; keep enablement separately gated |
| Content counts | root PRD records historical SQL 93/7 and observed authored 95/8 | the observed count appears in milestone and acceptance wording as though immutable | Keep 93/7 historical; date/qualify 95/8 and make validation inventory-derived |
| Site output count | current content root is configurable; clean normal build emitted 28 pages during the Unicode task review | `quality-guidelines.md:117-120` fixes the durable output to ten HTML routes | Specify exact inventory relative to the selected fixture/workspace; keep counts fixture-local |
| Build promotion | `assemble-publication/src/index.ts:489-532,563-632` promotes repository `artifacts/` and `dist/` together | root PRD wording can imply the assembler owns the external immutable release switch | Separate repository transaction from operator deployment `releases/current` |
| Comments dependency | assembler manifest declares validator only, but `tooling/assemble-publication/src/plugins/comments.ts` imports `apps/site/src/lib/comments.mjs` by path | `directory-structure.md:159-196` says assembler depends only on validator and consumes only static artifacts/manifests | Preserve the target rule and label the source bridge as a temporary extraction gap |
| X Core scope | `packages/x-core/src/index.ts` exports `plugins.ts`; production site uses the site extension path, while generic publication/service registry paths are unused | `x-core-contract.md:5-8` correctly excludes site/deployment ownership but does not identify the current generic export | Add a transitional warning; do not promote the generic host as durable X Core API |
| Adapter dependency | Semantic/Terminal source imports X Core; manifests currently place it under `devDependencies` | `directory-structure.md:173-182` describes an exact package dependency without recording the manifest mismatch | Keep the target dependency rule and label manifest correction as later child work |
| Adapter mutation | Terminal clones its input tree; Semantic currently passes the supplied tree into an in-place wrapper | `x-core-contract.md` requires both production adapters to clone without mutation | Keep cloning normative and label Semantic's current behavior as a later adapter-cleanup violation |

## Evidence boundaries

- Operational endpoints, identities, filesystem paths, and raw production output
  are deliberately excluded.
- Current implementation facts come from tracked source/manifests and local
  commits, not ignored owner configuration.
- This task may document known gaps but may not fix or broaden them.
