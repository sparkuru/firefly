# Expand terminal cat content to terminal width

## Goal

Make `cat` output use the available terminal content width so long documents and code blocks do not feel squeezed into a narrow column on wide screens.

## Background

- The terminal command row spans the `.terminal-home` content area, while inline articles stop at 52rem (`apps/site/src/styles/terminal.css:598`, `apps/site/src/styles/terminal.css:1232`).
- The prior inline-reading task deliberately chose the 52rem limit for prose and wide frames; this request revises that desktop width decision (`.trellis/tasks/archive/2026-09/09-23-terminal-cat-inline-reading/design.md:6`).
- The frontend content contract records the same 52rem rule (`.trellis/spec/frontend/content-workspace-contract.md:1074`).

## Requirements

- R1: Inline `cat` article chrome, body, and wide content regions use the terminal command row's available width at desktop sizes.
- R2: Inline prose is allowed to wrap across the available article width. Long code and tables retain local horizontal scrolling where needed.
- R3: Narrow viewports remain contained without page-level horizontal overflow or clipped controls.
- R4: Canonical document pages, command behavior, focus behavior, and article actions retain their existing behavior.

## Acceptance Criteria

- [x] AC1: On a wide desktop viewport, the inline article's right edge aligns with the terminal command row's right edge; header rules, toolbar, and code/table frames can reach that edge.
- [x] AC2: Ordinary inline paragraphs can use the widened article area, while long code and tables scroll inside their own frames without page-level horizontal overflow.
- [x] AC3: At narrow and intermediate viewport widths, the article fits the terminal content area and controls remain usable.
- [x] AC4: Existing inline reading actions and canonical document layout continue to work.

## Out of Scope

- Redesigning the terminal's overall width or typography.
- Changing document content, `cat` command resolution, or the standalone document view.
- Removing the local scroll behavior for genuinely wide code and tables.
