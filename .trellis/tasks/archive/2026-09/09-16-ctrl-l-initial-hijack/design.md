# Technical Design: Initial Terminal Ctrl+L Ownership

## Scope and boundary

The change is limited to the interactive home Terminal's startup marker,
controller, browser tests, and the corresponding frontend contract. It does
not change the canonical `vim` reader, the reader controller, browser chrome,
or any browser/OS shortcut that never reaches the page.

The page-level owner remains:

- `apps/site/src/components/TerminalHome.astro` for the earliest startup
  boundary;
- `apps/site/src/scripts/terminal-home.ts` for Terminal state and ready-state
  event handling.

The framework-neutral Terminal runtime remains unchanged because this is a DOM
focus/event-lifecycle concern rather than a command semantics concern.

## Current event flow

The inline startup marker sets the home root to `connecting` before the module
controller runs and currently guards only plain `Escape`. The controller then
waits for the boot-prompt animation or bounded fallback timer before setting
`interactiveReady`. Its document listener ignores all events before that state.
After readiness, prompt `Ctrl+L` is target-local and inline `cat` `Ctrl+L` is
handled by a bubbling document path.

That leaves two page-controlled gaps:

1. a delivered `Ctrl+L` during `connecting` has no app owner;
2. a delivered `Ctrl+L` from the initial boot/transcript surface or an
   unfocused home-page body has no ready-state owner.

The browser-controlled gap remains separate: a normal browser may reserve the
address-bar shortcut before it dispatches any DOM event.

## Event ownership design

### Early startup guard

Extend the inline startup marker with a minimal capture-phase `Ctrl+L` guard.
It runs only while the root is `connecting`, only for an exact unmodified,
cancelable, non-composing event that is not already prevented, and only for a
non-native home surface. It calls `preventDefault()` and sets a
`data-terminal-pending-clear` marker on the root.

The marker does not try to invoke controller code. This keeps the early inline
script independent from module initialization and lets the controller consume
the intent after it has a valid Terminal state. The existing mutation observer
removes the startup listeners when the root becomes `ready` or `failed`.

### Ready-state target boundary

Rename/generalize the current inline clear-target predicate to an interactive
home clear-target predicate. It accepts:

- the home root or one of its descendants, including the startup/boot record
  moved into the transcript and inline `cat` streams;
- `document.body`/`document.documentElement` when the home controller owns the
  page and no more specific native target owns focus;
- exact unmodified `Ctrl+L`, a cancelable and not-yet-prevented event, no
  composition, and a collapsed selection.

It rejects the existing protected native/ARIA selector, which covers links,
controls, editables, reader widgets, and local-scroll code/table regions, plus
events outside the home surface. The prompt's target-local handler remains the
first owner; the document handler still honors `defaultPrevented`.

## State transition

Reuse the existing `clearCommandTranscript()` action for every page-owned
clear. It cancels draft/history traversal state, updates the prompt, dismisses
completion, clears the transcript, announces the action, and settles focus and
viewport through `clearTranscript()`.

At the end of `completeStartup()`:

1. preserve the boot log and reveal the shell as today;
2. set `interactiveReady` and the `ready` state;
3. atomically consume/remove `data-terminal-pending-clear`;
4. run `clearCommandTranscript()` if the marker was present.

Thus a `Ctrl+L` received while booting prevents the browser default and
produces the same empty-session result once the shell can safely do so. A
ready-state event clears synchronously through the existing path.

## Behavior matrix

| Source/state | Result |
| --- | --- |
| prompt, ready, exact unmodified `Ctrl+L` | existing clear path |
| inline `cat` title/body, ready | clear path; native controls remain native |
| initial boot/transcript surface, ready | clear path without prior prompt focus |
| body/document target on home page, ready | clear path when no native target owns focus |
| home surface, `connecting` | prevent page default; apply clear after startup |
| link/control/input/editable/widget/selection | native behavior |
| modifier/composition/noncancelable event | native/no-op |
| canonical `vim` reader route | unchanged |
| browser/OS consumes before DOM delivery | impossible for page code to override |

## Test strategy

Extend `apps/site/tests/terminal.spec.ts` with:

- a delayed-controller startup case proving a delivered `Ctrl+L` is prevented,
  the pending marker is recorded, and the ready shell ends empty and focused;
- a ready initial-surface case proving the input need not be focused and that
  the boot transcript is cleared with the normal announcement/viewport state;
- negative cases for modifiers, composition, noncancelable events, protected
  native targets, selections, and outside targets, reusing existing inline
  `cat` coverage where it already provides the same boundary evidence.

Tests will assert the page event contract with cancelable DOM events and will
not claim that Playwright can force a real browser omnibox shortcut through the
page.

## Compatibility and rollback

No markup payload, command runtime, route, data, or permission model changes.
No Fullscreen, Keyboard Lock, Pointer Lock, or focus-on-load behavior is added.
Reverting the startup marker, home controller, Terminal browser test, and
frontend contract restores the previous prompt/inline-stream boundary.
