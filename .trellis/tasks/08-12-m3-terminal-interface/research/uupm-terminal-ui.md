# UUPM research — M3 Terminal UI

## Method

Project-local UI/UX Pro Max initialization was verified at
`.codex/skills/ui-ux-pro-max/`; its `search.py` entry point ran successfully.
Planning began with the required design-system query:

```text
personal static blog terminal interface retro CRT keyboard-first accessible
content navigation mobile dark content-first
```

The query used variance `4`, motion `2`, density `6`, and project name
`f1refly Terminal`. Follow-up domain searches covered keyboard navigation,
screen readers, live regions, mobile, reduced motion, terminal/CRT style, and
accessible monospace typography.

The unedited design-system result is preserved in `ui-ux-pro-max.md`. This file
is the approved project-specific synthesis and rejection record.

## Useful recommendations

- Use a near-black background, high-contrast light foreground, and a restrained
  green accent. Add amber/error colors only for meaning, never as the sole cue.
- Keep focus rings visible, preserve logical Tab order, label the command input,
  and give the submit affordance at least a `44px` target.
- Treat `375`, `768`, `1024`, and `1440` as explicit responsive checkpoints;
  prevent document-level horizontal scrolling.
- Use motion only for causal state feedback, keep it short and interruptible,
  and remove it under `prefers-reduced-motion`.
- Prefer immediate readable content over boot sequences, delayed typewriter
  output, or decorative animation.
- Use a local/system monospace stack so the static site has no external font
  request, flash, or new provenance obligation.
- Keep the terminal transcript semantic and selectable. Use a small dedicated
  polite announcer for the latest result rather than making the whole growing
  transcript a live region.

## Project-specific design direction

The local Typecho prototype is better product evidence than UUPM's generic
pattern match. Reimplement, rather than import, its restrained palette and
terminal composition:

| Token | Reference value | Intended role |
| --- | --- | --- |
| background | `#050806` | page/stage |
| panel | `#080d0a` | terminal surface |
| panel soft | `#0d1510` | secondary output |
| foreground | `#d6e7db` | primary text |
| muted | `#789081` | timestamps/metadata after contrast check |
| accent | `#63f59a` | prompt, links, focus |
| warning | `#ffd166` | explicit warning state |
| danger | `#ff6b7a` | explicit error state |
| border | `#213428` | quiet separation |

The visual target is a content terminal, not a hacker-game simulation:

- one centered desktop terminal surface and a full-bleed small-screen layout;
- optional restrained decorative title bar, with no fake interactive controls;
- no emoji, icon package, external image, or external font;
- scanlines, glow, cursor blink, or status labels only if they remain subtle,
  nonessential, contrast-safe, and absent under reduced motion;
- native links remain visible within `ls` and the initial fallback;
- no forced autofocus that bypasses the skip link or summons a mobile keyboard.

## Rejected generic output

The design-system search also proposed newsletter conversion structure, Bento
cards, Atkinson Hyperlegible from Google Fonts, hover scaling, and a GSAP route
transition. Those are database-neighbor results, not f1refly requirements, and
conflict with the terminal-first static shell, local-font policy, and minimal
runtime. They must not enter implementation.

## Validation implications

- Measure every foreground/background/focus pair; normal text must meet at least
  WCAG `4.5:1`.
- Exercise keyboard-only and touch submission, browser Tab escape, history,
  completion, IME composition, mobile keyboard behavior, and screen-reader
  announcement granularity.
- Run JavaScript-enabled, JavaScript-disabled, and reduced-motion browser cases
  at `1440x900` and `375x812`.
- Verify zoom remains enabled, content is not clipped, local scrollers are
  bounded/labeled, and initialization failure leaves static links usable.

## Owner-directed shell-first revision — 2026-08-13

After reviewing the first live implementation, the owner retained the palette
but rejected the visible hero/index, boxed command records, labeled field, and
Run button. A follow-up UUPM search targeted a minimal, dense, command-first
developer shell and supported a single-column system-monospace stream with very
low motion and no decorative content hierarchy.

The revised approved direction is:

- in the enhanced working state, the prompt is the only initial visible UI;
- command lines and results form one transparent continuous stream rather than
  panels or cards;
- the exact visible prompt is `guest@f1refly $`, kept on one line beside a
  transparent 16px-or-larger input with a clear `:focus-within` indicator;
- `cat` inserts a restrained Glow-like article with a 70–78ch reading measure,
  modest headings, underlined links, a blockquote rule, and locally scrollable
  code/table regions;
- the article start receives focus after `cat` and includes a focus-visible
  return-to-prompt link;
- no autofocus, fake terminal role, `role="application"`, growing live region,
  nested vertical scroller, fixed prompt, boot animation, or external font is
  introduced;
- desktop remains centered, while mobile uses safe-area-aware full-bleed
  spacing and the soft-keyboard Enter action for submission.

The static link list remains visible only as the no-JavaScript or failure
recovery product. Hiding the H1, label, and instructions visually is an explicit
owner-approved tradeoff for the shell-first experience; their accessible names
must still include the visible prompt text.
