# Mobile Homepage Article Search Contract

## 1. Scope / Trigger

Read this contract when changing homepage article discovery, public search
metadata, body-text extraction, search input handling, or mobile search styles.
This feature belongs to `apps/site`, independent of Terminal commands and
document navigator composition. Core/presentation metadata and authored content
schemas do not acquire a search field.
The [Mobile Experience](./mobile-experience-contract.md) contract governs
homepage availability: eligible mobile clients get search and native browsing,
without Terminal startup, command UI, or input ownership.

## 2. Signatures

The pure helpers live in `apps/site/src/lib/home-search.ts`:

```ts
interface HomeSearchMetadata {
  readonly title: string;
  readonly filename: string;
  readonly virtualPath: string;
  readonly href: string;
  readonly date: string;
  readonly description: string;
  readonly tags: readonly string[];
}

decodeHomeSearchMetadata(value: unknown): HomeSearchMetadata;
readableSearchText(value: string): string;
normalizeSearchText(value: string): string;
createHomeSearchDocument(metadata: HomeSearchMetadata, blocks: readonly string[]): HomeSearchDocument;
searchHomeDocuments(documents: readonly HomeSearchDocument[], input: string): readonly HomeSearchResult[];
searchExcerpt(text: string, query: string, limit?: number): string;
extractHomeSearchBody(prose: Element): readonly string[];
```

The browser entry is `startHomeSearch(root: HTMLElement): void` in
`apps/site/src/scripts/home-search.ts`. `HomeSearchResult` carries public
`metadata`, plain-text `context`, and `match: 'metadata' | 'body'`.

## 3. Contracts

### Public data

- Use only the guest-projected documents already passed to `TerminalHome` from
  `getCanonicalContent()`. Draft/private bodies and metadata never enter the
  search corpus. Posts and pages are included; experiments and friends are not.
- Serialize exactly the site-owned `HomeSearchMetadata` fields with Astro-safe
  encoding on the corresponding inert article template. Do not serialize whole
  front matter, source/host paths, or private content. Do not extend the strict
  Terminal entry decoder with search-only fields.
- Decode metadata before use and require a one-to-one correspondence between
  template paths/hrefs and the complete public browse index. Invalid, duplicate,
  missing, or mismatched records fail the whole search projection; do not return
  an incomplete list as complete results.
- Results use the existing canonical public `href`, without adding the document
  navigator fragment or reconstructing a route from a query/title. Preserve valid
  Unicode paths and spaces in parent directory segments permitted by the existing
  route projection. Query input is never an executable command or destination.

### Matching and body source

- Title, filename, virtual public path, description, tags, and readable body
  blocks are searchable. Trim/collapse whitespace, normalize NFC, and apply
  consistent case-insensitive literal substring matching. A query does not span
  separate fields or body blocks. Chinese does not require tokenization/spaces.
- Extract body text lazily on the first nonempty eligible query from each
  existing sanitized template's `.terminal-stream-prose`; cache normalized
  documents for the visit. Do not instantiate templates, rewrite article prose,
  or use `innerText` on inert content. Preserve inline continuity and separate
  block boundaries; include prose/code/table text while excluding generated
  controls, diagrams/SVG, hidden content, scripts, styles, and nested templates.
- Terminal `grep`'s text reader includes metadata and overlapping nested blocks.
  It is a separate contract, not a precise body-search corpus. A shared extraction
  change must preserve that command's existing line/spacing behavior.
- Emit one result per article: metadata matches first, then body-only matches.
  Keep the original canonical public order within each group. Report the complete
  count; do not silently truncate results or duplicate articles per occurrence.
- Render a bounded plain-text context around the first relevant match. The
  default excerpt bound is 160 Unicode code points plus ellipses; folded offsets
  must map back correctly when lowercasing changes length. Render query/content
  through text nodes, never authored or query `innerHTML`.
  Avoid locale conversion for every preceding character while finding excerpt
  offsets: an expanded browser corpus exposed seconds of cached-search overhead.
  Use whole-string/length-preserving fast paths and reserve offset mapping for
  expansions; keep expansion and Unicode-surrogate regression coverage.

### Interface and lifecycle

- The labeled mobile form and inline results section are independent of desktop
  Terminal startup/recovery/session ownership. Mobile keeps the complete native
  browse section visible; search does not wait for or trigger Terminal startup.
- Use the existing `(hover: none) and (pointer: coarse)` media condition in CSS
  and browser code. Portrait/landscape phones and touch tablets are eligible;
  fine-pointer desktop keeps its existing UI. This does not enable the mobile
  document navigator.
- Reveal the search section only after its own initialization succeeds. No
  JavaScript leaves complete native browsing available with no inert search
  promise. Search failure stays separate from Terminal failure; preserve native
  article access and bounded feedback. Missing required UI nodes also enter the
  failure path. Mobile browse visibility must outrank connecting-state and
  hidden recovery rules, including flags left by a previous desktop session;
  setting `fallback.hidden = false` alone is insufficient against author CSS.
  Search failure never enables a mobile shell.
- Use a native search input, explicit submit/clear controls, polite result-count
  feedback, and native title links accompanied by date, public path, and excerpt.
  Long labels wrap, controls have visible focus and at least 44px targets, and
  page-level horizontal overflow is prohibited.
- Live input is debounced (150ms); Enter submits immediately. Suspend matching
  while IME composition is unfinished. Clear cancels pending work, clears
  results/status, and restores an empty form. Blank queries leave ordinary
  browsing available. Do not autofocus or open the software keyboard on entry.
- Terminal has no mobile input ownership, including inline startup guards and
  late callbacks. Native search controls and result links must not have typing,
  Escape, or Ctrl+L redirected to a hidden prompt. Searching does not replay
  startup or manipulate a saved desktop transcript.
- Eligible homepages flow as search/results and native article browsing. There
  is no mobile Terminal empty-session viewport or prompt placement to reserve or
  measure below search. Desktop retains its original viewport-center behavior.
- Input-mode changes cancel pending work and do not strand focus on a hidden
  control. Returning to mobile must not duplicate listeners or commit a stale
  callback. Query/results stay local and ephemeral; no remote search or storage
  persistence is introduced.

## 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| Blank/whitespace query | Clear search results/status; retain ordinary homepage behavior |
| Body-only hit | One article result with a readable matching excerpt |
| Metadata and body hit for one article | One metadata-tier article result |
| No matches | Explicit no-results status, no misleading partial list |
| IME composing | No committed update or Enter search before composition completes |
| Invalid/incomplete template projection | Withdraw search controls and preserve native article access |
| Missing search section or required control/status node | Enter the same browse-recovery failure path, without a silent early return |
| Body extraction fails | Fail-contained feedback and native browsing; never partial-success results |
| JavaScript disabled | Complete native browse links; no working-looking inert form |
| Media becomes ineligible | Hide search, cancel pending work, release hidden-control focus |
| Desktop Terminal was connecting/ready/failed before switching to mobile | Search/native browsing are independently usable; no mobile shell reveal or input capture |

## 5. Good / Base / Bad Cases

- Good: a phrase present only in a public page's paragraph finds that page, shows
  its context/path, and opens its canonical route with a normal link.
- Base: a title substring narrows public posts/pages, and Clear removes results
  while ordinary native article browsing stays available.
- Bad: exposing private/draft metadata in a separate index, filtering only the
  currently visible part of the list, searching generated buttons, or placing
  the search form inside Terminal's success-hidden recovery panel.

## 6. Tests Required

- Wire pure search-helper tests into the existing site package gate: every
  matching field, Unicode/NFC/case folding, literal punctuation, blanks,
  metadata-first stable order, one result per article, canonical spaced/Unicode
  paths, descriptor/metadata validation, and bounded excerpts.
- Register `home-search.spec.ts` in explicit Playwright project `testMatch`
  rules. A file that is not selected by those patterns is not browser evidence.
  Place test paths before project flags and use `--project=<name>`; the pinned
  variadic `--project` option can consume a following test path as a project.
- Test built artifacts for touch form/native-index discovery with no boot or
  command UI, submission, clear, IME, no-results, native result navigation,
  non-intercepted native input, search failure, media changes, public-only data,
  body extraction boundaries, overflow/target/focus behavior, and no-JavaScript
  recovery.
- Cover portrait, landscape, touch tablet, desktop interactive, and static
  projects. Use the tracked public fixture and `./sam`/`./render.sh` command
  boundary from `../trellis-plus/validation-profile.md`.
- Measure an expanded synthetic public corpus with hundreds of longer bodies;
  assert complete counts and record extraction/search timings. Do not add
  synthetic records or private content to the actual published workspace.
- For visual QA, capture the viewport and verify the actual hover/pointer/touch
  state around orientation changes. In the pinned browser setup, a full-page
  screenshot reset touch emulation (`maxTouchPoints` 1 to 0 and coarse pointer to
  fine pointer), correctly making the mobile search unavailable. Do not change
  product eligibility to hide that automation effect. Save captures in a mounted
  test artifact directory before copying them to host `/tmp`; a container-only
  `/tmp` capture disappears when the ephemeral wrapper exits.

## 7. Wrong vs Correct

```astro
<!-- Wrong: search availability depends on a shell-owned recovery lifecycle. -->
<section data-terminal-fallback>
  <form role="search">...</form>
</section>

<!-- Correct: search owns its visibility, and mobile keeps native browsing. -->
<section data-home-search hidden>
  <form role="search">...</form>
</section>
<section data-terminal-fallback>...</section>
```

```ts
// Wrong: authored/query text can create markup or an unrelated route.
item.innerHTML = query;
link.href = `/posts/${query}/`;

// Correct: text and destination retain their separate public contracts.
link.textContent = result.metadata.title;
link.href = result.metadata.href;
excerpt.textContent = result.context;
```
