# Improve Terminal cat reading experience

## Goal

Make real long-form blog content comfortable to read inside Terminal at phone,
tablet and desktop widths, with an obvious way to resume commands. Preserve
`cat` as inline output and `open` as canonical document navigation.

The owner authorized task creation and solution design after the read-only
review, then approved implementation of the presented task tree.

## Evidence and requirements

The local source selected by the push tooling and config.dev produced 135 posts
and 8 pages. Chromium covered 375/768/1440/1920px widths at 900px height, plus a
375x812 touch check. Samples: Trellis workflow article and Markdown template,
including consecutive cat calls. Build, Astro check and 18 static tests passed.
These are baseline results, not acceptance of future changes. Evidence and
source anchors live in research/baseline.md; true soft keyboards were not tested.

| ID | Priority / observed problem | Required outcome | Child |
| --- | --- | --- | --- |
| R1 | P1: a 341px mobile region contains tables up to 1864px wide; overflow is visually obscure and row labels leave view. | Wrap prose cells, expose remaining overflow and preserve useful row context; code stays exact and locally scrollable. | A |
| R2 | P1: sample output is 10353px tall on mobile, with the prompt below it. | Reach the prompt, collapse an output or open the document without traversing the article; repeated outputs remain independently operable. | A |
| R3 | P1: Mermaid flowchart appears as multiple screens of source. | Valid Mermaid becomes a readable diagram in inline and canonical output, with accessible source and failure fallback. | B |
| R4 | P2: prose stays narrow while table/code frames expand to 1536px at 1920px. | A bounded, consistent reading column with purposeful local overflow. | A |
| R5 | P2: generated title repeats an authored heading; automatic title focus resembles an input. | One dominant opening title and restrained visible focus, preserving authored headings and IDs. | A |
| R6 | P2: typing j at title focus redirects to the prompt without a visible explanation. | Explain inline typing and expose document navigation; preserve protected native interactions. | A |

## Scope and task tree

- A: ../09-23-terminal-cat-inline-reading/ owns R1/R2/R4/R5/R6.
- B: ../09-23-document-mermaid-rendering/ owns R3 and shared rendering integration.
- Parent owns requirements and final combined review; implement the children.
- Execute A first. B can be researched independently but completes against A's
  layout and repeated-output contracts. A completion does not close R3.

Out of scope: a new pager/editor, inline Vim mode, command renaming, automatic
history deletion/virtualization, author Markdown rewrites, content theme redesign,
remote publication, comments, experiments and site-wide redesign.

## Acceptance criteria

- [x] AC1 / R1,R4: 375x812, 768x1024, 1440x900 and 1920x1080 have no page-level
      horizontal overflow; prose cells wrap and remaining overflow is visually
      discoverable. The widest sample table is fully reachable.
- [x] AC2 / R2,R6: at article top/middle/end, one explicit action focuses the
      existing prompt without losing draft input; collapse/expand affects only
      that output; clear removes its controls.
- [x] AC3 / R2,R6: open-document actions honor destination navigator capability,
      including none. Typing/protected interactions match documented behavior.
- [x] AC4 / R5: headings, outline and fragment targets remain intact; the opening
      has one dominant title and keyboard focus stays visible.
- [x] AC5 / R3: real and fixture Mermaid renders locally without client Mermaid
      execution; source/failure fallback, repeated clones and JS-disabled
      canonical output work.
- [x] AC6 / all: affected fixture gates pass and the owner-selected local source
      receives before/after visual review. No owner content enters tracked fixtures.

## Completion status

Implementation and acceptance criteria are verified in research/validation.md.
Both children retain their scoped evidence. The owner confirmed the local
commit and subsequent task archive/session journal after review. No remote publication
was performed.
