# Scoped article preservation context

## Canonical source and loading

The canonical `.trellis/spec/frontend/content-workspace-contract.md` exceeds
the native context injection size limit. This original scoped note preserves
the relevant invariants in the task manifests rather than relying on silently
truncated injection. An integration implementer must also read the canonical
file's first scenario and any route/access section it actually changes,
in bounded chunks. This note is not a replacement editable project spec.

## Required invariants

- `FIREFLY_CONTENT_ROOT` selects the blog authoring workspace, with posts and
  pages as separate Markdown collections. Memo uses its own selected root and
  never scans/materializes that workspace during a Memo publish.
- The blog publishes the existing static guest projection. Hidden/draft/
  owner-only documents and author-local symlink targets do not become public
  solely because another feature is being published.
- Existing article URLs, canonical metadata, aliases, directory navigation,
  document/search projections and safe Markdown behavior stay compatible.
  Memo does not masquerade as a posts/pages collection or X Core document.
- A main-site Memo navigation entry is an external same-origin static route,
  not a reason to read Memo body/config/export or let an authored alias shadow
  the reserved Memo namespace.
- Memo output/history must live outside the blog assembler's root artifacts/
  dist promotion targets. Memo deployment must never sync the blog mirror or
  change its release pointer. Full blog deployment preserves the independent
  Memo pointer and publication history.
- Test both directions with the other source root unavailable, and compare
  complete non-Memo path/content inventories across routine Memo updates.

## Relevant source entrypoints

The integration worker owns any necessary bounded change to
`apps/site/src/lib/content.ts`, `site-config.mjs`, navigation and the full
assembler/preview wiring. Existing content materializer/guest-access and
Markdown tests remain article regression evidence. The independent publisher
does not import those application loaders. If a change reaches a different
article/access layer, load its actual canonical section before editing.
