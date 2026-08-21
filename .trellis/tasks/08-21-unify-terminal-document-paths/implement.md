# Implementation plan

1. Update document and nested-directory Terminal title-bar callers to use the
   `~/blog/` visible shell root.
2. Remove the redundant `.terminal-path` body marker while preserving the
   document title, date, outline, reader, and Markdown output.
3. Update static-output, route, and review/browser assertions for the single
   visible path contract; retain slash-rooted internal and web URL assertions.
4. Reconcile the affected frontend component/workspace contract wording with
   the new ownership boundary.
5. Run `git diff --check`, main-site type-check/build/static tests, and focused
   Terminal/document Playwright coverage through `./sam`.

## Rollback points

- The implementation is confined to site presentation, tests, and specs; a
  rollback can revert those files without touching content or runtime state.
- Preserve all pre-existing unrelated worktree changes and do not regenerate
  publication artifacts as part of this focused task.

## Validation record

- `git diff --check` passed.
- `bash -n sam`, `shellcheck sam`, and `shfmt --diff sam` passed.
- `./sam npm --prefix presentations/terminal run check` passed.
- `./sam npm --prefix presentations/terminal run test` passed: 29/29.
- `./sam npm --prefix apps/site run check` passed: 58 Astro files, 0 errors, 0 warnings, 0 hints.
- `./sam npm --prefix apps/site run test:content` passed: 36/36.
- `./sam npm --prefix apps/site run build` passed: 121 static pages built and static-output assertions passed 16/16.
- Focused static Playwright (`tests/site.spec.ts`) passed: 20/20.
- Focused Terminal Playwright (`tests/terminal.spec.ts`) passed: 70/70 across desktop and mobile interactive profiles.
- Focused Reader Playwright (`tests/reader.spec.ts`) passed: 36/36 across desktop and mobile interactive profiles.
- Full site Playwright passed: 126/126 across static, Terminal, and Reader profiles.
