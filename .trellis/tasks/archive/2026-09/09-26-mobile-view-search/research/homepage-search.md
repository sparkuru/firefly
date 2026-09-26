# Homepage search evidence

## Confirmed product scope

The owner wants site-wide article search from the mobile homepage because the article list is too long to locate an article quickly. The owner explicitly answered that body matching is included. The previous idea of current-article text finding was rejected and is outside this task.

## Relevant code boundaries

- `apps/site/src/pages/index.astro:18` obtains guest-projected canonical documents. It maps posts/pages to Terminal entry metadata and renders every public document into the homepage.
- `apps/site/src/lib/content.ts:218` projects collected entries for the guest principal and sorts public virtual paths. `apps/site/src/lib/content-access.mjs:3` excludes drafts and non-guest private entries; this projection must remain authoritative.
- `apps/site/src/components/TerminalHome.astro:192` starts the recovery/native browse surface. Posts, pages, experiments, and friends occupy separate groups. Public article metadata already includes title/path/date/href; description/tags are available from the entry but not serialized for the existing Terminal entry decoder.
- `apps/site/src/lib/content-schema.mjs:70` defines description and `:74` defines optional tags. These do not require schema changes.
- `apps/site/src/components/TerminalStreamDocument.astro:48` contains the scoped rendered prose inside the inert public templates. Browser search must exclude generated actions/header labels from body extraction.
- `apps/site/src/scripts/terminal-home.ts:365` normalizes prose lines for Terminal. `:429` gathers metadata, title, and overlapping prose block selections. Reusing the rendered templates is appropriate; directly using these lines as a precise body projection would include extra content and duplicate nested blocks.
- `apps/site/src/scripts/terminal-home.ts:1499` hides the native fallback after successful boot. A form placed only inside that fallback would disappear. A sibling search section has an independent lifecycle.
- `apps/site/src/scripts/terminal-home.ts:87` defines protected typing targets including native inputs/buttons/anchors and searchbox roles. Browser tests must nevertheless exercise command shortcuts while the search input is active.
- `apps/site/src/lib/document-navigation.ts:16` owns the touch-primary/no-hover media constant. Reuse it for consistent mobile eligibility, without changing document navigator availability.
- `apps/site/src/styles/terminal.css:200` owns homepage geometry; `:1207` owns narrow responsive rules. New styles use existing tokens and must work for landscape touch eligibility independent of width.
- `apps/site/playwright.config.ts:28` uses explicit per-project `testMatch` expressions. A new `home-search.spec.ts` must be registered for the required interactive/static projects or tests can silently run zero cases.

## Planning limits

No product code, package lockfile, authored content, or build output was modified for this evidence. No product tests or performance measurements have run yet. Existing templates make a local full-text search feasible, but extraction cost and software-keyboard layout remain implementation validation items.

The content-workspace spec exceeds the default context-injection size. Implement/check agents must read its relevant Terminal public projection, homepage input/lifecycle, and mobile navigation sections directly if injected content is truncated. Do not treat truncation as permission to infer a missing contract.
