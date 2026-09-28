# Implementation and verification plan

Status: implementation complete 2026-09-17. Product decisions and PRD
convergence are complete, all four implementation children are complete, and the
parent integration evidence is recorded below. External authored content remains
outside the authorized write scope.

## Deliverables and dependency order

The four planning child tasks are created with the existing task tool. Each child
copies its dependency and acceptance mapping into its own PRD and implementation
plan; a parent/child link does not encode prerequisites.

| Child | Owned boundary | Prerequisites | Completion evidence |
| --- | --- | --- | --- |
| A: composition and disabled mode | Site config, registries/resolver, render decorators, owned assets, Terminal destination capability transport | Approved parent design | AC1–4; unchanged canonical/X Core boundaries; enabled/disabled destination behavior |
| B: semantic entry lifecycle | Entry/exit UI, inactive/active controller and URL/focus lifecycle | A accepted; entry/history contract approved | AC5; keyboard/touch/no-JS and repeated entry/history checks |
| C: authored theme contract | Schema/metadata tooling, repository authored keys, theme module/props/DOM/CSS, docs | Approved direct rename; integrate after A because rendering/styles overlap | AC6–7; invalid/old keys rejected and authored styling stable |
| D: command vocabulary | Terminal command registration, help/usage/completion/hints, command/browser tests | A accepted for destination behavior; new vocabulary approved | AC3 and AC10; document `open`, experiment `launch`, inline `cat`, no legacy dispatch |

R5/AC8 is a gate for every child. The parent performs AC9 integration after all
children are accepted. Suggested execution order is A → D → B → C to avoid
concurrent edits to Terminal and document rendering tests. This ordering is the
active coordination plan for the implementation children.

## Ordered checklist

- [x] Resolve semantic entry/history behavior and consolidate the PRD without
      losing requirement IDs, acceptance mappings or source evidence.
- [x] Obtain final review of the consolidated design and receive explicit
      implementation authorization.
- [x] Create/link children and curate each child's context manifests before
      activation. Refresh applicable specs and repository status.
- [x] A: add optional site configuration, split presentation/navigator definitions,
      validate one resolved composition, and propagate it to rendering and
      canonical destination capability lookup without X Core metadata leakage.
- [x] A: isolate navigator JS/CSS delivery. Verify a minimal enabled/disabled
      production build before extending browser behavior; if build bundling leaks
      assets, revise the loading mechanism rather than relax AC2.
- [x] D: move document behavior/completion to `open` and experiment behavior/
      completion to `launch`; update `cat`/`ls` hints, help, examples and live specs.
      Keep resource-kind validation and standalone-command policies unchanged.
- [x] B: implement approved entry/exit lifecycle, initialize listeners once, and
      verify focus, cleanup, native anchors, repeated activation and history.
- [x] C: replace theme field/module/DOM vocabulary across producers and consumers;
      migrate repository authored keys with unchanged values. Reject old keys and
      introduce no runtime picker, compatibility exports or legacy parser.
- [x] For each child, update owning executable specs alongside future code; the
      current specs describe old live behavior and must not silently override the
      approved changes. Preserve unrelated path, privacy and metadata contracts.
- [x] Parent: verify the complete matrix and publication integration, inspect
      remaining old-name references by meaning, and record concrete evidence.

## Validation plan

Use the repository's Docker wrapper and tracked-content fixture for eventual
checks. Existing root scripts and `verify.sh` were inspected during planning;
recheck their current definitions when implementation begins. Configure
`FIREFLY_CONTENT_ROOT` to the repository's absolute `content` directory before
focused `./sam` invocations, avoiding accidental use of an external workspace.

Focused checks, used according to each changed boundary:

```text
./sam npm run check:m3
./sam npm run test:terminal
./sam npm run test:content:site
./sam npm run test:x-core:site
./sam npm run build:m3
```

For browser tests use the project's supported Playwright image and IPC settings
from `verify.sh` with `./sam npm run test:e2e:site`. Do not substitute source-text
checks for emitted assets, focus, URL or browser navigation evidence.

The repository fixture gate is `./verify.sh`.
It fixes the tracked content root and runs check/test/build plus site, NERV and
assembled-publication browser suites. Run this full gate once for the integrated
result; repeat only after relevant changes or unresolved failures. Record missing
Docker/browser prerequisites as limitations, never as passing checks.

## Integration evidence

- All four children are linked and marked `completed`; the active task pointer is
  clear. The production implementation uses one site-owned composition resolver,
  an explicit `none` result, a registered `document-navigator`, and one public
  capability lookup shared by Terminal destination decoration and document
  rendering.
- `FIREFLY_CONTENT_ROOT=/home/wkyuu/cargo/repo/11-firefly/content ./sam npm run check:m3` passed with 0 diagnostics in x-core, semantic, terminal and site.
- The same fixture passed `./sam npm run test:m3`: x-core 15, semantic 3,
  terminal 40, site content 89, and site X Core 8 tests.
- The same fixture passed `./sam npm run build:m3`: all package builds completed;
  site emitted 28 pages and all 18 static-output assertions passed.
- A temporary repository-local config selecting `navigator = "none"` for both
  presentations built 28 pages successfully. Its document HTML retained the
  complete content/outline/theme surface while omitting navigator DOM, entry,
  status and runtime/style references; generated assets not referenced by the
  disabled pages were allowed by the approved complete-publication boundary.
  The temporary config was removed and the external workspace was not edited.
- The pinned Playwright document-navigator suite against an isolated copy of the
  external content, with only its legacy `articleTheme` key migrated in that
  copy, passed all 48 desktop/mobile tests. The full external-content site run
  passed 154/162; the eight remaining failures were hard-coded external-content
  assumptions (NERV metadata and workflow outline/link text), not this task's
  navigator/theme/command behavior.
- The tracked-fixture `./verify.sh` run passed check, unit, build and publication
  assembly stages. Its site browser stage reported 22 fixture mismatches: the
  tracked fixture has no external semantic document, differs in NERV/workflow
  content, and exposed two stale assertions (`app/` and an inaccessible-name
  mismatch). The latter two assertions were corrected and their focused tests
  passed 2/2 each; the semantic/external-content mismatches remain fixture
  limitations and do not justify weakening the new acceptance checks.
- The active legacy vocabulary audit is clean by meaning: `articleTheme` remains
  only in explicit migration-negative tests/spec guidance, and `vim` remains
  only in the intentional unknown-command negative test. There is no built-in
  legacy alias, old fragment routing, or dual command dispatch.

Extend existing tests rather than create an unrelated test framework:

- `apps/site/tests/presentation-experiences.test.mjs` and `site-config.test.mjs`:
  omission, overrides, unknown/invalid IDs, duplicate definitions and a test-only
  alternate navigator definition. No production alternate navigator is required.
- `static-output.test.mjs` and build fixtures: posts/pages × firefly/semantic ×
  enabled/none × default/paper. Use separate site-config builds for enabled and
  disabled states; one presentation cannot have both settings in the same build.
  Add a mixed configuration to catch capability lookup using the wrong destination.
- `document-navigator.spec.ts`: direct fragment entry, same-page activation,
  local exit, repeated entry, ordinary heading anchors, focus and Back/Forward;
  enhanced toggles must not add history entries, reload or force scrolling;
  replacement updates controller state without relying on a `hashchange` event;
  no-JS/mobile checks and authored theme invariance across lifecycle transitions.
- Browser requests and emitted import/style graph: disabled pages have no
  navigator-only JS/CSS edges while comments/chrome remain independently usable.
- `content-schema.test.mjs`, metadata/CLI tests and X Core tests: new-only,
  omitted, old-only, both-name and invalid-value cases; no theme metadata leakage.
- Terminal package tests and `apps/site/tests/terminal.spec.ts`: help, exact
  completion candidate sets, cwd-sensitive execution, resource-kind errors,
  standalone restrictions, public/listed filtering and ordinary unknown `vim`.
- Publication tests: canonical document/experiment destinations and loaded assets
  survive assembly. The old fragment may appear only in negative assertions or
  historical explanations, never active routing/DOM behavior.

## Risk and rollback boundaries

Highest-risk surfaces are Astro asset inclusion, shared document wrappers/styles,
the navigator lifecycle, Terminal command completion, and strict content metadata.
Record build evidence early for asset isolation. Do not couple command parsing
to browser DOM/profile data or derive destinations from raw command operands.

No compatibility rollout is planned. If a change needs reverting, restore
the corresponding application/config/repository-content revision together; do not
add aliases or dual fields as an improvised rollback. External content remains
outside automatic writes. All child and parent integration work is complete.
