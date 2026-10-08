# Terminal Memo Discovery Research

Focused read-only research by the bounded investigation agent on 2026-10-07.
The main session checked the cited navigation, VFS, command registration, and
effect evidence before retaining these findings. No product changes or tests
were run.

## Current Behavior

- `apps/site/src/components/TerminalHome.astro:242` already appends an enabled
  native memos/ link after pages/, lab/, and posts/. Unlike those directory
  links, it has no data-home-browse-directory attribute. Line 256 also supplies
  an enabled desktop shell-recovery index heading.
- `presentations/terminal/src/vfs/public-index.ts:29` and
  `presentations/terminal/src/vfs/paths.ts:5` limit the actual virtual roots to
  posts/pages/lab. Memo therefore has no ls/cd/cat/open support.
- `presentations/terminal/src/runtime.ts:23` defines document entries as
  post/page. `presentations/terminal/src/vfs/contracts.ts:47` has no external
  mount node/capability. Adding an empty memos root alone would falsely imply
  ordinary directory operations.
- `presentations/terminal/src/commands/registry.ts:57` has no view or dedicated
  lab command. Lab is browsed through ls and launched through the launch
  handler at `presentations/terminal/src/commands/session.ts:220`. Cat/open
  reject experimental entries instead of pretending they are documents.

## Existing Extension Points

- `presentations/terminal/src/runtime.ts:197` supplies command execute,
  completion, help, and execution-policy contracts.
- `apps/site/src/scripts/terminal-home.ts:45` defines a site-local theme
  command; line 95 combines it with the default registry, consumed at line
  1212. A memos function can use this command mechanism without adding shell
  function definition syntax or a new generic shell language.
- Effects at `presentations/terminal/src/runtime.ts:133` currently navigate
  experiments or documents, not arbitrary static destinations.
  `apps/site/src/scripts/terminal-home.ts:900` resolves effects and line 1321
  performs native navigation from navigationHref. A page-opening Memo command
  needs an explicitly constrained static navigation effect/handler.
  Do not classify Memo as a post or experiment merely to reuse an effect.

## Feasible Product Options

1. Preserve the current native link and add an enabled-only memos command that
   opens /memos/. This needs no content fetch or blog-build Memo dependency.
   Help, completion, and execution registration should all honor activation.
2. Display Memo within the Terminal using a separately planned runtime bridge
   to its independent public export. Define decoding, version handling,
   loading/error/empty states, cancellation, links and reading behavior.
   Builds must not embed owner sources or an export snapshot that becomes
   stale after an independent Memo publish.
3. Support actual cd/ls/cat in an external Memo mount. This additionally needs
   a resource type, mount lifecycle, path/completion semantics, listing and
   read protocol, and explicit revision of current Terminal isolation rules.
   A complete fake directory is not the minimal discovery solution.

An iframe is technically possible but still requests the independent page,
does not supply directory semantics, and needs separate focus, scrolling,
layout and failure-state design. It is not the current recommendation.

## Mobile, Static Reading, and Activation

- `.trellis/spec/frontend/mobile-experience-contract.md:134` makes mobile
  homepage native browsing primary; it does not run the desktop shell.
  Keep native Memo links for mobile, disabled JS, and initialization failure.
- `.trellis/spec/frontend/memo-site-contract.md:24` explicitly keeps Memo
  outside Terminal VFS and blog source/export reading. Navigation-only
  commands preserve the independent-content boundary; in-shell content needs
  an explicit contract amendment.
- `.trellis/spec/frontend/plugin-public-access-contract.md:86` requires
  disabled HTML/JSON/CSS/media access to return 404 while preserving history.
  Navigation registration must not override that runtime gate.
- Existing evidence is in `apps/site/tests/memos-build.test.mjs:16` and
  `apps/site/tests/memos.spec.ts:3`: blog-build independence, link/sitemap-only
  activation, absent site-owned Memo output, and native-link behavior.

## Recommendation for Owner Review

Keep the native Memo entry and add an enabled-only memos page-opening command
as the smallest discovery change. Decide separately whether the intended
Terminal experience includes list/read behavior before planning content
bridging or external directory operations. This is a proposal, not an owner
decision.
