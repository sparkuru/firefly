# Shared diagram rendering proposal

## Resolved renderer decision (2026-09-23)

The owner approved implementation of the task tree. The local feasibility probe
rendered synthetic flowchart/sequence and the actual sampled workflow with
Mermaid 12.0.0 in Playwright 1.62.0 Chromium. All had no foreignObject. Separate
pages per render made both SVG bytes and identifiers deterministic; sharing one
page was rejected because sequence counters leaked between calls. Two renders
of each of three samples took 6.9 seconds total including startup; the real SVG
was about 107 KB. Warm builds will reuse a content-addressed cache.

Use pinned mermaid@12.0.0 and playwright-core@1.62.0 directly, not mermaid-cli or
a second Puppeteer installation. This is a candidate selection within the approved
static-rendering design. Limit input to 64 KiB and render duration to 15 seconds.
Run renderer-bearing commands through the existing Playwright Noble image; keep
sam's general Node default. A named ./render.sh wrapper selects that image/IPC
and delegates to ./sam. Use it for site check/build/dev and root publication
builds; dev.sh build/dev and package-runtime.sh delegate through it. verify.sh
already selects the same image. Push tooling changes only its local build call.

Cache SVGs under ignored site build storage. Publication emits only assets
referenced by public HTML, including inert templates; do not copy the whole cache.
Warm Astro content-cache hits must still resolve existing diagram files. Use
atomic file writes and content-addressed names for concurrent builds. Dev serves
the same immutable keys through its site integration. Integration checks now
verify lifecycle/asset closure and failure behavior before completion.

## Architecture

Use a site-owned build-time renderer, not a Terminal-only browser enhancement.
The shared Markdown processor detects Mermaid fences after authored HTML parsing
and sanitation but before X Core normalization/identity assignment. It emits
ordinary HAST figure/image/disclosure/source nodes, then runs the unchanged
X Core pipeline and selected adapter. Both routes and cat templates share this
result; no headings or stable identities are removed after normalization.

Generate same-origin static SVG files and reference them as images. SVG IDs stay
inside the image document, avoiding changes to terminal-home.ts:449 clone scoping
(which rewrites href/token references, not marker/style url references).
Use a content/config/renderer-version hash for the asset key and share render
promises across canonical/template processing. Emit assets through the build
integration and serve the same generated artifact mapping in supported dev mode.
Do not mutate source Markdown or publish source workspaces.

Present a bounded preview with a diagram caption/name, a native full-size asset
link and details/summary source disclosure. Keep source text exact. If a diagram
fails parsing/rendering within a bounded timeout/size limit, emit readable source
and a concise fallback message plus route-scoped build diagnostic. Missing
infrastructure is a build error, not a successful source-only downgrade.

## Renderer candidate and evidence

The official Mermaid CLI supports SVG and a Node API backed by a browser:
https://github.com/mermaid-js/mermaid-cli/blob/master/README.md
Mermaid documents strict security mode and configurable deterministic IDs:
https://mermaid.js.org/config/schema-docs/config-properties-securitylevel.html
https://mermaid.js.org/config/setup/mermaid/interfaces/MermaidConfig.html

Use the resolved Mermaid/Playwright pair above. The CLI was a research candidate;
no CLI or Puppeteer dependency is part of the implemented design.

Apply host-controlled strict configuration, disallow authored configuration
overrides/click callbacks and remote resources, and validate generated SVG before
publication. Prefer SVG text labels (no foreignObject) and verify multiline/CJK
labels against the real sample. SVG output must not contain executable content,
external references or unsafe URLs. This does not broaden the authored HTML schema.
No document source is sent to a service.

## Integration verification gates

The local probe resolved renderer compatibility, deterministic page isolation and
runtime selection. Implementation must additionally prove:

1. Actual shared processor output retains X Core headings and stable identities.
2. Warm Astro cached HTML resolves generated assets; publication copies exactly
   referenced public assets and dev serves the same content-addressed keys.
3. Input/timeout failures retain source; missing browser infrastructure reports
   the documented render.sh recovery instead of hiding a broken build.
4. Build:m3, build:m4, verification, packaging and dev use their documented entry
   points and the general sam default remains unchanged.
5. Full fixture/browser gates and the real-source visual matrix pass.

## Risks, alternatives and rollback

Inline SVG would require additional clone-reference/CSS scoping and a wider HTML
policy; isolated image assets avoid that coupling. Client Mermaid would increase
runtime cost and violate static/no-JS goals. Third-party rendering would introduce
source egress and availability dependencies. Neither is an automatic fallback.

Adding browser-backed build rendering increases environment weight. A can finish
independently while B is finalized; do not claim the parent complete without B.
Revert the diagram stage and its asset integration together to restore ordinary
source fences. Preserve all author source and existing sanitizer behavior.

## Full-size visual verification

A real long diagram exposed responsive SVG roots shrinking even the native
asset URL to the viewport. Generated assets now carry numeric intrinsic
dimensions from a validated viewBox, while page CSS bounds the overview.
Standalone browser checks compare actual SVG bounds with viewBox dimensions,
not merely an HTTP response or a link attribute.

Wide flowcharts also use their existing first-node fragment for native full-size
entry. This works with JavaScript disabled and preserves all original SVG IDs.
Other diagram families retain ordinary SVG URLs; no image viewer is introduced.
