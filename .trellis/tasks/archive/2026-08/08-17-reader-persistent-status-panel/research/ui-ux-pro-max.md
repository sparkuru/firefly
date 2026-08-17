# UI/UX Pro Max research

## Applied findings

The local UI/UX Pro Max search covered sticky navigation, feedback, focus, and
status-surface contrast. The useful constraints are:

- A sticky layer must not obscure the content it accompanies. Keeping the
  status section in normal flow, reserving its own height, and using an opaque
  surface addresses this directly.
- User actions need visible feedback. The existing reader message and search
  status are appropriate feedback channels; the design should make their
  ownership explicit instead of adding another notification layer.
- Keyboard focus must remain visible and forms must retain native semantics.
  The existing `:focus-within` prompt-row pattern and 44px input target remain
  the local baseline.
- Status surfaces need semantic foreground/background contrast. Reuse the
  existing light raised surface and Terminal subtle surface rather than
  introducing a new palette.

## Decision

Make the existing reader status section a persistent, content-sized sticky
panel. Keep mode/position, committed search status, and current feedback as
separate owned fields; suppress only the duplicate generic search message.
No animation, icon, new color family, or dependency is needed.
