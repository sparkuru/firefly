# Make ls and tree entries clickable

## Goal

Make the interactive Terminal's `ls` and `tree` output useful for direct
navigation: public documents remain clickable links, and public directories can
be opened in the current shell session as if the user had entered `cd <dir>/`.

## Confirmed Facts

- `ls` already renders `TerminalEntry` documents as native links to their
  canonical routes, but renders directory names as plain `<code>` text in
  `apps/site/src/scripts/terminal-home.ts`.
- `tree` currently preserves only display lines in its shell/runtime effect,
  even though `presentations/terminal/src/commands/tree.ts` already computes
  each child's virtual path.
- Public directory routes already exist and can remain the native fallback for
  directory anchors; interactive clicks should be handled by the Terminal
  session and update its virtual working directory.
- The existing path resolver and `cd` command are the safety boundary. This
  task must not introduce shell evaluation, arbitrary URL navigation, or host
  filesystem access.

## Requirements

1. `ls` document rows keep their current canonical native links.
2. `ls` public directory rows become keyboard-accessible native links. An
   unmodified primary click executes the equivalent of `cd <directory>/` in the
   current Terminal session, updates the prompt/cwd, and preserves the command
   transcript behavior. Modified clicks retain normal browser-link behavior.
3. `tree` keeps its current branch glyphs, ordering, and text output, while
   preserving enough structured child metadata to render:
   - public document nodes as canonical native links;
   - public directory nodes as the same Terminal `cd` links as `ls`;
   - listed experiments as their existing canonical route links;
   - any non-navigable file node as text.
4. The directory links use only paths already validated and exposed by the
   public virtual filesystem. Clicking a directory must not make a request to a
   host path or execute arbitrary command text.
5. Existing `ls`, `tree`, shell pipeline, file-navigation, accessibility, and
   no-JavaScript fallback behavior remains intact.

## Acceptance Criteria

- [x] `ls posts` (and nested public directory listings) renders directory names
      as focusable links and clicking `characters/` changes the prompt to the
      corresponding virtual cwd as `cd characters/` would.
- [x] `ls` document links retain their canonical hrefs and existing navigation
      behavior.
- [x] `tree /` and `tree /posts` preserve the exact visible tree structure while
      rendering document nodes as links and public directory nodes as clickable
      `cd` controls.
- [x] Keyboard activation of a directory link performs the same cwd update as a
      primary pointer click; modified pointer activation remains a native link.
- [x] Unit tests prove structured tree metadata and unchanged text/stdout output;
      browser tests prove `ls` and `tree` directory/document link behavior and
      prompt/cwd updates.
- [x] Affected Terminal/site checks, builds, and focused interactive Playwright
      coverage pass through `./sam`; `git diff --check` is clean.

## Out of Scope

- Changing file clicks from canonical navigation to inline `cat`.
- Adding a client router, runtime content fetch, or new public filesystem
  entries/routes.
- Making private/session scratch paths navigable through `ls` or `tree`.
