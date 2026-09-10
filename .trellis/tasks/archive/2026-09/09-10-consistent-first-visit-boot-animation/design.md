# Technical design: deterministic first-visit boot animation

## Boundary

The home page remains a static Astro document. The server-rendered boot surface
is the source of the first visual frame, while the browser controller owns only
the transition from that surface to the interactive session. No Service Worker,
SSR request, third-party animation library, or CDN configuration change is
required.

## Contract

`TerminalHome.astro` emits the complete 12-line boot log, the animated prompt,
and a numeric `data-terminal-boot-duration` value derived from the same timing
constants used by the inline styles. The inline startup marker sets
`data-terminal-startup-state="connecting"` before the controller module runs.

`startTerminalHome()` may decode the runtime payload and bind event handlers
while the root is still `connecting`, but it must set
`data-terminal-controller-initialized` and keep the boot surface/session gate in
place until either the boot prompt's named `animationend` event or a bounded
duration fallback. Reduced motion and a prompt that is already visibly
complete are immediate fast paths.

On successful completion, the controller moves the existing boot surface into
one transcript boot record, disables replay through the existing CSS record
rule, reveals exactly one interactive prompt, and changes the root state to
`ready`. On any initialization or transition error it uses the existing fatal
recovery path. Before `ready`, shell submit, hidden-input key handling, and
document-level character insertion are inert; ordinary page keys remain native.

## Timing and failure behavior

- Twelve lines use the existing 100 ms stagger and 180 ms reveal duration.
- The prompt starts at 1400 ms and ends at 1580 ms; the root publishes 1580 ms
  as the controller fallback duration.
- The fallback timer adds a small grace interval and is bounded so a missing
  animation event cannot leave the page permanently in `connecting`.
- A delayed module that arrives after the CSS timeline has completed uses the
  computed-style fast path and does not wait through a second animation.
- `prefers-reduced-motion: reduce` reveals the static boot surface and opens the
  shell immediately after controller initialization.
- The marker fails only when the controller never initialized; a controller
  that is initialized and waiting for the visual gate is not mistaken for a
  failed load at `DOMContentLoaded`.

## Compatibility and deployment boundary

The generated HTML/CSS, versioned Astro module, no-JavaScript recovery, focus
behavior, and overflow constraints remain within the existing publication
contract. CDN/Orange Cloud cache headers and real-device first-paint behavior
remain deployment-owner checks; this change supplies deterministic client-side
ordering but does not alter remote infrastructure.

## Verification surface

Static-output tests check the timing contract and startup marker. Playwright
tests cover fast and delayed module delivery on desktop and mobile Chromium,
timeline event ordering, the pre-ready input gate, reduced motion, no replay,
refresh, Escape, recovery, focus, and overflow. Project `check`, build, content,
X Core, and focused browser commands provide the release evidence.
