# Memo contract implementation plan

## Ordered checklist

1. Load `trellis-before-dev` guidance for the plugin/config/frontend layers.
2. Add the memo manifest and declaration surfaces without changing comments.
3. Implement config activation/public/runtime decoding with disabled-safe
   defaults and repository-relative path validation.
4. Implement exact v1 export decoding, normalization, ordering, digest, and
   serialization helpers.
5. Add adversarial tests, including unknown/private keys and digest/tombstone
   failures.
6. Run focused contract tests, then the relevant repository type/check gate.
7. Review the diff for private values and confirm no site/service files were
   changed by this child.

## Validation commands

- `./sam node --test plugins/memos/tests/*.test.mjs`
- The repository's approved plugin/site check command from
  `.trellis/spec/frontend/development-runtime.md`.

## Before activation

- Text limits are owner-approved and the PRD convergence pass is complete.
- The owner approved the final planning summary; this child is `in_progress`.
- Load the curated `implement.jsonl` and `check.jsonl` manifests; both must
  resolve to existing spec/research files.
- Keep live site configuration and consumer registration in `memo-site`.
- Focused contract tests need no running application service or private data;
  the repository still requires the `./sam` container command boundary.

## Risk and rollback points

- The digest payload and exact-key decoder are compatibility boundaries. Change
  them only with a schema/version decision and synchronized consumer tests.
- Reuse validation patterns, not comments field names or route assumptions.
- If the contract is wrong, roll back this child before activating service/site
  consumers; do not patch consumers with local exceptions.

## Implementation and check evidence

- Implemented the independent manifest, public decoder/producer, strict config
  parsers, public projection, declarations, configuration example, and tests.
- Full-scope independent review found no outstanding product defects. It
  strengthened negative test evidence with reason-specific assertions,
  getter invocation counters, and a malformed-byte fixture that would pass
  under replacement decoding. All checks below passed after these changes.
- `FIREFLY_CONTENT_ROOT="$PWD/content" ./sam node --test plugins/memos/tests/*.test.mjs`
  — 11 tests passed, including example TOML parsing.
- `FIREFLY_CONTENT_ROOT="$PWD/content" ./sam node apps/site/node_modules/typescript/bin/tsc --noEmit --strict --module NodeNext --moduleResolution NodeNext --target ES2022 plugins/memos/tests/declarations.mts`
  — passed positive and negative declaration-consumer assertions.
- `FIREFLY_CONTENT_ROOT="$PWD/content" ./sam sh -c 'for file in plugins/memos/*.mjs plugins/memos/tests/*.mjs; do node --check "$file" || exit; done'`
  — passed syntax checks; no dedicated plugin linter is configured.
- `git diff --check` and task context validation passed. No site/service/UI
  build was required for this pure contract child; no consumer integration or
  deployment is claimed.
- Durable contract: `.trellis/spec/frontend/memo-contract.md`.
- Work is awaiting the repository's commit review, then archive/session
  bookkeeping. No subsequent child has been activated.

## Consumer handoff

- Consumers import the shared module instead of reproducing normalization,
  ordering, serialization or hashing. Runtime config currently includes
  origin/path settings and secret environment-name references; SMTP transport,
  email encryption and final secret-file vocabulary are coordinated additions
  for the service child.
- The site child installs live activation and manifest consumer entrypoints;
  the current site loader still accepts only comments. Disabled consumers
  must skip config/export file reads.
- `resolveMemosConfigPath` is lexical only. File loaders must establish real
  containment and reject symlinks/special files before reading.
- The publication child compares tombstone epochs with prior promoted state.
  The public contract validates shape, not owner approval or historical-data
  provenance; service selection and publication privacy remain required.
