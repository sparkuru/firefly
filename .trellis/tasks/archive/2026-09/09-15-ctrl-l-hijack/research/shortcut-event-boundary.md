# Research: Inline `cat` Ctrl+L Event Boundary

## Repository evidence

- `apps/site/src/scripts/terminal-home.ts:1124-1237` currently handles
  command-line shortcuts on `nodes.input` only. Its exact unmodified `Ctrl+L`
  branch calls `preventDefault()`, resets shell input state, dismisses
  completion, and calls `clearTranscript()`.
- `apps/site/src/scripts/terminal-home.ts:1320-1328` listens on `document` only
  for eligible printable characters. The predicate rejects all modifier keys,
  so it cannot handle `Ctrl+L` from an article title.
- `apps/site/src/scripts/terminal-home.ts:815-831` renders a `document` effect
  by cloning a trusted template and returns the cloned
  `[data-terminal-stream-title]` as the focus target.
- `apps/site/src/components/TerminalStreamDocument.astro:19-35` renders the
  inline stream article. Its title is an `h2 tabindex="-1"`; links and any
  interactive descendants remain native controls.
- `apps/site/tests/terminal.spec.ts:1066-1082` covers prompt-focused `Ctrl+L`.
  `apps/site/tests/terminal.spec.ts:1397-1465` proves that `cat` focuses the
  title and that existing printable/native-boundary behavior is target-aware,
  but it has no inline-stream `Ctrl+L` regression.
- `apps/site/src/scripts/terminal-reader.ts:431-463` owns only the standalone
  reader region. The reported inline `cat` stream does not load that controller.

## Existing contract and prior decision

- `.trellis/spec/frontend/content-workspace-contract.md:986-993` currently
  documents prompt-only `Ctrl+L`: clear transcript/input/completion, preserve
  history, refocus prompt, and leave modified/composing variants native.
- The prior command-shortcut planning records that browser/OS-reserved
  shortcuts are best-effort: DOM code can cancel only a cancelable event that
  the browser delivers to the page. This task extends page ownership to the
  inline `cat` reading surface but does not promise address-bar control when
  the browser consumes the shortcut earlier.

## Approved product scope

The owner approved inline `cat` output only. The handler may act on a
non-interactive target inside the current Terminal transcript's
`[data-terminal-stream-document]`, including the focused title. It must not
expand to the standalone `vim` reader route or to links, native/ARIA controls,
editables, local-scroll widgets, composing input, modified variants, or
user-owned text selections.

## Proposed implementation seam

Use one shared local clear action in `terminal-home.ts` for prompt and inline
stream events. Add a bubbling document `keydown` listener that checks the
exact unmodified/cancelable event, current transcript containment, the existing
protected-target selector, and collapsed selection before preventing default
and invoking that action. The existing prompt listener remains the prompt
owner and the new listener honors `event.defaultPrevented`.

## Validation boundary

Run site checks/build and the focused interactive Terminal browser suite via
`./sam`, using the pinned Playwright image from
`.trellis/spec/trellis-plus/validation-profile.md`. Synthetic cancelable events
may prove `defaultPrevented`; tests must not claim to automate browser
address-bar interception that never reaches the DOM.
