# Implementation plan

## Preconditions

- Keep the current branch and all existing uncommitted document-navigator/theme
  changes intact. Do not use a worktree-wide reset or checkout.
- `task.py start` is the implementation gate; this plan and `design.md` must
  exist before activation.
- Treat archived task documents as history. Search and update production code,
  current tests, and live contracts only.

## Ordered work

### 1. Establish the canonical metadata boundary

Files owned by this slice:

- `apps/site/src/lib/content-schema.mjs`
- `apps/site/scripts/blog-meta.mjs`
- `tooling/format-content.sh`
- `apps/site/tests/content-schema.test.mjs`
- `apps/site/tests/blog-meta-cli.test.mjs`

Actions:

1. Remove `rejectLegacyArticleTheme`, its preprocess wrappers, the `source`
   validator/field, and `source` from organizer output.
2. Update the shell formatter registry to include `contentTheme` and exclude
   `source`.
3. Change tests from migration guidance to ordinary unknown-field assertions;
   add source rejection and preserve no-write behavior.
4. Keep the `contentTheme` default/registry and all unrelated metadata behavior
   unchanged.

### 2. Make comments configuration canonical-only

Files owned by this slice:

- `plugins/comments/config.mjs`
- `plugins/comments/config.d.mts`
- `services/comments/src/config.ts`
- `services/comments/tests/config.test.ts`
- `apps/site/src/lib/site-config.mjs`
- `apps/site/tests/site-config.test.mjs`

Actions:

1. Remove the legacy comments key set, translation helpers, parser export,
   type, and runtime dispatch.
2. Make `resolveCommentsRuntimeOptions()` call the canonical config parser only.
3. Make the site parser strip only the handled `plugins` input before strict
   core validation, so top-level `comments` remains an unknown key.
4. Remove the site loader's old namespace bypass and add a service-loader guard
   so a legacy site namespace cannot be silently ignored.
5. Make explicit service config files flow directly through canonical exact-key
   validation.
6. Rewrite positive fixtures to canonical `[public]`/`[runtime]` TOML and add
   negative legacy/mixed namespace coverage. Preserve explicit environment
   precedence and named-secret behavior.

### 3. Synchronize live contracts

Files owned by the main integration slice:

- `readme.md`
- `plugins/comments/README.md`
- `.trellis/spec/frontend/content-workspace-contract.md`
- `.trellis/spec/frontend/site-configuration-contract.md`
- `.trellis/spec/frontend/comments-publication-contract.md`

Actions:

1. Remove current documentation that presents `source`, `articleTheme`, or
   `[comments]` as accepted migration inputs.
2. State ordinary unknown-field rejection and canonical names explicitly.
3. Remove the legacy comments public API signature/type and old conflict row.
4. Preserve intentional `sha256:` digest, runtime env, database/data, route
   format, and command/API compatibility descriptions.

### 4. Cross-reference audit

Run a repository search for production references to:

- `rejectLegacyArticleTheme`, `articleTheme` outside historical archives,
   `source` as a front matter field, `parseCommentsNamespace`,
   `parseLegacyCommentsNamespace`, `LegacyCommentsNamespace`, `LEGACY_KEYS`,
   and current `[comments]` migration wording.

Distinguish generic variables named `source`, storage migration terms, and
historical task records from retired authored/configuration fields. The search
must leave the intentionally preserved runtime/format compatibility paths
present and documented.

### 5. Validation gates

Fast checks:

```sh
bash -n tooling/format-content.sh
shellcheck tooling/format-content.sh
shfmt -d tooling/format-content.sh
./tooling/format-content.sh --print-schema
python3 ./.trellis/scripts/task.py validate .trellis/tasks/09-17-enforce-canonical-field-contracts
git diff --check
```

Focused repository checks through the approved wrapper:

```sh
./sam npm run test:content:site
./sam npm run test:comments-contract
./sam npm run test:comments
```

Cross-layer gates:

```sh
./sam npm run check:m51
./sam npm run test:m51
./sam npm run build:m51
```

If a gate fails, classify it against the pre-existing worktree changes and
record the exact failure before changing code. Do not weaken tests or alter
the scope to make a gate pass.

## Delegation boundaries

After activation, the implementation may be split into disjoint worker slices:

- content worker: step 1 files only;
- comments worker: step 2 files only;
- main session: step 3, cross-reference audit, integration, and final review.

Workers must not revert other worktree changes, touch external content, or
modify live specs outside their assigned slice. The main session verifies each
returned diff before integrating it.

## Rollback points

- After step 1: content schema/CLI tests must pass before comments changes.
- After step 2: comments contract and service tests must pass before docs.
- Before step 3: inspect `git diff` and confirm no unrelated file was touched.
- If a slice fails, revert only that slice's hunks through an explicit patch;
  never use `git reset --hard`, `git checkout --`, or broad cleanup.

## Completion handoff

Before task completion, run the full applicable checks, inspect the final diff,
update any newly learned durable spec rule through the normal Trellis spec
workflow if needed, and report that no external content was changed. Commit
creation remains subject to the repository's normal user-authorized finish
step; do not auto-commit the archive or unrelated worktree changes.
