# M5.1 Static Comment Consumer — Design

Add one site-owned build-time comments module. It reads a repository-relative
export path configured for the build, validates the versioned envelope and
post-route catalog, then passes immutable post-scoped data to a shared
`CommentSection.astro`. The component is composed by
`SemanticDocument.astro` and `TerminalDocument.astro` after article content;
it is not placed inside the Terminal reader region and is never imported by
`TerminalStreamDocument.astro`.

The public write origin is build-time configuration only. The form uses a
native POST action and exposes no JavaScript loader, read endpoint, live count,
or database-shaped data attribute. Plain text is emitted as text nodes with
line breaks preserved by CSS; homepage values are validated HTTPS anchors with
the existing safe link policy.

The module must reject unknown/private export fields, stale/non-post routes,
duplicate IDs, nested/missing parents, unsafe text/URLs, invalid dates, and
records whose parent is not an approved exported top-level comment. A missing
or empty export is a valid empty read model; malformed non-empty input fails
the build before HTML is emitted.
