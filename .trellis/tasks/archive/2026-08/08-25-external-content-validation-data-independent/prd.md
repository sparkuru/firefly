# Make external-content validation data-independent

## Goal

Make the site's validation usable with any schema-valid Markdown workspace while
keeping the repository's marker coverage meaningful. Make the formatter's
frontmatter-only scope explicit so a successful presence check is not confused
with a complete Astro build/test result.

## Confirmed facts

- `apps/site/tests/static-output.test.mjs:193-205` requires the optional
  `featured` marker on three hard-coded public surfaces.
- `apps/site/src/lib/content-schema.mjs:59-61` gives `firefly.markers` an empty
  default, so a valid content workspace may contain no marker at all.
- The tracked repository fixture contains a representative `featured` marker,
  while an external workspace may not.
- `tooling/format-content.sh:32-35` defaults to read-only `check` mode and scans
  both collections. `tooling/format-content.sh:245-260` skips zero-byte files
  and files whose first line is `---`; it reports only missing frontmatter.
- The formatter does not run Astro, inspect rendered marker output, or invent
  optional `firefly.markers` metadata. A clean result therefore means that no
  missing frontmatter repairs remain.

## Requirements

1. Keep the formatter's repair semantics unchanged: preserve existing
   frontmatter and bodies, skip zero-byte placeholders, require explicit
   `--write` for mutation, and do not synthesize optional presentation markers.
2. Clarify the formatter help/result wording so its frontmatter-presence scope
   and the separate project validation step are obvious.
3. Make the static marker-output test data-driven: a workspace with no
   `featured` marker must not fail solely because the optional marker is absent;
   when supported marker markup is present, its identifier and visible label
   must remain correct and unsupported marker output must remain rejected.
4. Preserve positive marker coverage for the repository fixture through the
   existing fixture behavior and marker unit tests.
5. Keep all durable task/project artifacts free of external workspace paths,
   private content, credentials, and one-off article identifiers.

## Acceptance Criteria

- [ ] The static output test passes with the repository fixture and with a
      schema-valid external workspace that contains no `featured` marker.
- [ ] The static output test still detects unsupported marker output and
      verifies `featured`/`Featured` whenever that marker is rendered.
- [ ] The formatter's default read-only invocation remains exit 0 when all
      non-empty entries already have frontmatter, and its output explains that
      this is not a full build/test validation.
- [ ] Existing formatter behavior remains idempotent and does not alter bodies,
      existing frontmatter, or zero-byte placeholders.
- [ ] `bash -n`, ShellCheck, shfmt, relevant content tests, Astro check, and the
      applicable static build/test command pass through `./sam`.
- [ ] No external path, private article content, or generated external content
      is added to the repository task or source files.

## Out of scope

- Adding `featured` markers to external content merely to satisfy a test.
- Changing the content schema, marker registry, publication visibility rules,
  route model, or unrelated site configuration.
- Making the shell formatter a YAML parser or a replacement for Astro's schema
  and static-output validation.

## Open questions

None. The recommended implementation is a narrow test contract correction plus
formatter scope clarification; no product or privacy decision remains.
