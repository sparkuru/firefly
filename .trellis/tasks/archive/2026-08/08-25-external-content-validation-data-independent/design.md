# Design: data-independent external-content validation

## Boundaries

- `tooling/format-content.sh` remains a low-dependency frontmatter presence and
  repair utility. It continues to derive its field registry from the project's
  content schema source and does not become a renderer or full YAML validator.
- `apps/site/tests/static-output.test.mjs` owns assertions about rendered HTML.
  It must use the active generated content as input rather than assuming that
  every workspace contains the repository's optional marker fixture.
- The tracked repository fixture remains the positive integration case; marker
  registry/schema tests remain the direct contract for marker resolution and
  unsupported-marker behavior.

## Data flow

1. The materializer stages the selected Markdown workspace.
2. Astro validates the staged entries and emits static routes.
3. The static-output test reads emitted HTML and checks only marker markup that
   is actually present on the selected canonical surfaces.
4. The formatter independently scans source files for missing frontmatter and
   reports that result without claiming build/test success.

## Test contract

The marker test will always reject unsupported marker output and will verify the
`featured` identifier/`Featured` label for every rendered occurrence. Positive
assertions remain active when the generated fixture exposes that marker; an
otherwise valid workspace with no marker has no badge to assert and must pass.
This avoids changing content semantics or making an external corpus carry a
repository-only fixture.

## Formatter messaging

Keep the existing default `check`/explicit `write` behavior. Add concise help
and/or success wording that distinguishes “no missing frontmatter” from the
separate Astro schema, rendered-output, and build-test gates. Do not add a
marker field to generated frontmatter.

## Compatibility and rollback

- The schema, materializer, route generation, and external workspace mount stay
  unchanged.
- The test remains strict for malformed/unsupported rendered marker markup and
  for the repository fixture's supported marker behavior.
- If the new test contract proves too permissive, revert only the test and
  messaging changes; no content repair rollback is required.
