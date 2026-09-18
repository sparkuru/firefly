# Document open and experiment launch commands — execution plan

## Dependency

Child A must be accepted before the browser destination integration is finalized;
its resolver owns enabled/disabled navigation capability. This child may change
Terminal package code independently, but it must not duplicate A's lookup or infer
capability from the source page.

## Ordered checklist

- [x] Inventory the command registry, descriptors, parser, completion bindings,
      help/examples, error hints, browser announcements and tests; search every
      active `vim`/experiment-`open` reference before editing.
- [x] Rename document command behavior to `open`, move experiment behavior to
      `launch`, remove built-in `vim`, and retain `cat` inline semantics.
- [x] Update resource-kind errors, `cat`/`ls` hints, help, usage, examples,
      completion and browser announcements as one registry contract.
- [x] Preserve cwd/root/path safety, listed experiment filtering, metadata/path
      completion, standalone policies, canonical effects and private exclusion.
- [x] Integrate document destination capability decoration with A and add tests for
      enabled/disabled destination navigation, query/same-origin behavior and
      fragment-free pure effects.
- [x] Run Terminal unit/type checks, site checks and focused/full browser/publication
      tests; verify no active compatibility dispatch remains.

## Validation commands

```text
./sam npm --prefix presentations/terminal run check
./sam npm --prefix presentations/terminal run test
./sam npm --prefix apps/site run check
./sam npm --prefix apps/site run test:e2e
./sam npm run test:e2e:publication
```

Use the repository wrapper and current package scripts; re-read `verify.sh` for
the final complete fixture gate.

## Risk and rollback points

1. Registry/help/completion must agree before browser changes.
2. Keep pure effects fragment-free and let the site controller own decoration.
3. Verify error-kind branches do not silently dispatch the other resource kind.
4. Revert the complete command vocabulary revision rather than adding a legacy
   alias if integration uncovers a consumer that still expects `vim`.

## Evidence

- The frozen command registry now exposes `open <path>` for public documents and
  `launch <path>` for listed experiments. `vim` is intentionally unknown, and
  the old experiment-`open` dispatch is removed.
- Completion, help, wrong-resource hints, `cat`/`ls` experiment hints, browser
  announcements, and destination-aware document navigation all use the same
  vocabulary. The pure document effect remains fragment-free; the site resolver
  owns the optional `#document-navigator` decoration.
- `./sam npm --prefix presentations/terminal run check`: passed.
- `./sam npm --prefix presentations/terminal run test`: passed (40 tests).
- The pinned site Playwright document-navigator suite passed all 48 desktop and
  mobile tests, including `open` document effects, listed experiment
  `launch`, enabled/disabled destination handling, and fragment-free `:q`
  effects where applicable.
- Active specs contain no `vim` command contract or experiment-`open` dispatch;
  the only remaining `vim` token is a negative test asserting normal unknown
  command behavior.
