# Enhance terminal cat code blocks

## Goal

Make code blocks inside inline `cat` articles easier to read and reuse through syntax highlighting, visible line numbers, and a copy button.

## Background

- Markdown fences already pass through Astro's Shiki stage, but the site's HTML sanitizer removes Shiki's inline token styles before publication. The resulting `cat` code appears uncolored while retaining nested token spans (`apps/site/astro.config.mjs`, `apps/site/src/lib/markdown-html-policy.mjs`).
- X Core wraps terminal code blocks in local scrolling regions. The browser clones trusted article templates into the command transcript and currently adds scroll cues after cloning (`presentations/terminal/src/index.ts`, `apps/site/src/scripts/terminal-stream-overflow.ts`).
- The site security contract requires authored HTML styles and active elements to be removed before X Core processes content (`.trellis/spec/frontend/x-core-contract.md`).

## Requirements

- R1: Language-labelled Markdown code fences in `cat` use visible syntax colors that fit the terminal theme. Unknown or unlabelled languages remain readable plain text without breaking the page.
- R2: Every visible `pre > code` block in an inline article, including authored preformatted blocks, shows one-based line numbers aligned with its code lines. Line numbers are presentation only and do not enter copied code.
- R3: Each block has a keyboard- and touch-usable Copy code control. It copies the displayed code text, preserving indentation and line breaks, and gives success or failure feedback.
- R4: Code blocks keep their existing local horizontal scrolling and directional hints. Buttons do not redirect typing into the terminal prompt or interfere with links, selection, article collapse, or repeated `cat` output.
- R5: Authored HTML cannot inject active markup or arbitrary styles through the highlighting path. Canonical document pages retain their existing code-block appearance and interactions.

## Acceptance Criteria

- [x] AC1: A labelled fence displays at least two distinguishable token colors in `cat`; unlabelled and unknown-language blocks render as readable plain text.
- [x] AC2: Line numbers start at 1 for each block, match the displayed code lines, and remain outside copied text and screen-reader code reading.
- [x] AC3: Copy returns exactly the displayed code text for multiline, indented, and repeated-output blocks; the control reports success and failure without moving focus to the prompt.
- [x] AC4: Wide code still scrolls inside its region with correct direction cues at desktop and narrow widths, and no page-level horizontal overflow.
- [x] AC5: Authored dangerous HTML/style attributes remain stripped; canonical document code appearance and existing terminal actions remain stable.

## Out of Scope

- New code editors, code execution, line selection, folding, or source download.
- Changing authored Markdown source or the `cat` command syntax.
- Replacing Mermaid's separate static diagram and source-fallback behavior.
