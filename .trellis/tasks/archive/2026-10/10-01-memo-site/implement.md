# Memo site implementation plan

## Ordered checklist

1. Load `trellis-before-dev` guidance for the frontend, plugin, route,
   navigation, and static-output layers.
2. Extend public site config/types and disabled examples; preserve comments
   behavior and short-circuit before reading disabled memo config. Consume the
   accepted memo contract with a manifest-aligned adapter/declarations at
   `apps/site/src/plugins/memos/index.mjs`, strict byte decoding, real path
   containment and regular-file/non-symlink checks. Add focused adapter tests.
3. Register the standalone site plugin/stream adapter without forcing memo into
   the existing post-only extension hook.
4. Prevalidate enabled exports in both site build entrypoints. Add the
   conditional rest-parameter `/memos/` route, semantic list/empty state,
   no-JavaScript form, service-owned response contract and scoped styles.
   Disabled builds emit no route or sitemap URL. Keep body rendering text-only,
   consent required/unchecked and form fields exactly service-compatible.
5. Add conditional primary navigation and Terminal recovery links; verify no
   memo entries enter content/search/Experiment projections.
6. Add isolated enabled/disabled build fixtures for inventory, invalid/missing
   exports, private-field rejection, escaped text, Unicode and projection
   isolation. Add dedicated memo browser fixtures/config that serve prebuilt
   static output and prove native URL-encoded POST/consent/service responses
   without JavaScript at desktop/mobile sizes. Fixtures remain synthetic and
   local; run ordinary interactive navigation regressions too.
7. Run site checks/tests and inspect generated HTML for private-field leakage.
   Ensure `sam` forwards `FIREFLY_MEMOS_EXPORT` without disabled-path file
   probing; run Bash syntax, ShellCheck, shfmt and wrapper handoff evidence for
   this minimal command-boundary change.
8. Dispatch independent full-scope `trellis-check`, resolve findings, and
   update owning specs/evidence before the required finish decision. Keep
   publication/runtime as a separate planning child.

## Activation gate and dependencies

- The owner approved the latest planning summary on 2026-10-04. The main
  session activated this child with `task.py start`; implementation is authorized.
- Contract (`c9885e6`) and service (`bcbca34`) are completed and archived.
  Consume their accepted contracts; no service deployment is needed here.
- The owner must approve the latest final summary before `task.py start`.
  Keep the parent planning as the integration record.
- Validate the curated `implement.jsonl` and `check.jsonl`; dispatch with this
  child's active task path, native context injection preferred and child-side
  loading as fallback. The main session owns review/spec/finish decisions.

## Validation commands

Run package commands through approved wrappers with tracked content selected:

```bash
FIREFLY_CONTENT_ROOT="$PWD/content" ./sam npm --prefix apps/site ci
FIREFLY_CONTENT_ROOT="$PWD/content" ./sam node --test plugins/memos/tests/*.test.mjs
FIREFLY_CONTENT_ROOT="$PWD/content" ./sam npm --prefix apps/site run test:content
FIREFLY_CONTENT_ROOT="$PWD/content" ./sam npm --prefix apps/site run test:x-core
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run check
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run build
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host FIREFLY_CONTENT_ROOT="$PWD/content" ./sam npm --prefix apps/site run test:e2e
./verify.sh
```

Planned scripts to create during implementation:

- `test:memos`: adapter/config and isolated enabled/disabled build assertions,
  through `./render.sh` because site builds can render diagrams.
- `prepare:test:memos`: generate synthetic repo-contained config/export
  fixtures and build enabled static output through `./render.sh`.
- `test:e2e:memos`: dedicated Playwright configuration serving that immutable
  output, through `./sam` with the pinned browser image and IPC.

Do not rebuild in the browser preview server. Restore/build the tracked disabled
configuration before ordinary tests and the repository gate. Generated fixtures
stay under the ignored test-results area; clean only test-owned files. Finalize
exact fixture script options during implementation and record actual results.

## Acceptance mapping

| Criteria | Evidence |
| --- | --- |
| AC1 | Valid/empty adapter tests and enabled route build |
| AC2 | Strict decoder, file/path and negative build fixtures |
| AC3 | Disabled unusable-input fixture; inventory/sitemap scan |
| AC4 | Field/action assertions and JS-disabled native browser POST |
| AC5 | Hostile text/Unicode/privacy fixtures and viewport captures |
| AC6 | Native/mobile navigation, projection exclusion and regressions |

## Risk and rollback points

- The disabled path must short-circuit before export resolution; preserve this
  as a focused regression test.
- Do not broaden the post-only registry to make memo look like a post. Add the
  smallest explicit stream capability or route-owned adapter.
- If output privacy fails, remove the route integration before changing the
  publication gate; publication must remain fail-closed.
- Do not copy comments' missing-export fallback or lexical-only checks.
- A fixed empty `index.astro` still emits a route; verify emitted inventory.
- Same-origin proxying, client-IP/rate topology, real mail, publication metadata
  and stale-epoch refusal belong to the publication/runtime child. Browser
  fixture responses prove frontend compatibility only.
- Rollback disables/reverts the adapter, never deletes private service data.

## Final implementation and review status

Implementation, full-scope independent review, automated gates and main-session
desktop/mobile visual inspection passed on 2026-10-04. All six PRD criteria are
checked; exact results and staged gate provenance are recorded in
`research/validation-findings.md`. No unresolved site finding remains. Source
is frozen. The owner approved Phase 3.4 on 2026-10-05 and the exact work
batch was committed as `f5bc47c`; site-only archival and journal recording follow.

## Approved commit batch — 2026-10-05

One coherent work commit: `feat: add static memo site integration`.
It includes the following 36 product/test/config/spec files. The two proven
stale theme fixture corrections are part of this verified change; they do not
change theme behavior or weaken sanitizer/native-directory guarantees.

```text
.trellis/spec/frontend/architecture-contract.md
.trellis/spec/frontend/content-workspace-contract.md
.trellis/spec/frontend/directory-structure.md
.trellis/spec/frontend/homepage-search-contract.md
.trellis/spec/frontend/index.md
.trellis/spec/frontend/memo-contract.md
.trellis/spec/frontend/memo-site-contract.md
.trellis/spec/frontend/mobile-experience-contract.md
.trellis/spec/frontend/site-configuration-contract.md
apps/site/package.json
apps/site/playwright.memos.config.ts
apps/site/scripts/prepare-memos-fixture.mjs
apps/site/scripts/serve-memos-fixture.mjs
apps/site/scripts/validate-memos-build.mjs
apps/site/src/components/TerminalHome.astro
apps/site/src/layouts/DocumentLayout.astro
apps/site/src/lib/contained-file.mjs
apps/site/src/lib/content.ts
apps/site/src/lib/site-config.mjs
apps/site/src/lib/site-plugins.ts
apps/site/src/pages/memos/[...stream].astro
apps/site/src/plugins/memos/MemoForm.astro
apps/site/src/plugins/memos/MemoStream.astro
apps/site/src/plugins/memos/index.d.mts
apps/site/src/plugins/memos/index.mjs
apps/site/tests/content-build-positive.test.mjs
apps/site/tests/memos-build.test.mjs
apps/site/tests/memos-fixture.mjs
apps/site/tests/memos.spec.ts
apps/site/tests/memos.test.mjs
apps/site/tests/mermaid-rendering.test.mjs
apps/site/tests/static-output.test.mjs
config/plugins/memos/config.toml.example
config/plugins/memos/site-public.toml.example
config/site.toml.example
sam
```

After that work commit, archive only `10-01-memo-site` through the task helper
and record its developer session through `add_session.py --no-commit`, then
stage only the affected developer journal and index for `chore: record journal`.
This keeps archive and journal as separate bookkeeping commits and prevents
an active-task fallback from staging the parent planning directory.
Current task artifacts are handled by that workflow,
not folded into the product commit. The parent/publication-runtime planning
directories predate this implementation and remain local planning records;
preserve them, including the main session's parent progress edits. Do not
activate the next product task or push as part of this batch.
