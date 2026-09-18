# Composition and disabled document navigator mode — implementation design

## Boundary

This child owns the site configuration → composition resolver → document renderer
→ browser destination capability path. It does not own semantic mode transitions,
the theme-field migration, or command vocabulary. The resolver is the only place
where presentation and navigator definitions are composed; Astro components and
Terminal browser code consume its projections rather than inspecting presentation
IDs or raw configuration.

## Configuration and registry

Extend the existing strict site TOML decoder with an optional
`documentNavigation` table keyed by registered presentation ID:

```toml
[documentNavigation.semantic]
navigator = "none"
```

The parser validates TOML shape and safe strings. The site-owned composition
module validates registered presentation IDs, registered navigator IDs, the
`none` discriminator and the enabled profile. Omission resolves to the existing
firefly/`always` and semantic/`fragment` profiles. Enabled definitions own their
entry/exit policy and runtime/style assets; disabled results carry no profile or
asset handles. Registries are immutable and reject duplicate or identity-drifted
definitions. A test-only alternate definition proves consumers use the resolver
contract rather than a hard-coded `document-navigator` switch.

The adapter registry used by X Core remains a presentation concern. Composition
data is site-owned and is not added to `DocumentContext`, X Core metadata,
frontmatter, route identity, comments payloads or package command contracts.

## Rendering and assets

Resolve once for each canonical document. Pass the resolved enabled/disabled
capability through the shared document presentation boundary to Semantic and
Terminal renderers. Both variants keep the content root, current article-theme
attribute (until child C), body, headings, outline and comments integration.

The enabled branch renders the navigator region/status/entry and loads only the
resolved navigator assets. The disabled branch renders the ordinary content
wrapper with no navigator ID/data hooks, focus attributes, region label, status,
entry or handlers. Move navigator-only CSS out of shared `global.css` and
`terminal.css` into the capability-owned resource path while leaving body,
layout and content-theme styles available in the disabled branch. Verify the
actual production HTML, preload/import graph and browser request log; Astro dev
graph behavior is not sufficient evidence.

## Destination capability transport

At build time, project the same public canonical documents used by Terminal into a
frozen path → capability map. Generate it from the same resolver and config used
by document rendering. Serialize only canonical document paths and the enabled
or disabled capability needed by the browser; never include host paths, private or
unlisted entries, X Core metadata, or arbitrary module/style URLs.

The Terminal home controller decodes the strict map and, for a validated
same-origin canonical document navigation effect, appends exactly
`#document-navigator` only when the destination is enabled. It preserves path and
query, rejects unsafe/raw URLs, and falls back to the fragment-free canonical URL
when the map has no entry. The pure command effect remains fragment-free and
does not parse or infer capability from the source page.

## Failure and rollback

Configuration, registry and lookup mismatches fail before rendering/build
promotion. A missing lookup entry is a browser-safe ordinary canonical fallback;
build tests must still assert that every published Terminal document has an entry.
Removing the optional site table and rebuilding restores the prior enabled
defaults. No old fragment alias or compatibility resolver is permitted.
