# Safe embedded Markdown HTML — Implementation Plan

## 1. Readiness and task gate

- Before product edits, re-read this task's `prd.md` and `design.md`, load
  `trellis-before-dev` for the X Core/frontend layers, and confirm the
  external blog source has not been modified.
- Keep the task in `planning` until the owner explicitly approves the final
  planning summary. On the approved follow-up turn, run
  `python3 ./.trellis/scripts/task.py start .trellis/tasks/09-14-safe-markdown-html`
  (or the repository-supported task name) before editing product code.
- Keep the cross-layer work in this one task: the sanitizer/X Core bridge,
  article-content boundary/styles, tests, dependencies, and durable contract
  updates are not independently releasable deliverables.

## 2. Implement the host policy and X Core boundary

1. Add direct locked `rehype-raw` and `rehype-sanitize` dependencies to
   `apps/site`; preserve the repository's package-lock conventions and do not
   rely on Astro transitive packages.
2. Add the site-owned Markdown HTML policy module with the explicit safe tag,
   attribute, class, and URL schema. Include the `<center>` compatibility
   exception and the documented `firefly-content-*` class set. Keep
   `<style>`, `style`, scripts, event handlers, unsafe protocols, `srcdoc`,
   and browser-embedding primitives out of the schema.
3. Extend `createXCorePlugins()` with the default-off authored-HTML opt-in.
   Preserve the default `XCORE_RAW_HTML` diagnostic and the final raw-HAST
   `XCORE_INVALID_TRANSFORM` guard.
4. Wire Astro's processor as `rehypeRaw` → sanitizer → X Core rehype, with
   `remarkRehype.allowDangerousHtml` enabled only for this site pipeline.

## 3. Implement the article-content styling seam

5. Add the shared article-content stylesheet and generic token contract. Keep
   selectors under `[data-article-content]`; document and style the initial
   callout/center class vocabulary without referencing website chrome or
   presentation implementation classes.
6. Map semantic and Terminal existing tokens to the generic article-content
   variables. Load the shared stylesheet through the current semantic bundle
   and Terminal inline-style mechanism without changing the synchronizer or
   creating an article-theme registry.
7. Add `data-article-content` to the rendered Markdown containers in
   `SemanticDocument.astro` and `TerminalDocument.astro`. Do not move the
   boundary over headers, outlines, comments, reader controls, or shell UI.

## 4. Regression coverage and contract updates

8. Update X Core unit tests for the opt-in/default behavior and preserve
   transform identity/raw-node diagnostics.
9. Update site integration tests to render approved `div class` content and
   legacy `<center>` through the real Astro processor; assert valid metadata,
   stable headings/node IDs, both production presentations, and absence of
   script/event-handler/unsafe-URL/style output.
10. Replace the obsolete site negative test that expects every raw HTML node to
    fail. Keep route, context, adapter, metadata, and other build negatives
    intact; add a focused policy regression if the test surface needs a
    build-level assertion.
11. Add/update static or component assertions for the article-content
    boundary and shared style loading. Keep physical routes, asset behavior,
    and current website presentation output unchanged except for the intended
    content support.
12. Update `.trellis/spec/frontend/x-core-contract.md` and the relevant
    content-workspace/frontend contract with the explicit opt-in, sanitizer
    order, allowlist behavior, content boundary, class vocabulary, and the
    deferred article-theme seam.

## 5. Validation order

Run repository checks through `./sam`; direct host Node/npm results are not
evidence for this project:

```sh
python3 ./.trellis/scripts/task.py validate .trellis/tasks/09-14-safe-markdown-html
./sam npm --prefix packages/x-core run check
./sam npm --prefix packages/x-core run test
./sam npm --prefix apps/site run test:x-core
./sam npm --prefix apps/site run test:content
./sam npm --prefix apps/site run check
./sam npm --prefix apps/site run build:workspace
./sam npm run check:m4
./sam npm run test:m4
FIREFLY_CONTENT_ROOT=/absolute/path/to/blog ./sam npm run build:m4
git diff --check
```

Run the relevant static-output/browser suite if the changed layout/style
surface requires it, using the repository's existing `./sam` wrapper. Record
any unavailable external workspace, browser, or dependency gate with its
original diagnostic rather than substituting a host-side success.

## 6. Review gates and rollback points

- After the X Core change, verify default hosts still reject raw Markdown HTML
  and that adapter transforms cannot return raw HAST.
- After the Astro wiring, inspect a rendered fixture before and after X Core:
  raw nodes must be gone, allowed classes must remain, metadata must be
  present, and dangerous content must not be serialized.
- After the layout/style change, verify both content roots and ensure no
  selector depends on `.site-*`, `.terminal-*`, `.prose`, or
  `.terminal-prose`; check that the existing static asset count/routes remain
  stable.
- Before completion, inspect the final diff for external/private paths,
  generated-content changes, lockfile drift, accidental frontmatter/theme
  fields, and changes to `tooling/sync-server`'s remote protocol.
- If a validation gate fails because the policy is too narrow, add the
  smallest documented safe allowance and rerun focused tests. If behavior is
  still unsafe or metadata drifts, revert the affected source layer before
  considering broader changes.
