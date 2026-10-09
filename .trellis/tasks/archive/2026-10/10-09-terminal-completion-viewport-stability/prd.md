# Terminal completion viewport stability

## Goal

Prevent Tab and Arrow candidate selection from moving an already visible prompt and completion panel; preserve visibility recovery for obscured or oversized completion.

## Requirements

- Keep the page stationary when the prompt and candidate panel are already fully visible, including the first Tab and repeated Tab/Arrow selection.
- Move the page only to recover obscured completion; retain fitting-group centering and midpoint-limited placement for oversized candidates when movement is necessary.
- Preserve candidate-list local scroll, input focus, draft, selection, accessibility state and existing completion acceptance semantics.
- Preserve reduced-motion behavior and modified/composing key guards. Exclude lab and unrelated article design/content.

## Acceptance Criteria

- [x] Visible off-center completion stays at the same viewport coordinates and scroll offset across first Tab, cycling, Arrow navigation and wrap-around.
- [x] Candidate cycling after earlier settlement does not change the page height or lose bounded local scrolling.
- [x] Obscured fitting and oversized completion remain usable with the active candidate visible.
- [x] Focused browser regressions, site type/build/static checks and independent review pass; the existing local preview serves the fix.

## Notes

- Owner accepted the prior inline layout and reported unwanted completion scrolling with ample room. This is a lightweight bugfix with an explicit existing request to repair the behavior; task creation was separately confirmed on 2026-10-09.
- Supersedes unconditional centering in the previous completion viewport refinement. No new visual redesign, remote push or production deployment is requested.
