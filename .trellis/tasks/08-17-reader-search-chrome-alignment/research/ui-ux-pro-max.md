# UI/UX Pro Max research

## Applied findings

The local UI/UX Pro Max search was run for sticky contrast/focus/form behavior,
Terminal prompt alignment, and semantic dark-mode color tokens. The relevant
findings are:

- Keyboard users need a visible focus indicator; moving focus styling from the
  native input to its `:focus-within` row is acceptable only when the row keeps
  an equivalent visible treatment.
- Functional text needs a contrast-safe foreground/background pair; a sticky
  layer must use an opaque, distinct surface rather than a canvas-colored
  transparent layer.
- The existing project prompt is the best local pattern: `.terminal-command-row`
  uses an inset bottom rule and `:focus-within`, while keeping the input native
  and at least 44px high.

## Decision

Use the repository's existing semantic/Terminal tokens and prompt-row pattern.
Do not introduce a new palette, shadow system, icon, animation, or dependency
for this small reader chrome correction.
