# Converge publication route and fixture alignment

## Goal

Make publication assembly and its representative tests agree on the canonical
nested post route already used by the site, while preserving path-safety and
inventory protections.

## Requirements

- Replace stale active fixture/probe references to `/posts/main/379/` with
  `/posts/ai/llm-workflow-with-trellis/` where they describe the current
  representative article.
- Keep the public comments fixture route valid against the site output.
- Allow authored post documents with deeper directory nesting while retaining
  the existing page shape and unsafe-reference checks.
- Keep publication tests and runtime probes representative of the actual
  canonical route; do not rewrite article content or change Terminal behavior.

## Acceptance Criteria

- [x] The active comments fixture and publication/runtime probes reference the
      canonical nested route.
- [x] `tooling/assemble-publication` type check and tests pass.
- [x] The route-depth assembler regression passes for both ordinary and deeper
      authored post paths.
- [x] `npm run test:content:site` passes under Node `>=22.13.0`.
- [x] The assembled-publication browser test passes when the local browser
      runtime is available, or the unavailable environment is recorded.
- [x] No active runtime/test surface retains the stale representative route;
      historical archived task evidence may remain unchanged.

## Out of scope

- Moving authored content or changing canonical URL policy.
- Changing comments export schema or service behavior.
- Unrelated Terminal UI/keyboard/path interaction changes.
