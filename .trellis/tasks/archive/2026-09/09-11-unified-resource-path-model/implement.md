# Unified resource path display: implementation plan

## 1. Confirm the current boundary

- [x] Read this task's PRD/design, the content-workspace contract, validation
      profile, and cross-layer/code-reuse thinking guides.
- [x] Recheck the worktree and keep the unrelated `sam` modification outside
      this task.
- [x] Confirm every current post/page-specific visible path projection with
      `rg` before editing: grep, find, ls, site fallback, and accessibility
      labels.

## 2. Implement one visible resource projection

- [x] Reuse the existing internal-to-shell-root mapping and expose a single
      runtime helper for site code; do not add a second path table.
- [x] Update neutral grep/document formatting and the runtime stdout adapter to
      use `~/blog/<virtual-path>` for named resources.
- [x] Update interactive site rendering and the static recovery index to use
      the same helper for grep locations, find rows, document labels, and tree
      accessibility labels.
- [x] Keep `GrepMatch.path`, VFS paths, Terminal metadata, and canonical browser
      `href` values in their existing internal/URL domains.

## 3. Update the executable contract and tests

- [x] Replace old assertions for `/posts/...`, `/pages/...`, and post-relative
      document rows with shell-visible paths where the value is user-facing.
- [x] Add a regression that takes a named grep result's displayed path and
      reads the same document with `cat`.
- [x] Cover posts, pages, scratch files, stdin, `-n`, pipelines, redirects,
      find, exact/wildcard ls, interactive DOM output, static fallback output,
      and preserved `/...` rejection.
- [x] Update `.trellis/spec/frontend/content-workspace-contract.md` so the
      unified display model is durable and its internal/browser exceptions are
      explicit.

## 4. Validation sequence

- [x] 1. `./sam npm run check:terminal`
- [x] 2. `./sam npm run test:terminal`
- [x] 3. `./sam npm run check:site`
- [x] 4. `./sam npm --prefix apps/site run test:content`
- [x] 5. Build the publication with `./sam npm run build:m4` when the site/static
   projection changes require assembled evidence.
- [x] 6. Run the affected Terminal browser suite with the pinned Playwright image:
   `SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- terminal.spec.ts`
- [x] 7. Run `git diff --check`, inspect the final diff, and verify generated output
   and ignored media are not staged.

## 5. Review gates and rollback points

- [x] Before code: complete planning artifacts, context manifests, and receive
      explicit approval of the final planning summary; only then run
      `task.py start`.
- [x] After implementation: dispatch `trellis-check` for full-scope review and
      resolve any spec/test drift before reporting completion.
- [x] Before commit: update the durable content-workspace contract if the
      behavior is accepted, rerun the relevant checks, and keep unrelated
      `sam` work uncommitted.
- [ ] If the browser or static fallback regresses, first revert site projection
      call sites; if neutral output regresses, revert formatter call sites while
      retaining the unchanged VFS and route boundaries.
