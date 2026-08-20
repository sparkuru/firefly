# M5 content filesystem and Vim reader — Implementation Plan

## Entry gate

- [x] Obtain owner approval of the final planning summary.
- [x] Return to M4, obtain explicit submit-ready approval, commit and archive it,
      run Project Pulse, and confirm this task remains the next authorized item.
- [x] Start this task only after that dependency is complete.
- [x] Confirm `./sam node --version` reports the locked Node 22 runtime.
- [x] Load every curated implementation context entry before editing.

## 1. Workspace transport and ingestion

- [x] Add strict shell handling for `FIREFLY_CONTENT_ROOT`, default fixture root,
      exact read-only same-path workspace/link-target mounts, recursive link
      discovery, broken-link/cycle-safe failure, and existing labels/ports/IPC.
- [x] Keep `dev.sh` and root build delegates on the same content-root contract.
- [x] Implement deterministic Node scanner/materializer with safe virtual segment,
      lstat/realpath/link ancestry, type, Unicode/case, file/directory, duplicate,
      and transaction/rollback checks.
- [x] Materialize ordinary Markdown only into an ignored candidate, validate it,
      and promote without stale files or output symlinks.
- [x] Add positive nested file/symlinked file/symlinked directory fixtures and
      negative broken/cycle/special/unsafe/collision/rollback/private-sentinel
      fixtures. Clean all generated test stages in `finally` paths.
- [x] Wire every site check/build/dev/test command that needs collections through
      a fresh materialization boundary; no direct Astro command may silently use
      stale staged content.

## 2. Metadata, identity, and canonical model

- [x] Extend the strict post schema with optional legacy slug assertion and exact
      public/private-owner access union; retain page compatibility.
- [x] Implement frozen guest/user/admin principal types and pure draft-first
      projection. Bind production site calls to the guest constant only.
- [x] Build the canonical document model from collection + staged relative path,
      including virtual Markdown path, route, directories, breadcrumbs, metadata,
      aliases, and access result.
- [x] Add route reservation/collision checks for exact/case/Unicode/file-directory/
      alias forms and `index.md` semantics.
- [x] Update X Core context, public content helpers, Terminal serialization, and
      template bijection to consume the canonical model without source paths.
- [x] Add negative output/body/title/path sentinel tests proving private content
      never enters route HTML, home templates, JavaScript, completion, tree,
      directory indexes, or publication inventory.

## 3. Nested routes, directories, and breadcrumb

- [x] Replace flat post route generation with canonical nested static document
      paths while preserving existing flat URLs.
- [x] Generate `/posts/` and every guest-visible nested directory index with
      native immediate-child links, home path, semantic headings, visible focus,
      controlled measure, mobile wrapping, and no JavaScript.
- [x] Refactor Terminal document props to receive canonical path/breadcrumb data.
- [x] Replace the ambiguous command strip with exact prompt + linked root/parent
      tokens and an underlined unlinked current `.md` filename; update titlebar/
      path metadata together and reject literal `cd` or duplicate/glued slashes.
- [x] Add static route/deep-link/404/heading/breadcrumb/focus/overflow/browser
      coverage at desktop and mobile viewports with JavaScript disabled.

## 4. Command registry, aliases, tree, and nested cat

- [x] Introduce immutable command definitions/registry with token, freeze,
      duplicate, alias-collision, help, lookup, execution, and completion checks.
- [x] Port every existing command/effect without behavior drift; register `tree`.
- [x] Prove future extension with a unit-only custom command + alias fixture; do
      not add runtime plugin loading or surprise default aliases.
- [x] Replace Terminal entry decoding with exact virtual-path/route contracts and
      adversarial descriptor/getter/prototype/path cases.
- [x] Derive one frozen guest tree and deterministic directory-before-file output.
- [x] Change the frozen Terminal working directory to `~/blog/posts`; implement
      default-current `tree`, full-root `tree /`, mount-specific `tree /posts` /
      `tree /pages`, current-relative `cat [./]...md`, and virtual-absolute
      `cat /posts/...md` / `cat /pages/...md` with segment-aware unique-only
      completion. Reject traversal, host/unknown roots, URL, backslash, hidden,
      private, and ambiguous inputs.
- [x] Implement `vim <virtual-path>.md` on the same resolver/completer with a closed
      canonical-document navigation effect; prove raw input never becomes a URL,
      directory, hidden/private, unsafe, unknown, and ambiguous operands stay put,
      and the destination reader exits to `/` through `:q`.
- [x] Update controller rendering/announcements and preserve history, clear,
      recovery, IME, safe global typing, lab commands, and prompt/document
      settlement.

## 5. Read-only Vim reader

- [x] Add a Terminal-document-only progressive-enhancement controller and keep
      canonical HTML complete without JavaScript.
- [x] Emit stable semantic reading-unit identities, one focusable reader region,
      compact mode/status surface, labeled search/command inputs, and polite live
      announcements without adding every block to Tab order.
- [x] Implement normal `j/k/g/G`, reduced-motion-aware reading settlement, and
      protected-key/native-target/IME/selection boundaries.
- [x] Implement real Range-based visual `v` selection with `j/k` extension/
      contraction and Escape cleanup.
- [x] Implement forward `/`, backward `?`, literal query, Enter, no-result state,
      `n/N`, capability-gated highlights, and deterministic focus restoration.
- [x] Implement `:` command mode with only `:q` + Enter navigating to `/`, clear
      unsupported-command feedback, and Escape cancellation.
- [x] Add focused Playwright coverage for every supported key/mode and negative
      native link/control/local-scroll/modifier/IME/manual-selection/browser
      shortcut path across desktop/mobile and reduced motion.

## 6. Publication and container integration

- [x] Update exact site/release inventories for directory pages, reader asset,
      and any changed hashed filenames; forbid maps, symlinks, source/private
      paths, stale files, or unknown artifacts.
- [x] Add a validated runtime-only Docker target/delegate for the workspace-built
      assembled publication while preserving the repository-fixture source build.
- [x] Ensure private/external sources never enter final image or broad build
      context; only validated guest `dist/` is copied.
- [x] Update Nginx/reference checks for arbitrary nested directory/document paths,
      canonical trailing slashes, site/NERV 404 ownership, security/cache headers,
      and reader/font assets.
- [x] Exercise exact label teardown and leave no containers, listeners, generated
      reports, or temporary content stages.

## 7. Validation and review

- [x] Shell gates: `bash -n`, ShellCheck, shfmt, executable modes, hostile path/
      mount probes, and exact teardown.
- [x] Run affected package checks/builds/tests through `./sam`: X Core, Terminal,
      site content negatives/integration/static output, assembler, and NERV where
      release inventory/routes require it.
- [x] Run focused static/Terminal/reader Playwright first, then full site,
      publication, and relevant NERV suites with the locked Playwright image.
- [x] Run a repository fixture publication and a temporary external nested
      workspace publication containing valid file and directory symlinks.
- [x] Build/probe the production-shaped runtime-only image: health, root/tree,
      nested directories/document, reader asset, `/lab/`, NERV, redirects,
      distinct 404s, security/cache headers, non-root/read-only confinement,
      exact guest inventory, absence of private/source sentinels, and teardown.
- [x] Capture focused `1440×900` and `375×812` screenshots for tree, nested
      directory, breadcrumb, normal/search/visual reader states.
- [x] Run Trellis context validation and `git diff --check`.
- [x] Dispatch independent `trellis-check`; fix every confirmed finding and rerun
      affected gates.
- [x] Use `trellis-update-spec` for executable workspace/link/access/path/registry/
      reader/publication contracts.
- [x] Present the submit-ready human gate. Do not commit or archive until the
      owner explicitly approves the implementation.

## Risk and rollback points

- Shell mount planning is security-sensitive: preserve exact repo/scope/service
  labels and never broaden mount ancestors for convenience.
- Content stage replacement is destructive only within its explicit ignored
  generated path; validate candidate/target ancestry and keep rollback coverage.
- Catch-all routes can shadow 404/directory paths: reserve the entire route table
  before emitting `getStaticPaths()` results.
- Reader key handling can create accessibility regressions: native ownership and
  JavaScript-disabled reading are release gates, not follow-up polish.
- Do not run dependency audit force-fixes or unrelated Astro upgrades.
- A failed task reverts product/spec/task edits and regenerates the M4 baseline;
  it never changes linked source content.
