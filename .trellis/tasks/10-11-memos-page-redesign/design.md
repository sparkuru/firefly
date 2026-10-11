# Memos Reader Design

## Status and Ownership

The first candidate was implemented/verified and its light visual direction
accepted. This updated design records the owner's subsequent feed/detail
simplifications. The owner then explicitly selected the effective reading-center
rule. The revised scope and policy below are approved for implementation.

Keep all changes in the site-owned Memo shell, styles and progressive runtime.
The existing canonical content/rendering/time-index paths remain authoritative.
Reuse Astro and scoped CSS; no new framework, font service, or animation library.

## Visual System

Reuse `--memo-*` semantic tokens and their article-content mappings. Use an
off-white/silver page background, white reading surfaces, charcoal text, clear
muted text, fine gray dividers, and restrained blue for actionable/active states.
Candidate tokens: background `#f5f5f7`, surface `#ffffff`, text `#1d1d1f`, muted
`#626269`, border `#dedee3`, accent `#0066cc`. Validate actual foreground/background
contrast, including markers and focus, before accepting them.

Use existing system fonts with Chinese fallbacks. Body type stays at least 16px
with approximately 1.7 line height. No large desktop intro remains; long
paragraphs never span the entire shell. Use an 8px spacing rhythm, subtle surface
depth, and restrained corner rounding. Entry dividers and breathing room carry
the feed hierarchy. Remove visible global site identity/navigation in this
standalone reading experience, as requested by the owner.

## Responsive Layout

| Viewport | Feed layout | Detail layout |
| --- | --- | --- |
| Above 768px / 48rem | Two columns: sticky left historical rail and spacious entry stream | Flat centered date/content reader with one bottom return and footer |
| At most 768px / 48rem | One column with sticky horizontal history above entries | Flat single-column reader with one bottom return and footer |

Use a fluid centered two-column shell, allocating roughly 200–240px to history
and 760–850px to the stream at wide desktop sizes, with deliberate gutters.
Avoid stretching paragraphs to consume the former navigation column. Keep the
accepted roomy entry rhythm and detail prose around 46rem; wide content scrolls
locally. Remove the large feed hero/intro so history and entries are the visible
primary surfaces. Supply accessible page naming without decorative heading chrome.
Details omit outer-card border/shadow and visible tag/marker/update chrome,
while preserving authored titles when present as part of readable content.

The historical rail remains inside the existing `data-memo-timeline` root.
Markup order and landmarks must preserve sensible keyboard/reading order even
when history is placed on the left. Remove the global sticky header. Rail
clearance must use the actual current geometry, with zero absent-header fallback
and appropriate narrow-view safe-area handling. Keep the 48rem runtime/CSS
orientation breakpoint in sync. Delete unused header-only enhancement code
rather than retaining a redundant shell observer.

## Interaction Design

1. **Reading highlight (approved):** native scrolling selects the entry crossing
   the vertical center of the unobscured reading viewport. Exclude the sticky
   mobile history area when calculating that viewport. If the center falls in
   a gap, choose the nearest visible entry deterministically. Long entries stay
   active while the reading center lies inside them. This is a reading-position
   proxy, not gaze detection.
2. **Time feedback:** show a cursor-adjacent date bubble during drag and keyboard
   seeking. Use the existing UTC+8 label and selected entry, keep the bubble
   within viewport bounds, and preserve the slider's ARIA value text. Duplicate
   visual dates do not add a chatty live region. Ordinary scrolling uses the
   quieter current-date/active-month display tied to the approved reading policy.
3. **Seek feedback:** briefly emphasize the selected entry after a discrete seek
   or fragment return. Natural scrolling only updates its quiet active state.
   Preserve immediate per-frame pointer alignment and browsing/dragging/settling
   ownership; do not enqueue smooth-scroll animations for every drag event.
   Induced seek scrolls and observers must not immediately replace the chosen
   target with a different center candidate. Resume automatic browse selection
   only when actual browsing resumes; cover wheel/touch/keyboard/scrollbar paths.
4. **Control feedback:** links/navigation receive understated hover, visible
   focus and press states. Body text remains selectable. Do not make whole
   entries appear clickable when only their links are actionable.

Prefer 180–240ms opacity/transform/color transitions. Reduced motion removes
movement/transient animation while retaining clear static selected/focus states.
No reveal effect delays or hides memo body availability. Native scrolling stays
under visitor control.

## States, Accessibility and Compatibility

- Empty: retain readable empty copy; omit interactive
  time affordances that have no entries.
- Single: retain the complete entry with disabled/inert seek semantics.
- No JS or runtime failure: shell and full static body remain available; month
  disclosure, anchors, detail links and explicit returns work natively.
- Enhanced same-tab month activation owns a single alignment and keeps fragment
  history equivalent to native navigation. Repeating the same fragment adds no
  history; modified/other-target and static activations remain native.
- Loaded/settled: rail/date/active entry reflect the same index. Native scroll,
  resize, media loading and orientation changes preserve context.
- Pointer, touch and existing arrows/Page Up/Page Down/Home/End remain available;
  month and control targets stay at least 44px with visible focus.
- Keep skip navigation, one accessible page-level H1, landmarks, meaningful labels,
  readable contrast and local wide-content overflow. Reuse existing data hooks.
- Canonical URLs, stored Markdown, metadata, preview/full-body semantics, access
  exclusion, route-owned CSS and time-index math do not change.

Update the owning Memo spec after validated refinement to describe the left
desktop rail, absent global header/navigation, minimal details and the chosen
native-scroll policy. First-candidate right-rail/header rules are superseded by
the owner's refinement; retain their validation as historical evidence.

## Risks and Rollback

The main risks are absent-header sticky clearance, date-bubble clipping, and
induced seeks being overwritten by center-based browsing. Exercise final geometry,
native month anchors and oldest-entry seeking in the existing browser matrix.
Both supported surfaces must be visually reviewed. Keep source changes scoped
so rollback can restore the Memo shell/CSS/runtime/tests/spec together; there
is no data migration or production action in this task.
