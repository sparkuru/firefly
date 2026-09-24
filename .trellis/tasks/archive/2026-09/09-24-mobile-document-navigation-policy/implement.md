# Implementation and verification plan

Status: implemented and verified in the pinned renderer and on the USB-connected PLR110 with Via.

## Ordered checklist

- [x] Confirm the current branch/status, applicable frontend contracts, and the exact `supportsMobile`/media-query value before editing.
- [x] Add the optional presentation-profile field with strict boolean validation, a frozen default of `false`, and propagation through enabled composition; retain the all-device `none` discriminator.
- [x] Extend the public destination capability lookup and Terminal browser consumer so `open` and inline Open document preserve canonical path/query while omitting the navigator fragment on disallowed mobile clients. Keep visible link copy accurate.
- [x] Add the same mobile predicate to semantic and Terminal navigator-owned CSS. Hide mobile-disallowed entry/status/reservation while leaving ordinary content and native anchors intact, including no-JavaScript output.
- [x] Gate controller startup, focus, key handling, direct-fragment activation, and input-modality changes. Keep opted-in mobile and existing desktop lifecycles working without duplicate listeners.
- [x] Update focused unit/static/browser tests for default, explicit opt-in, invalid fields, lookup serialization, both presentations, portrait/landscape/touch tablet/narrow desktop, direct fragments, Terminal destinations, and `none`.
- [x] Update the executable frontend contracts to describe the new policy and its separation from X Core/front matter/content themes.
- [x] Run focused checks and an integrated fixture gate; inspect emitted assets, desktop regressions, diff, and ignored artifacts.
- [x] Repeat the ordinary-reading check on the USB-connected PLR110 when available, restoring task-owned ADB/service state.

## Validation commands and evidence

Set `FIREFLY_CONTENT_ROOT` to the repository's absolute `content` directory for every build/test command. Use the pinned renderer/Playwright container through `./render.sh`; do not use owner-local content for acceptance.

```text
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run test:content
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm run check:m4
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm run build:m4
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run test:e2e -- --project chromium-mobile-interactive tests/document-navigator.spec.ts
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run test:e2e -- --project chromium-desktop-interactive tests/document-navigator.spec.ts
./verify.sh
```

The browser matrix may use a focused added spec or project variants for touch tablet, landscape phone, narrow fine-pointer desktop, and JavaScript-disabled behavior. Record exact pass counts and any expected skips. On the physical phone, check current device/ADB/service state first, use a task-owned loopback server and reverse mapping, capture only the demo page, and remove exactly what this task created.

## Risk and rollback points

- The same static page serves desktop and touch clients. CSS must hide controls before JS, while runtime must prevent hidden mode/focus behavior; verify both layers and input-modality transitions.
- The capability lookup is a strict browser transport. Change producer, decoder, Terminal consumer, and tests together; unknown destinations must stay canonical.
- A direct `#document-navigator` URL may remain in the address bar on mobile as an inert content anchor. Do not rewrite history or force scrolling to conceal it.
- Revert the profile, transport, CSS, runtime, tests, and related contracts together if rollback is needed. Do not add a compatibility alias for the old generated lookup shape.
