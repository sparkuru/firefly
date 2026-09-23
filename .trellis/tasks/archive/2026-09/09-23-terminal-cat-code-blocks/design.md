# Terminal cat code-block design

## Rendering boundary

Astro currently runs its Shiki stage before the site-owned `rehypeRaw` and
`rehypeSanitize` stages. Sanitization correctly removes inline styles, leaving
Shiki's token spans without colors. Disable Astro's early syntax-highlight
stage and invoke its public `rehypeShiki` plugin after HTML sanitation, before
Mermaid and X Core. Keep `mermaid` excluded so the static diagram pipeline sees
unchanged source. Use two bundled Shiki themes with `defaultColor: false`:
the trusted plugin emits color custom properties but no default foreground or
background color. Apply the dark token variables only under the inline `cat`
prose selector. Canonical article code remains visually as it is today.

The sanitizer still rejects authored style attributes, active elements and
unapproved classes. Only the trusted post-sanitization highlighter may add
Shiki's generated custom properties. Do not relax the authored HTML schema or
reparse/render Markdown in the browser. The X Core adapter continues to wrap
terminal code in `.terminal-wide` and assign its existing node identities.

## Line numbers and code source

Build a separate numbered gutter when each trusted article template is cloned.
The gutter is `aria-hidden`, outside `<code>`, and never enters code
`textContent` or clipboard output. Count displayed code lines from that text;
each block restarts at 1. Align gutter entries with preformatted code through
shared line height and padding. This also covers plain/unknown-language blocks,
authored `pre > code` and Mermaid's excluded source fallback without modifying
their source HAST. Keep the gutter aligned while the existing code region
scrolls horizontally; do not cause page-level overflow.

## Copy control and browser lifecycle

Enhance each cloned `cat` code block, including nested `pre > code` in tables,
with an adjacent header containing the language label when known and a
native Copy code button. Keep standalone-block headers visible over horizontal
scrolling; a nested table-cell control may scroll with its table. Keep touch
targets at least 44px. The terminal controller delegates clicks from the
transcript. It copies `code.textContent` through the Clipboard API, never
`innerHTML` or visible line numbers. A short button state and the existing
polite announcer report success or failure. Buttons are protected typing
targets, so keyboard activation does not send characters to the prompt.

Cloned articles and repeated output instances receive their own controls.
`clear` and fatal recovery release any transient timers or listeners. Native
selection, collapse/expand, focus restoration and overflow hints remain
unchanged. If clipboard access is unavailable or denied, keep the code
selectable and report the failure; do not silently claim success.

## Validation and rollback

Use build-time tests for sanitized authored HTML, Shiki colors/line spans,
unknown languages, exact source text and Mermaid exclusion. Use Playwright
for desktop/mobile visual colors, numbering, copy success/failure, long-line
scrolling, repeated outputs, keyboard focus and canonical-page stability.
Build with the repository's pinned rendering container. The previous tracked
content build hit a separate Mermaid metadata failure; use a temporary
content fixture for UI verification if it recurs, and report that boundary.

The code introduces no persistence or content migration. Revert the plugin
order and browser enhancement together if security or copy/source fidelity
regresses.
