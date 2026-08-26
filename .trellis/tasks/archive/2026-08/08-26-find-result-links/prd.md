# Make Terminal find results clickable

## Goal

Make direct interactive `find` results useful for navigation: every matched
public document is rendered as a native, keyboard-accessible link that opens
the document's existing canonical route. Keep the command's deterministic text
projection unchanged so pipelines and redirects continue to receive the same
plain rows.

## Background / Confirmed Facts

- `find` already performs the approved case-insensitive visible-filename
  search over public posts/pages, including safe recursive `--path` and
  inclusive date filters.
- `find` currently returns only `stdout`, so the browser controller renders
  successful matches as inert text.
- `ls` already carries validated document metadata through a structured
  Terminal effect and renders document rows as native links. Its DOM event
  handler intercepts only directory links carrying `data-terminal-cd-path`;
  ordinary document anchors retain native browser behavior.
- The neutral shell has separate `stdout` and structured `value` channels.
  Only bounded `stdout` crosses a pipeline; structured values are available to
  direct interactive rendering.
- `TerminalEntry.href` is decoded from the build-time public index and already
  validated as a same-origin canonical document route. The browser must not
  construct a URL from the search keyword or raw command text.
- The existing Terminal entry-row CSS is responsive and already supports
  focusable document anchors with wrapped paths.

## Requirements

1. A successful direct interactive `find <keyword>` renders each matching
   public document as a native `<a>` using its validated canonical `href`.
   The link is keyboard reachable and Enter activates the same canonical route.
2. Find links use the existing `ls` document-link semantics: normal primary
   activation follows the native same-origin route, while browser-modified
   activation remains native. No inline document fetch or client router is
   introduced.
3. The visible direct result preserves the existing row data: display path,
   publication date, and title. Results remain in canonical virtual-path order.
4. Piped, substituted, and redirected `find` output remains plain deterministic
   text in the existing `<display path> — <date> — <title>` format. A pipeline
   must not serialize HTML or structured link metadata.
5. Existing filename matching, public-only scope, date filters, validation,
   help output, no-match behavior, and bounded-walk fail-closed behavior remain
   unchanged.
6. The structured result must be built only from validated public index/VFS
   records. Any adapter mismatch fails safely to the existing text projection;
   it must not expose private paths or accept a URL from user input.
7. Add focused unit, adapter, and browser coverage for direct links,
   keyboard reachability/canonical navigation, and the unchanged text pipeline.

## Out of Scope

- `--exact`, title/body/tag/description search, ranking, pagination, or new
  search filters.
- Inline `cat` rendering, a client router, runtime fetches, or new document
  routes. The link follows the same canonical route already used by `ls`.
- Making no-JavaScript recovery indexes execute `find`; the existing static
  recovery surface remains unchanged.
- Changes to directory links, `tree`, experiment links, friend links, or the
  comments/production roadmap.

## Acceptance Criteria

- [x] Direct `find alpha` renders the matching document row with a native link
      whose href is the canonical post route and whose visible data includes
      the path, date, and title.
- [x] A direct page match is also a native link with its canonical page route;
      the link is keyboard focusable and Enter navigates to that route.
- [x] Multiple matches remain in canonical virtual-path order and each link is
      independently reachable.
- [x] `find alpha | cat` and other text projections keep the exact existing
      plain row without any anchor markup or structured payload.
- [x] Existing find filters, invalid-input errors, help, no-match output,
      public-only scope, and work-limit behavior remain green.
- [x] Terminal package tests/check/build and focused site interactive browser
      tests pass through `./sam`; `git diff --check` is clean.

## Planning Status

The product scope and implementation are complete. The dedicated structured
document-search value/effect reuses the existing validated `TerminalEntry` link
and row conventions, while retaining the neutral text projection for shell
composition.
