# Verified baseline

Reviewed 2026-09-22/23 using Chromium in the project Playwright container.
The source came from config.dev and tooling/push-majoim. Retrieve the exact
machine-specific source there; do not copy it or owner content into task records.

| Width (height 900) | Stream width | Article height | Page scroll width |
| --- | ---: | ---: | ---: |
| 375 | 343 | 10353 | 375 |
| 768 | 614 | 9593 | 768 |
| 1440 | 1152 | 9244 | 1440 |
| 1920 | 1536 | 9244 | 1920 |

At 375x812 with touch, wide regions had 341px client width and tables reached
1864px scroll width. First-table scrollLeft=300 succeeded: content is locally
scrollable, not missing. Existing regions have keyboard focus and accessible
scroll labels; the missing affordance is mainly visual.

At title focus, j focused the input and inserted j; Tab focused permalink.
This is existing intentional behavior. Both samples duplicated generated and
authored opening titles. Mermaid flowchart code appeared as raw source.
No quantified font/contrast failure or true-device keyboard defect was proved.

Baseline source anchors:
- apps/site/src/styles/terminal.css:40 — font/measure tokens, including 82ch prose.
- apps/site/src/styles/terminal.css:139 — shared focus-visible treatment.
- apps/site/src/styles/terminal.css:698 — stream title/body layout.
- apps/site/src/styles/terminal.css:1074 — wide regions and nowrap table cells.
- apps/site/src/components/TerminalStreamDocument.astro:20 — generated header/body.
- apps/site/src/scripts/terminal-home.ts:449 — ID/href/token clone scoping; no SVG URL rewriting.
- apps/site/src/scripts/terminal-home.ts:828 — destination-aware document opening.
- apps/site/src/scripts/terminal-home.ts:839 — inline template cloning.
- apps/site/src/scripts/terminal-home.ts:1383 — printable-to-prompt listener.
- presentations/terminal/src/index.ts:39 — named local-scroll wrappers.
- apps/site/astro.config.mjs:30 — shared Markdown pipeline without Mermaid.
- apps/site/src/lib/render-document.ts:61 — heading/metadata validation.

Reproduction:
1. Use the local configured content root; never run remote synchronization.
2. ./sam npm run build:m3. Baseline: 135 posts/8 pages, clean Astro check,
   successful build, 18/18 static tests.
3. Serve the built apps/site/dist through Astro preview inside the pinned
   Playwright Noble container with SAM_IPC=host.
4. Resolve operands from public entry attributes; cat the Trellis workflow
   article and then the Markdown template. Capture opening/table/code states.
5. Record region widths, article height and prompt location at the widths above;
   separately check 375x812 touch scrolling and title-focused typing.

Ignored evidence: apps/site/test-results/cat-review/. A temporary review copy
also exists under /tmp/firefly-cat-review/. These files can expire; the measurements
and reproduction above are durable. Do not commit raw screenshots/content index.
Future fixtures must use synthetic CJK prose, URLs, tables and headings.
