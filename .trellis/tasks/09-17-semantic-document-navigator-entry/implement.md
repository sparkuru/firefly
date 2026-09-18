# Semantic document navigator entry lifecycle — execution plan

## Dependency

Child A must be accepted first so semantic markup receives an enabled/disabled
composition result. Do not duplicate resolver/profile logic here. C and D are
independent planning children; parent integration follows all children.

## Ordered checklist

- [x] Inspect A's resolved semantic profile and current status/controller markup;
      identify the exact entry, status and runtime test surfaces.
- [x] Add the native semantic entry for every enabled document, independent of
      outline output, and the enhanced local exit control.
- [x] Refactor the controller to install one inactive/active lifecycle, synchronize
      direct and browser-driven fragment changes, and implement replace-state entry
      and local exit with focus/viewport preservation.
- [x] Preserve firefly home exit, Escape cancellation, native modified/no-JS
      anchors and editable/widget/local-scroll/selection guards.
- [x] Add focused desktop/mobile interactive and JavaScript-disabled browser tests
      for direct entry, same-page entry, repeat entry, exit, history and heading
      navigation.
- [x] Run static build and focused Playwright checks, then the site's normal check
      and e2e gates; retain artifacts for any browser failure.

## Evidence

- Semantic SSR renders a `Read document` native anchor whenever the resolved
  profile is `fragment`; disabled composition still omits the navigator subtree.
- `startDocumentNavigator` now installs one inactive/active controller, exact
  `#document-navigator` synchronization, replace-state entry/local exit,
  remembered ordinary fragments, focus restoration and inactive keyboard guards.
- `./sam npm --prefix apps/site run check` passed with zero diagnostics.
- `./sam npm --prefix apps/site run build` passed, including the static output
  gate.
- Pinned Playwright desktop and mobile interactive semantic lifecycle checks
  passed; the JavaScript-disabled desktop native-entry check passed.

## Validation commands

```text
./sam npm --prefix apps/site run check
./sam npm --prefix apps/site run build
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e
./sam npm run test:e2e:site
```

Use the built immutable artifact and the project's desktop/mobile/no-JS matrix;
do not use `astro dev` or host Playwright as publication evidence.

## Risk and rollback points

1. Native SSR anchor/body must remain usable before controller initialization.
2. URL replacement must preserve path/query/state and avoid hashchange assumptions.
3. Focus/scroll assertions must distinguish native hash settlement from enhanced
   mode changes.
4. Any failure in local exit must not be “fixed” with `history.back()` or a legacy
   fragment alias.
