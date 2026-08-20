# M5.1 Static Comment Consumer — Implementation Plan

1. Extend the strict site config with optional comments export/write-origin
   settings and add fixtures for empty/valid/private/invalid exports.
2. Implement the build-only decoder, route cross-check, deterministic grouping,
   and shared `CommentSection.astro` with native no-JavaScript form markup.
3. Compose the section in both canonical document presentations and add scoped
   semantic/Terminal CSS without entering the reader-region boundary.
4. Add content/static-output/browser tests covering both presentations and all
   exclusions.
5. Run site content/check/build and focused then full Playwright through `./sam`.

Rollback is removing the site consumer and using the empty-export path; no
service data or static runtime code may be made dynamic.

## Implementation evidence

Implemented under `apps/site/`: strict schema/digest decoding, canonical
post-route binding, build-time config/export loading, shared
`CommentSection.astro` and native `CommentForm.astro`, Semantic/Terminal
composition, and scoped styles. The disabled build remains empty; an enabled
fixture renders only canonical post comments/forms and keeps private fields
out of HTML.

Validation through `./sam`: focused decoder/config tests 10/10, site
content/static regression 35/35, Astro check, disabled build, and enabled
fixture build passed. The decoder rejects unknown/private fields, stale
routes, nested/cross-post parents, unsafe URLs/text, and digest mismatch.
