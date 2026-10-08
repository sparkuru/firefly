# Vertical Time Scrubbing

## Confirmed Owner Direction

The owner selected a combined timeline and individual-entry reading model,
then specified the central interaction: move through historical time with a
vertical draggable cursor, analogous to video scrubbing. Desktop uses two
columns, with a sticky time rail on the left and naturally scrolling dated
content on the right. Moving the cursor positions content; scrolling content
updates the cursor. Year/month/date ticks, visible snapping, strong current
time emphasis and progressively subdued surrounding ticks are required.

Do not replace this with a passive archive menu or a scrollbar proportional
to rendered document height. Time, not article height, is the navigation domain.

## Reading and Synchronization Proposals

- Render readable chronological content at build time and progressively enhance
  its existing anchors with time navigation. Static/no-JS reading remains useful.
- Use the natural document scroll for the right column rather than a separate
  viewport-height nested scroll panel. The rail remains sticky within the
  reading page and its cursor moves inside the rail.
- Track desired time while dragging separately from the nearest available entry
  date. In a gap, disclose the nearest result rather than inventing an entry or
  pretending that its date equals the selected empty time.
- While dragging, cursor input owns synchronization. Scroll events caused by
  repositioning content must not pull the cursor back or create a feedback loop.
  Genuine reader scrolling subsequently owns the active reading time/cursor.
- Derive the active entry from a stable viewport reading reference. Handle long
  entries, image loading, expansion, simultaneous visible cards, and same-date
  entries without flicker. Final tie-breaking/alignment rules belong in design.
- Show magnetic snap feedback when passing time nodes and settle predictably.
  Do not schedule a fresh smooth-scroll animation for every pointer movement.
  Reduced-motion preference retains navigation and snap feedback while reducing
  transition motion.
- Keep an ordinary per-entry link for the agreed individual reading page and
  an anchor in the timeline. Cursor movement must not automatically open detail
  routes or create browser history entries for every drag frame.
- Provide click/keyboard alternatives to dragging, a readable current-time value,
  visible focus and touch-sized controls. Pointer drag must not capture normal
  page scrolling outside its intended handle/rail interaction area.

These proposals are not implementation. Exact slider semantics, pointer capture,
scroll ownership and active-entry algorithms require design and behavioral tests.

## Time Scale Is a Product Choice

The short-entry corpus is uneven: 96 entries in 2022, 55 in 2023, 24 in 2024,
four in 2025 and one in 2026. The existing 89 long notes may change these
densities if included in the same view; corpus/view scope remains undecided.

1. Real elapsed-time scale: equal distances represent equal durations. Empty
   periods remain visible and moving the cursor has a consistent temporal
   meaning. Dense periods offer less physical drag space and need appropriate
   snap/precision design.
2. Occupied-period scale: months or periods with content receive equal space,
   with empty intervals compressed. Dense archives are easier to inspect, but
   equal distances no longer represent equal elapsed time. Expose compressed
   gaps explicitly and do not label the control as a linear calendar ruler.

Resolved by the owner on 2026-10-07: use option 2 with equally spaced occupied
months and compressed empty periods. The earlier real-time recommendation is
superseded. Preserve actual year/month/date labels and make compressed gaps
understandable; do not claim that equal distances represent equal durations.
The set of occupied months comes from the visible corpus, once its scope and
any filter behavior are agreed. Within-month precision/snap mapping remains
technical design work and must not use rendered article height as elapsed time.

## Mobile and Accessibility

The desktop two-column interaction is explicitly requested. The owner selected
a compact sticky horizontal time control above a single content column for
narrow mobile. It retains occupied-month spacing and bidirectional scrubbing
without squeezing paragraph width. Do not remove time navigation on mobile or
capture normal vertical scrolling as horizontal seeking. Exact breakpoint,
control dimensions and focus handling are technical design work.

The UUPM search below supports keyboard navigation and reduced motion. Its
generic smooth-scroll recommendation must not become repeated interpolations
while actively dragging; direct tracking takes priority for this interaction.
Generic newsletter signups, typography downloads, and decorative suggestions
remain outside the approved Memo reading scope.

## UI Research Commands and Relevant Results

The local CLI accepts the actual feature domain; the design-system search was
rerun for "timeline chronological archive time scrubbing personal microblog
content-first calm accessible minimal reading", project "Firefly Memo Time
Navigation". It suggested a content-first/flat reading direction but also
irrelevant newsletter/form recommendations; no new design master was persisted.

Focused search:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 .codex/skills/ui-ux-pro-max/scripts/search.py \
  'drag slider keyboard alternative scroll reduced motion touch' \
  --domain ux --max-results 4
```

Relevant results: honor reduced-motion preferences, avoid forced scroll effects,
provide complete keyboard navigation, and use predictable anchor navigation.

## Repository Reuse Evidence

`apps/site/src/scripts/terminal-home.ts:1001` centralizes scrollIntoView for
existing shell reading; `apps/site/src/scripts/document-navigator.ts:287` uses
motion-aware positioning and line 609 schedules a reading action through
requestAnimationFrame. These establish local motion/scroll conventions, not an
existing bidirectional time scrubber. Implement a page-owned controller only
after its state and interaction contracts are approved; do not modify Terminal
home scrolling to supply this new page experience.

## Proposed Verification

Desktop pointer drag and click-to-seek; native content scrolling updates the
cursor; no oscillation after programmatic seek; sparse-time snapping; earliest
and latest bounds; long-entry/expanded-content alignment; detail-link behavior;
keyboard operation; reduced motion; mobile touch and normal scrolling;
JavaScript-disabled chronological reading; Back/return restoration and no
cross-route style/runtime leakage. Choose deterministic observables for these
checks rather than tests that reproduce an implementation algorithm.
