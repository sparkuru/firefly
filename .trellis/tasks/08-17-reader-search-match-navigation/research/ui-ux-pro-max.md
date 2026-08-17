# UI/UX Pro Max research: reader search refinement

## Scope

This task refines the existing canonical, static document reader rather than
introducing a new page or visual system. The prior approved reader research
remains the baseline; this note records the UI decisions applied to search
feedback and focus movement.

## Approved context

- Preserve the content-first document hierarchy, terminal visual language,
  sparse spacing, subtle motion, reduced-motion behavior, and the existing
  375/768/1024/1440 responsive checkpoints.
- Make search state explicit through text, labels, focus, and status—not color
  alone. The active match must be distinguishable from other matches while
  retaining readable contrast.
- Keep the search field native and keyboard accessible. The visible `/` or `?`
  prefix, direction-specific accessible label, and direction-specific
  placeholder should make the current command understandable at a glance.
- Keep search status in the reader status region so it follows the focused
  occurrence without changing the canonical URL or adding nested scrolling.
- Preserve static Astro output, semantic HTML, native selection/controls, and
  the project's terminal tokens. No external fonts, icon libraries, router,
  or client-side content fetching are introduced.

## Review checkpoints

- At narrow widths, the prefix, input, and status must remain readable without
  horizontal overflow; the input retains at least a comfortable native touch
  target.
- At desktop widths, the status and search field remain aligned with the
  existing reader region rather than becoming a floating overlay.
- Active-match emphasis must remain meaningful with reduced motion and without
  relying on animation or color as the only signal.

## Source and constraints

- Project-local skill: `.codex/skills/ui-ux-pro-max/SKILL.md`.
- Existing visual evidence and approved decisions: archived task
  `08-17-permalinks-vim-single-page/research/ui-ux-pro-max.md`.
- Existing implementation contracts: `.trellis/spec/frontend/`.
