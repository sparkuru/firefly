# UI/UX research — Terminal completion and shortcuts

## Source

Project-local `ui-ux-pro-max` search on 2026-08-20:

- Design-system query: `terminal command prompt keyboard completion accessible dense dark`.
- UX query: `keyboard shortcuts accessibility focus screen reader`.
- Astro stack query: `Astro keyboard event accessibility`.

## Adopted guidance

- Keep the existing dark, monospace Terminal visual language and its semantic
  color tokens; do not introduce a separate widget style.
- A selected candidate needs a visible state that does not rely on color alone,
  and the native input must retain focus so typing and IME continue to work.
- The keyboard flow must not create a trap: Tab selection is owned only by the
  focused command prompt, while focus traversal outside the prompt stays
  native.
- Verify the result at 375px and 1440px, with readable wrapping and no
  horizontal page overflow.
- Use the current Astro/static markup and TypeScript browser enhancement;
  introduce no framework or third-party terminal input.

## Rejected guidance

The generated generic landing-page layout and CTA recommendations do not apply
to the existing Terminal interface and are not adopted.
