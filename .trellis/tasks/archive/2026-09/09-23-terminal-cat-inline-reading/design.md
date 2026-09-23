# Inline reading design

## Reading surface

Keep shell/transcript geometry unchanged. Introduce stream-scoped reading tokens:
a 52rem maximum reading column (approximately current 82ch prose at default font),
100% of available width below that. Apply this to paragraphs, lists, blockquotes,
table/code frames and stream header; headings can remain shorter. At 1920px,
short code frames must not expand to 1536px. Preserve body text size.

Table cells use normal wrapping with overflow-wrap:anywhere for long prose/URLs
and explicit bounded column sizing. Inline code may wrap without changing its
text; preformatted blocks retain exact whitespace. Retain semantic tables,
headers, colspan/rowspan and existing focusable local scroll regions.
Do not transform arbitrary tables into cards or cap a fixed number of columns.

If overflow remains, show a small directional hint at the region boundary and
edge cues for the available direction. Measure actual scroll/client dimensions;
update on scroll, resize, expansion and image load. Reuse one controller observer
path; release it on clear/failure. Under reduced motion, avoid animated cues.
Use an opaque sticky first column only for simple tables (no spanning cells)
whose measured first-column width is at most 40% of the viewport region.
Otherwise keep ordinary scrolling, never pin a column that obscures the data.
The no-controller fallback retains native overflow and accessible labels.

## Per-output actions and focus

Extend TerminalStreamDocument with a compact header and sticky action bar:
Return to command / Collapse / Open document. The bar is sticky within its own
article, not globally fixed; previous outputs scroll away. Touch targets meet
44px minimum dimensions. At narrow widths use concise labels without horizontal
overflow. The output header remains visible when body content is collapsed.

Use native buttons with aria-expanded/aria-controls and a native canonical link.
Attach delegated behavior at the home root; do not allocate a second command
input or a separate keyboard event system. Clone scoping rewrites control IDs
using the existing token-attribute rules. Keep collapse state on each cloned
article. Collapse preserves the body DOM so expansion preserves selections and
links; move focus to the collapse control if its descendant would be hidden.

Return to command focuses the existing input using the current viewport
settlement helper, preserving draft text and selection. Honor reduced motion,
safe-area insets and focus visibility; do not claim real soft-keyboard support
without device evidence. clear and fatal fallback clean up controls/observers.

Open document uses the same destination-aware URL builder as the command effect.
Do not duplicate capability resolution in a component. Keep the ordinary permalink
and body links fragment-free; only the new explicit Open document action carries
open intent. The native canonical href
is valid without enhancement; the controller decorates it only when the exact
destination supports document navigation. Retain native new-tab/link behavior.

A short visible hint explains: typing resumes commands; use Open document for
document navigation. Keep printable-to-prompt and all protected-target rules.
Buttons/links must not trigger typing redirection.

## Title hierarchy

Use the validated build-time outline to compare metadata title with the first
body heading, but only when that heading is the first substantive body block.
Conservatively normalize case/whitespace and separator runs (space, hyphen,
underscore); do not fuzzy-match meaning. If equivalent, visually demote the
generated header to a compact document label and keep the authored heading as
the dominant title. Otherwise keep the generated title at normal prominence.
Do not remove or rewrite either heading/ID, or disturb fragment/outline contracts.

Keep the existing named focus target for output announcements. Give that target
a smaller offset/outline style distinct from the command input; retain a clearly
visible keyboard focus indication. Account for sticky bar height in scroll margin.

## Ownership and compatibility

Primary files: TerminalStreamDocument.astro, TerminalHome.astro,
terminal-home.ts and terminal.css in apps/site. Both .terminal-wide and
.wide-content bodies can occur in the stream. Prefer stream-scoped styling so
canonical documents keep their accepted navigator layout and content themes.
Do not modify X Core headings, command effects or presentation selection.
The current content-workspace contract forbids a redundant return-to-prompt
footer. This proposal adds a header toolbar for long articles while keeping the
footer and prompt adjacency unchanged; explicitly revise the rationale and
open-intent contract during accepted implementation (see parent research/contracts.md).

Meaningful tests belong in terminal.spec.ts and focused build/static tests.
Ensure template validator, repeated ID scoping and trusted-body contracts remain
consistent with added native controls. Existing body HTML must not be reconstructed
with innerHTML or parsed again in the browser.

## Trade-offs and rollback

Prefer explicit controls over auto-collapse or automatic deletion of old output.
The 52rem token is a reviewable starting point, not a typography overhaul.
Sticky first columns are conditional; preserving semantics takes precedence.
Revert this child as a complete UI/controller change if focus or native interactions
regress; no persisted state or content migration is involved.
