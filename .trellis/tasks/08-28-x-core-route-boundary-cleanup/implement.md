# X Core and canonical-route boundary cleanup — Implementation Plan

## 1. Reconfirm context and readiness

- Read this task's PRD/design, the parent remediation PRD, the root PRD,
  `x-core-contract.md`, the comments publication contract, the development
  runtime/quality specs, and the boundary evidence.
- Confirm the archived Unicode, documentation, deterministic-validation, and
  comments-contract prerequisites and verify that the pre-existing worktree
  changes are limited to task-control files.
- Before product edits, load `trellis-before-dev` for the X Core and frontend
  layers. Do not run `task.py start` until the final planning summary is
  explicitly approved.

## 2. Narrow X Core and retain site integration

- Remove the generic publication/service host implementation and public export
  from `packages/x-core`, along with tests that only exercise that removed
  boundary.
- Define the minimal site-only registry contract at the site boundary and
  migrate `apps/site/src/lib/site-plugins.ts` without changing the comments
  plugin's static registration, disabled behavior, extension shape, or package
  ownership.
- Search the repository after the change for `FireflyPluginRegistry`,
  `publicationContributions`, `servicePlugins`, and X Core `plugins.js` imports;
  every remaining use must be either intentionally absent or a documented
  site-local replacement.

## 3. Extract and apply the route projection

- Add the pure site-owned route helper and focused tests before deleting the
  duplicated route assembly.
- Replace the route expression in `createCanonicalDocument()` and the route
  expression in `resolveDocumentContext()` with the helper.
- Preserve the existing content-specific path validation, directory hrefs,
  breadcrumbs, aliases, route reservations, and X Core diagnostic wrapping.
- Add a cross-check that an equivalent staged/content entry produces the same
  `CanonicalDocument.href` and `DocumentContext.route` for root/nested posts,
  pages, slug overrides, and Unicode.

## 4. Documentation and regression coverage

- Update `.trellis/spec/frontend/x-core-contract.md` to make the final X Core,
  site registry, and route ownership explicit.
- Update `plugins/comments/README.md` to keep the comments manifest and its
  site/publication/service adapters separate from X Core.
- Retain comments-disabled tracked configuration, public output, comments
  public contract, and publication metadata exactly as they are.

## 5. Validation order

Run through `./sam`; do not use direct host Node/npm or raw Docker commands:

```sh
python3 ./.trellis/scripts/task.py validate .trellis/tasks/08-28-x-core-route-boundary-cleanup
./sam npm run check:x-core
./sam npm run test:x-core
./sam npm run check:site
./sam npm run test:content:site
./sam npm run test:x-core:site
./sam npm run build:site
./verify.sh
git diff --check
```

If a focused helper test has its own package script, run it before the broader
site tests and record the exact command. Preserve any unavailable browser or
external check failure rather than treating it as a pass.

## 6. Review gates and rollback points

- After X Core removal: confirm the package public surface still builds and
  all Presentation/document tests pass.
- After site registry migration: confirm comments remain statically wired and
  no publication/service data enters site input.
- After route extraction: compare representative generated routes and inspect
  Unicode, nested, alias, and collision fixtures.
- Before commit: inspect the diff for private paths, generated output,
  unrelated adapter mutation/dependency changes, new runtime discovery, and
  accidental public URL changes.
- Dispatch an independent Trellis check after implementation. Return to the
  owning step for any API drift, skipped route case, or cross-layer mismatch.
- A source revert is the rollback. Do not touch comments data, secrets,
  deployment state, or owner-local/generated inputs.
