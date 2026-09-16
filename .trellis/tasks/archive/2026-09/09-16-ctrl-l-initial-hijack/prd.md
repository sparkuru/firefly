# Fix initial page Ctrl+L browser hijack

## Goal

Make the Terminal home page handle an unmodified `Ctrl+L` consistently from
the moment its interactive surface is presented, while keeping native browser
and accessibility behavior intact. The user value is that pressing the shell
shortcut during the first visit does not silently fall through to a browser
address/search UI when the browser has actually delivered the event to the
page.

## Background and confirmed facts

- The owner reported that `Ctrl+L` still enters the browser search/address UI
  immediately after opening the page.
- `apps/site/src/components/TerminalHome.astro:76-129` installs an inline
  startup marker before the module controller, but it currently guards only
  `Escape` while startup is `connecting`.
- `apps/site/src/scripts/terminal-home.ts:1032-1392` registers the page-level
  `keydown` handler, but its shortcut path returns while `interactiveReady` is
  false. The boot gate can keep that state for the configured 1.58-second
  startup timeline.
- The current controller handles `Ctrl+L` at the command input and on
  non-interactive inline `cat` surfaces after the event reaches the DOM. The
  prior task deliberately excludes browser/OS shortcuts consumed before DOM
  delivery.
- The current startup test at
  `apps/site/tests/terminal.spec.ts:107-136` proves the prompt is visible but
  not focused after startup; existing shortcut tests begin after the shell is
  ready.
- `preventDefault()` can cancel only a cancelable event delivered to the page.
  Keyboard Lock is an immersive Fullscreen API capability, requires user
  activation and has limited browser availability; it is not an appropriate
  silent normal-page fix for a content terminal.

## Requirements

### R1. Initial Terminal shortcut boundary

When the home page owns a delivered, cancelable, exact unmodified `Ctrl+L`
event during startup or the ready interactive state, the page must prevent its
default browser action and route the event to the Terminal's clear behavior at
the appropriate lifecycle state. The implementation must not require the
command input to already have focus.

### R2. Existing behavior preservation

Preserve prompt-focused and inline-`cat` `Ctrl+L` behavior, command history,
completion cancellation, announcements, focus settlement, and centered empty
session layout. Do not change the standalone reader route.

### R3. Native and browser boundaries

Do not intercept modified variants, composition, native/ARIA interactive
controls, user-owned text selection, or events outside the Terminal home
surface. Do not claim to override a browser or operating-system shortcut when
no cancelable DOM event is delivered. Do not introduce silent Fullscreen or
Keyboard Lock behavior.

### R4. Regression evidence

Add browser-level coverage for `Ctrl+L` during the initial/connecting state and
immediately after startup, including cancellation/default-prevention and the
resulting Terminal state. Retain existing prompt, inline-`cat`, native-boundary,
and no-JavaScript recovery coverage.

## Acceptance Criteria

- [x] A delivered cancelable exact unmodified `Ctrl+L` during the home page's
      startup/initial surface is prevented from taking the page's browser
      default action and is handled without requiring prior prompt focus.
- [x] Once the shell is ready, initial-surface `Ctrl+L` leaves the Terminal in
      the same empty-session state as prompt `Ctrl+L`, including prompt focus,
      empty draft/completion, announcement, and retained history.
- [x] Existing prompt-focused and inline-`cat` `Ctrl+L` tests remain green.
- [x] Links, controls, inputs, IME/composition, selections, modified variants,
      standalone reader behavior, and native recovery remain unchanged.
- [x] The implementation and durable frontend contract state the hard browser
      boundary: page code cannot prevent a shortcut consumed before DOM event
      delivery; no fullscreen or keyboard-lock prompt is introduced.
- [x] Focused site checks, build checks, and the relevant interactive browser
      suite pass through `./sam`.

## Out of scope

- Disabling Chrome, Firefox, Safari, or an operating system's address-bar or
  search shortcut when it is consumed before the page receives an event.
- Requesting Fullscreen, Keyboard Lock, Pointer Lock, or another immersive
  permission solely to capture `Ctrl+L`.
- Replacing the shell shortcut, changing unrelated browser shortcuts, or
  modifying the canonical `vim` reader route.

## Key decision

- The owner approved the recommended scope: add an early,
  page-delivered-event guard and cover the initial Terminal surface without
  entering Fullscreen or requesting Keyboard Lock. This removes the app-side
  startup gap, but cannot guarantee control of a real browser omnibox shortcut
  that never reaches the DOM.

## Open questions

- None block implementation or acceptance.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
