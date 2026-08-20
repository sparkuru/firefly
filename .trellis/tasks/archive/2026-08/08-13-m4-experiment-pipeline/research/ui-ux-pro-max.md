# M4 UI/UX Pro Max Research

## Raw Design-System Query

Command:

```bash
python3 .codex/skills/ui-ux-pro-max/scripts/search.py \
  "static personal blog experiment catalog content-first terminal dark immersive accessible restrained" \
  --design-system --stack astro --variance 3 --motion 2 --density 4 \
  -p "firefly M4 Experiment Pipeline" -f markdown
```

Generated result:

## Design System: firefly M4 Experiment Pipeline

### Design Dials

- **Variance:** 3/10 — Centered / Minimal
- **Motion:** 2/10 — Subtle
- **Density:** 4/10 — Standard

### Pattern

- **Name:** Newsletter / Content First
- **Conversion Focus:** Single field form (Email only). Show 'Join X, 000 readers'. Read sample link.
- **CTA Placement:** Hero inline form + Sticky header form
- **Color Strategy:** Minimalist. Paper-like background. Text focus. Accent color for Subscribe.
- **Sections:** 1. Hero (Value Prop + Form), 2. Recent Issues/Archives, 3. Social Proof (Subscriber count), 4. About Author

### Style

- **Name:** Exaggerated Minimalism
- **Mode Support:** Light ✓ Full | Dark ✓ Full
- **Keywords:** Bold minimalism, oversized typography, high contrast, negative space, loud minimal, statement design
- **Best For:** Fashion, architecture, portfolios, agency landing pages, luxury brands, editorial
- **Performance:** Excellent
- **Accessibility:** WCAG AA

### Colors

| Role | Hex | CSS Variable |
| --- | --- | --- |
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

Notes from generator: Terminal dark + success green.

### Typography

- **Heading:** Atkinson Hyperlegible
- **Body:** Atkinson Hyperlegible
- **Mood:** accessible, readable, inclusive, clear
- **Generated font source:** Google Fonts

### Key Effects

- Generated exaggerated-minimalist recommendation: very large typography and
  massive whitespace.
- Generated subtle-motion recommendation: a 200–300 ms GSAP route crossfade.

### Generated Checklist

- No emoji structural icons.
- Visible hover and focus states.
- Text contrast at least 4.5:1.
- Respect `prefers-reduced-motion`.
- Verify 375, 768, 1024, and 1440 px widths.

## Raw UX Search

Query:

```bash
python3 .codex/skills/ui-ux-pro-max/scripts/search.py \
  "navigation accessibility reduced motion empty state keyboard focus responsive no horizontal overflow" \
  --domain ux -n 8
```

High-value results:

1. Prevent document-level horizontal scrolling.
2. Respect `prefers-reduced-motion`.
3. Keep every function keyboard accessible with logical tab order.
4. Preserve visible focus indicators.
5. Render a helpful empty state rather than an empty surface.
6. Preserve a skip-to-main-content path on navigation-heavy pages.
7. Contain genuinely wide content locally instead of breaking the viewport.
8. Make current navigation context legible.

## Raw Astro Search

Query:

```bash
python3 .codex/skills/ui-ux-pro-max/scripts/search.py \
  "static routes accessibility performance asset isolation responsive navigation" \
  --stack astro -n 8
```

Applicable results:

- Keep static structure in `.astro` components.
- Use file-based routes and build-time data for known static destinations.
- Preserve useful no-JavaScript content and navigation.
- Use responsive image machinery when a new responsive raster image is needed.

Generated but inapplicable results included hybrid rendering, link prefetch, and
dynamic route advice. M4 is a fully static catalog with one fixed `/lab/` route,
and Experiment assets must not be prefetched into ordinary pages.

## Approved M4 Selection

UUPM output is advisory and is reconciled with the established firefly product
and frontend specs. M4 approves these task-specific decisions:

- `/lab/` stays content-first, restrained, static, and visually within the
  existing semantic site shell; it is not a new marketing landing page.
- Use the existing semantic typography, palette, spacing tokens, local/system
  font boundary, skip link, focus treatment, and readable measure. Do not add
  Google Fonts, Atkinson downloads, raw generator colors, a new theme, icons,
  oversized display type, a subscribe form, or sticky marketing chrome.
- Experiment items are a native semantic list with title, concise kind/tags,
  and one clearly labeled native entry link. Avoid card theatrics or asset
  previews that preload NERV.
- Empty catalog state is explicit and calm. There is no loading, disabled,
  success, or permission state because the catalog is immutable build-time data;
  invalid manifests fail the build rather than render an error UI.
- Terminal lab discovery follows the approved shell-first M3 language: native
  recovery links without JavaScript, closed command output after enhancement,
  visible focus, safe navigation, and no animation or loading state.
- NERV preserves its existing immersive visual identity. Reduced motion disables
  continuous scanline, flicker, and scroll-driven movement while leaving static
  layers and all core content visible.
- No GSAP, view transitions, client router, prefetch, runtime data request,
  external font, or new icon package is introduced.
- Verify 375×812 and 1440×900 browser projects, plus static layout assertions at
  768 and 1024 px where the existing suite supports them. No document-level
  overflow, keyboard trap, hidden focus, color-only meaning, or broken return
  route is acceptable.

## Verification Focus

- `/lab/`: meaningful visible H1, sequential headings, list semantics, readable
  copy, native destination and home paths, visible focus, explicit empty state,
  no JavaScript requirement, no Experiment preload/import, and no overflow.
- Terminal: `help`, `ls lab`, `open lab/nerv`, unknown/unlisted recovery,
  completion, keyboard behavior, focus retention, disabled-JavaScript fallback,
  and fatal recovery.
- NERV: title/landmarks, mounted entry, mounted 404/assets, return path, desktop/
  mobile containment, and a media-query-controlled static reduced-motion state.
- Human residual: visual coherence of semantic `/lab/`, Terminal output, and
  NERV reduced-motion identity; real-device and assistive-technology behavior.

## Owner-Review Supersession: Terminal Session Refinement

After the first submit-ready capture, owner review found that the enhanced home
still behaved like an append-only webpage: short output could leave the prompt
below the viewport, inline documents lacked a deliberate reading-start
transition, `cat ./<prefix><Tab>` escaped because only bare filenames completed,
the incidental mono stack looked weak, and there was no safe type-anywhere return
to the prompt. This supersedes only the earlier Terminal-specific “no new theme
or font” selection; `/lab/` and NERV decisions remain unchanged.

Follow-up design-system query:

```bash
python3 .codex/skills/ui-ux-pro-max/scripts/search.py \
  "terminal portfolio content-first dark theme keyboard command interface" \
  --design-system --variance 3 --motion 2 --density 6 \
  -p "firefly Terminal" -f markdown
```

Follow-up UX and typography queries:

```bash
python3 .codex/skills/ui-ux-pro-max/scripts/search.py \
  "terminal command input focus keyboard tab scroll continuity readable monospace theme tokens" \
  --domain ux -n 12

python3 .codex/skills/ui-ux-pro-max/scripts/search.py \
  "developer terminal readable monospace modern" --domain typography -n 10
```

Applicable output recommends semantic dark-theme roles, visible focus, logical
keyboard navigation, readable 16 px minimum type, no horizontal scroll, restrained
cause-and-effect motion with reduced-motion support, and JetBrains Mono for a
developer Terminal. Generated marketing layout, GSAP, external Google Fonts, and
raw palette replacement remain inapplicable.

The approved refinement is:

- one root-selectable semantic theme contract and one shipped green phosphor
  theme; no picker or persistence in M4;
- self-host the official JetBrains Mono webfont, keep system/CJK fallbacks, and
  make no third-party runtime request;
- short output reveals the ready prompt, document output reveals its reading
  start, and reduced motion removes smooth movement;
- only an unmodified non-Space printable character outside controls, links,
  keyboard-scroll regions, selections, and IME returns to and types in the
  prompt; protected browser/accessibility keys remain native;
- normalize only the exact optional `./` prefix for closed `cat` filenames.

License evidence was checked against the official JetBrains product page and
repository. JetBrains Mono is free and open source under SIL Open Font License
1.1, is permitted for commercial/non-commercial website and application use,
and the source code is Apache-2.0:

- https://www.jetbrains.com/lp/mono/
- https://github.com/JetBrains/JetBrainsMono
- https://openfontlicense.org/
