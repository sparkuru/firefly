# Diagnose terminal cat width mismatch

## Goal

Explain why a screenshot taken shortly after the width change still shows `cat` narrower than the terminal command row, and correct any reproducible current defect.

## Background

- The screenshot shows the command row spanning most of the screen while inline article rules stop around the former 52rem cap.
- The committed source and local built homepage no longer contain `--terminal-stream-reading-width` or the 52rem cap (`apps/site/src/styles/terminal.css:700`).
- A fresh read of the public homepage also served the new article rule. In a fresh Chromium session at a 1920px viewport, the public site's inline article and command row both measured 1536px, from x=192 to x=1728.
- The screenshot clock predates the fresh public-site probe. An already-open tab holding old inline CSS is a plausible explanation; the screenshot alone cannot establish whether a newly reloaded tab still has the defect.

## Requirements

- R1: Determine whether the reported width mismatch persists in a freshly loaded public page.
- R2: If it persists, capture the browser's computed article width, command width, and applied max-width rule before changing code.
- R3: If it does not persist, document the stale-page explanation and leave the working layout unchanged.

## Acceptance Criteria

- [x] AC1: Verify current public HTML/CSS and measure article versus command row in a fresh browser session.
- [x] AC2: A fresh public-page browser session shows equal article and command widths; no current mismatch was reproduced.
- [x] AC3: The user accepted the diagnostic result and moved on to another enhancement request. The previous browser tab was not inspected, so stale page state remains an inference.

## Out of Scope

- Deployment changes without evidence that the current public build is wrong.
- Further terminal redesign beyond the reported width mismatch.
