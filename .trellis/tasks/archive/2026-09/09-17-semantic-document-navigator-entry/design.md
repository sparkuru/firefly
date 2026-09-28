# Semantic document navigator entry lifecycle — implementation design

## Rendered controls

Child A supplies the resolved enabled semantic profile. The semantic renderer
places a native `Read document` anchor near the document header for the enabled
profile regardless of outline length. It targets exactly `#document-navigator`.
The status/region starts inactive and is not focusable until activation. The
enhanced status owns an `Exit navigation` button that is hidden/absent from the
usable no-JS path and appears only after the controller is ready. Controls wrap at
mobile widths and retain visible native focus indicators.

## Controller state machine

Use one controller instance with `inactive` and `active` states; normal, visual,
search and command are active substates. Install `hashchange`, `popstate` and
entry/exit listeners once even when the initial URL has no navigator fragment.
Initial non-fragment load stays inactive. Exact fragment load activates after one
animation frame so native hash settlement owns initial scrolling; focus the region
with `preventScroll: true` and do not call movement merely to restore a unit.

For an unmodified same-tab entry click after enhancement is ready, remember the
current non-navigator fragment, call `replaceState` with the same path/query/state
and `#document-navigator`, then explicitly synchronize the controller because
`replaceState` does not emit `hashchange`. Focus the region without scrolling.
Clicking entry while active only focuses the region and retains the active unit.

Semantic local exit clears owned mode/search/selection/highlights/forms, restores
the inactive region tabindex and status visibility, replaces the fragment with the
remembered ordinary fragment (or no fragment for direct entry), and focuses the
entry with `preventScroll`. Never call `history.back()`. Browser-driven
deactivation follows the resulting URL, preserves native heading scrolling, and
returns focus only when focus was inside a navigator control that became hidden.
Firefly's home exit remains profile-owned and is not changed by this child.

Guard the key handler with composition, modifiers, editable/native controls,
ARIA widgets and local-scroll/selection ownership. Escape is mode cancellation.
Modified anchor activation stays native. A controller initialization failure
leaves the SSR anchor/body usable.

## Validation boundary

Browser tests observe URL, history length/state, reload count, scroll positions,
focus target, visible controls and listener/re-entry behavior. Test desktop and
touch mobile, no outline and outline documents, direct/same-page/Back/Forward
paths, no-JS, modified clicks and editable controls. Do not replace browser
evidence with source-text checks.
