# Firefly display blocks: implementation plan

Status: implementation authorized and completed; final verification and
submission evidence are recorded in research/validation.md.

## Sequence and ownership

1. **Activate after the review gate.** Curate the two context manifests, validate
   them, then start this task. Load `trellis-before-dev` for the affected site,
   content and publication layers. Preserve the other active security-review
   task and all unrelated workspace changes.
2. **Parser and semantic representation.** Site Markdown/build owner implements
   strict YAML schema, document-located diagnostics, matching actual fences,
   nested Markdown parsing, trusted handoff through sanitation, and generated
   static HAST. Integrate before X Core remark analysis and before X Core rehype
   identity assignment. Preserve Mermaid, Shiki, node IDs, heading equality and
   existing non-Firefly Markdown behavior. Add focused parser/processor tests.
3. **Article media lifecycle.** Content/publication owner implements shared
   reference extraction, atomic staging, document-relative mapping,
   content-addressed output and development serving with guest-only reference
   closure. Extend exact static inventory and warm-withdrawal tests; cover
   private/draft/ignored/unreferenced inputs and linked workspace cases. Do not
   alter the independent Memo publishing contract.
4. **Reader layout and navigation.** Site UI owner adds generic composition
   styling, narrow-screen stacking, intrinsic dimensions when available,
   Terminal stream support, and nested reading units. Cover both presentations,
   both content themes, desktop/mobile, keyboard/search and disabled JavaScript.
   Keep native media controls and fallback links usable.
5. **Docs and cross-layer integration.** Add an author-facing English guide
   and synthetic fixtures for all PRD types/layouts. Exercise summaries,
   references, duplicate heading IDs, home search, canonical pages, inline
   Terminal `cat`, malformed blocks, HTTP(S) sources, local paths and media
   fallback. Update the applicable project spec only after implementation facts
   are established.
6. **Quality and closure.** Run focused tests, then applicable full project
   verification. Record actual desktop/mobile and Firefox/Chromium evidence;
   do not mark unavailable environments as passed. Complete the Trellis check,
   finish-work and review process as appropriate to the authorized scope.

The parser and media pieces share a schema/reference contract, so establish
that contract before parallel changes. If implementation is delegated, assign
explicit non-overlapping file ownership; workers must preserve one another's
edits and report verification. The main agent coordinates and integrates.

## Planned checks

Run commands through the repository's Docker wrappers, not host npm/Node:

```sh
./sam npm --prefix apps/site run test:content
./sam npm --prefix apps/site run test:x-core
./preview.sh render npm --prefix apps/site run test:diagrams
./preview.sh render npm --prefix apps/site run check
./preview.sh render npm --prefix apps/site run build
./preview.sh render npm --prefix apps/site run test:e2e -- <focused-spec>
./preview.sh verify
```

Add focused test scripts/config selectors as necessary so the new tests really
run. The exact wrapper commands may need a tracked synthetic fixture or the
renderer image; document any prerequisite and failures rather than bypassing
the project's static-output gate. PRD requires visual and scroll evidence in
both Firefox and Chromium; the maintained Playwright profile is Chromium-only,
so separately establish a controlled Firefox path or report it unavailable.

## Review checkpoints

- Review `prd.md`, `design.md`, `implement.md`, and curated context manifests
  together before moving from planning to implementation.
- Keep all five types and all three layouts within one implementation scope;
  do not ship broken or misleading URL-only placeholders.
- Verify document-relative local resources under actual publication and rebuild
  flows, not just a unit-test mock; inspect final public inventory for leaks.
- Validate generated markup through the actual sanitizer/X Core/Astro pipeline,
  and verify readable static HTML and both browser viewport sizes.
- Check final diff, remaining limitations and full quality gate before marking
  the task complete. No deployment is requested.
