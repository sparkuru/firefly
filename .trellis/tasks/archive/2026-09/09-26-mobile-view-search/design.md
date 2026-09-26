# Design: mobile homepage article search

## Boundary and data flow

Keep the feature in `apps/site`. No change is needed to X Core metadata, authored front matter, presentation selection, Terminal command semantics, or the document navigator's mobile policy.

```text
getCanonicalContent() guest projection
  -> homepage public entry metadata + existing sanitized article templates
  -> independent homepage search initialization
  -> normalized metadata and rendered body text (cached on first use)
  -> literal matching and metadata-first stable ordering
  -> inline native article links and plain-text excerpts
```

`apps/site/src/pages/index.astro:18` already uses the guest projection. Preserve this as the only source of searchable documents. `TerminalHome.astro` receives the public entry metadata and rendered templates; add description and tags to a site-owned search projection without extending the strict `TerminalEntry` contract. Use Astro-escaped attributes or another safe framework-owned serialization for those fields, with an explicit browser-side type/shape check. Do not serialize entire front matter or workspace/source paths.

Use the existing inert `data-terminal-template` content for body text. Scope extraction to `.terminal-stream-prose`; exclude stream headers, actions, hidden/generated controls, and non-prose executable/style content. Join readable blocks with whitespace separators so neighboring elements do not accidentally form a new word. Search headings, paragraphs, lists, blockquotes, code, and table text while preserving inline text continuity. Do not instantiate article templates in the visible DOM, rewrite authored prose, or use `innerText` on inert templates.

The existing Terminal text reader includes metadata and overlapping block selections (`apps/site/src/scripts/terminal-home.ts:429`); its output is not an exact article-body projection. Reuse the sanitized template source, and share a small extraction helper only if doing so preserves the existing `grep` contract. Do not refactor Terminal commands solely to implement this feature.

## Search contract

Use a site-owned typed search document with canonical `href`, display title, virtual public path, date, description, tags, and extracted body blocks. Normalize text to NFC, collapse whitespace for matching, and use consistent case folding. Normalize the query the same way, trim it, and match as a literal substring within individual metadata fields or readable body blocks. A query is not a regex or a shell command. There is no stemming/tokenization dependency; Chinese contiguous substrings work naturally.

Return one result per document. Tier 1 contains any metadata-field match; tier 2 contains body-only matches. Within each tier retain the existing canonical public order. Do not introduce a score or silently truncate matches. Display the full article count, and render a bounded excerpt around the first body hit or the metadata context. Keep excerpt text bounded (approximately 160 Unicode code points, plus ellipsis) and do not split surrogate pairs. A plain-text snippet is sufficient; query/highlight markup must never come from authored or query HTML.

Cache extracted body blocks and normalized fields for the visit. Perform extraction lazily on first mobile search use; do not traverse article templates on desktop startup. Delay live updates briefly (about 150ms) to avoid repeated work while typing, with IME composition explicitly suspended. Enter commits immediately after composition completes. Clearing cancels pending work and clears results/count feedback. Measurements on an expanded local fixture must verify responsive input and no hidden result cap; if a worker or a separate index becomes necessary, revise the design before adding infrastructure.

## Interface and lifecycle

Add an independent search section before the homepage startup/recovery/session sections. It contains a labeled native `type=search` input, submit and clear buttons, a polite count/no-results status, and a result list of title links with date, public path, and context. Style it with existing Terminal tokens and responsive rules. Inputs and buttons have at least 44px targets, visible focus, and wrapping that avoids page overflow.

Use `(hover: none) and (pointer: coarse)` for mobile eligibility, reusing the site's existing media constant without treating this feature as document navigator availability. This covers landscape phones and touch tablets; a narrow fine-pointer desktop retains the existing desktop UI. Keep CSS and runtime visibility consistent during media changes.

The search section stays outside the existing fallback/session visibility lifecycle. It must remain visible after Terminal startup succeeds, while search results appear directly below the form. Existing native browse/Terminal surfaces remain present underneath; search does not replay startup, replace the transcript, or change their `hidden` state. Empty queries therefore return to the existing homepage behavior without lifecycle reconstruction. Search input, buttons, and result anchors use native elements already protected from Terminal typing capture; verify the document-level Terminal shortcuts cannot hijack search interaction.

Search initialization is independent and fail-contained: failure must not prevent Terminal startup or native recovery. Reveal the controls only after their controller and data boundary initialize successfully. No JavaScript leaves the original complete native browse surface available. If an error occurs while searching, withdraw the interactive search promise, restore access to ordinary browsing, and give bounded feedback rather than breaking the homepage. No query autofocus, background navigation, remote query request, or `#document-navigator` decoration is introduced.

Queries/results are route-local and ephemeral. Media changes cancel pending work when search is unavailable and must not leave focus on an invisible search control; any focus restoration must preserve native browser ownership. Returning to mobile can safely restore the last query or a cleared form, but must not duplicate listeners or process a stale debounce callback.

## Compatibility, trade-offs, and rollback

- Keeping a separate controller avoids coupling article discovery to Terminal failure/boot behavior and avoids importing command machinery for search.
- Reusing already-published sanitized templates avoids a second full-text body payload or search-service dependency. The cost is initial text extraction on first search; cache and measure it.
- Metadata-first ordering makes article-name queries useful even when many bodies mention the same phrase. Literal matching provides predictable multilingual behavior with a deliberately small query contract.
- With JavaScript disabled, full navigation remains available but interactive full-text search is unavailable. Do not render a working-looking inert form.
- Rollback removes the search section/controller, optional search metadata, and its styles/test registration. The existing content and Terminal artifacts remain authoritative; no data migration is required.
