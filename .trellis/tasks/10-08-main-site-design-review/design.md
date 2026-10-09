# Terminal refinement design

## Direction

### Approved owner revision

The owner's subsequent visual feedback overrides the original reading-measure
and hint choices. Restore the pre-task page-dependent prose width (including
headings where narrowing was introduced), retain other polish, and make `help`
a first-index-visit hint backed by guarded browser-local storage. Clear the
visible hint when the first session is used; no recurring empty-prompt hint.

The new completion viewport requirement authorizes a focused change to
`apps/site/src/scripts/terminal-home.ts`, associated completion styles and
behavioral tests. Reuse existing viewport settlement and motion conventions.
Fit the command/candidate group into the central reading band when possible;
for oversized lists cap prompt upward settlement at the midpoint, use a bounded
local candidate scroll area and reveal the current option. Do not alter runtime
command resolution or move the page for ignored/modified/composing Tab events.
These decisions supersede conflicting sections of this original design below.

The owner selected minimal refinement of the current Terminal mental model. Treat the existing prompt, file paths, tree prefixes, authored boot text, JetBrains Mono and semantic palettes as the project's established language. Improve reading and operating comfort through precision, without changing that language.

One coherent UI task is sufficient: typography, navigation geometry and feedback share the same structural stylesheet and acceptance matrix. No independent product deliverables warrant a parent/child tree.

## Ownership and boundaries

- `apps/site/src/styles/terminal.css`: Terminal structural typography, measure, spacing and state feedback.
- `apps/site/src/components/TerminalHome.astro`: empty-command placeholder only if needed for the approved hint.
- `apps/site/src/styles/memo.css`: mobile month-index touch target only.
- Existing site tests: behavioral/geometry assertions and maintained browser selection. Add a focused suite only when existing suites cannot express the acceptance.
- Keep renderer/adapters, content/configuration, command runtime, search/browse/navigator controllers and experiment styles unchanged. The owner revision explicitly extends browser-side ownership to `terminal-home.ts` for hint lifecycle and completion viewport settlement.

## Reading measure

Restore the pre-task default paragraph/list/blockquote width and authored
heading wrapping from `HEAD` rather than choosing another fixed cap. Ordinary
prose follows the available page or Terminal shell width in standalone and
`cat` reading. Retain full source text, authored line breaks and IDs. Wide
code/table regions scroll locally and paper content owns its own presentation.
The owner rejected the first candidate's 76ch cap after visual review; that
candidate remains historical evidence in the initial implementation reports.

## Typography and space

Keep current fonts and palette roles. Define a small consistent rhythm through existing tokens where useful: title/metadata, header/outline, outline/body and body blocks. Distinguish interface chrome from authored content without hiding duplicate authored headings or changing source titles.

Use existing margins/padding and document density to improve first-screen reading. Keep the outline visible and preserve all entries; do not introduce a collapse interaction, sidebar, decorative cards or a new navigation layer. Desktop command/tree/help output retains its layout and intentional empty space.

## Touch geometry

Under the existing coarse-pointer/no-hover predicate, give canonical directory/parent/home links and outline anchors at least 44px height. Expand the anchor itself, not only an unclickable row. Prevent adjacent hit areas from overlapping. Preserve prefix alignment and long-label wrapping; inline-home browse keeps its established geometry.

Memo month summary moves from its current mobile 32px minimum to at least 44px. Inspect the resulting sticky rail height/offset and oldest-entry alignment using the current integrated reader fixtures. No Memo controller, time mapping or palette change accompanies it.

## Discoverability and feedback

Use `help` as a quiet native placeholder only on the first interactive desktop index visit. Guard origin-local persistence, consume it only after successful desktop startup, and retire its visible text on initial interaction. Reloads and returns suppress the hint. Mobile does not consume it; storage failure cannot break commands. The explicit label and accessible keyboard help remain authoritative. Styling uses muted semantic color and never changes input value or tab order.

Refine hover/press/focus feedback only on affected controls using existing text/link/surface/focus tokens. Preserve conspicuous keyboard focus and active navigator selection. Use short color/background/opacity transitions under no-preference motion; avoid width/height/position transitions and motion that delays input. Reuse established timing unless comparison demonstrates an inconsistency.

## Responsive and accessibility behavior

- Retain the shared input predicate; narrow fine-pointer desktop continues to operate a Terminal, touch tablet continues native browsing.
- Keep all core native links available when JavaScript is disabled or modules fail.
- Existing searching/IME, Back/Forward, selected folder and command history are unaffected.
- Test dark/white and every CSS-registered palette for changed styles; keep paper content isolated.
- Capture desktop and narrow-mobile separately; supplement tablet/landscape, 200% text enlargement/zoom and reduced motion on changed surfaces.
- Use representative computed contrast/focus checks where styles change; do not claim an exhaustive accessibility audit or physical-device certification.

## Tradeoffs and rollback

Preserve the owner-preferred wide prose measure rather than the first candidate's narrower paragraphs. Touch spacing changes can increase outline height; compare first-screen body access before retaining them. Completion uses extra bottom settlement space only while applicable and bounded local scrolling for oversized candidate lists; verify actual page-end geometry and spacer specificity.

Keep each change small and reviewable. Revert only task-owned edits if a candidate worsens wrapping, focus/scroll alignment or the established minimal appearance. Preserve user changes and diagnostics. No source migration, deployment or runtime configuration is required.

## Acceptance and iteration

Map checks to PRD AC1–AC7. Capture a fixture baseline before changing product CSS, then compare after each coherent group. Record what improved and any regressions; discard changes whose benefit is only novelty. Mechanical checks precede the final subjective review. Two consecutive review rounds with no material justified improvement close visual iteration once all required acceptance passes.
