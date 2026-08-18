# Move reader statusline to bottom

## Goal

Make the read-only Vim reader feel like one continuous document by moving its
status UI from the boundary between the document outline and prose to the
bottom of the viewport, where it behaves like a Vim statusline while the page
scrolls.

## Background and confirmed facts

- `ReaderStatus.astro` is shared by the semantic and Terminal document
  components, but each presentation owns its statusline CSS.
- Both document components currently render the status section between the
  optional outline and `data-terminal-reader-region`.
- `.reader-status` and `.terminal-reader-status` currently use a top sticky
  position and a full-viewport bleed. The resulting high-contrast band splits
  the title/outline from the prose instead of reading as document chrome.
- The Terminal status is visible on direct document entry; the semantic status
  is hidden until the explicit `#terminal-reader` fragment. The reader script
  owns mode, position, search, command, focus, and active-unit behavior.
- Existing reader tests cover sticky geometry, search/command lifecycle,
  active-unit visibility, responsive containment, and JavaScript-disabled
  fallback. The durable frontend contract currently describes a sticky status
  in normal document flow, so this task must update that contract if the new
  layout is implemented.
- The active `08-18-unify-public-document-presentation` task may change which
  public documents select the Terminal presentation. This task must not modify
  its content-selection changes or the unrelated shell-path task.

## Requirements

1. When visible, both semantic and Terminal reader statuslines stay continuously
   anchored at the viewport bottom during document scrolling, matching the
   user's Vim-like mental model. The implementation must not leave a second
   status band between the document header/outline and prose.
2. The statusline remains a compact, readable piece of reader chrome. Search
   and command forms may expand upward when active, retain native labels and
   inputs, visible focus, direction-specific prompts, and the existing 44px
   interaction target.
3. The layout reserves enough bottom space, including the expanded form state,
   that the statusline does not permanently obscure the active reading unit or
   the end of the document. Mobile safe-area insets and both configured
   desktop/mobile viewports remain usable.
4. Preserve the existing reader controller and behavior: semantic fragment
   activation, Terminal direct-entry visibility, `j`/`k`/`g`/`G`, visual mode,
   literal search and `n`/`N`, cancellation, `:q`, announcements, reduced
   motion, and native/no-JavaScript document fallback.
5. Preserve theme ownership and accessibility: semantic and Terminal status
   surfaces remain opaque, token-backed, sufficiently contrasting, keyboard
   reachable, and free of document-level horizontal overflow.
6. Update focused browser/static assertions and the durable frontend contract
   to describe the bottom statusline behavior. Do not change authored content,
   route URLs, the reader's search semantics, or the generic semantic adapter.

## Acceptance Criteria

- [ ] At the Terminal document route and the semantic `#terminal-reader`
      entry, the visible statusline's bottom edge remains at the viewport
      bottom while the document is at the top and after reader navigation or
      page scrolling; it no longer occupies the title-to-prose boundary.
- [ ] Header, optional outline, and prose remain visually continuous at the
      initial viewport; the active reading unit and final content remain
      reachable above the statusline in normal, search, and command states.
- [ ] Search and command interactions retain their current prompts, focus,
      44px target, cancellation, committed-result visibility, and keyboard
      behavior while expanding within the bottom chrome without horizontal
      overflow at the configured desktop and mobile widths.
- [ ] Existing reader movement/search/visual/exit tests and static/no-JavaScript
      document tests continue to pass, with focused geometry assertions proving
      the new bottom anchoring and reserved space.
- [ ] The semantic and Terminal styles use their existing theme tokens, and
      the frontend reader contract records the new bottom-anchored layout.
- [ ] `git diff --check` and the relevant site checks/build/browser suites pass;
      no unrelated worktree changes are staged or reverted.
