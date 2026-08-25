# Add `find` command for article discovery

## Goal

Let visitors discover public posts and pages from the terminal prompt without
having to know the content directory layout or use line-oriented body search.
The command complements `ls` (browse a known virtual directory) and `grep`
(search document text).

## Confirmed Repository Facts

- The neutral terminal command registry is the source of truth for built-in
  commands; new commands belong in `presentations/terminal/src/commands/` and
  `commands/registry.ts`.
- `TerminalEntry`/`PublicDocument` already expose the MVP search fields:
  virtual/relative path, filename, title, and publication date. Public
  documents are Markdown documents, so a collection/type filter is not needed
  for this command.
- `grep` already searches public document text and supports safe regular
  expressions, fixed strings, case folding, and pipelines. `find` must not
  duplicate that line-oriented behavior.
- The command runs against the read-only public virtual filesystem and must not
  access the host filesystem, private content, experiments, or session scratch
  files.

## Requirements

1. Add an Explore command named `find` with usage equivalent to:

   ```text
   find [--path <directory>] [--after YYYY-MM-DD] [--before YYYY-MM-DD] <keyword>
   ```

2. With a positional `keyword`, perform a case-insensitive substring match
   against the user-visible Markdown filename (`filename`), not the document
   title or body. The default search is global across public posts and pages
   and is independent of the current working directory.

3. `--path <directory>` restricts the search to public documents recursively
   below one safe virtual directory. It accepts the same public virtual path
   forms as other read-only terminal commands, including a cwd-relative path
   and a `~/blog`-absolute path. A document operand, private path, experiment,
   scratch path, unsafe path, or unknown directory is rejected.

4. `--after YYYY-MM-DD` and `--before YYYY-MM-DD` filter publication dates
   inclusively. Dates must use the canonical calendar form; invalid dates and
   an `after` date later than `before` are rejected.

5. The keyword is required. Unknown options, too many operands, empty search
   values, and malformed filter values fail safely
   without scanning outside the public virtual filesystem.

6. `find -h` and `find --help` print a self-contained help block containing
   the usage line, a concise filename-search summary, and the meanings of
   `--path`, `--after`, and `--before`. Help does not require a keyword. The
   main `help` command lists `find` with the same usage and summary metadata.

7. Results are deterministic and use the existing document listing format:

   ```text
   <display path> — <date> — <title>
   ```

   Matching documents are returned in canonical virtual-path order and remain
   plain text for pipelines and redirects. Zero matches produce no result rows
   and a clear no-results announcement.

8. Add unit/integration coverage for filename matching, recursive path
   restriction, inclusive date filters, combined filters, case-insensitivity,
   deterministic output, zero results, invalid options/values, command help,
   main help registration, and pipeline text behavior.

## Out of Scope

- Full-text body search (use `grep`).
- Title, body, description, tags, aliases, or other front-matter search. The
  MVP keyword targets only the visible filename.
- Experiment or scratch-file discovery.
- Fuzzy ranking, relevance scoring, pagination, result sorting options, type
  filters, or browser-specific UI changes beyond the existing terminal command
  output path.

## Acceptance Criteria

- [x] `find` is registered in the neutral Explore command registry with safe
      metadata and a validated argument parser.
- [x] `find <keyword>` discovers public posts/pages by case-insensitive visible
      filename substring.
- [x] `--path`, `--after`, and `--before` behave as specified and may be
      combined with the keyword.
- [x] `find -h`/`find --help` prints useful command-specific guidance, and
      `help` lists the command with matching metadata.
- [x] Invalid syntax and filter values return bounded usage-oriented errors;
      no private, experiment, or scratch data is exposed.
- [x] Results are deterministic, use the existing document row format, and
      remain usable as text in a pipeline or redirect.
- [x] Help output and focused terminal tests cover the new command and all
      acceptance-critical edge cases.
- [x] The Terminal package check, test, and build commands pass.

## Planning Status

This is a lightweight, single-package command extension. `prd.md` is the
complete planning artifact; no separate `design.md` or `implement.md` is
required before activation.
