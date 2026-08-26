## Design System: Firefly Terminal Help

### Design Dials

- Variance: 1/10 — centered/minimal
- Motion: 1/10 — subtle
- Density: 6/10 — standard

### Generated Direction

- Pattern: Portfolio Grid
- Style: Exaggerated Minimalism
- Typography: JetBrains Mono for heading and body
- Responsive checkpoints: 375px, 768px, 1024px, 1440px
- Checklist constraints: visible focus states, readable contrast,
  `prefers-reduced-motion`, and no horizontal overflow

### Task Decisions Extracted

The generated pattern, palette, and oversized-typography recommendations are
not adopted as new product direction: this is a focused Firefly Terminal bug
fix, not a redesign. The useful constraints are retained in the task design:

- keep the existing JetBrains Mono terminal typography and semantic Firefly
  color tokens;
- keep the fix minimal and low-motion, with no new animation or visual effect;
- preserve the existing responsive checkpoints and prove no overflow;
- preserve keyboard-readable text layout and existing focus/native behavior.
