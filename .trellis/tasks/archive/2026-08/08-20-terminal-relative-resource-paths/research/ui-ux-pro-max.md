# UUPM research — Terminal path consistency

## Applied decisions

The generated design-system output is not adopted as a visual redesign: the
existing static Terminal is a deliberate product language and this task changes
only command semantics. The applicable UX guidance is:

- preserve complete keyboard access and visible focus;
- make errors recoverable at the command where they occur, with accepted path
  forms coherent with the current virtual directory;
- preserve native links and no-JavaScript recovery rather than adding custom
  controls or remote behavior;
- validate the interaction at desktop and mobile widths without adding visual
  complexity.

## Rejected output

The generated generic enterprise navigation, palette, and layout suggestions
do not fit this bounded shell interaction and are deliberately not promoted.
