# Design: home startup state and no-JavaScript recovery

## Boundary

Keep the behavior inside the existing Terminal-home progressive-enhancement
boundary:

- `TerminalHome.astro` owns the early inline marker, startup markup, and the
  server-rendered boot-log source node.
- `terminal.css` owns the direct Terminal-flow staging layout and the persistent
  transcript record styling.
- `terminal-home.ts` owns transitions to `ready` and `failed` after its existing
  validation and runtime error boundaries, including moving the boot-log node
  into the transcript on successful startup.
- `dev.sh` owns the fast Astro development entry point; the existing assembled
  publication preview remains an explicit build/preview mode.
- Existing native recovery markup remains the only no-JavaScript content path.

No data, routing, presentation, or package boundaries change.

## State Flow

```text
no marker (JavaScript disabled) ───────────────► recovery index
        │
        └─ inline marker before recovery markup ► connecting staging view
             │
             ├─ validated controller startup ───► move log into transcript → prompt
             ├─ validation/runtime failure ──────► recovery + failure state
             └─ controller never runs by DOM ready ► recovery index
```

The inline marker sets a home-root startup data attribute synchronously before
the recovery section is parsed. A DOM-ready guard changes an uncompleted
startup to `failed`, covering a missing or failed bundled controller. The
controller changes the same state to `ready` only after its existing exact
node/index/template validation succeeds. Before revealing the session, it
wraps the existing boot-log surface in a `.terminal-record`, appends it as the
first transcript child, forces the moved lines to their final visible state with
animation disabled, and removes the staging section. It changes the state to
`failed` for early or fatal recovery.

## Markup and Styling

- Add an unboxed Terminal-flow boot-log staging surface with deterministic,
  local startup lines and a non-interactive prompt line. Do not add a separator
  or a separate visible `connecting...` status element. On successful startup,
  preserve the same log DOM node as the first `.terminal-record` in the
  transcript, force its lines to their final visible state with animation disabled,
  and remove only the staging prompt line. DOM relocation must not replay the
  staged reveal. The staging prompt reserves the live command-row geometry but
  remains hidden until the final line reveal completes; reduced motion makes it
  visible immediately and controller readiness never waits for this effect.
- The log lines describe the existing static Terminal startup boundary (for
  example, loading the public index and validating templates); they must not
  claim real kernel, hardware, network, or host diagnostics.
- Default CSS keeps connecting hidden and recovery visible, preserving the
  static/no-JavaScript document.
- The `connecting` root state shows the direct top-flow staging view and
  suppresses recovery. `ready` moves the log into the session transcript,
  removes the staging section, and reveals the prompt; `failed` shows recovery
  again.
- Use the existing phosphor Terminal tokens, self-hosted JetBrains Mono, and
  responsive layout primitives. Do not add external assets, a route transition,
  global overflow rules, or an artificial output delay.
- Render all log-line boxes immediately and use only a short CSS opacity reveal;
  the controller must not wait for a visual effect before revealing the live
  prompt. The staging prompt must share the live command-row geometry so the
  startup-to-ready transition does not reflow. When the session transcript is
  empty after `clear`, `cls`, or prompt `Ctrl+L`, mark the session with an
  explicit empty-state attribute and center the command form within the home
  viewport; remove the attribute when a new record is rendered.

## Development entry points

- `./dev.sh` starts `apps/site` through `astro dev` without rebuilding the M5
  publication, so local visual review is fast and hot-reloadable.
- `./dev.sh preview` (with `build` as a compatibility alias) retains the full
  M5 build, assembly, and immutable publication server path.
- `./dev.sh down` and `./dev.sh stop` stop either mode through the same exact
  repository/scope labels.

## Failure and Accessibility

- A startup validation failure must not leave the root in `connecting`.
- Existing post-start `showFatalFailure()` remains the single path that
  exposes the explicit failure message and focuses the recovery heading.
- The no-JavaScript path has no marker, so its native links remain in the
  accessibility tree. The startup log and prompt are decorative/non-interactive
  during the internal connecting state and must not introduce a separate live
  announcement. Command results continue to use the existing polite announcer.

## Compatibility and Rollback

- Static routes other than `/` do not receive the home marker or landing.
- Existing command/session data contracts remain unchanged; the transcript
  gains only one local startup record.
- Rollback is limited to removing the marker, connecting element, state
  transitions, record transfer, style rules, and their regression assertions;
  public content and route output remain untouched.
