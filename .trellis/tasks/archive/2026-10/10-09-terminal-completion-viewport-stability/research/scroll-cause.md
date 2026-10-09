# Completion scroll diagnosis

The owner accepted the compact inline layout and reported viewport movement
while cycling completion candidates despite ample room. Inspection identified
two coupled causes in `terminal-home.ts`:

- Settlement unconditionally called `window.scrollBy` to center every completion.
- Selection rerender cleared the settlement attribute, replacing the list and
  losing its height cap/local scroll. The subsequent layout read could clamp
  page scroll after removal of the form's 50vh spacer.

The focused repair checks actual viewport edges before moving the page and
updates the existing list for selection-only Tab/Arrow actions. Obscured
completion retains the existing fitting/oversized recovery rules; local
selection visibility remains independent of document scrolling.

The owner confirmed a dedicated lightweight Trellis task. The existing request
to repair the reported behavior supplies implementation scope. Root owns task,
spec, mainline and final integration; implement/check agents own bounded source
and regression work. Build/browser verification and independent review are
pending and will be recorded separately with actual results.
