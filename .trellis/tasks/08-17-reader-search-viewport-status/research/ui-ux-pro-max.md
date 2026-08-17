# UI/UX Pro Max research: reader search viewport status and prefix layout

## Scope

This is a focused refinement of an existing static, content-first reader. The
approved Terminal/semantic visual language and responsive checkpoints from the
previous reader-search task remain authoritative; no new design-system search
or visual redesign is needed.

## Applied guidance

- Use the existing semantic and Terminal color tokens; the active status needs
  an opaque surface and visible boundary when it sits above scrolled content.
- Keep the status in normal document flow and make the whole status section
  sticky only for a committed query. This preserves the document hierarchy,
  avoids nested scrolling, and keeps the status available while the reader
  moves through a long document.
- Use the existing 4/8px spacing rhythm. The search prefix and native input
  receive an explicit gap of at least 8px, and the input keeps its 44px minimum
  target and visible focus outline.
- Treat 4K as a wide-screen layout class: let the outer Terminal frame grow
  with the viewport after the established 78rem baseline, but cap it and keep
  long-form text measures readable. Avoid compensating with giant type or
  page-level horizontal scrolling.
- Search direction must remain understandable through visible prefix text,
  accessible label, and placeholder; color is not the only signal.
- Validate at 375px and 1440px, with reduced motion, checking no horizontal
  overflow and no active-match obstruction.

## Review checklist

- [ ] Sticky status remains readable against the content in both presentations.
- [ ] Status text remains visible after scroll and changes after `n/N`.
- [ ] `?` and its focus outline do not touch or overlap the input border.
- [ ] Prefix/input gap is at least 8px on mobile and desktop.
- [ ] The 4K frame uses the available width proportionally without unbounded
      growth, while prose and wide-content containment remain readable.
- [ ] Native label, placeholder, focus-visible state, and 44px input target are
      preserved.
- [ ] No new font, icon, router, animation, or client-side content dependency
      is introduced.

## Sources

- Project skill: `.codex/skills/ui-ux-pro-max/SKILL.md`.
- Existing approved reader research:
  `.trellis/tasks/archive/2026-08/08-17-reader-search-match-navigation/research/ui-ux-pro-max.md`.
- Existing implementation contracts: `.trellis/spec/frontend/`.
