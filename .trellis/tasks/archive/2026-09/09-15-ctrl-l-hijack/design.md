# Technical Design: Inline Cat Ctrl+L Event Ownership

## Scope and boundary

The change is limited to the interactive Terminal home stream and the
non-interactive reading surface produced by `cat`. It does not change the
standalone canonical `vim` reader route, reader modes, or browser/OS shortcuts
that never reach the page.

The page-level owner remains `apps/site/src/scripts/terminal-home.ts`. The
framework-neutral Terminal package has no role in this keyboard interaction.

## Current event flow

`cat` returns a document effect. The home controller clones its trusted template,
appends it to the transcript, and focuses the cloned
`[data-terminal-stream-title]`. The controller currently handles `Ctrl+L` only
in the command input's `keydown` listener. Its document listener handles only
eligible printable characters, so a `Ctrl+L` event from the focused title has
no page handler and can fall through to the browser.

## Event ownership contract

Add one document-level, bubbling `keydown` path in the home controller for an
exact unmodified `Ctrl+L` event. The path must run only when all of these are
true:

- the Terminal is interactive and not failed or composing;
- the event is not already default-prevented and is cancelable;
- the key is `l`/`L`, `ctrlKey` is true, and `Alt`/`Meta`/`Shift` are false;
- the event target is an element inside the current Terminal transcript and
  inside `[data-terminal-stream-document]`;
- the target is not inside the existing protected native/ARIA target selector,
  including links, controls, local-scroll code/table widgets, and editables;
- the browser selection is collapsed, so a user-owned text selection remains
  native.

The prompt's existing target-local listener remains the first owner for
prompt-focused events. The document path honors `defaultPrevented`, so it does
not duplicate a prompt clear. A target check against the current transcript
prevents stale or unrelated page content from acquiring shell ownership.

## State transition

Factor the existing prompt `Ctrl+L` state transition into one local controller
action. Both the prompt listener and the inline-reading document listener call
that action. It will:

1. call `cancelCommandInput(state)` to reset history traversal and draft state;
2. refresh the prompt from the resulting shell state;
3. dismiss completion UI;
4. clear the transcript through the existing `clearTranscript` presentation
   path, including its announcement and centered prompt settlement.

The document event calls `preventDefault()` before the action. Submitted
command history remains in the shell state and is verified with ArrowUp after
the clear.

## Behavior matrix

| Focus/event source | Result |
| --- | --- |
| command input, exact unmodified `Ctrl+L` | existing clear behavior |
| inline `cat` title or non-interactive stream surface | prevent page default and clear Terminal |
| inline stream link, button, input, editable, ARIA control, code/table widget | leave native |
| inline stream with user-owned selection | leave native |
| `Alt`/`Meta`/`Shift` variant or composition | leave native |
| standalone `vim` reader route | unchanged |
| browser/OS consumes shortcut before DOM dispatch | impossible for page code to override; document as best-effort |

## Test strategy

Extend the existing site interactive suite with a `cat`-then-`Ctrl+L` case:

- submit a command and `cat` a fixture document;
- assert the stream title owns focus;
- dispatch/press an exact cancelable `Ctrl+L` from that title and assert the
  event is default-prevented, the transcript is empty, and the prompt is
  focused and empty;
- use ArrowUp to prove the submitted history survives;
- cover a protected stream link, a modified variant, and a user-owned
  selection as non-intercepted boundaries.

Retain the existing prompt-focused regression. The synthetic cancelable event
assertion proves the page contract without claiming that a real browser's
address-bar reservation can be automated from Playwright.

## Compatibility and rollback

No markup, runtime payload, navigation, or data migration is required. The
change is confined to the home controller, its browser regression tests, and
the frontend content-workspace contract. Reverting those files restores the
previous prompt-only shortcut boundary.
