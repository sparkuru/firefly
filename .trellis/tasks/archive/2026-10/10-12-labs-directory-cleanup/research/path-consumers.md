# Source Path and Retired Service Investigation

| Consumer | Evidence | Action |
| --- | --- | --- |
| Default discovery | `tooling/validate-experiments/src/index.ts:379` | Default to `labs`; retain API/override |
| Source fixtures | Validator/assembler tests create `experiments/alpha` | Update source paths, preserve assertions |
| Root scripts | `package.json:45` onward | Use `labs/nerv` and `labs/majo` |
| Docker installs | `Dockerfile:22` and `:23` | Use renamed source paths |
| Ignore rules | `.gitignore:6` onward and `.dockerignore:22` | Preserve exclusions under `labs` |
| Publisher protection | `tooling/publish-memos/src/index.mjs:21` | Include renamed protected source root |
| Current docs | Architecture/directory/publication/runtime specs, validation profile, third-party index | Update actual source paths |

`apps/site/src/lib/experiments.ts` uses shared discovery. `preview.sh` delegates
root commands and consumes publication paths. Neither needs independent source
imports. Root README has no old source-path command. Authored content/config and
Terminal references use the Experiment concept rather than source placement.

`tooling/assemble-publication/src/index.ts:631` and `:657` use the retained
`artifacts/experiments/<id>` format. Historical Trellis records are not migrated.

`git ls-files services/memos` lists only the retirement README. Its contents and
`.trellis/spec/frontend/memo-service-contract.md` establish retirement. Searches
excluding dependencies/build outputs and historical records find no maintained
import/package/Compose/proxy consumer of this directory.

Local remnants contain dependencies, compiled files and historical runtime
browser evidence. Preserve them outside the repository instead of destroying
them. Private plugin data/history, recovery keys/databases/backups and current
Memo reading/publishing components remain outside the removal scope.

This investigation establishes repository feasibility only. No rename, removal,
build, browser or runtime verification has been performed.
