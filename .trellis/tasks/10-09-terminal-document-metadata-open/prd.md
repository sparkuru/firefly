# Terminal document metadata and new-tab opening

## Goal

Add compact date/bytes/license/Share metadata to standalone Terminal documents, use the same date/bytes/license order in inline cat, and open Terminal document destinations in new tabs while preserving the source session.

## Requirements

- Replace the standalone Terminal article's published/updated line beneath its title with compact UTC YYYY-MM-DD date, original Markdown bytes, post license and Share, in that order. Apply the same date/bytes/license order to inline cat metadata, retaining its virtual file path.
- Share copies the canonical permanent URL with honest success/failure feedback. Post licenses retain the existing default/override contract; pages do not acquire a post license.
- Terminal `open <file>` and inline article Open launch the document in a new tab. The original Terminal keeps its URL, transcript, cwd/history and a usable empty prompt.
- Successful `open` leaves only its submitted command record followed by the next prompt; do not append a redundant successful-navigation link/message.
- Preserve navigator destination capability, new-page focus, native modified-link behavior, no-JS article metadata, independent launch/lab behavior and existing article content.

## Acceptance Criteria

- [x] Standalone Terminal post metadata shows ISO-style date, original bytes, actual post license and Share; inline cat uses the same date/bytes/license order; default/override and applicable page behavior are covered.
- [x] Share copies the fragment-free canonical URL, reports rejection/unavailability honestly, resets without layout movement and preserves navigator keyboard/focus behavior.
- [x] Enter-submitted `open` and ordinary inline Open create one new tab at the canonical/navigator-aware destination while the source Terminal stays usable and retains its state.
- [x] Successful command records contain only the command line; blocked opening retains a usable recovery path without replacing the original tab.
- [x] Desktop/narrow interaction, static metadata, navigator and Terminal regressions pass; independent review and existing local preview update are complete.

## Notes

- Owner explicitly requested creation and continued implementation on 2026-10-09. No second planning/implementation consent is necessary for these concrete requirements.
- Standalone Terminal document chrome is the target shown in the screenshot. Semantic/Memo redesign, lab changes, authored content/schema changes, remote push and production deployment are excluded.
