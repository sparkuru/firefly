# Adjust the Terminal document path and outline presentation

## Goal

Make the Terminal document reader header easier to scan by showing one canonical
Markdown path, using a single divider, and presenting the document outline as a
tree rather than a numbered list.

## Background and confirmed facts

- The screenshot targets the Terminal presentation rendered by
  `apps/site/src/components/TerminalDocument.astro`.
- That component currently renders both an interactive `Document path`
  breadcrumb (`guest@firefly:~/blog $ / posts / ...`) and a separate
  `terminal-path` paragraph for the same Markdown identity.
- The current outline is rendered as an ordered list with the visible label
  `On this page`; each item already carries `metadata.outline` depth, anchor ID,
  and text from the shared X Core pipeline.
- `presentations/terminal/src/commands/tree.ts` establishes the existing tree
  glyph convention (`├──`, `└──`, `│`) for Terminal output.
- `apps/site/src/styles/terminal.css` gives the document header and outline
  multiple nearby block borders, which produces the doubled horizontal-rule
  effect in the screenshot.

## Requirements

1. Remove the redundant Terminal document breadcrumb/navigation block. Keep one
   visible canonical source path in the document header, formatted as
   `/posts/<relative-file>.md` (or the corresponding `/pages/<relative-file>.md`
   path for pages), without changing the canonical route or content model.
2. Simplify the affected separator treatment so the header/outline transition
   presents one `1px` divider rather than adjacent or block-level double rules.
3. Replace the Terminal outline's visible `On this page` label and ordered
   numbering with a tree-shaped list that uses the existing Terminal branch
   glyph convention. Preserve every outline entry's anchor link, heading text,
   depth, keyboard accessibility, and deep-link behavior. Keep an accessible
   navigation label even though the explanatory visible label is removed.
4. Keep the change scoped to the screenshot-targeted Terminal document reader;
   do not change route generation, the interactive shell's `tree` command, or
   the separate semantic presentation unless a shared test contract requires it.

## Acceptance Criteria

- [x] A Terminal document renders exactly one visible source path, such as
      `/posts/llm-workflow-with-trellis.md`; the duplicate `Document path`
      breadcrumb and its links are absent.
- [x] The document header/outline transition has one visible horizontal divider,
      not two adjacent or enclosing dividers.
- [x] The Terminal outline has no visible `On this page` text and no browser
      ordered-list numbering; entries render with tree connectors and retain
      links to every corresponding heading ID, including nested depths.
- [x] Existing Terminal document content, heading anchors, fixed reader status,
      responsive containment, and non-JavaScript static rendering remain intact.
- [x] Focused site tests/static-output checks, the site type-check, and the
      required diff validation pass.

## Out of scope

- Changing the canonical `/posts/<slug>/` route or the virtual filesystem path
  contract.
- Redesigning the semantic document presentation or the shell `tree` command.
- Translating the site's broader UI language.
