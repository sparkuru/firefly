# Owner Memo static reading UI research

## Procedure and retention

On 2026-10-06 the installed local UI/UX Pro Max search and data entrypoints were
available. Ran `scripts/search.py --design-system` for owner-authored static
Markdown microblog/chronological notes, using supported `html-tailwind` guidance
as plain-web guidance, low variance and low motion. Also queried UX guidance
for keyboard accessibility, long code blocks, responsive Markdown and reduced
motion. The renderer itself does not need Tailwind or a browser framework.
Generated recommendations remain temporary; this document contains original
project decisions only. No design-system master, font download or source/UI
change was made.

## Decisions for the reviewed design

- Preserve Firefly's existing reading colors and typography at source level.
  Do not adopt generated marketing layouts, a new palette, Google Fonts or
  animation-library recommendations for this content-only page.
- Use one readable chronological column, semantic Memo articles, creation
  times and stable fragment links. Owner identity is public presentation;
  source filenames, drafts and publication/SSH state are not visitor content.
- Give an empty stream an honest short empty state plus normal home/blog
  links. No submission call to action, email field, moderation status or
  verification UI remains.
- Keep paragraph/link/list/table/fenced-code Markdown readable. Long words
  wrap; code blocks and tables may scroll within their own boundaries, while
  the page never overflows the viewport. Use semantic headings and visible
  focus. Theme assets must be served under the Memo mount.
- No client scripts, loading skeleton or browser publishing controls are
  required. Reading and ordinary links work with JavaScript disabled. Build/
  push errors are owner CLI messages; failed candidates never replace the
  public page. Existing static content remains available during upload.
- Test desktop and a narrow phone, keyboard navigation, zoom/text enlargement
  and reduced motion. Do not truncate the author body or use virtualization
  that hides content without JavaScript.

## Gate classifications

UI automation is `playwright-required`; mobile is `mobile-required`.
Screenshots/DOM evidence use only synthetic owner notes. Physical-device and
assistive-technology claims require actual evidence; browser emulation does
not certify them. Actual validation remains pending implementation approval.
