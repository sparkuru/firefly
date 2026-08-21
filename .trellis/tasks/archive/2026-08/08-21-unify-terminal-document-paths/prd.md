# Unify Terminal document paths and remove duplicate source line

## Goal

Make the Terminal presentation use one coherent path model for visitors and
remove the duplicate source-path line from document pages. A document page
must expose its terminal path as `~/blog/...` once, while preserving the
internal VFS and canonical web URL contracts.

## Requirements

- R1 — Visible Terminal paths use the configured shell root. Document and
  directory title-bar paths must begin with `~/blog/`; the document example is
  `~/blog/posts/infra/cloudflare-web-service.md`. Do not construct these paths
  as `~/${virtualPath}`.
- R2 — Keep path namespaces distinct. Internal VFS values remain slash-rooted,
  such as `/posts/infra/cloudflare-web-service.md`; canonical post URLs remain
  web routes such as `/posts/infra/cloudflare-web-service/` (with the existing
  trailing-slash route contract). No global replacement of `/posts/...` is
  allowed.
- R3 — A Terminal document renders its source path only once. Remove the
  duplicate body `.terminal-path` line and retain the document title/header
  presentation; existing document content, outline, reader behavior, and
  metadata are otherwise unchanged.
- R4 — Update focused static-output and browser assertions, plus the affected
  frontend contract wording, so the new visible path and single-path rule are
  executable and future regressions are caught.

## Acceptance Criteria

- [ ] A Terminal document title bar displays
      `~/blog/posts/<relative-file>.md`, never `~/posts/<relative-file>.md`.
- [ ] A Terminal document has no `.terminal-path` body element and still
      renders its title, existing date metadata, outline, reader, and content.
- [ ] Internal VFS paths remain `/posts/...` and `/pages/...`; canonical web
      links remain `/posts/.../` and `/pages/.../`.
- [ ] Directory Terminal title bars also use `~/blog/<virtual-directory>`.
- [ ] Focused site type-check, static-output tests, and relevant Playwright
      coverage pass without modifying unrelated worktree changes.

## Out of Scope

- Changing command resolver semantics, internal VFS keys, browser route shapes,
  article Markdown, or the comments/publication pipeline.
- Removing ordinary document metadata such as publication date; “只保留标题”
  is interpreted as removing the redundant path marker from the title area,
  while the existing metadata/content contract remains intact.

## Confirmed Evidence

- `apps/site/src/components/DocumentPresentation.astro` currently passes
  `~/${canonical.virtualPath}` to the title bar, which omits `blog`.
- `apps/site/src/components/TerminalDocument.astro` currently renders
  `/${canonical.virtualPath}` in the body, duplicating the title-bar identity
  and exposing the internal VFS form.
- `presentations/terminal/src/vfs/paths.ts` and the frontend workspace contract
  define `/` as the internal VFS root and `~/blog` as the sole user-visible
  absolute shell root.

## Open Questions

None for the scoped implementation. The attached screenshot's “Image #1” is
treated as a reference to the visible body path marker; the article source has
no image reference to remove.
