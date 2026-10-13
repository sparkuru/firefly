# Format metadata for existing Markdown

## Goal

Let the owner run `python3 content/add.py format /path/to/blog/posts/category/article.md` to add suitable Firefly metadata to an existing Markdown file automatically.

## Background

- `content/add.py` and the owner-maintained external copy are identical at task creation; neither exposes existing-file metadata normalization.
- `apps/site/scripts/blog-meta.mjs` already infers metadata, validates post/page schemas, preserves body bytes and existing authored fields, and provides atomic explicit write-back.
- The requested example is an empty Markdown file. Filename fallback must work without body content.
- The owner explicitly requested task creation and implementation, prioritizing the repository entry point.
- The owner subsequently selected the `format PATH` subcommand as the public interface.

## Requirements

1. Add `format PATH` to the repository `content/add.py`. Accept absolute paths and caller-relative paths to one Markdown file, including an external blog workspace. Replace the unreleased `--meta` option without a compatibility alias.
2. Run automatically without menu, metadata questions, editor invocation, or first-time configuration prompts. Honor existing optional dotenv/root configuration and actionable configuration errors.
3. Reuse the existing metadata organizer: infer title from H1 or filename, description from the first eligible body line or title, and date from today's UTC date. Preserve existing metadata; missing draft status defaults to `true`. Keep the original body bytes and filesystem mode.
4. Normalize one YAML front-matter block in place. Repeating the command must not duplicate front matter or overwrite valid authored values.
5. Infer posts/pages for a recognized workspace path. Add `format PATH --preview`, emitting the candidate without changing the source.
6. Reject incompatible creation/setup options, invalid/symlink sources and malformed metadata with a nonzero exit status and no file changes. Existing post/memo/init behavior remains available.

## Acceptance Criteria

- AC1: On an empty synthetic `posts/security/privacy/01-darkweb.md`, `format PATH` writes schema-valid inferred metadata at the original path without stdin or an editor.
- AC2: A body-bearing Unicode/CRLF document retains exact body bytes; existing title/date/tags/access/license/theme values survive normalization and repeat invocation.
- AC3: Absolute external-workspace and caller-relative paths work; page paths receive page metadata and slug.
- AC4: `--preview` returns the same metadata shape without writing or creating configuration.
- AC5: Missing/non-Markdown/symlink/malformed sources and incompatible arguments fail without mutation. Normal help, post/memo parsers and init remain compatible; `--meta` is no longer accepted, and `format` help documents its positional path and preview.
- AC6: Focused CLI checks, Python lint/syntax checks and the existing metadata-organizer regression suite pass, or any unavailable prerequisite is explicitly recorded.

## Out of Scope

- Editing or synchronizing the external copy of `add.py`, or modifying the owner's original Markdown example.
- AI-generated summaries/tags, network calls, new schema fields, bulk rewriting, deployment and publication.
- Git commit/archive without a separate owner instruction.

## Validation Boundary

Use temporary synthetic workspaces under `/tmp` for CLI fixtures. Host execution is appropriate for the documented authoring entry point; Node package regression checks run through `./sam`. No browser or full publication build is required for this CLI-only adapter.
