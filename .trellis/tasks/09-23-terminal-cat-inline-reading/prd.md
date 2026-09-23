# Improve inline cat layout and reading controls

## Goal and scope

Own parent R1/R2/R4/R5/R6 and contribute AC1-AC4/AC6. Make inline output readable
and controllable without changing cat/open semantics. Parent research/baseline.md
owns evidence and source anchors. The owner approved implementation of this child.

Requirements:

- A1: readable wrapping table cells, visible remaining overflow, usable row
  labels and exact preformatted code.
- A2: per-output prompt return, collapse/expand and canonical document opening.
  One existing prompt and independent repeated output instances.
- A3: consistent bounded reading measure across prose, table and code frames.
- A4: one dominant opening title with authored heading/outline/ID preservation;
  subdued but visible programmatic focus.
- A5: visible inline typing guidance; preserve typing-to-prompt, IME, selection,
  interactive elements, wide regions and modified-key native behavior.

Out of scope: Mermaid renderer (B), new commands, inline Vim/pager/search,
persistent transcript state, source rewriting, canonical navigation redesign.

## Observable acceptance

- [x] A-AC1: the parent viewport matrix has no page overflow; prose cells wrap;
      genuinely wide tables/code scroll locally with visible directional cues.
      Cues update after resizing and disappear when content fits.
- [x] A-AC2: a compact action bar stays available throughout the active article;
      prompt return takes one action and preserves draft input/selection.
      Controls never stack from previous articles or cover focused content.
- [x] A-AC3: collapse/expand preserves content, native links and per-instance
      state; focused hidden descendants are moved to a visible control.
      clear removes all associated state, controls and observers.
- [x] A-AC4: open action preserves canonical routing and the existing destination
      capability logic, including navigation disabled; no fallback fragment.
- [x] A-AC5: body headings/IDs/outline stay identical; duplicate leading titles
      have one dominant visible title, nonmatching introductions keep their title.
      Focus remains detectable and the title no longer resembles an input.
- [x] A-AC6: explicit guidance explains typing; j still enters the prompt from
      eligible title focus. Protected inputs/links/selection/IME/wide regions
      remain native. No new printable reading shortcuts.
- [x] A-AC7: test same-document and mixed-document output, narrow touch viewport,
      keyboard only, reduced motion and 200% zoom; inspect real-source screenshots.

## Verification

Parent `research/validation.md` records package/browser evidence. Real-source
Playwright passed the four viewport matrix, per-article top/middle/end actions,
draft and selection preservation, same-node expansion, unique repeated IDs,
overflow directions, 200% zoom and short landscape. Physical soft keyboards
remain explicitly unverified.
