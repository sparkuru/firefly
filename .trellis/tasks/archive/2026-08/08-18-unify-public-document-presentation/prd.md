# Unify public document presentation

## Goal

Give every currently published public document the same Terminal reading
theme, so navigating from the Terminal home to a document does not switch the
site into a second visual system. Preserve the existing document content,
canonical routes, semantic HTML, and no-JavaScript fallback.

## Confirmed facts

- The site dispatches canonical documents through
  `apps/site/src/components/DocumentPresentation.astro` according to the
  validated X Core `presentation` metadata.
- The current public corpus has two semantic documents:
  `content/pages/about.md` and `content/posts/hello-static-foundation.md`.
  The two remaining public posts already use `presentation: terminal`.
- Terminal documents already provide the desired shared shell, JetBrains Mono
  typography, breadcrumbs, reader status, canonical links, and static HTML.
- The semantic presentation package and generic X Core adapter contract are
  independently tested and are not required to be removed for this corpus
  migration.
- The unrelated `08-18-shell-intuitive-document-paths` task has uncommitted
  changes in the worktree; this task must not alter or stage those files.

## Requirements

1. All four currently published public documents use the Terminal presentation
   on their canonical routes: `/pages/about/`,
   `/posts/hello-static-foundation/`, `/posts/characters/nahida/`, and
   `/posts/llm-workflow-with-trellis/`.
2. The unified routes render the Terminal shell and document structure,
   including the shared theme root, title bar, document breadcrumb, reader
   status, and Terminal prose styles. No canonical public document route may
   load the semantic stylesheet instead.
3. Existing document meaning and behavior remain intact: headings, outline
   links, canonical URLs, external links, reader movement/search/exit, and
   JavaScript-disabled readable HTML continue to work.
4. `#terminal-reader` remains a valid reader-entry fragment. It may activate
   reader focus, but it must not select a second visual presentation.
5. Do not remove the generic semantic adapter, alter the shell-path task, add a
   client router, add external fonts, or introduce a new visual design system.

## Acceptance Criteria

- [x] Every current public document route exposes `.terminal-root` and
      `.terminal-document`; `/pages/about/` and
      `/posts/hello-static-foundation/` no longer expose `.semantic-document`.
- [x] Static output proves all four document routes use Terminal styles and
      the existing reader bundle, while `/lab/` and the 404 route retain their
      semantic/static ownership.
- [x] JavaScript-disabled document pages remain readable and keep native
      navigation, headings, outlines, and canonical links.
- [x] Interactive browser tests cover the unified page routes in desktop and
      mobile projects, including the `#terminal-reader` entry behavior.
- [x] Content and site checks/builds plus focused and full Playwright suites
      pass through `./sam`; `git diff --check` is clean.

## Out of scope

- Removing or redesigning `presentations/semantic/` or the generic X Core
  presentation registry.
- Changing the Terminal color tokens, fonts, command behavior, or shell-path
  resolution.
- Rewriting document prose, route URLs, canonical links, or Markdown content.
