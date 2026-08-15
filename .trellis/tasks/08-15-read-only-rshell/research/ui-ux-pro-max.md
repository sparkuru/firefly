# UI/UX Pro Max research

Generated 2026-08-15 with the project-local UUPM entry point:

```bash
python3 .codex/skills/ui-ux-pro-max/scripts/search.py \
  "static knowledge browser terminal shell content-first minimal dark accessible" \
  --design-system --project-name "f1refly rshell" --format markdown \
  --variance 2 --motion 1 --density 7
```

## Raw design-system output

### Design dials

- Variance: 2/10 — centered/minimal.
- Motion: 1/10 — subtle.
- Density: 7/10 — standard.

### Recommendations

- Pattern: content-first knowledge browsing.
- Style: high-contrast, minimal dark interface; WCAG AA target.
- Colors: terminal dark with a success-green accent, readable foreground, muted
  supporting text, and a distinct destructive/error color.
- Typography: accessible, readable, inclusive text.
- Motion: a user action should remain immediate; no animation may block
  navigation or input.
- Avoid: poor navigation and absent search.

### Generated checklist

- No emoji structural icons.
- Visible keyboard focus.
- Respect `prefers-reduced-motion`.
- Check responsive behavior at 375px, 768px, 1024px, and 1440px.

## Raw interaction-UX search output

Generated with:

```bash
python3 .codex/skills/ui-ux-pro-max/scripts/search.py \
  "keyboard command input error recovery mobile accessibility reduced motion" \
  --domain ux --max-results 6
```

1. Respect reduced-motion preferences; do not force scroll effects.
2. Keep the command input usable with mobile keyboards.
3. Every error needs a recovery path, not only an error indication.
4. All functionality remains keyboard reachable with a logical tab order and no
   trap.
5. Dynamic errors must be announced (`aria-live` or equivalent), rather than
   relying on visual color alone.
6. Do not add parallax or scroll-jacking.

## Applicability decision

The generated landing-page CTA, font, color, and page-transition suggestions do
not apply: the project already owns Terminal typography, theme tokens, static
route behavior, and immediate reduced-motion handling. The applicable decisions
are the content-first hierarchy, no new decorative animation, visible focus,
explicit recovery text, text-plus-color error communication, and responsive
keyboard/mobile command use. These are promoted into `../design.md` once the
rshell pipeline scope is approved.
