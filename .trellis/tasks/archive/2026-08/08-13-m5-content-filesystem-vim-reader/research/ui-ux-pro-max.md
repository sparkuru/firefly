# UI/UX Pro Max — content filesystem and Vim reader

## Scope

Planning query for a static, dark, content-first Terminal blog with nested
filesystem navigation and a bounded read-only Vim interaction layer. The current
Astro/vanilla TypeScript architecture and approved phosphor theme remain the
source of truth; database results are advisory.

## Initialization

- Project-local package: `.codex/skills/ui-ux-pro-max/`
- Search script and local data are present.
- No persisted project `design-system/` exists. This task will record its page-
  specific decisions here and in `design.md` rather than create a competing
  global system during planning.

## Queries

```text
static terminal blog nested content filesystem vim read-only dark content-first
  --design-system -p "firefly Terminal Reader" -f markdown

keyboard shortcuts search breadcrumbs reduced motion accessibility
  --domain ux -n 12
```

## Relevant Results

- Content-first/editorial structure with restrained, rational spacing.
- Dark surface, high-contrast foreground, green accent, visible borders/focus.
- Breadcrumbs are appropriate for hierarchies of three or more levels.
- Keyboard navigation, visible focus, predictable escape routes, and native back
  behavior are high-priority requirements.
- Reduced motion must disable scroll-jacking or animated repositioning.
- Search needs an explicit input/mode, useful no-result feedback, and focus
  management rather than a silent key buffer.
- Mobile remains readable at 16px minimum without document-level horizontal
  overflow; long-form measure stays controlled on desktop.

## Selected Direction

- Extend the existing root semantic Terminal tokens instead of changing the
  approved phosphor visual identity.
- Keep the permalink as semantic long-form HTML. The Vim layer adds mode/status,
  search, movement, and selection semantics without replacing the document with
  canvas, `contenteditable`, a textarea, or a third-party editor.
- Render native linked breadcrumbs with wrapping and visible focus. Do not rely
  on color alone to distinguish current vs navigable segments: links are
  underlined; the current filename is text.
- Preserve browser scrolling as the primary touch/mobile interaction. Vim keys
  are keyboard enhancements, not gesture replacements.
- Movement is immediate when reduced motion is requested and causal/interruptible
  otherwise. Avoid scroll-jacking, nested document scrollers, and decorative
  animation.
- The search prompt uses a real labeled input or equivalent native editable
  control, exposes direction/query/result count, and returns focus predictably.

## Rejected Database Suggestions

- Do not introduce Space Grotesk or its Google Fonts import. The approved,
  self-hosted JetBrains Mono v2.304 and CJK/system fallbacks remain mandatory;
  runtime remote font requests are forbidden.
- Do not add a light theme, newsletter CTA, sticky subscription form, icon set,
  or marketing layout. They are unrelated to the requested reading tool.
- Do not hide the native document behind a custom editor surface or require
  JavaScript for reading.

## Required Browser Evidence

- Static JavaScript-disabled document, directory index, and deep-link tests at
  `1440×900` and `375×812`.
- Interactive keyboard coverage for each supported Vim key, search direction,
  result navigation, visual mode, Escape, and `:q`.
- Negative coverage for native links/controls, local scrolling, modifier keys,
  IME/composition, browser selection, and unsupported ex commands.
- Reduced-motion checks, visible focus, no document overflow, search status
  announcements, route/back-stack behavior, and desktop/mobile human-review
  captures.
