# Memo reading actions — technical design

## Status and boundaries

The owner approved this plan on 2026-10-21. Implementation follows
`task.py start`. Limit source changes to site-owned Memo markup, styles and
interaction with maintained tests and topic-spec updates. No X Core, source
body, route, import or deployment changes.

## Active-entry ownership

Extend `startMemoTimeline` rather than adding CSS-only selection independent
of the rail. Its active entry remains authoritative for border, rail cursor,
date and slider semantics. Track mouse-hover intent separately from existing
browsing/dragging/settling ownership and seek lock.

- Genuine mouse movement over an entry chooses it without align/scrollTo or
  history changes. Touch cannot latch mouse hover.
- Explicit slider/month/fragment/return seeks beat stale pointer coordinates
  until deliberate mouse movement or actual browsing takes ownership.
- During ordinary browsing, reconcile the entry under the latest real mouse
  coordinates on scroll, clearing it over rail/gutters/outside the viewport.
  Account for entries moving under a stationary pointer.
- With no hovered entry, retain visible-interval / unobscured viewport-center
  distance selection, narrow rail clearance and deterministic feed-order ties.
  Preserve the existing lock release on actual user movement.
- Reconcile transient hover on pointer leave/cancel, page restoration and
  layout/input-mode changes. Batch geometry through the existing frame work;
  observers must not invent fresh mouse intent.

Preserve brief seek emphasis separately from the single active border. Keep
the text cursor and native text selection over entry bodies.

## Markup and metadata

`MemoEntry.astro` owns both views. Replace timestamp anchors with time elements
and remove link-hover decoration. Every preview gets a footer: Read Full
left, Share right. This preserves detail access for untitled short entries.
The owner approved the 2026-10-22 refinement directly: Read Full is underlined,
has no arrow and reuses the Share action class for hover/press/focus styling,
while retaining its native link destination and keyboard semantics.

Extend the detail header with original bytes, fixed license, COPY and Share at
the right. Keep titles/body and the single bottom Return in existing reading
order. Use existing Memo tokens/font; flex-wrap and gaps allow the metadata
group to occupy a second line on narrow screens. Keep separators with items.

Use `document.sourceByteLength`, not rendered/staged text sizes. Reuse the fixed
CC BY-NC 4.0 mapping in `post-license.mjs` without extending Memo's authored
schema or rewriting source frontmatter. Record this display-only rule in the
Memo contract while retaining the post-only authored-license boundary.

The owner also directly requested matching Share visuals for the Memo license
link on 2026-10-22. Reuse `memo-action`, suppress the license underline and
anchor-only transition, and retain the official deed href/rel and native
keyboard/no-JS navigation. Read Full keeps its explicitly requested underline.

## Clipboard enhancement

Resolve each Share through
`resolveDocumentShareUrl(canonical.href, entry.data.canonical)`. Give each
entry an independent Share root/announcer for `startDocumentShare`. Initialize
Memo Share independently of timeline startup, including detail/single variants,
using the existing WeakSet startup guard.

Add a focused Memo full-body COPY enhancement using `copyClipboardText`, with
its own pending token, feedback timer and page lifecycle handling. Extract the
complete rendered detail body as plain text with meaningful block/line
boundaries; test prose, verse, Unicode, lists, code and content past the preview.
Exclude metadata, navigation and announcer text. Do not serialize HTML or add
a second general sharing framework.

Hide COPY/Share and their separators until enhancement succeeds. Native
reading/detail/license links work without JS. Serialize repeated clicks;
report local Copied/Failed plus polite status, resetting after the existing
two-second window. Preserve focus, text selection and scroll through fallback.
Retired requests cannot update detached/restored controls or reset newer work.

## Responsive and accessible states

- Idle controls remain subtle with stable widths across feedback labels.
- Pending requests serialize without shifting focus/layout or blocking others.
- Success/failure is local, visible, politely announced and retryable.
- Empty/single corpora retain honest inert timeline controls; each actual entry
  still has a detail link and Share.
- No JS/runtime failure retains static reading, metadata and links, with no
  inert clipboard buttons or orphan separators.
- Native keyboard buttons have visible focus and no timestamp tab stop;
  preserve rail shortcuts and control/text interaction protections.
- Touch actions are at least 44px and do not depend on hover; scrolling is native.
- Reduced motion retains static active/focus states without transitions.
- Check 375px, short landscape and 200% text for readable body/header wrapping.

Classification: `playwright-required`, `mobile-required`.

## Compatibility and rollback

No dependency, storage, schema or route migration is planned. Existing canonical
URL precedence and homepage Share stay authoritative. Rollback reverts task-owned
source/spec/test changes together; no source-data or remote-state rollback.

## Research disposition

See `research/ui-ux-pro-max.md`. Keep the current light Memo identity; generic
generated dark/marketing/serif suggestions conflict with the requested scope.
Use applicable action clarity, touch/focus feedback and static Astro guidance.
