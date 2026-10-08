# Homepage Template Boundary for Memo

Focused read-only investigation by the existing bounded agent; the main session
checked the source anchors and retained the result on 2026-10-07.

- apps/site/src/pages/index.astro:20 projects every current canonical document
  into a Terminal entry; line 39 renders all corresponding documents.
- apps/site/src/components/TerminalHome.astro:374 embeds one template per entry,
  with home-search metadata. TerminalStreamDocument.astro:48 includes Content.
- apps/site/src/scripts/terminal-home.ts:438 requires an exact entry/template
  match and extracts text for the shell; line 502 rejects missing templates.
- apps/site/src/scripts/home-search.ts also expects exact template/entry count
  and extracts body text from the template. Skipping a template silently breaks
  both shell and mobile search initialization.
- presentations/terminal/src/commands/cat.ts:29 reads text/document content;
  terminal-home.ts:924 clones the template for document effects. Open uses
  a separate document-navigation effect and canonical destination, not the body.
- Existing document-navigation lookup can specify none, yielding the canonical
  native URL without a navigator fragment. That does not remove home templates.

Chosen design: the aggregate Pages document supplies a compact Markdown
introduction and full-page link as its ordinary home template. The full Memo
feed is composed only in its registered page view. Individual Memo collection
entries are projected to their own reader/routes without being inserted into
the homepage's ordinary post/page template set. This preserves the expected
template inventory while avoiding hundreds of long-body copies in home HTML.

Do not add fetch/iframe, silently omit required templates, or make the homepage
load the complete aggregate just to advertise /pages/memos/. New dedicated
reading capabilities are not necessary for this first-cut aggregate strategy.
The new presentation's default navigation is native, and ordinary firefly/
semantic navigator policies remain unchanged.
