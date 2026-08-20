## Design System: firefly Terminal Reader

### Pattern
- **Name:** Newsletter / Content First
- **Conversion Focus:** Single field form (Email only). Show 'Join X, 000 readers'. Read sample link.
- **CTA Placement:** Hero inline form + Sticky header form
- **Color Strategy:** Minimalist. Paper-like background. Text focus. Accent color for Subscribe.
- **Sections:** 1. Hero (Value Prop + Form), 2. Recent Issues/Archives, 3. Social Proof (Subscriber count), 4. About Author

### Style
- **Name:** Dark Mode (OLED)
- **Mode Support:** Light ✗ No | Dark ✓ Only
- **Keywords:** Dark theme, low light, high contrast, deep black, midnight blue, eye-friendly, OLED, power efficient
- **Best For:** Night-mode apps, coding platforms, entertainment, eye-strain prevention, OLED devices, low-light
- **Performance:** ⚡ Excellent | **Accessibility:** ✓ WCAG AAA

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
- **Heading:** JetBrains Mono
- **Body:** JetBrains Mono
- **Mood:** terminal, cli, hacker, monospace, matrix, developer, retro-future, command line, precision, OLED
- **Best For:** Developer tools, Web3/blockchain apps, hacker aesthetic, sci-fi games, ARG, security tools, geek-culture portfolios
- **Google Fonts:** https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400;0,500;1,400
- **CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400;0,500;1,400&display=swap');
```

### Key Effects
Minimal glow (text-shadow: 0 0 10px), dark-to-light transitions, low white emission, high readability, visible focus

### Avoid (Anti-patterns)
- Light mode only
- Hidden results

### Pre-Delivery Checklist
- [ ] No emojis as icons (use SVG: Heroicons/Lucide)
- [ ] cursor-pointer on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard nav
- [ ] prefers-reduced-motion respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px

### Task interpretation

The existing repository already owns the dark Terminal presentation, local
JetBrains Mono assets, phosphor-green command color, visible focus treatment,
and diagnostic-only screenshot workflow. For this task, the applicable UUPM
decisions are to preserve that dark/high-contrast/content-first system, keep the
tree outline text-first and keyboard reachable, avoid introducing new icons or
motion, and validate at the repository's 375px and 1440px browser widths.
