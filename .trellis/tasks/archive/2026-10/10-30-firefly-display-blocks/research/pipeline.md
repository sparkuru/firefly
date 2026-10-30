# Repository evidence: Firefly display blocks

This is the pre-implementation investigation snapshot. Current behavior and
verification are recorded in `validation.md` and the shared display-blocks
contract; references to missing support below describe the original baseline.

- `apps/site/astro.config.mjs:33-53` configures static Astro output and the
  ordered Unified/remark/rehype pipeline. X Core remark analysis is currently
  the only user remark plugin. Site rehype processing runs raw HTML parsing,
  sanitization, Shiki, Mermaid, X Core and Memo processing in that order.
- `apps/site/node_modules/@astrojs/markdown-remark/dist/index.js:39-79` shows
  user remark plugins run before image collection and remark-to-rehype; user
  rehype plugins run before Astro heading collection. This is a local dependency
  observation, not a new public API guarantee.
- `packages/x-core/src/pipeline.ts:177-210,636-690` computes summary and
  references at remark time, then assigns headings/identities and validates
  adapter preservation at rehype time. `apps/site/src/lib/render-document.ts`
  compares X Core outline against Astro headings and rejects drift.
- `tooling/shared/markdown-html-policy.mjs:6-16,71-215` and
  `.trellis/spec/frontend/x-core-contract.md` define the author HTML boundary;
  `<audio>`, `<video>`, `<iframe>`, styles and event handlers are not available
  as unrestricted authored HTML. Existing generated Mermaid is added after
  sanitation by `apps/site/src/build/mermaid-markdown.mjs`.
- `apps/site/scripts/materialize-content.mjs:83-209,257-291,416-461` scans
  ordinary post/page Markdown, copies only `.md`, and atomically replaces the
  staging tree. The Memo collection alone invokes `copyMemoAssets`.
- `.trellis/spec/frontend/content-workspace-contract.md:375-435` supports
  link-owned logical identities, deterministic path collision rules,
  `O_NOFOLLOW` race checks and atomic promotion, while explicitly deferring
  `.fireflyignore` for attachments. The proposed media policy extends that
  deferred boundary; implementation must update its contract and tests rather
  than claim it exists today. Linked non-Markdown files are currently errors.
- `.trellis/spec/frontend/content-workspace-contract.md:534-561,1502-1559`
  owns the sanitized author-HTML vocabulary, independent content theme, native
  no-JavaScript behavior and route-local reading/search units. Read these ranges
  from the full contract before changing the corresponding layer; the full file
  exceeds native subagent context-injection limits.
- `apps/site/src/build/memo-assets.mjs` parses public HTML references, publishes
  exact referenced Memo bytes and has a dev middleware. It is evidence for an
  output-closure pattern, not evidence that posts/pages already publish assets.
- `apps/site/src/lib/content-access.mjs` projects drafts/private documents out
  of the guest view. Any new media output and dev endpoint must preserve the
  same guest boundary; staged bytes are not automatically public.
- `apps/site/tests/static-output.test.mjs:289-350` asserts the exact HTML,
  scripts and media inventories. `apps/site/src/components/TerminalHome.astro`
  and `TerminalStreamDocument.astro` also consume rendered documents as inert
  home templates; ordinary article pages are not the sole output consumer.
- `apps/site/src/scripts/document-navigator.ts:21-34,173-198` selects direct
  child reading units and thus currently skips paragraphs inside an added
  composition wrapper. Native inputs and links already have protection rules.
- `apps/site/package.json:31-45` already declares `yaml`, `rehype-raw`,
  `rehype-sanitize` and Astro Markdown. Parser dependencies must still be
  declared directly if a new module imports them.
- `apps/site/playwright.config.ts` and
  `.trellis/spec/trellis-plus/validation-profile.md` define desktop/mobile,
  interactive/static Chromium checks; Firefox is not a configured project.
  Docker daemon and the pinned renderer image were accessible with the
  execution boundary on 2026-10-30; no implementation test has been run.
