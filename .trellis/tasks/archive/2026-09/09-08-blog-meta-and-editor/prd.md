# Blog metadata listing and Markdown editor

## Goal

Make Firefly consume the configured external blog as ordinary Markdown while
using document metadata as the primary human-facing identity. Add a safe CLI
for preparing or updating Markdown front matter so a document remains valid
and useful outside Firefly as well.

The user-facing result is that a directory listing shows an article title from
its Markdown metadata when available, falls back to the file name when it is
not, and does not expose an ordering-only `index-*` prefix when a metadata
title is available. The canonical article route may continue to use the
physical Markdown path and its `index-*` stem.

## Confirmed repository facts

- `FIREFLY_CONTENT_ROOT` denotes a readable blog root containing `posts/` and
  `pages/`; the materializer copies ordinary Markdown into an ignored generated
  stage before Astro reads it.
- The inspected external blog root currently contains 154 Markdown files: 141
  with YAML front matter and 13 zero-byte files. No physical `index-*.md` file
  currently exists in the inspected tree, so the prefix rule must be
  future-compatible rather than based on an existing fixture. Tests will add a
  non-empty no-frontmatter fixture for the requested fallback behavior.
- Firefly currently requires `title`, `date`, `description`, `draft`, and
  collection-specific `layout` metadata, derives post routes from the staged
  path plus optional `slug`, and renders directory file labels from
  `entry.data.title`.
- There is no existing article metadata editor CLI. The repository uses Node
  tooling and the site package already has YAML parsing available transitively;
  any new runtime dependency must be made explicit if the implementation uses
  it directly.

## Requirements

### R1 — Metadata-first document labels

- Directory listings use the document's non-empty metadata title when one is
  present.
- A document with absent or empty metadata remains listable/readable when it is
  a valid non-empty Markdown file; its displayed label falls back to the
  physical file name without the `.md` suffix.
- An ordering prefix matching the agreed `index-*` convention is not shown as
  the human-facing directory label when a non-empty metadata title is present;
  the canonical route may retain the physical path/stem so existing links
  remain stable.
- When metadata is absent/empty, the fallback is the physical filename stem,
  including any ordering prefix. No special prefix-stripping rule is added.
- The same canonical document model supplies route identity and directory
  labels; private, draft, empty, unsafe, and colliding inputs must not leak into
  the public tree.

### R2 — Markdown editor/metadata organizer

- Accept an explicit `/path/to/file.md` input and inspect or organize its YAML
  front matter without requiring the source to already be inside the blog.
- Support writing the normalized document back to the source and saving a new
  copy; saving a new copy is the default and must not silently overwrite the
  source.
- Resolve sensible defaults from the configured Firefly blog root and existing
  document conventions, while allowing explicit CLI overrides for fields that
  affect publication or routing.
- When saving a new copy, write it below the configured blog root using the
  agreed collection/category/path policy and report the exact output path.
- Emit standards-compliant YAML front matter delimited by Markdown document
  boundaries. The resulting file must render as ordinary Markdown outside
  Firefly and must satisfy Firefly's schema when its required publication data
  is available.
- Preserve the authored Markdown body, code fences, links, Unicode, and
  unrelated front-matter values unless the user explicitly requests a change.

### R3 — Compatibility and safety

- Existing slugs, routes, pages, posts, access controls, draft filtering,
  markers, and presentation selection remain compatible unless changed by the
  new metadata fallback contract.
- Path arguments and output destinations are validated; the script must not
  write outside the selected blog root in save-as mode or follow unsafe source
  links silently.
- Default behavior and examples are documented at the repository's supported
  command boundary.

## Acceptance Criteria

- [x] A metadata-bearing post displays its metadata title in every relevant
      directory listing, even when its physical file name is an ordering key.
- [x] A non-empty Markdown file with no front matter is rendered with the
      agreed fallback contract (`draft: false`, source mtime as a UTC date);
      its directory label is its file name, not an invented title.
- [x] A physical `index-*.md` path keeps a stable route while a non-empty
      metadata title is used as the directory's human-facing label.
- [x] Existing external-blog metadata builds without regressions in route,
      visibility, page/post separation, or static output safety.
- [x] The CLI accepts a Markdown path, has explicit write-back and save-as
      modes, defaults to save-as, derives documented defaults from the Firefly
      blog root, and reports the output path.
- [x] CLI output is valid standalone Markdown/YAML and Firefly-compatible for
      the selected collection; the Markdown body is byte-for-byte preserved
      apart from the deliberate front-matter rewrite.
- [x] Tests cover metadata title selection, missing/empty metadata fallback,
      `index-*` display-vs-route behavior, YAML/body preservation, save-as
      containment, and write-back opt-in behavior.
- [x] Relevant site checks, content tests, CLI tests, and `git diff --check`
      pass.

## Resolved save-as and label decisions

- For a source file outside the configured blog root, default save-as writes to
  `<blog-root>/<collection>/<category?>/<slug>.md`; collection defaults to
  `posts`, category is optional, and the filename derives from the normalized
  slug unless explicitly supplied. A source already inside the blog preserves
  its relative directory/filename for destination inference, but an equal
  source/destination is rejected; the caller must choose write-back or an
  explicit output path.
- The blog root is selected by an explicit CLI option or the configured
  Firefly content-root convention, with the repository fixture as the safe
  fallback. Save-as never writes outside that root and never overwrites unless
  an explicit override is supplied.
- No special `index-` stripping rule is added. A non-empty metadata title is
  the label; absent/empty metadata falls back to the physical filename stem,
  including any ordering prefix. Routes always retain the physical path/slug
  contract.

## Resolved fallback decision

For a non-empty Markdown file with no front matter, the build-time fallback
uses `draft: false` and the source file's modification time as the UTC date.
This satisfies the requested list/read behavior and gives the article a
natural date; the known trade-off is that the date can differ when the file is
copied between machines. The authoring CLI remains conservative by defaulting
newly organized documents to the current UTC date and `draft: true`.

## Out of scope

- Bulk rewriting or renaming of the owner's external blog during this task.
- Treating a zero-byte placeholder as a publishable article.
- Changing route ownership, access control, draft projection, presentation
  selection, or the existing batch-only scope of `tooling/format-content.sh`.
