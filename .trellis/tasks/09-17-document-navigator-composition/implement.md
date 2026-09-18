# Composition and disabled document navigator mode — execution plan

## Dependency

Parent design is approved. This is the first child. Do not start B or D against
unaccepted rendering/lookup contracts; C may be planned independently but its
theme edits must integrate after this child because the content-root boundary
overlaps. Dependencies are written here because task-tree links are not a
dependency mechanism.

## Ordered checklist

- [x] Re-read current site config, presentation registry, document components,
      navigator status/runtime/styles, Terminal browser transport and their tests;
      record the exact changed-file set before editing.
- [x] Add strict optional `documentNavigation` parsing and immutable composition/
      navigator definitions with omission defaults and early diagnostics.
- [x] Thread one resolved capability into both document renderers; retain the
      current body/content/theme/outline/comments output for enabled and disabled
      results, with no presentation-specific navigator dispatch duplication.
- [x] Isolate navigator runtime/CSS/preload/import edges from general document and
      presentation assets. Build a minimal enabled/none fixture and inspect actual
      emitted HTML, chunks, styles and request paths before moving on.
- [x] Generate and decode the public canonical-document capability lookup; update
      destination decoration to use the destination capability, preserving query,
      same-origin checks and fragment-free pure effects.
- [x] Add resolver/config, static-output, asset-graph/request, lookup and X Core
      isolation regressions, including a test-only alternate navigator definition.
- [x] Run focused checks, then package/site build checks; leave browser lifecycle
      behavior to child B while proving disabled static reading and destination
      capability here.

## Validation commands

Use the repository wrapper and tracked content only. Completed evidence for this
child:

```text
./sam npm --prefix apps/site run check       # passed
./sam npm --prefix apps/site run test:content # passed
./sam npm --prefix apps/site run build       # passed
```

An isolated production build with a temporary repository-local configuration
setting both presentations to `none` produced readable post/page HTML with no
navigator DOM, navigator styles, or `DocumentNavigationStatus` script edge.
The temporary configuration was removed after inspection; no external content
was changed.

Use the exact project Playwright image/IPC for focused static output and request
checks only after a fresh build. Do not use host npm, `astro dev`, or source-text
assertions as asset evidence. Record unavailable Docker/browser prerequisites.

## Risk and rollback points

1. Resolver/config tests must pass before renderer edits.
2. The minimal build must prove asset isolation before browser transport edits.
3. Lookup tests must pass before changing Terminal destination decoration.
4. If the design cannot isolate navigator CSS/runtime assets without weakening
   disabled-page guarantees, stop and revise the loading boundary; do not relax
   acceptance or add a compatibility path.
