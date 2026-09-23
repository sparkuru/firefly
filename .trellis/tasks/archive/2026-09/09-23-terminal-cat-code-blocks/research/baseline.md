# Code-block baseline

- `apps/site/astro.config.mjs` selects Shiki and orders site plugins as raw HTML,
  sanitation, Mermaid, then X Core. In the installed
  `@astrojs/markdown-remark/dist/index.js`, the built-in Shiki stage runs
  before those custom rehype plugins.
- `apps/site/src/lib/markdown-html-policy.mjs` intentionally rejects authored
  style attributes and arbitrary classes. The existing X Core integration test
  asserts this boundary. The built homepage contains `pre[data-language]` with
  nested token spans but empty classes and no colors.
- A read-only Node 22 prototype using `syntaxHighlight: false`, then
  `rehypeRaw`, `rehypeSanitize`, and the package's public `rehypeShiki` export
  produced `<pre class="astro-code ...">` with `<span class="line">` and
  token-local `--shiki-dark` variables. `defaultColor: false` omitted direct
  foreground colors, so cat-scoped CSS can opt into colors. A second probe
  confirmed that unlabelled and unknown languages become readable `plaintext`
  with line spans, while `mermaid` remains an unchanged `<pre><code>` source.
- `presentations/terminal/src/index.ts` wraps each pre in `.terminal-wide`;
  `apps/site/src/scripts/terminal-stream-overflow.ts` inserts measured scroll
  hints after the article template is cloned. The prompt's typing redirect
  already protects native buttons.
- Astro's current syntax highlighting guide describes Shiki as the default
  Markdown highlighter and notes inline token styles:
  https://docs.astro.build/en/guides/syntax-highlighting/
- Shiki documents `defaultColor: false` with theme variables:
  https://shiki.style/guide/dual-themes
