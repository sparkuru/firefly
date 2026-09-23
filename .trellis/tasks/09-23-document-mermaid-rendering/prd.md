# Render Mermaid diagrams in shared document output

## Goal and scope

Own parent R3/AC5 and contribute AC1/AC6: valid Mermaid fences become readable
diagrams in canonical documents and inline cat output, with accessible source.
The baseline showed a real flowchart displayed as several screens of raw code
(parent research/baseline.md; apps/site/astro.config.mjs:30).

In scope: site-owned build rendering, packaged diagram assets, source disclosure,
fallback diagnostics, repeated output and both presentation adapters.
Out of scope: remote rendering, browser Mermaid execution, editable diagrams,
external icons/resources, author click callbacks and a generalized plugin system.

The owner approved implementation. The renderer/runtime probe resolved dependency
selection and deterministic page isolation (see design.md). Asset lifecycle,
publication closure and real-source visual acceptance are verified in the parent
research/validation.md. A provides the approved inline layout.

## Requirements and acceptance

- [x] B-AC1: valid flowchart and sequence fixtures render as diagrams with useful
      accessible names; the real sampled flowchart is visually reviewed.
- [x] B-AC2: source is available through native disclosure; invalid/unsupported
      source stays readable with a concise message and a route-scoped diagnostic.
      It cannot make other documents disappear.
- [x] B-AC3: the same built result serves canonical output and cat templates.
      Canonical pages work without JS; repeated cat never causes broken markers,
      duplicate document IDs or cross-instance control targets.
- [x] B-AC4: large diagrams offer fit-to-column preview plus a native full-size
      view; they never cause page overflow. Source uses local code scrolling.
- [x] B-AC5: no Mermaid browser bundle, external rendering request or owner source
      upload; input cannot override the renderer's constrained execution policy.
- [x] B-AC6: identical content/config/version yields stable artifact references;
      clean and warm builds work and all assets survive assembled publication.
- [x] B-AC7: missing renderer/browser is an actionable build error, distinct from
      malformed diagram fallback; existing Markdown sanitizer/heading/ID
      invariants remain intact. Document the container/dependency requirements.
