# Semantic document navigator entry lifecycle

## Goal

Implement the approved visible semantic document-navigator entry and immediate
page-local entry/exit lifecycle. Static reading remains complete and native when
JavaScript is absent or enhancement fails.

## Dependency and scope

This child depends on child A being accepted: the renderer must already expose an
enabled semantic navigator profile and omit the entry for `none`. It owns R3 and
AC5 only. R5/AC8 remains a gate: the only active navigator fragment is exactly
`#document-navigator`.

In scope: visible named entry near the document header even without an outline,
semantic local exit via `:q` and an enhanced touch/keyboard exit control,
inactive/active controller lifecycle, focus behavior, URL replacement, native
anchor/no-JS behavior, repeated activation, Back/Forward synchronization and
mobile accessibility. Firefly's `:q` home behavior remains unchanged.

Out of scope: navigator composition/disabled rendering (A), authored theme
migration (C), Terminal command vocabulary (D), global shortcuts, editor
behavior, public theme switching, old-fragment compatibility and route changes.

## Requirements

- Enabled semantic documents render a normal `Read document` link to
  `#document-navigator` independent of outline presence. `none` documents render
  no entry or navigator controls.
- Without JavaScript the entry is a native body anchor and the complete body,
  heading anchors, outline and prose remain usable. The enhanced exit button is
  not usable in no-JS output and does not replace native reading.
- With enhancement ready, ordinary same-tab entry replaces only the URL fragment
  with `#document-navigator` using `history.replaceState`, activates immediately,
  focuses the body region with `preventScroll`, and adds no history entry, reload,
  artificial delay or forced scroll. Preserve path, query and history state.
- Direct fragment loads activate after native hash settlement without a second
  scripted scroll. Loads without the fragment stay inactive and do not steal
  focus. Re-entry does not duplicate listeners or reset the reading position.
- Semantic `:q` and the visible `Exit navigation` control deactivate locally,
  restore the remembered non-navigator fragment or clear it, preserve the reading
  viewport and return focus to the entry. Escape cancels only the current search or
  command interaction; it never exits the document.
- Browser Back/Forward and ordinary heading fragments synchronize state without
  writing a new history entry or stealing focus from ordinary links/comments.
  Modified clicks retain native browser behavior. Editable elements, widgets,
  local scroll regions, selection and touch/native control behavior remain safe.

## Acceptance Criteria

- [ ] Entry is visible for enabled semantic posts/pages with and without an
      outline, absent for `none`, and has native anchor semantics.
- [ ] Direct fragment load, same-page activation, repeat activation, local exit,
      focus restoration, viewport preservation and Back/Forward match the lifecycle
      table in the parent design.
- [ ] Enhanced toggles do not reload, add a history entry, call forced movement or
      introduce a transition delay; ordinary heading navigation remains native.
- [ ] No-JS static Chromium and interactive desktop/mobile checks prove complete
      reading, keyboard/touch operation, visible focus and editable/control guards.
- [ ] Firefly `:q` still returns home; semantic `:q` and the exit control stay on
      the document and use only the current fragment contract.
- [ ] No active old fragment, global shortcut, picker, editor or compatibility
      branch is introduced.

## Risks and rollback

The controller must be able to remain inactive while listeners are installed;
returning early on a fragment-profile page would make a later same-page anchor
dead. If lifecycle behavior fails, revert the child controller/markup together;
do not change fragment compatibility or introduce history-based exit.
