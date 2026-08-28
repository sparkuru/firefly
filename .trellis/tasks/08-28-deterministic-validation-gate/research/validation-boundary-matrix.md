# Deterministic validation boundary matrix

## Evidence snapshot

| Surface | Repository evidence | Risk exposed | Planned control |
| --- | --- | --- | --- |
| Host command boundary | `sam:1-348` loads optional `config.dev`, resolves `FIREFLY_CONTENT_ROOT`, mounts it read-only, and passes it into `/app` | An ignored owner setting can silently change the input used by a supposedly reproducible run | `verify.sh` fixes the absolute `<repo>/content` root before invoking `sam`; only image/IPC diagnostics remain overridable |
| Root milestone scripts | `package.json:36,49,52,59-63` has separate e2e commands and `check:m51`/`test:m51`/`build:m51`, but no aggregate browser gate | A green milestone command can omit one or more browser surfaces | Add a short-circuiting `verify:m51` with check → test → build → site → NERV → publication order |
| Negative content builds | `apps/site/tests/content-build-negatives.test.mjs:7-43` writes under repository `content/`, spawns Astro, uses ignored same-filesystem output, and cleans in `finally` | Child build inherits an external content root while the fixture is written elsewhere | Pass the tracked fixture root explicitly in the spawned environment; retain output placement and cleanup |
| Main site browser surface | `apps/site/package.json:11-18`; Playwright preview config serves the already-built site artifact at the declared desktop/mobile viewports | Browser checks can validate a build from a different workspace or rebuild unexpectedly | Run after `build:m51` with the fixture root and existing preview/server contract |
| NERV browser surface | `experiments/nerv/package.json:10-11`; package Playwright config owns its `/lab/nerv/` server and viewports | Root validation can omit the experiment UI while package checks remain green | Invoke the existing package `test:e2e` as a required aggregate phase |
| Assembled publication browser surface | `tooling/assemble-publication/package.json:10-15`; e2e builds and serves assembled `dist/` | Repository assembly and publication UX can drift independently of the site | Invoke the existing publication `test:e2e` after the root build/assembly phase |
| Browser runtime | Runtime spec declares `mcr.microsoft.com/playwright:v1.62.0-noble`; browser commands may need `SAM_IPC=host` | Missing Docker/image/browser binaries may be mistaken for skipped success | `verify.sh` defaults image/IPC and preserves exact non-zero diagnostics |
| Owner workspace | `readme.md:23-28` and content-workspace contract define explicit external-root `build:workspace`; `sam` mounts it read-only | Owner content could leak into fixture evidence or force fixture-specific assertions to become workspace-relative | Keep the owner command separate and document it as authoring validation only |
| Release probe | `package-runtime.sh` is a host Docker/release-image probe with its own exact-label cleanup | Nesting it in the Node/Playwright container would add a second runtime boundary and obscure failure ownership | Keep it as an optional, explicit host probe after the aggregate gate |
| CI/report posture | Quality/runtime specs retain package-local ignored reports; repository has no local CI workflow | A local command could silently skip browser checks or leave private/generated output in tracked records | Fail closed on unavailable prerequisites and review diff/privacy without adding CI or generated reports |

## Scope and privacy boundary

The research uses tracked source, manifests, specs, fixtures, and task history
only. It deliberately excludes ignored `config.dev`, external content roots,
credentials, endpoints, identities, and raw operational output. The matrix is a
planning record for deterministic validation, not a claim that owner-workspace
data has been inspected.

## Decision summary

The smallest complete solution is a host wrapper plus one root npm
orchestrator, with one explicit child-process environment correction. Existing
Playwright servers, reports, viewports, and package boundaries remain the
authority. No second content loader, browser harness, CI workflow, or runtime
packaging mode is justified by the evidence.

## Fixture-specific drift confirmed during implementation

The retained repository-fixture browser evidence exposed expectation drift that
is independent of owner-workspace content:

| Test surface | Stale expectation | Tracked-fixture behavior | Scoped correction |
| --- | --- | --- | --- |
| Main-site outline | 22 outline list items | 21 body headings are listed; the article title H1 is not part of the outline | Change only the two outline counts to 21; keep heading-level and anchor checks |
| Main-site heading order | One expected level was missing/extra around the verification subsections | The rendered article has six level-four headings under `ownership` before `evidence` | Keep the exact emitted DOM level sequence and adjust only the fixture expectation |
| Main-site/reader link | URL as accessible name | Markdown link text is `Trellis repository`, with the same canonical URL | Locate by visible accessible name and keep the href assertion |
| Reader repeated search | `trellis` must occur repeatedly | The rendered body contains one visible `trellis` occurrence | Use the repeated fixture word `the` while preserving exact-range, active-match, and cycle assertions |
| Reader about search | Frontmatter title word `foundation` in reader body | Reader searches rendered body units, not frontmatter metadata; the body has no `foundation` text | Use the body word `the` in the fixture route matrix |
| Terminal document output | Space-normalized article title | Terminal preserves the tracked slug/title `llm-workflow-with-trellis` | Assert the emitted tracked title in both affected reads |
| Terminal source grep | Markdown `#`/`##` heading markers | Terminal templates expose normalized visible body lines, so heading markers are not searchable there; `build` repeats in the rendered article | Search for the stable visible word `build` and retain the multi-line/line-length checks |

These are test-data expectation corrections only. No public Markdown, route,
presentation, or search implementation is changed, and no assertion is
weakened for an external workspace.
