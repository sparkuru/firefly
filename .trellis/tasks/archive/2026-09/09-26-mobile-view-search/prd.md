# Add site-wide article search to the mobile homepage

## Goal

Help mobile readers quickly locate an article when entering the homepage, instead of scrolling through a long article list. The owner explicitly clarified that this is site-wide article discovery from the homepage.

## Background

- The homepage obtains guest-visible canonical documents and passes them to `TerminalHome` (`apps/site/src/pages/index.astro:18`). The public projection includes posts and pages and sorts by virtual path (`apps/site/src/lib/content.ts:218`).
- Its native browse surface renders posts and pages as separate lists, with display title, filename/path, date, canonical link, and markers. It also renders separate experiment and friend-link groups (`apps/site/src/components/TerminalHome.astro:192`). There is no dedicated article-search control on this surface.
- Content metadata includes description and optional tags (`apps/site/src/lib/content-schema.mjs:70`).
- The interactive Terminal currently provides `find` for public filenames and `grep` for body text (`presentations/terminal/src/commands/find.ts:94`, `presentations/terminal/src/commands/grep.ts:513`). Its controller hides the native browse surface on successful startup (`apps/site/src/scripts/terminal-home.ts:1499`), so a new search entry must account for the homepage lifecycle rather than assume the native list is always visible with JavaScript.
- The existing current-document navigator search is a separate capability (`.trellis/spec/frontend/content-workspace-contract.md:1322`). The prior mobile navigator policy stays outside this task (`.trellis/tasks/archive/2026-09/09-24-mobile-document-navigation-policy/prd.md:17`).

## Requirements

- R1. Provide a readily discoverable search entry on the mobile homepage, usable without knowing Terminal commands or using a physical keyboard.
- R2. Search across public articles, independent of their location in the long homepage list. Results must link to their canonical article routes and never expose private/draft content.
- R3. Let readers enter a query, identify matching articles, open an article, and clear the query to resume browsing through touch and the software keyboard.
- R4. Preserve existing desktop Terminal behavior, native article links, and document reading/navigation policy.
- R5. Match title, filename/path, description, tags, and article body. The owner explicitly approved body-text matching.
- R6. Use a labeled search input at the top of the mobile homepage, with results directly below it. Update results after input settles; Enter also submits. Support Chinese IME without treating unfinished composition as a committed query. Do not autofocus or automatically open the software keyboard.
- R7. Use trimmed, literal, case-insensitive matching; support Chinese text without requiring spaces. Show each article once, prioritize metadata matches over body-only matches, and retain deterministic ordering within each group. Empty/whitespace queries leave ordinary browsing available.
- R8. Show the result count and each matching article's title, date, path, and a bounded plain-text matching excerpt (or description when metadata matched). Same-title articles remain distinguishable by path. Search results use ordinary canonical links without forcing document navigator entry.
- R9. Search covers guest-visible posts and pages. Experiments and external friend links remain separate. With JavaScript unavailable or search initialization failing, preserve the complete native article browse links and avoid exposing nonfunctional search controls.
- R10. Search remains discoverable on touch-primary, no-hover clients in portrait and landscape, including after successful Terminal startup. Keep queries local to the current homepage visit; do not send them to external services.

## Acceptance Criteria

- [x] On entering the mobile homepage, a reader can discover and activate article search without scrolling through the full article list or entering shell commands. (R1)
- [x] A query can find a matching public article regardless of its position in the homepage list, and tapping the result opens the canonical article route. (R2, R3)
- [x] Private/draft documents are absent from searchable data and results. (R2)
- [x] Clearing the query restores ordinary article browsing; an unmatched query gives explicit no-results feedback. (R3)
- [x] The controls remain usable in phone portrait/landscape and touch-tablet layouts without document-level horizontal overflow; interactive controls have visible focus and at least 44px touch targets. (R6, R10)
- [x] Existing desktop Terminal startup/commands, native recovery links, and document navigator behavior remain intact. (R4)
- [x] An article can be found by a query that appears only in its body, and the result provides enough matching context to identify the article. (R5)
- [x] Title, filename/path, description, tags, and body-only fixtures each demonstrate matching. Case variation, literal punctuation, Chinese input, whitespace-only input, and composition/Enter handling behave as specified. (R5, R6, R7)
- [x] Results show accurate article counts, no duplicate articles, metadata-first ordering, and distinguishable duplicate-title entries. Snippet/query text is rendered as text and cannot create markup. (R7, R8)
- [x] Both public posts and public pages are discoverable. Experiments, friends, private/draft metadata, and private/draft body text are absent from the search projection. (R2, R9)
- [x] Search remains usable after Terminal startup, startup failure, and a media-condition change without stealing search input focus or altering the command transcript. (R4, R10)
- [x] Disabling JavaScript or failing search initialization retains full native article navigation with no misleading working-search promise. Queries are never sent to a remote search endpoint. (R9, R10)

Acceptance evidence is recorded in `research/validation.md`. All required automated gates and viewport visual review passed; physical-device software-keyboard review remains optional.

## Scope Boundaries

- Scope is article discovery from the homepage. Current-article text finding, mobile document navigator controls, and directory-page search entries are not requested.
- Desktop search UI and changes to the existing Terminal commands are excluded.
- Fuzzy matching, regular expressions, query operators, relevance scoring beyond metadata-first ordering, and matching image-only text are excluded.
- Search history, remote search services, authored metadata changes, and deployment work are not currently requested.

## Decisions and Deferred Items

- Confirmed by the owner: homepage article discovery across the site; body text is included.
- Owner approved the final interaction with "同意": a top-of-homepage mobile search form and an inline results list, preserving existing homepage browse/Terminal surfaces.
- Matching uses rendered public prose, including searchable code/table text, rather than Markdown syntax or presentation controls. Diagram/image labels and hidden/generated control text are not promised searchable content.
- Real software-keyboard geometry and subjective visual quality can benefit from a physical-device check. Automated touch-browser evidence covers the reproducible acceptance behavior; no device access is assumed.
