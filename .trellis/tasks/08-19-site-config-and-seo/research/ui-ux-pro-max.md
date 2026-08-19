# UUPM Research: f1refly site configuration

## Raw design-system output

### Design System: f1refly site configuration

### Pattern
- **Name:** Newsletter / Content First
- **Conversion Focus:** Single field form (Email only). Show 'Join X, 000 readers'. Read sample link.
- **CTA Placement:** Hero inline form + Sticky header form
- **Color Strategy:** Minimalist. Paper-like background. Text focus. Accent color for Subscribe.
- **Sections:** 1. Hero (Value Prop + Form), 2. Recent Issues/Archives, 3. Social Proof (Subscriber count), 4. About Author

### Style
- **Name:** Swiss Modernism 2.0
- **Mode Support:** Light ✓ Full | Dark ✓ Full
- **Keywords:** Grid system, Helvetica, modular, asymmetric, international style, rational, clean, mathematical spacing
- **Best For:** Corporate sites, architecture, editorial, SaaS, museums, professional services, documentation
- **Performance:** ⚡ Excellent | **Accessibility:** ✓ WCAG AAA

### Colors
| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#18181B` | `--color-primary` |
| On Primary | `#FFFFFF` | `--color-on-primary` |
| Secondary | `#3F3F46` | `--color-secondary` |
| Accent/CTA | `#EC4899` | `--color-accent` |
| Background | `#FAFAFA` | `--color-background` |
| Foreground | `#09090B` | `--color-foreground` |
| Muted | `#E8ECF0` | `--color-muted` |
| Border | `#E4E4E7` | `--color-border` |
| Destructive | `#DC2626` | `--color-destructive` |
| Ring | `#18181B` | `--color-ring` |

*Notes: Editorial black + accent pink*

### Typography
- **Heading:** JetBrains Mono
- **Body:** JetBrains Mono
- **Mood:** terminal, cli, hacker, matrix, developer, retro-future, command line, precision, OLED

### Key Effects
`display: grid`, mathematical ratios, clear hierarchy.

### Avoid (Anti-patterns)
- Poor typography
- Slow loading

### Pre-Delivery Checklist
- [ ] No emojis as icons (use SVG: Heroicons/Lucide)
- [ ] cursor-pointer on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard nav
- [ ] prefers-reduced-motion respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px

## Project interpretation

This task changes build-time text/head metadata and generated discovery files; it
does not introduce a visual redesign, CTA, new interaction, font, animation, or
layout system. The existing phosphor Terminal tokens, self-hosted JetBrains Mono,
static-first Astro boundary, and responsive/accessibility behavior remain the
source of truth. Configured identity text must remain escaped, readable, and
wrappable at the existing responsive breakpoints.
