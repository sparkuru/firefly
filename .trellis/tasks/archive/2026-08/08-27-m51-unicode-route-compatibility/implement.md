# M5.1 Unicode route compatibility implementation plan

## 1. Readiness and context

- Run `trellis-before-dev` for the shared comments contract and main-site
  frontend before editing product files.
- Load the curated implementation context, then re-read `prd.md`, `design.md`,
  and this plan.
- Confirm `./sam`, the site lockfile, and the pinned Playwright image are
  available. Do not use host Node, global Playwright, production data, or a
  remote service as validation evidence.
- Confirm the only pre-existing worktree changes are this task's planning
  artifacts.

## 2. Implement the shared conversion contract

- Add `commentsPostPathFromSiteHref(value)` beside the existing comments route
  encoder/validator in `plugins/comments/config.mjs`.
- Validate the raw site-href shape, encode non-ASCII segments with uppercase
  UTF-8 escapes, and validate the complete output with the existing canonical
  comments grammar.
- Return `null` for invalid input; do not partially normalize unsafe input.
- Add the corresponding type declaration in `plugins/comments/config.d.mts`.
- Extend focused config/comments tests for Unicode, ASCII, non-NFC, encoded,
  traversal, delimiter, whitespace, control/format, and punctuation cases.

## 3. Adapt publication grouping

- Re-export the converter through the site comments adapter and declaration
  boundary as needed.
- In `loadCommentsForPosts`, build a unique encoded-route-to-raw-href map from
  the supplied public posts.
- Fail closed for unrepresentable posts or encoded-route collisions.
- Resolve each export comment through that map, retain the stale/non-public
  error, and store grouped comments under the original raw href.
- Add a sanitized Unicode export fixture and prove grouping under the raw href;
  retain ASCII, empty-group, and stale-route behavior.

## 4. Adapt the post extension and form payload

- Keep build-document identity and route on raw `CanonicalDocument.href`.
- Set `CommentsPostExtension.postPath` from the shared converter and fail closed
  if an enabled post cannot be represented.
- Keep comment lookup keyed by the raw document route.
- Do not change `CommentSection.astro` or `CommentForm.astro` unless a test
  demonstrates that their existing prop propagation is insufficient.
- Verify top-level and reply forms both receive the encoded route.

## 5. Add deterministic enabled projection coverage

- Create the smallest sanitized test fixture/projection needed for one Unicode
  post, one top-level comment, one reply, and non-secret local submission
  action.
- Generate any enabled config only inside an ignored repository-local test
  boundary; never mutate or copy the owner-local site/plugin config.
- Build the fixture through the existing content-root and static-build path.
- Add or extend a focused static Chromium Playwright test asserting the route,
  visible comments, form labels, encoded hidden `postPath`, and containment at
  desktop and mobile viewports.
- Do not submit the form, send mail, call a remote endpoint, or update visual
  baselines.

If the isolated projection cannot be made reproducible through `./sam`, stop
and return to planning. Do not fall back to modifying owner configuration or
count the browser gate as passed.

## 6. Validation

Run focused checks first, followed by the full changed-package gate:

```sh
./sam npm --prefix services/comments run check
./sam npm --prefix services/comments run test
./sam npm --prefix apps/site run test:content
./sam npm --prefix apps/site run check
./sam npm --prefix apps/site run build
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e:unicode-comments
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e
./sam npm run check:m51
./sam npm run test:m51
./sam npm run build:m51
git diff --check
python3 ./.trellis/scripts/task.py validate .trellis/tasks/08-27-m51-unicode-route-compatibility
```

Run the focused command with the explicit sanitized content, site-config, and
export fixture inputs. Its dedicated configuration must require both static
Chromium projects to execute; it may not skip when the projection is missing.
Run the enabled projection in addition to the normal disabled build; neither
substitutes for the other.

Record Playwright evidence with the exact command, desktop/mobile projects,
route, visible comment/form assertions, fixture boundary, and result. Preserve
configured report/trace/screenshot artifacts on failure.

## 7. Final review and finish

- Run a privacy scan across source, fixtures, task artifacts, and manifests for
  credentials, account identities, external hosts, operator paths, and raw
  operational output.
- Confirm tracked comments activation remains disabled and no authored content,
  owner config, production export, or generated browser artifact entered the
  diff.
- Run the final full-scope Trellis check for the shared comments contract and
  frontend package.
- Promote a stable route-boundary rule into the comments publication spec if
  implementation confirms it is reusable and non-obvious.
- Present the submit-ready evidence and residual review classification before
  committing; then follow the normal Trellis commit and finish flow.

## Rollback points

1. Before shared-contract edits: preserve current validator behavior and test
   baselines.
2. Before enabled projection setup: verify its exact ignored directory and
   cleanup ownership.
3. On grouping or route-collision regression: revert the adapter change and
   keep comments disabled.
4. On browser harness leakage or owner-config contact: stop, remove only the
   exact generated fixture artifacts, and return to planning.
