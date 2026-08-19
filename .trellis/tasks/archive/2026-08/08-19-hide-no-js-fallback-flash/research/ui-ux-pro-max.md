# UUPM Research: f1refly Terminal startup

## Design System: f1refly Terminal startup

### Design Dials
- **Variance:** 2/10 — Centered / Minimal
- **Motion:** 3/10 — Subtle
- **Density:** 5/10 — Standard

### Pattern
- **Name:** Funnel (3-Step Conversion)
- **Conversion Focus:** Progressive disclosure. Show only essential info per step. Use progress indicators. Multiple CTAs.
- **CTA Placement:** Each step: mini-CTA. Final: main CTA
- **Color Strategy:** Step colors: 1 (Red/Problem), 2 (Orange/Process), 3 (Green/Solution). CTA: Brand color
- **Sections:** 1. Hero, 2. Step 1 (problem), 3. Step 2 (solution), 4. Step 3 (action), 5. CTA progression

### Style
- **Name:** Exaggerated Minimalism
- **Mode Support:** Light ✓ Full | Dark ✓ Full
- **Keywords:** Bold minimalism, oversized typography, high contrast, negative space, loud minimal, statement design
- **Best For:** Fashion, architecture, portfolios, agency landing pages, luxury brands, editorial
- **Performance:** ⚡ Excellent | **Accessibility:** ✓ WCAG AA

### Colors
| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#0F172A` | `--color-primary` |
| On Primary | `#FFFFFF` | `--color-on-primary` |
| Secondary | `#1E293B` | `--color-secondary` |
| Accent/CTA | `#22C55E` | `--color-accent` |
| Background | `#020617` | `--color-background` |
| Foreground | `#F8FAFC` | `--color-foreground` |
| Muted | `#1A1E2F` | `--color-muted` |
| Border | `#334155` | `--color-border` |
| Destructive | `#EF4444` | `--color-destructive` |
| Ring | `#0F172A` | `--color-ring` |

*Notes: Terminal dark + success green*

### Typography
- **Heading:** Clash Display
- **Body:** Satoshi
- **Mood:** startup, bold, modern, innovative, confident, dynamic
- **Best For:** Startups, pitch decks, product launches, bold brands
- **Google Fonts:** https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Rubik:wght@300;400;500;600;700&display=swap
- **CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Rubik:wght@300;400;500;600;700&display=swap');
```

### Key Effects
font-size: clamp(3rem 10vw 12rem), font-weight: 900, letter-spacing: -0.05em, massive whitespace

### Motion
**Page Transition** (Subtle) — Trigger: route change | Duration: 200-300ms | Easing: `power1.inOut`
```js
gsap.to(main, { opacity: 0, duration: 0.2, onComplete: () => { navigate(); gsap.fromTo(main, { opacity: 0 }, { opacity: 1, duration: 0.2 }); } });
```
*Framework notes: Pair with the router's transition hooks (Next.js App Router transitions, React Router's useNavigate, Vue Router's beforeEach/afterEach)*
- ✅ Preload the destination route's critical assets before the exit tween finishes
- ❌ Don't block navigation on animation; cap exit duration at ~250ms so the app never feels unresponsive

### Avoid (Anti-patterns)
- Complex shadows
- 3D effects
- Muted colors
- Low energy

### Pre-Delivery Checklist
- [ ] No emojis as icons (use SVG: Heroicons/Lucide)
- [ ] cursor-pointer on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard nav
- [ ] prefers-reduced-motion respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px

## Approved project interpretation

The generator's generic landing-page recommendations are not adopted where they conflict with the existing product. This task keeps the phosphor Terminal tokens, self-hosted JetBrains Mono assets, static-first Astro boundary, no external fonts, no route transition, no 3D/shadow treatment, and no CTA. The initial visual direction was a centered, high-contrast, dense-but-readable boot log with restrained sequential text reveal; the later product revision supersedes that staging treatment with direct unboxed terminal flow and complete static output.

Approved states:

- JavaScript disabled: native public-document recovery remains immediately available.
- JavaScript enabled and controller pending: show a direct unboxed boot-log stream with a bounded set of believable local startup lines and a static prompt line; avoid a separator and a separate visible connecting status line.
- Startup complete: replace the boot surface with the existing Terminal prompt.
- Startup/fatal failure: restore the recovery index and existing failure messaging.
- prefers-reduced-motion: reduce: show the complete boot log immediately; do not stagger or animate lines.

Responsive and accessibility constraints remain 375px, 768px, 1024px, and 1440px; preserve visible focus, native links, readable 16px-equivalent terminal text, and status semantics without making color the only signal.
