# Firefly display blocks: technical design

Status: approved for implementation by the owner on 2026-10-30. The task is
in progress; final validation and submission evidence are recorded in research/validation.md.

## Outcome and boundaries

One site-owned Markdown extension consumes fenced `firefly` blocks at build time.
It renders the PRD's five types (`image`, `link`, `video`, `audio`, and
`composition`) in public posts and pages. The source remains portable Markdown;
the browser does not parse YAML or Markdown. Existing presentation adapters,
themes, access projection, X Core metadata shape, and raw-HTML sanitation retain
their ownership. The feature is one coordinated delivery: parser, media
publication, rendering, and reader integration are mutually dependent, so it is
kept in one task rather than creating independently incomplete child tasks.

## Author contract

Parse fence content as YAML using the existing `yaml` dependency. Accept exactly
the fields demonstrated in `prd.md`, with unknown keys, duplicate keys,
incorrect types, missing required fields, and unknown enum values diagnosed with
the virtual document path and fence position. Do not include host paths in
diagnostics. The block must be a plain mapping; alias expansion and nesting must
be bounded. Treat text values as data, never executable markup or code.

| `type` | Required | Optional | Meaning |
| --- | --- | --- | --- |
| `image` | `src` | `alt`, `caption` | Image/GIF with optional textual alternative and visible caption. |
| `link` | `url` | `title`, `description` | Native HTTP(S) anchor, with URL as visible label if title is absent. No network metadata fetch. |
| `video`, `audio` | `src` | `caption` | Native media control and separate visible resource link; no autoplay. |
| `composition` | `layout`, `media`, `content` | — | `layout` is `image-left`, `image-right`, or `image-top`; `media` is the same image declaration and `content` is Markdown. |

`src` may name a supported document-relative local asset, a safe site-root
asset, or an HTTP(S) resource. Links and media are never inferred from URL
extensions or fetched during the build. A platform page requires a future
explicit adapter. Maintain the existing safe URL policy and reject unsafe or
malformed inputs; do not grant raw-authored HTML access to media controls or
iframe elements.

An omitted `alt` renders an empty alternative; the author guide should
recommend meaningful alternatives for informative images. An explicit empty
`alt` denotes a decorative image. A caption remains separate from `alt`.

## Parsing and rendering pipeline

1. A site-owned remark stage recognizes only actual `firefly` fenced code
   nodes in posts/pages, validates the YAML and expands its semantic contents
   **before** `xCorePlugins.remarkPlugin`. A Firefly-looking string inside a
   different code fence, inline code or raw authored HTML is not an extension.
2. Parse `composition.content` with the same Markdown/GFM behavior as normal
   article prose, preserving headings, paragraph structure, links and image
   references in source order. Integrate the resulting nodes into the main tree
   so X Core summary/references and Astro heading collection see real content,
   not YAML field names. Reject nested Firefly blocks; do not run arbitrary
   recursive pipelines or special-case away heading/identity validation.
3. Preserve a per-document trusted record of the validated block declaration.
   Any intermediate marker used to survive `rehypeRaw` and the sanitizer must
   be bound to that record, consumed exactly once, impossible to forge using raw
   authored HTML, and absent from final output. A safe internal marker with an
   unguessable per-render token is an acceptable mechanism; it is removed before
   output, so rendered content remains deterministic. Do not trust CSS classes
   or data attributes supplied by authors as proof that a node is generated.
4. Run the existing `rehypeRaw` and `rehype-sanitize` boundary. A trusted site
   stage upgrades only authenticated records into HAST for figures, anchors,
   native media and layout containers **before** the X Core rehype pass. Safe
   text and attributes are constructed as nodes, not HTML string interpolation.
   Preserve the existing authored-HTML restrictions and final raw-HAST guard.
5. Exclude any remaining internal marker language from Shiki, and keep Mermaid
   source handling unchanged. X Core then assigns identities/outlines and the
   existing adapter transforms the resulting tree. Astro's heading collector
   runs after site rehype plugins; assert that its headings match X Core's,
   including duplicate headings inside/outside combinations.

Exact module names are implementation details; a site-owned pair of remark and
rehype plugins under `apps/site/src/build/` is the intended seam. The generated
semantic nodes must preserve safe authored Markdown links and participate in
existing search and outline consumers. Audit X Core reference semantics for
image/link/media nodes and keep metadata version/shape unchanged unless a
separately reviewed spec change is actually necessary.

## Document-relative resource publication

Posts/pages currently stage only `.md` files; Memo's asset pipeline is not a
generic article-asset implementation. Add an article-media path rather than
assuming `./assets/...` will work after a slug or route changes.

- Resolve a relative source against the authored document's **logical workspace
  location**, not the public route, the staging directory, or a host path
  exported to the page. Preserve the content scanner's documented support for
  linked document/directories; determine asset ownership from the same virtual
  workspace. The current `.fireflyignore` contract explicitly defers
  attachments; this feature extends the policy to newly supported media and
  must update its spec. A public block referring to an ignored asset receives a
  clear build diagnostic instead of silently publishing it.
- Extend materialization with a shared parser/reference collector so YAML
  references are discoverable without regexing Markdown and cannot diverge from
  rendering. Reuse contained regular-file checks where applicable; reject unsafe
  paths, non-regular resources and escaping the permitted workspace. Stage only
  referenced supported assets in the candidate staging tree. Candidate staging
  and rollback remain atomic and source byte provenance remains unchanged.
- Give local media a deterministic content-addressed public URL in a dedicated
  site-owned namespace, for example `/firefly-media/<sha256>.<extension>`.
  Validate collisions, supported MIME types and path encoding; keep names and
  host paths out of public identifiers. Reuse a streaming copy/hash approach
  for large audio/video where possible.
- As with the existing Memo/diagram publication patterns, emit only assets
  referenced by **guest-visible generated HTML**, including inert Terminal-home
  templates. The static output inventory must prove exact correspondence and
  byte identity, not simply accept every file under the namespace. Draft,
  private, ignored, unreferenced and withdrawn sources must not leak into the
  public release, including warm rebuilds.
- The development server must apply an equivalent guest-visible reference
  allowlist; knowledge of a staged asset URL must not expose private bytes. Its
  MIME responses and failure behavior must match the static result. Verify
  nested paths, source links, filenames with supported Unicode, duplicate
  resources, moved/renamed documents and both selected external and tracked
  content roots.
- Remote HTTPS/HTTP sources remain browser references. Do not download remote
  assets or request metadata at build time. When local intrinsic dimensions are
  safely available, reserve width/height; avoid fetching remote dimensions.
  Sizing/transcoding infrastructure is not required for this feature.

## Layout, reading and accessibility

Generate an inert composition wrapper with a figure followed by parsed prose.
Apply site-owned styles to the ordinary article root and Terminal inline stream:

- `image-left`/`image-right`: float the figure within a bounded formatting
  context so prose wraps beside it, then returns to full width below it.
- `image-top`: centered figure followed by full-width prose.
- On narrow screens: disable the float and use image then text. Images keep
  aspect ratio and never force page overflow. No reader-authored width is needed.
- Preserve distinct alt text and figcaption, native anchors, visible media
  fallback links, keyboard-accessible controls and no-JavaScript reading.

Update document-navigation unit selection narrowly for nested composition
content while retaining order and avoiding duplicate units. Preserve native
controls and links as protected targets. Confirm home search, outline, source
text, inline `cat`, and terminal-stream rendering against their existing
contracts, not just the canonical document page. `firefly/semantic` and
`default/paper` are independent dimensions.

## Errors, compatibility and rollback

Malformed Firefly declarations fail the build with a diagnostic identifying the
virtual document, block ordinal/location and field. A remote resource being
offline is a runtime concern and does not make a valid declaration invalid.
Normal code, Mermaid, ordinary Markdown and existing authored HTML retain their
previous behavior. Remove or disable the site-owned pipeline integration and
asset emission to roll back the feature; original Markdown remains intact and
then displays the declarations as ordinary code fences. Do not silently relax
the public inventory, sanitizer, identity or route constraints to pass checks.

## Validation evidence and limitation

Implement focused parser, publication, navigation, static-output and browser
fixtures, followed by the repository's wrapped full gate. Cover the PRD's 13
acceptance criteria, no-JS reading, four presentation/theme combinations,
desktop/mobile, stable headings/IDs, drafts, private files, ignored assets,
warm rebuild withdrawal, and media failure. Browser fixture files must be
included by the actual Playwright project selectors.

The maintained project profile provides Chromium only. The PRD also requests a
Firefox visual/scroll check; use a compatible controlled Firefox environment if
available, and record an explicit limitation if it is not. A system `firefox`
executable existing on the host does not by itself establish a valid wrapped
browser test. Docker daemon access and the pinned renderer image were verified
through the approved execution boundary on 2026-10-30; no feature tests have
yet run.
