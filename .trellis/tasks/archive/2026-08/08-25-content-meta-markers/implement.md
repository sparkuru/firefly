# Implementation plan: Firefly content metadata markers

## Preconditions and review gate

- Keep the task in `planning` until the final planning summary is explicitly
  approved. Do not run `task.py start` from this planning pass.
- Before product edits, load `trellis-before-dev` and the relevant frontend
  schema, type-safety, component, quality, state, and content-workspace
  guidance.
- Use `./sam` for every Node/npm/Astro command. Preserve the clean worktree and
  do not modify external blog content during planning or tests.

## Ordered checklist

### 1. Finalize the metadata and registry contract

- Add the optional strict `firefly.markers` schema to the shared post/page
  metadata without changing existing defaults.
- Validate safe lowercase kebab-case IDs, normalize duplicates deterministically,
  and preserve unknown-but-safe IDs as no-op metadata.
- Add the site-owned registry/normalizer with only `featured` supported and
  export its supported ID set for the future checker.
- Add focused tests before wiring presentation consumers.

### 2. Add the canonical projection

- Extend `CanonicalDocument` with an immutable supported-marker descriptor list.
- Resolve markers inside `createCanonicalDocument()` so every consumer receives
  one projection and no component parses raw metadata.
- Prove posts/pages, public guest projection, legacy documents, unknown IDs,
  ordering, and frozen results in Node tests.

### 3. Render the MVP marker

- Create a shared marker badge component that renders registry-owned text and
  safe diagnostic attributes.
- Add `featured` badges to Semantic/Terminal document headers and existing
  public document listing rows, including the Terminal home index.
- Add semantic and Terminal style tokens with visible text and no color-only
  meaning; preserve responsive/no-overflow and JavaScript-disabled output.
- Keep `TerminalEntry` package contracts unchanged; pass the site canonical
  projection through the existing home wrapper.

### 4. Integrate fixture and static-output coverage

- Choose a repository-local marker-bearing fixture without changing publication
  or access semantics, or use an isolated external-workspace fixture if the
  existing static tests require it.
- Assert the badge appears only for `featured`, unknown IDs have no visible
  effect, and raw marker values do not become HTML/CSS/script payloads.
- Retain all existing content schema, materializer, route, draft/private, and
  static-output assertions.

### 5. Document and update the durable contract

- Document the `firefly.markers` namespace, supported `featured` behavior,
  unknown-marker no-op rule, and future checker boundary in `readme.md`.
- Update `.trellis/spec/frontend/content-workspace-contract.md` with the
  metadata/canonical projection contract and cross-layer invariants.
- Add the task-local research/design findings to the implement/check context
  manifests before implementation dispatch.

### 6. Validate and review

```sh
./sam npm --prefix apps/site ci
./sam npm --prefix apps/site run test:content
./sam npm --prefix apps/site run check
./sam npm --prefix apps/site run build
git diff --check
python3 ./.trellis/scripts/task.py validate content-meta-markers
```

- Inspect generated HTML for badge presence, unknown-marker absence, no host
  paths, and no uncontrolled marker payload.
- Run focused static/browser checks only if the changed markup or CSS warrants
  them; record an exact unavailable error rather than counting an unavailable
  command as passed.
- Run the Trellis quality check after implementation, then update the spec,
  commit, archive, and record the session through the finish workflow.

## Risk points and rollback

| Area | Risk | Mitigation |
| --- | --- | --- |
| Schema defaults | Existing front matter starts failing or parsed data changes shape | Use optional/default strict namespace and preserve all existing fixtures |
| Unknown markers | Future external metadata breaks ordinary builds or leaks to HTML | Accept only safe IDs, resolve only registry entries, test no-op output |
| Canonical projection | Consumers read different marker representations | Resolve once in `createCanonicalDocument()` and pass typed data |
| Presentation duplication | Semantic/Terminal/list surfaces drift | Use one shared badge component and registry descriptors |
| Static output | Marker adds uncontrolled source text or breaks layout | Registry-owned labels, explicit static assertions, existing output tests |
| Fixture choice | Feature task changes public content unexpectedly | Use a clearly scoped fixture or isolated workspace; document the choice |

## Completion gate before activation

- PRD has no unresolved product decisions.
- `design.md` and `implement.md` agree on open namespace, unknown no-op,
  `featured`-only MVP, future checker deferral, and renderer boundaries.
- `implement.jsonl` and `check.jsonl` contain real spec/research entries.
- The final planning summary has been presented and explicitly approved.
