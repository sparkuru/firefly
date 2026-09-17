# Remove legacy document navigator compatibility

## Goal

During development, make the latest `document-navigator` naming and contract
authoritative across the site and Terminal presentation. Remove the legacy
page fragment/DOM identifier that was retained by the preceding refactor, so
the live codebase has one current document navigator contract and its tests and
durable specifications describe that contract directly.

## Background and confirmed facts

- The preceding task composed document navigation by presentation profile but
  deliberately preserved `#terminal-reader`, `id="terminal-reader"`, and the
  `vim` command as compatibility behavior.
- The user has chosen the latest-first development policy and confirmed that
  `vim` remains the current Terminal command. The page-level compatibility
  surface is the part being removed.
- `apps/site/src/lib/document-navigation.ts:1` currently exports
  `DOCUMENT_NAVIGATOR_FRAGMENT` as `#terminal-reader`.
- `apps/site/src/components/TerminalDocument.astro:94-103` and
  `apps/site/src/components/SemanticDocument.astro:68-79` currently expose
  `id="terminal-reader"` on the document navigator region.
- `presentations/terminal/src/commands/session.ts:17-20,229-271` defines
  `vim` as a first-class command that resolves public documents. It has no
  alias or deprecation wrapper.
- The current browser helper in
  `apps/site/src/scripts/terminal-home.ts:127-137` already imports the shared
  fragment constant and adds the fragment only when rendering the browser
  destination for a document-navigation effect.
- The durable live contracts containing the old fragment are
  `.trellis/spec/frontend/content-workspace-contract.md:1187-1209`,
  `.trellis/spec/frontend/publication-contract.md:264-269`, and
  `.trellis/spec/frontend/x-core-contract.md:155-162`.
- The old compatibility decision is recorded in the archived preceding PRD;
  that historical record and the developer journal remain evidence and are not
  live contracts to rewrite.

## Requirements

- **R1 — Current page contract:** Use `#document-navigator` as the sole
  document navigator entry fragment and `document-navigator` as the sole DOM
  region ID.
- **R2 — One source of truth:** Keep the fragment value in
  `DOCUMENT_NAVIGATOR_FRAGMENT`; runtime entry gating and Terminal-generated
  document links must derive from it rather than define another literal.
- **R3 — Behavior preservation:** Preserve the existing `always` and
  `fragment` presentation profiles, status visibility, focus timing, native
  hash settlement, Back/Forward behavior, `:q`, search, selection, responsive
  layout, progressive enhancement, and JavaScript-disabled document content.
- **R4 — Terminal command boundary:** Keep `vim` as a first-class command with
  its existing name, path resolution, completion, help, fragment-free
  `open-document` effect, and shell behavior. Its browser destination will use
  the current page fragment through the shared site helper.
- **R5 — Contract consumers:** Update site source assertions, static output
  checks, JavaScript-disabled browser checks, interactive browser checks,
  screenshot routes, and live frontend specifications to the current fragment
  and ID.
- **R6 — Intentional compatibility removal:** Do not add a redirect, alias,
  dual ID, legacy hash branch, or migration layer for the old page contract.
  Previously published URLs using the old fragment are outside this
  development scope.

## Acceptance Criteria

- [x] **AC1 (R1, R2):** `DOCUMENT_NAVIGATOR_FRAGMENT` is exactly
      `#document-navigator`; both document components render exactly one
      `id="document-navigator"` region, and no live runtime path defines a
      competing legacy fragment or ID.
- [x] **AC2 (R3):** The pure presentation/profile tests still cover Firefly's
      always-entry/visible profile and semantic's fragment-entry/hidden
      profile. Focus, status, native hash, history, `:q`, search, selection,
      responsive, and progressive-enhancement assertions retain their current
      meaning under the new fragment.
- [x] **AC3 (R3, R5):** Built Terminal and semantic document output remains
      complete without JavaScript, contains the current navigator region, and
      preserves navigator asset and status ordering/visibility contracts.
- [x] **AC4 (R4, R5):** `vim` still resolves and opens the same public
      documents, while browser tests expect its generated URL to end in
      `#document-navigator`; unit tests continue to verify the fragment-free
      shell effect.
- [x] **AC5 (R5):** Site content, static-output, focused/full desktop and
      mobile Playwright, screenshot, package, build, and publication checks
      pass, or an environment-only limitation is recorded with evidence.
- [x] **AC6 (R6):** A live-source audit finds no `terminal-reader` reference in
      product source, tests, or active frontend specifications. References in
      the current task's evidence, archived task records, and historical
      journal are explicitly excluded from this audit.

## Scope

In scope:

- `apps/site/src/lib/document-navigation.ts` and the two document components;
- dependent site browser URL behavior through the existing shared constant;
- affected site unit, static-output, JavaScript-disabled, interactive, and
  screenshot assertions;
- the three live frontend contract documents named above;
- task-local research, manifests, validation, and final review.

Out of scope:

- renaming or removing `vim`, adding a replacement shell command, or changing
  Terminal command registry/completion semantics;
- changes to X Core metadata, presentation IDs, front matter, canonical route
  generation, comments payloads, article-theme resolution, authored Markdown,
  NERV, or the external blog workspace;
- rewriting archived task records or developer journals;
- preserving previously published `#terminal-reader` URLs through redirects or
  aliases.

## Decisions and risks

- The user decision is to keep `vim`; changing it would be a separate shell UX
  and API rename with a larger command/test surface.
- The new page contract intentionally breaks the old public fragment/ID
  contract during development. The main risk is a partial cross-layer rename
  that leaves runtime, generated HTML, tests, and specifications inconsistent.
  The shared constant, exact-one-ID static assertions, live-reference audit,
  and desktop/mobile browser matrix address that risk.
- No blocking open questions remain. Complex-task design and execution
  artifacts are required before task activation.
