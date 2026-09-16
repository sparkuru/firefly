# Research: Browser Shortcut Capture Boundary

## Repository evidence

- `TerminalHome.astro` installs a small inline startup marker before the module
  controller. It currently prevents only plain `Escape` while the startup
  state is `connecting`.
- `terminal-home.ts` sets `interactiveReady` only after the boot prompt
  animation or its bounded fallback timer. Its document shortcut handler
  returns before that state and its current clear target is limited to prompt
  or inline `cat` ownership.
- The home page intentionally leaves the command input unfocused after
  startup so normal page focus and Tab traversal remain available.

## Platform findings

- `Event.preventDefault()` cancels a browser default only when a cancelable
  event has been delivered to the page. See MDN:
  <https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault>
  and <https://developer.mozilla.org/en-US/docs/Web/API/Event/cancelable>.
- The Keyboard Lock API is designed for immersive fullscreen applications.
  Chrome's documentation states that JavaScript-initiated fullscreen is a
  prerequisite and that the API captures keys otherwise handled by the
  browser or operating system:
  <https://developer.chrome.com/docs/capabilities/web-apis/keyboard-lock>.
- MDN marks `Keyboard.lock()` as limited availability and requiring transient
  user activation:
  <https://developer.mozilla.org/en-US/docs/Web/API/Keyboard/lock>.

## Decision guidance

The normal-page fix should cover the event lifecycle the application controls:
install a minimal early capture guard during `connecting`, remember a pending
clear request, and let the controller apply the same clear transition once the
shell is ready. In the ready state, allow the home Terminal's non-interactive
surface to own the same exact shortcut while preserving native controls,
composition, selections, and modified variants.

Do not add silent Fullscreen or Keyboard Lock. Those APIs would change the
product interaction model, require user activation/permissions, and still
would not provide a cross-browser guarantee. The contract and tests must state
that a browser or operating system shortcut consumed before DOM delivery is
outside page control.

## Break-loop analysis

- **Root cause category:** D (test coverage gap) plus E (implicit lifecycle
  assumption). The implementation had separate `connecting` and `ready`
  event ownership, but the regression matrix covered only the latter and
  prompt focus.
- **Why the previous fix was incomplete:** the prior task intentionally scoped
  `Ctrl+L` to prompt and inline `cat` surfaces after readiness. That matched
  its approved requirement, but startup's inline marker and the unfocused
  initial Terminal surface were not part of that acceptance matrix.
- **Prevention:** keep an early marker and ready controller as one shortcut
  contract, test both lifecycle states with focused and unfocused surfaces, and
  record the browser pre-DOM boundary explicitly in the frontend spec.
- **Systematic check:** the canonical reader remains a separate owner, so its
  controls must stay native; future home-level shortcut changes should search
  both the startup marker and the controller before adding a new handler.
