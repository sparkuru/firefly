# UUPM Research — M5 Full Content Migration

## Raw Design-System Query

```bash
python3 .codex/skills/ui-ux-pro-max/scripts/search.py \
  "personal blog comment archive optional moderated feedback content-first terminal accessible privacy" \
  --design-system --stack astro --variance 2 --motion 1 --density 5 \
  -p "f1refly M5 Content Migration" -f markdown
```

### Generated Result

- Dials: variance 2/10 (centered/minimal), motion 1/10 (subtle), density 5/10 (standard).
- The generator proposed editorial content-first structure, high contrast, visible keyboard focus, and reduced motion.
- Its newsletter conversion chrome, sticky form, oversized typography, raw pink palette, Google-hosted font, GSAP hover movement, and hybrid rendering conflict with existing f1refly decisions and are not approved.

## Raw UX Query

```bash
python3 .codex/skills/ui-ux-pro-max/scripts/search.py \
  "comment form privacy consent moderation loading success error keyboard accessibility mobile" \
  --domain ux -n 12
```

### Applicable Results

- Preserve logical keyboard order and visible focus.
- Give every form input a visible associated label; do not use placeholders as labels.
- Announce validation and submission errors adjacent to the relevant field through an alert/live region, with recovery.
- Make loading, success, rejection, and retry states explicit.
- Use appropriate mobile input modes, avoid viewport overflow, and keep primary controls touch-accessible.

## Raw Astro Query

```bash
python3 .codex/skills/ui-ux-pro-max/scripts/search.py \
  "static blog progressive enhancement forms privacy comments" --stack astro
```

### Applicable Results

- Keep immutable comment archives in `.astro` static markup and use the validated content model rather than an untyped glob.
- The hybrid-rendering recommendation is not approved. A future mutable comment service remains an independently deployed write boundary; it does not turn the main publication into SSR.

## Planning Selection

- Existing semantic/Terminal identity, local font boundary, theme tokens, skip link, focus treatment, no-prefetch posture, and static-first routes are authoritative. Do not import generator fonts, colors, motion libraries, marketing layout, or runtime UI dependencies.
- This task has no comment archive or submission UI. The future submission-form advice is reserved for M5.1 and is not an M5 implementation requirement.
- Current M5 UI scope is article directories and optional public tag navigation: semantic static markup, clear heading/list/link hierarchy, visible focus, no JavaScript requirement, reduced motion, and no document-level overflow at desktop/mobile widths.
- Browser checks cover representative migrated article directories, larger indexes, public tags when generated, source/private-data absence, focus/keyboard order, and responsive containment. Human review remains for content hierarchy, privacy wording, visual coherence, real devices, and assistive technology.
