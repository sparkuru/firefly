# Terminal Reading and Feedback Contract

## Scope and reading layout

Use when refining default Terminal typography, command discoverability or
completion viewport feedback. Preserve authored content, command semantics,
independent wide/paper presentation and the mobile no-shell boundary.

Default prose follows the available page/Terminal shell width in standalone
and `cat` reading. The owner rejected the fixed 76ch paragraph cap after visual
review: do not reintroduce a narrower reading cap on direct paragraphs, lists,
blockquotes or authored headings without an explicit product decision. Keep
wide code/table local scrolling and `paper` surfaces independently styled.
Measure actual paragraph/shell alignment in both reading entry points, including
Chinese/English content, 200% text and native wide-region keyboard scrolling.

Controlled metadata/title/outline/body spacing retains all authored headings
and IDs. Directory/outline press feedback pairs semantic text with a readable
semantic surface; a selection background alone may have insufficient contrast
with the ordinary link foreground. Short color/background transitions respect
reduced motion and do not move layout.

## First-visit command hint

The native empty-input `help` placeholder is introductory guidance, never an
input value, submitted command or recurring prompt decoration. Show it only
on the first interactive desktop index visit in the same browser, and retire
its visible text when that session is used. Guard browser-local storage access;
storage failure must not disable input, startup, history or completion. Native
mobile browsing must not consume a first desktop Terminal visit. Preserve the
explicit accessible command label and keyboard description on every visit.

`terminal-home.ts` initializes the hint only after successful interactive
startup. The origin-local key `firefly.terminal.help-seen` records first display
with value `1`; any existing value suppresses it on later visits. Input events,
eligible command interaction and clearing remove the placeholder. Storage
read/write errors fall back to a usable hint for that document; they do not
claim persistent suppression when persistence is unavailable.
Back/Forward cache restoration (`pageshow` with `persisted=true`) retires a
previously displayed first-visit hint even if the user left without typing.

## Completion viewport

Safe unmodified non-composing prompt Tab owns completion, retains input focus
and uses existing rewrite/selection/acceptance semantics. Presentation settles
only after an eligible completion action; modified/composing Tab and Tab
outside the prompt retain their established behavior.

When the command row and candidate panel fit, center them as one group. For
oversized panels, cap upward prompt placement at the viewport midpoint and
keep the candidate list in a bounded local scroll region. Repeated Tab and
Arrow selection reveal the active option locally while preserving the page's
prompt placement. Retain the input's `aria-activedescendant` and listbox option
selection; viewport movement never submits or accepts a candidate. Respect
reduced motion, page boundaries and no horizontal document scroll.

Regression checks must use actual viewport coordinates after long transcript
output, not only DOM visibility. Cover fitting and oversized candidate sets,
first/last active options, wrap-around, unique completion, no match, focused
input, unchanged draft, candidate acceptance and modified/composing guards.
`terminal-refinement.spec.ts` also covers page-wide reading, touch geometry,
long labels, local code scrolling, enlarged text and hint/history behavior.
Theme checks verify computed foreground/background pairs rather than inferring
contrast from the palette's base text color.

## Inline article navigation

`TerminalStreamDocument.astro` uses the owner's centered four-action bar, body
and file-footer composition; see [Terminal file metadata](./terminal-file-metadata-contract.md).
Validated repeated metadata titles use a hidden inert-template label. Cloning
promotes the matching first authored heading as the visible reading focus and
article label, preserving its scoped ID/text and strict unique template checks.
Nonrepeated titles stay visible below the action bar. Do not restore stacked
permalink/guidance chrome or focus a hidden label. Keep draft/caret return,
per-clone collapse state, local wide scrolling and actual sticky clearance.
