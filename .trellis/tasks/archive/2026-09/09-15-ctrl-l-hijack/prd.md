# Make Ctrl+L Reachable from Inline Cat Output

## Goal

Keep the interactive Terminal's exact, unmodified `Ctrl+L` shortcut available
when the user is reading a document rendered inline by `cat`, so the shortcut
does not silently fall through to the browser's address/search UI whenever the
focused element is the rendered article title or another shell-owned reading
surface.

The intended user value is consistent shell behavior: `Ctrl+L` should clear the
visible Terminal session, reset the current draft/completion state, preserve
command history, and return focus to the prompt whenever the browser actually
delivers the key event to the page.

## Background and confirmed facts

- The task was created after the owner reported that `Ctrl+L` still opens the
  browser search/address UI after `cat` renders an article.
- `apps/site/src/scripts/terminal-home.ts:1124-1237` handles command shortcuts
  only from the native command input. Its existing `Ctrl+L` branch calls
  `preventDefault()`, resets shell input state, and clears the transcript.
- The same controller's document listener at
  `apps/site/src/scripts/terminal-home.ts:1320-1328` only captures eligible
  printable, unmodified characters; it intentionally rejects modifier keys, so
  it cannot handle `Ctrl+L` while another shell-owned element has focus.
- Inline `cat` document effects clone a trusted template and return the
  rendered title as the focus target at
  `apps/site/src/scripts/terminal-home.ts:815-831`. The title is a
  focusable `h2` at `apps/site/src/components/TerminalStreamDocument.astro:19-35`.
- The existing browser coverage verifies that `cat` focuses the title and that
  printable typing returns to the prompt, but the `Ctrl+L` regression at
  `apps/site/tests/terminal.spec.ts:1066-1082` only starts with the prompt
  focused. The focused-document interaction coverage is at
  `apps/site/tests/terminal.spec.ts:1397-1465`.
- The separate reader controller deliberately ignores modified keys in its
  region handler at `apps/site/src/scripts/terminal-reader.ts:431-463`; the
  inline `cat` stream does not use that reader controller, so it currently has
  no shell-level `Ctrl+L` handler outside the prompt.
- The durable frontend contract currently documents `Ctrl+L` only at the active
  prompt (`.trellis/spec/frontend/content-workspace-contract.md:986-993`).
  Earlier planning established that browser/OS-reserved shortcuts remain
  best-effort: page code can only cancel an event that the browser sends to the
  page.

## Key decision

- The approved scope is the interactive Terminal's inline `cat` output only:
  the rendered article title and other non-interactive article surfaces inside
  that stream may invoke the shell clear shortcut when the page receives the
  event. The standalone `vim` reader route remains unchanged. This fixes the
  reported path while keeping browser-shortcut ownership narrower on ordinary
  article pages.

## Requirements

### R1. Reading-surface Ctrl+L

When the Terminal is interactive and the browser delivers an exact unmodified
`Ctrl+L` event whose target belongs to the approved shell-owned inline `cat`
reading surface, prevent the browser default and perform the same clear path as
prompt `Ctrl+L`: clear visible transcript/output, clear the draft and
completion display, preserve submitted command history, announce the action,
and refocus the command prompt.

### R2. Existing prompt behavior

Preserve the current prompt-focused `Ctrl+L` behavior and its shell state,
history, focus, and empty-session layout semantics.

### R3. Native and browser boundaries

Do not intercept modified variants (`Alt`, `Meta`, or `Shift`), composing input,
or focus inside native/ARIA interactive controls such as links, buttons, text
inputs, reader search/command forms, code/table widgets, or user-owned text
selection. Do not claim to override a browser or operating-system shortcut
when no cancelable page event is delivered.

### R4. Regression evidence

Add browser-level regression coverage for `cat` followed by `Ctrl+L` while the
rendered title/reading surface owns focus, plus the existing prompt path and
native-boundary cases. The assertions must cover transcript clearing, prompt
focus, history retention, and event cancellation where the event is dispatched
to the page.

## Acceptance Criteria

- [x] After `cat <document>`, with the rendered title or approved reading
      surface focused, an unmodified `Ctrl+L` clears the inline Terminal
      transcript, empties the prompt, and focuses the prompt when the page
      receives a cancelable event.
- [x] The same interaction preserves submitted command history, so ArrowUp
      still recalls a command submitted before the clear.
- [x] Prompt-focused `Ctrl+L` remains green with its existing layout,
      completion, announcement, and history behavior.
- [x] Links, controls, reader search/command inputs, composing input, user text
      selections, and modified `Ctrl+L` variants retain their native behavior.
- [x] The implementation and project contract state the page-delivery
      limitation for browser/OS-reserved shortcuts; tests do not pretend that
      Playwright can force a browser address-bar shortcut to reach the page.
- [x] Focused Terminal/site checks, build checks, and the relevant interactive
      browser suite pass through the repository's `./sam` boundary.

## Out of scope

- Replacing or disabling the browser or operating system's address-bar/search
  shortcut when it is intercepted before DOM event delivery.
- Introducing a global shortcut configuration system or changing unrelated
  `Ctrl+C`, reader navigation, browser navigation, refresh, or tab shortcuts.
- Capturing `Ctrl+L` inside canonical reader route controls or arbitrary page
  content outside the interactive Terminal inline stream.
