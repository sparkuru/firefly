# Main-site design assessment

## Outcome and scope

There are worthwhile improvements. Recommend refining Firefly's existing Terminal identity, prioritizing reading geometry, native directory touch targets and first-visit command discoverability. Shared visual cues can connect the intentionally independent Memo reader without forcing its content into a terminal shell. `/lab/` pages and experiments were not assessed.

This is planning evidence, not implementation approval. The task remains in `planning`. The initial assessment was a lightweight PRD-only deliverable. The owner's subsequent choice of minimal Terminal refinement is now recorded in the PRD, design and execution plan; those artifacts await final implementation approval.

## Evidence method

- Read main-site layouts/styles/components and the frontend, mobile and validation contracts.
- Captured the existing `apps/site/dist/` through the repository's pinned Playwright Docker wrapper and an isolated Astro preview on container-local port 4333. No fresh build or publication was performed.
- Six routes at 1440×900 and touch-emulated 375×812: `/`, `/pages/`, `/posts/ai/`, `/pages/about/`, `/pages/markdown-template/`, `/memos/`. All twelve page loads returned HTTP 200; measured document widths matched their viewports; no pageerror events were captured.
- Also inspected desktop help/tree, mobile search/inline pages and light article captures. These observations establish successful actions and rendered states, not a full regression or accessibility pass.
- Initial access from the browser container to the host preview failed with `ERR_EMPTY_RESPONSE`. The isolated preview of existing build output resolved the capture prerequisite. The owner's preview was not stopped or reconfigured; the capture-owned server exited.
- Diagnostic artifacts are ignored under `apps/site/test-results/design-assessment/`: screenshots, `metrics.json`, `interaction-metrics.json` and the temporary capture script. Do not commit owner-content screenshots or body excerpts into this task.
- Real devices, non-Chromium engines, tablet/landscape, text enlargement, slow-font loading, contrast across every palette, temporal animation review, Core Web Vitals and a full keyboard/reduced-motion regression remain unverified.

## Findings across the eight requested dimensions

| Dimension | Evidence and judgment | Priority and observable target |
| --- | --- | --- |
| Typography | Desktop standalone About prose spans approximately 1150px. `terminal.css:39` defines an 82ch reading token, and `terminal.css:1044` initially applies it to stream prose, but a later rule at `terminal.css:1666` resets stream paragraphs to 100%. Standalone `.terminal-prose` at `terminal.css:1344` has no corresponding paragraph measure. Terminal/CJK/system-font behavior differs from Memo. | P1: apply a reviewed effective prose measure across both reading entry points while allowing wide code/tables. Test representative Chinese, English and mixed text on desktop/mobile rather than imposing one character count on every language. |
| Whitespace | Native directory captures place a small list inside a wide, tall shell. Long article outline precedes the body; the Markdown template's opening content is pushed close to the desktop fold. This is a design opportunity, not evidence of broken layout. | P2: tune directory geometry and outline/heading/content spacing according to actual content density. Keep deliberate Terminal breathing room. Compare short/long directories and articles before/after. |
| Hierarchy | Desktop initial homepage shows boot transcript and prompt, while the visible capture has no explicit first-command hint. The rich command assistance is currently in visually hidden text (`TerminalHome.astro:402`). Long outline and duplicate authored/page titles can compete with the reading start; authored content must remain intact. | P1: offer a restrained, discoverable entry to help/browse without changing command semantics. P2: differentiate interface metadata, document heading and body without rewriting authored titles. |
| Color | Dark Terminal uses slate/teal/green/amber; light Terminal retains teal. Memo has an independent light/blue token set (`memo.css:5`). Screenshots confirm a strong palette change on navigation. This is intentional presentation separation, not a contract defect. | P2: explore shared accent/metadata/spacing cues, retaining independent reader layouts and accessible focus states. Palette changes require owner direction; existing contrasts are not claimed to fail. |
| Motion | Terminal includes restrained boot reveals and mobile quick-toolbar transitions (`terminal.css:234`, `terminal.css:539`); reduced-motion selectors exist at `terminal.css:1583`. Memo also has reduced-motion rules (`memo.css:124`). | P3: unify timing where meaningful and evaluate interaction feedback; adding more animation is not an acceptance goal. Verify final states under reduced motion and interruptibility before claiming success. |
| Microinteractions | Search has a clear result count and focus ring; mobile inline directory rows are spacious. Canonical `/pages/` and `/posts/ai/` captures use compact native anchors: sampled link rectangles are approximately 21px tall with tightly spaced lines. Memo mobile month summary explicitly uses a 32px minimum (`memo.css:118`). | P1: strengthen mobile native directory and outline hit areas to a reviewed ≥44px target without destroying text rhythm. Investigate month-index hit area before changing it. Preserve input/IME/history and visible focus. |
| Responsive behavior | All twelve sampled pages fit the measured desktop/mobile widths. Initial mobile homepage omits the command session and provides search/browsing as required. Native directories and inline home directories have noticeably different densities. | P1: align touch comfort across navigation entry points. Subsequent checks include 375px, tablet/landscape, long names, large text and coarse/fine-pointer transitions. Current emulation does not certify those. |
| Originality | Terminal path/tree/prompt, the personal boot voice and Memo time scrubbing supply coherent project-specific material. Current improvement opportunities concern their integration and precision. | P2: deepen the existing language through a small set of shared details. Preserve personal authored text and the functional navigation model; award references are craft references, not templates to copy. |

## Recommended implementation order, subject to owner choice

1. Mobile native directory/outline touch geometry and standalone document reading measure.
2. First-visit command discoverability, directory hierarchy and article/outline spacing.
3. Shared visual cues between Terminal and Memo while keeping presentation boundaries independent.
4. Targeted state feedback and timing polish only where comparison shows a real benefit.

Do not describe all of these as confirmed defects. Touch geometry and standalone measure are measured observations; usability impact and visual priorities are design judgments.

## Award reference and prompt limits

The official [Webby judging criteria](https://www.webbyawards.com/judging-criteria/) include content, structure/navigation, visual design, functionality, interactivity, innovation and overall experience. This supports considering appropriate, usable execution alongside visual craft. This assessment does not certify award eligibility or claim that Awwwards, Webby and FWA share an identical rubric. No exhaustive winner comparison was performed.

The original prompt supplies ambition but lacks project identity, protected behavior, evidence requirements and a stopping rule. A project-specific working brief should require:

- Keep the existing Terminal identity and independent Memo reading experience; exclude lab.
- Prioritize reading and navigation, then refine typography, spacing, semantic color and meaningful interaction feedback.
- Record each significant issue, before/after evidence, user benefit and affected states.
- Verify desktop/mobile, keyboard/touch, long content, theme states and reduced motion on the affected scope.
- Stop when agreed acceptance criteria pass, no unresolved high-priority issues remain and two successive review rounds find no material improvement worth the added complexity. Subjective alternatives remain possible; absolute perfection is not verifiable.

## UUPM research interpretation

Ran `.codex/skills/ui-ux-pro-max/scripts/search.py` with the actual domain: personal technical blog, terminal, editorial reading, restrained monospace. The local generator suggested content-first organization, a systematic grid and JetBrains Mono. These support existing project conventions. Its newsletter subscription sections, accent-pink palette and React Native defaults do not describe this Astro site and were not adopted. Accessibility labels attached to generated style recommendations are not measured accessibility results.

## Owner decision for subsequent planning

The owner selected refinement of the current Terminal identity and explicitly values its minimal mental model. Larger art-direction changes are excluded from the current plan. Memo visual rebranding is deferred; its mobile month-control touch target is included. The final plan is awaiting approval for implementation.
