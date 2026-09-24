# Mobile document navigation policy by presentation

## Goal

Keep phone reading as an ordinary document page. A presentation may explicitly support the document navigator on mobile; omission means mobile navigation is unavailable.

## Background

- On 2026-09-24, a Pixel 5 Playwright touch viewport and a USB-connected PLR110 running Via could enter the semantic document navigator, but the visible mobile UI offered only Exit navigation. Search and unit movement had no touch entry.
- The site-owned `PRESENTATION_EXPERIENCES` registry in `apps/site/src/lib/presentation-experiences.ts` owns each presentation's navigator entry and exit profile. Firefly enters automatically; semantic enters through `#document-navigator`. Both currently enable navigation regardless of viewport or input capability.
- `resolveDocumentNavigation` also supports site-level `navigator = "none"`. That setting disables navigator composition for all clients and is separate from the requested mobile policy.
- Terminal destination links use a public capability lookup to decide whether to append `#document-navigator`. Direct fragment loads and ordinary document links are separate entry paths.
- The owner chose a touch-primary, no-hover media condition for this policy. It includes landscape phones and touch tablets; a narrow desktop window with a fine pointer retains desktop behavior.

## Requirements

- R1. Add a presentation-owned, typed mobile support field to the navigator profile. An omitted field resolves to disabled; an explicit enabled value permits that presentation's existing navigator behavior in touch-primary, no-hover environments. Reject invalid field values.
- R2. For presentations without mobile support, touch-primary, no-hover readers get the complete ordinary document, outline, links, comments, and content theme, without a visible navigator entry, fixed status, navigator focus or key handling. This applies in portrait and landscape.
- R3. In that environment, direct `#document-navigator` URLs must remain usable as ordinary document anchors without activating navigator mode. Terminal-generated document destinations must omit the navigator fragment and avoid text that promises navigation. Ordinary heading fragments remain native.
- R4. Desktop behavior for both built-in presentations remains as currently defined. An explicitly mobile-enabled presentation retains its existing entry/exit behavior. Site-level `navigator = "none"` remains the stronger all-device disable.
- R5. Do not add mobile movement/search controls or change X Core metadata, authored front matter, or content-theme selection.

## Acceptance Criteria

- [x] Both built-in presentations default to mobile navigation disabled; desktop Firefly and semantic entry/exit, search, and movement still work.
- [x] Portrait and landscape touch-primary, no-hover checks show complete static and interactive document reading without navigator status, entry control, focus takeover, or document-level horizontal overflow.
- [x] A narrow fine-pointer desktop viewport still has the desktop navigator; a touch tablet follows the mobile default.
- [x] Direct navigator fragments and Terminal `open` / inline Open document links on mobile lead to ordinary reading; native heading links remain usable.
- [x] A test-only presentation profile with mobile support enabled demonstrates the opt-in path, and invalid field values fail validation.
- [x] Site-level `none` still omits navigator assets and hooks for all devices; no navigator policy enters X Core or authored metadata.
- [ ] Automated touch-viewport checks and a focused real-device pass cover the final behavior. Automated checks passed; PLR110 repeat awaits USB reconnection.

## Out of Scope

- Designing touch controls for the navigator.
- A per-article or per-user mobile override.
- Browser or user-agent sniffing without a deliberate policy decision.
