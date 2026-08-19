# Hide no-JS fallback flash with connecting landing

## Goal

Remove the visible flash of the Terminal home's no-JavaScript document index
when JavaScript is enabled, while preserving the document index as the usable
fallback when JavaScript is disabled or the interactive startup fails.

The JavaScript-enabled first paint should show a direct Terminal-style startup
stream and a command prompt beneath it. There is no separator or separate visible
`connecting...` status line. The bounded log may reveal line by line without
blocking the session. Once
the Terminal session is ready, that same stream must become the first persistent
transcript record, with the live command prompt following it instead of
discarding the startup history.

## Background and Confirmed Facts

- `apps/site/src/components/TerminalHome.astro` server-renders the recovery
  document index visibly and the interactive session with `hidden`.
- `apps/site/src/scripts/terminal-home.ts` currently hides recovery and reveals
  the session only after DOM/index/template validation.
- The static site and existing browser coverage intentionally require the native
  recovery links to work with JavaScript disabled.
- The visible flash occurs because the browser can paint the server-rendered
  recovery markup before the deferred home controller runs. A separate startup
  surface also disappears at readiness, so a refresh can expose a transition
  frame instead of a continuous Terminal history. The current border, centered
  placement, and staggered reveal make the state feel like a showcase card
  rather than normal terminal output.

## Requirements

1. Add a synchronous, home-only JavaScript capability/startup marker that runs
   before the recovery markup can paint. It must not add a client framework,
   request content, or change the build-time Terminal data boundary.
2. When the marker runs, show a direct, unboxed Terminal-style startup staging
   state with the complete bounded set of deterministic local startup log lines
   and a non-interactive prompt line. Keep that staging prompt hidden until the
   final log-line reveal completes, except that reduced motion may reveal it
   immediately. Do not add a separator or a separate visible `connecting...`
   status line. Suppress the recovery index during interactive startup.
3. When the existing home controller completes validation successfully, move
   the same startup log into the beginning of the Terminal transcript and keep
   it visible above the existing prompt/session. Do not duplicate or discard
   the log during this transition.
4. When JavaScript is disabled, the marker must not run; the recovery index must
   remain visible and usable without any browser runtime.
5. If the controller fails validation or later encounters a fatal runtime
   error, restore the recovery index, expose its existing failure message where
   applicable, and do not leave the page stuck on `connecting...`.
6. Keep the startup stream accessible, responsive at the existing desktop and
   mobile viewports, and isolated to the Terminal home route. Reserve the full
   log layout immediately, allow a short non-blocking line reveal, and never
   delay session readiness for animation. After `clear`, `cls`, or unmodified
   prompt `Ctrl+L`, keep the empty-session prompt centered in the home viewport
   without requiring document overflow; the next output record restores normal
   flow.

## Out of Scope

- Replacing the Terminal command model or changing public document/index data.
- Adding a progress indicator, client router, fetch, or hydration framework.
  The boot log is a bounded startup illustration, not a real kernel/system
  diagnostic stream. A short CSS-only line reveal is allowed, but it must not
  gate the live session.
- Changing canonical document routes, semantic routes, NERV, or publication
  packaging behavior.

## Acceptance Criteria

- [ ] The built home output contains an early inline capability/startup marker
      before the recovery section and a direct top-flow boot-log state containing
      the complete configured lines and the static prompt, without a separator.
- [ ] The boot stream uses the existing phosphor Terminal tokens and
      JetBrains Mono, contains deterministic local log lines, is unboxed and
      directly placed in the Terminal flow, and does not add external assets or
      an artificial output delay.
- [ ] With JavaScript enabled, the home no longer exposes the recovery heading
      during successful startup; the boot log is the first transcript record
      and the existing Terminal session becomes available after it. Moving the
      log into history must not replay its line animation.
- [ ] With JavaScript disabled, the home exposes `Browse public documents`, its
      native document links, and no interactive prompt requirement.
- [ ] A startup validation failure and a post-start fatal failure both restore
      the recovery state rather than leaving `connecting...` visible.
- [ ] Existing static-output, Astro/type, content, and relevant Playwright
      checks pass; the new startup/no-JavaScript behavior has regression
      coverage.
- [ ] The frontend Trellis guidance reflects the revised Terminal-home startup
      contract.

## Key Decisions

- Use a synchronous inline marker in the Terminal home markup so the browser
  can distinguish JavaScript-enabled startup from the no-JavaScript fallback
  before parsing and painting the recovery content.
- Keep the existing native recovery index as the failure/no-JavaScript path;
  the connecting surface is a staging view, while its log becomes persistent
  history in a successful JavaScript-enabled session.
- Render a high-contrast boot-log stream with the existing Terminal visual
  system. Its geometry is complete immediately and its optional CSS reveal is
  non-blocking; successful initialization is never delayed just to complete a
  visual effect.

## Risks and Deferred Items

- A JavaScript-enabled browser whose main controller asset cannot load could
  otherwise remain in the connecting state; the inline startup marker must have
  a deterministic DOM-ready recovery path for this case.
- Very fast local loads may show only part of the log sequence. This is
  intentional: the effect must not add a fixed wait before the prompt becomes
  usable.
- The exact visual timing of first paint remains browser-dependent; static
  output ordering and JavaScript-disabled/enabled browser states are the
  automated evidence boundary.

## Open Questions

None.
