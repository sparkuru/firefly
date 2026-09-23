# Design proposal

## Product boundary

cat remains the command transcript. Its output gains a compact identity/header,
bounded reading column and reading actions. Full outline/search/navigation stays
on the canonical document through the existing open destination resolver.
Keep printable-to-prompt behavior, explain it and avoid competing j/k bindings.

## Ownership

A owns stream components, home controller and stream-scoped CSS. Reuse trusted
build-rendered templates and the single command input. Support both presentation
adapters inside the Terminal stream.

B owns site-side Markdown diagram processing, static assets and renderer/build
integration. X Core stays framework-neutral. Canonical pages and home templates
receive the same built result; no browser Markdown parser is introduced.

## Design decisions

1. Wrap table prose rather than shrinking text or converting arbitrary tables
   into cards. Code keeps whitespace and a local scroll region.
2. One compact sticky action bar per expanded output, bounded by that article.
   Do not pin a duplicate input or stack all history controls on the viewport.
3. Preserve authored headings. Matching leading headings demote the generated
   identity header visually; they do not delete body content.
4. Prefer Mermaid SVG image assets plus source disclosure. Isolated image
   documents avoid SVG marker/style ID conflicts between cloned outputs.
5. A ships first. B's new build-time browser dependency requires a compatibility
   experiment before its exact runtime integration is finalized.

## Risks and rollback

Sticky controls must not obscure anchors or conflict with focus settlement.
Table wrapping must cover CJK, long tokens and spanning cells. Row-label pinning
must leave room for data columns. Diagram assets must ship atomically with HTML.

Children are independently revertible. A preserves command semantics; B can
revert to readable source fences. Neither changes author Markdown or weakens
authored-HTML sanitation. Detailed designs and execution gates live in children.
