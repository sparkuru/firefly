# UI/UX Pro Max research: friend links

## Search context

The project-local UI/UX Pro Max search was run with:

```text
python3 .codex/skills/ui-ux-pro-max/scripts/search.py "personal static blog curated friend links editorial directory external links" --design-system --stack astro --format markdown --project-name "firefly Friend Links" --variance 2 --motion 1 --density 4
```

The generated recommendation was:

```text
## Design System: firefly Friend Links

### Design Dials
- Variance: 2/10 — Centered / Minimal
- Motion: 1/10 — Subtle
- Density: 4/10 — Standard

### Pattern
- Marketplace / Directory; Conversion Focus search bar; CTA search/navbar; sections hero/categories/featured/trust/CTA

### Style
- Exaggerated Minimalism; light/dark; bold minimalism/high contrast/negative space; excellent performance/WCAG AA

### Colors
primary #18181B, on primary #FFFFFF, secondary #3F3F46, accent #EC4899, background #FAFAFA, foreground #09090B, muted #E8ECF0, border #E4E4E7, destructive #DC2626, ring #18181B

### Typography
Caveat + Quicksand, Google Fonts link/import suggested

### Key Effects
massive whitespace, huge clamp heading

### Motion
page transition GSAP 200-300ms

### Avoid
excessive decoration

### Pre-Delivery Checklist
no emoji icons, focus/contrast, hover 150-300, reduced motion, responsive 375/768/1024/1440
```

## Project-specific interpretation

The search result is advisory and its marketplace framing is broader than this
feature. The approved direction is a quiet, content-first resource list inside
the existing static site:

- Preserve the current semantic/Terminal visual tokens and self-hosted
  JetBrains Mono. Do not add Google Fonts, Caveat, Quicksand, GSAP, or a new
  pink palette for a small site feature.
- Prefer a compact native list or grouped list over marketplace cards, search,
  hero/CTA sections, avatars, remote images, or decorative illustrations.
- Keep every external destination as a keyboard-accessible native link with
  visible focus and sufficient contrast. No JavaScript is required for the
  primary interaction.
- Verify the selected presentation at the repository's important 375px and
  1440px viewports, with no horizontal overflow and a useful result when
  JavaScript is disabled.
- Treat motion as unnecessary for the MVP; if any future enhancement is
  proposed, it must respect reduced-motion preferences.

This file records task research only. It does not change the project-wide
design specification or authorize implementation.
