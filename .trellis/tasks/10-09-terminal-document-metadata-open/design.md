# Terminal document metadata and new-tab opening

## Surfaces and ownership

`TerminalDocument.astro` owns the standalone title/meta chrome. Reuse renderer
`sourceByteLength`/`sourceKind`, UTC entry date, validated `getPostLicense` and
`resolveSiteMetadata` canonical precedence from the existing inline composition.
The owner updated the requested order before implementation. The visible row follows date/bytes/post-license/Share order, wraps on narrow
viewports and preserves authored body/outline/navigation. Updated date remains
available to existing SEO metadata; the owner-requested compact row omits it.
Inline cat retains its path and uses the same date/bytes/license metadata order.
Pages use applicable file metadata and Share without a post license default.

Sharing stays site-owned and independently enhanced on article pages, including
when the navigator is disabled. Use a small reusable canonical URL/share helper
where it avoids diverging from the existing inline controller. Retain honest
clipboard failure, stable feedback width, per-button pending protection and
cleanup; do not widen X Core/runtime payloads or leak provenance snapshots.
Hide/withdraw inert Share actions when JS is unavailable while retaining static
bytes/date/license and native article links. Keyboard navigation remains native
for the button and does not activate navigator commands while it owns focus.

## New-tab document intent

The site render/controller separates `document-navigation` from Experiment
`navigation`. Only document intent changes: the original Terminal keeps its
session and successful command-line record; the new document receives the same
validated capability-aware URL, including the navigator fragment when enabled.
Call browser opening synchronously inside the user's submit gesture. Prevent
opener access and distinguish actual blocked opening from successful opening
when deciding whether a native recovery link is required. Do not turn unrelated
Experiment launch into a new-tab action.

Inline Open remains a native anchor with `target="_blank"` and explicit opener
isolation, preserving modified-click defaults and dynamic capability refresh.
It preserves the source draft/caret and existing cat/collapse/Share state.
Successful command opening leaves no redundant navigation output; blocked
opening may provide a native retry link with honest feedback in its record.

## Compatibility and rollback

Do not alter document navigator exit/focus policies, virtual-file operands,
static canonical routes, article content, Terminal completion/history or native
mobile browsing. Existing tests that assumed same-tab Terminal Open must be
rewritten to assert both popup behavior and retained source state. The change
is reversible through the focused site source/test commit without migrations.
