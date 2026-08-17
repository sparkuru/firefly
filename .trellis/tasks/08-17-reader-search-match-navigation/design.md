# Reader search match navigation and highlighting — Technical Design

## 1. Scope and product boundary

The existing read-only reader remains a progressive enhancement over complete
semantic HTML. This task changes only the local search model, status feedback,
and match navigation. Canonical routes, `#terminal-reader` entry, native
navigation, `:q`, authored content, and the bounded Vim capability boundary do
not change.

The central distinction is:

```text
reading unit = movement/visual-selection boundary
search match = one literal occurrence inside a reading unit
```

`j/k/g/G` and `v` continue to operate on reading units. `/`, `?`, `n`, and `N`
operate on individual search matches.

## 2. Search match model

`terminal-reader.ts` introduces a private route-local match record:

```ts
type SearchMatch = {
  readonly unitIndex: number;
  readonly range: Range;
};
```

The search collector receives the current `units` and a non-empty query and
returns document-order, non-overlapping matches. It walks visible text nodes
inside one unit, builds a temporary flattened-text index, performs the
existing literal case-insensitive search, then maps each folded-text interval
back to the exact start/end text nodes and offsets for a `Range`. Matches never
cross reading-unit boundaries. Inline markup inside one unit is preserved; the
collector never writes to text nodes or inserts wrapper elements.

The folded-text mapping must preserve the original DOM offsets for the current
ASCII/Unicode text rather than assuming that a lower-cased string has the same
code-unit length. A query that cannot map to a valid DOM range is skipped rather
than producing a broad unit range. Empty queries produce no matches.

## 3. Highlight and active-match rendering

When CSS Highlights are available, the controller owns two names:

- `terminal-reader-search`: all exact match ranges;
- `terminal-reader-search-active`: the current match range only.

`renderSearchHighlights()` replaces both registrations after every query or
match movement. It passes cloned ranges to the Highlight API so the active
range is independent from the collection's route-local records. The CSS keeps
the active treatment visually distinct from the quiet all-match treatment.

When CSS Highlights are unavailable, the controller still updates the match
status, active reading unit, and viewport. It does not mutate authored content,
use a DOM `<mark>`, or commandeer the browser selection as a fallback.

## 4. Search navigation and viewport behavior

The controller keeps `searchMatchIndex` as an index into the occurrence list,
not into the reading-unit list. Initial search chooses the first/last match in
the requested direction relative to the current document position, with
wraparound. `n` advances in `searchDirection`; `N` advances in the opposite
direction. Every transition:

1. updates `searchMatchIndex`;
2. sets `activeIndex` to the match's `unitIndex`;
3. re-renders exact and active highlights;
4. updates the persistent status and polite announcer;
5. settles the exact `Range` into a readable viewport band.

The match settlement uses the range's viewport rectangle and the page scroll
container, applying only the required window scroll when the range is outside
the central reading band. It must not focus the match, replace a user-owned
selection, or scroll a protected nested code/table region. Reduced motion uses
an immediate scroll; normal motion may use the existing smooth behavior.

The reader region retains focus after search submission and match movement, so
`n/N` remains available even when the active match is inside a `<pre>`. Tests
must exercise the actual `#terminal-reader` entry path rather than manually
focusing a different element after every search assertion.

## 5. Status and backward-search affordance

`ReaderStatus.astro` gains one persistent search-status node before the reading
region:

```html
<p data-reader-search-status hidden></p>
```

The controller renders one of:

- `2/22 matches for “trellis”.`;
- `No results for “trellis”.`;
- hidden when no committed query exists.

The node is persistent visual state, not the only accessibility announcement;
the existing polite announcer continues to announce the latest transition.
Mode/unit position remains independently visible.

The search form keeps a native labeled input but adds a direction-specific
accessible name and placeholder. For backward search the visible prefix is
`?`, the label identifies “backward”, and the placeholder gives a short
typing hint such as `Search backward…`. The forward form uses the equivalent
forward wording. The hint must remain readable under Terminal colors and
visible focus at 1440px and 375px.

## 6. Compatibility and state boundaries

- Query, match ranges, active match, and highlights remain controller closure
  state. They are not written to the URL, storage, global state, or content
  metadata.
- Escape cancels an in-progress input. Submitting an empty input cancels the
  input without creating a query. A new query replaces all previous matches.
- Native links, controls, IME, modified keys, local scroll regions, user-owned
  selections, JavaScript-disabled output, direct permalink focus policy, and
  Back/Forward remain governed by the existing reader contract.
- The reader remains read-only: no editing, replacement, runtime fetch,
  Markdown parser, router, or arbitrary command is introduced.

## 7. Verification design

The browser suite must prove both the data model and the interaction:

- Query a fixture with repeated occurrences inside one code block; inspect CSS
  Highlight ranges to confirm each range's text is exactly the query and that
  the count equals the occurrence count, not the block count.
- Enter from the canonical `#terminal-reader` route, submit a query, then use
  `n` and `N` without manual refocus. Assert status changes, active range text
  remains exact, and the active range's viewport position changes when the
  occurrence is outside the current reading band.
- Verify status persistence after movement, wraparound, no-result, empty-query,
  and replacement-query paths.
- Verify backward search exposes an explicit visible prefix, accessible label,
  and placeholder at desktop/mobile sizes.
- Retain the existing movement, selection, IME, modifier, native-control,
  reduced-motion, direct-link, `:q`, static-output, and full-site coverage.

## 8. Risks and rollback boundaries

- Mapping folded text back to DOM ranges can be wrong around inline elements or
  Unicode case folding. Keep the collector isolated and cover text-node,
  inline-markup, and code-block fixtures.
- CSS Highlight support differs by browser. The no-mutation fallback must keep
  navigation and status correct without claiming an exact visual highlight.
- Window-only range settlement can interfere with nested overflow. Use a
  bounded viewport-band calculation and preserve protected-region ownership.

Rollback is limited to the reader controller, status component/style files,
reader/static/browser tests, task evidence, and any directly updated frontend
spec. Do not revert canonical content/path code or unrelated worktree changes.
