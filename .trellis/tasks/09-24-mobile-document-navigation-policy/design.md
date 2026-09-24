# Design: presentation-owned mobile navigator policy

## Boundary and contract

The site-owned presentation experience remains the source of navigator UI policy. Add an optional `supportsMobile?: boolean` to `DocumentNavigatorProfile` and normalize it to a required frozen boolean in each resolved experience and enabled `DocumentNavigationComposition`. Both built-in presentations omit the field, so their effective value is `false`. A non-boolean value is an error. `navigator = "none"` still resolves to the disabled composition before any device policy is considered.

Do not put this field on X Core `PresentationAdapter`, authored front matter, `contentTheme`, or site TOML. Those layers do not own browser navigator behavior. A future presentation opts in in its site-owned experience definition. Keep the existing `always`/`fragment` and `home`/`local` policies unchanged.

The approved mobile predicate is `(hover: none) and (pointer: coarse)`. It is stable across phone orientation and includes touch-primary tablets. Narrow fine-pointer desktop windows continue to use desktop navigation. Use this exact predicate in both CSS (for no-JavaScript rendering) and browser code (for behavior); a focused test should catch disagreement. Do not use viewport width or user-agent sniffing.

## Document page behavior

An enabled composition still renders one static HTML page for all devices. Expose the resolved `supportsMobile` value on the document root so the navigator's own styles and controller can read it. For a mobile-disallowed presentation, the mobile media rule hides semantic `Read document`, fixed status, forms, and navigator-only bottom reservation while retaining the body, outline, links, comments, and content theme. Desktop markup and behavior stay the same. `none` continues to omit navigator-owned DOM and asset edges at build time.

The navigator controller must check the policy before initial focus, generated reading-unit state, or event handling. In a disallowed mobile environment, direct `#document-navigator` is an ordinary anchor to the content root: leave the URL and browser history alone, avoid navigator activation/focus, and preserve native heading links. If the media query changes while the page is open, suspend navigator state and clear navigator-owned focus/selection/highlights; when available again, derive active state from the current URL without duplicating listeners. CSS visibility and runtime availability must agree at every transition. An explicitly opted-in presentation follows its existing entry/exit lifecycle on mobile.

The static no-JavaScript page also hides the disabled mobile controls through CSS, with complete content still visible. Navigator JS/CSS can remain in the shared static page because desktop uses the same artifact; mobile policy is distinct from all-device `none` composition.

## Terminal destinations

The Terminal home knows only a destination's public canonical route and serialized navigation capability. Extend that site-owned lookup so each enabled destination carries its resolved mobile support boolean; `none` remains distinct. Keep strict validation, frozen records, canonical paths, sorted serialization, and public-only projection. No authored or private metadata is added.

At link creation or activation, Terminal checks the current mobile predicate. A disallowed mobile destination uses its canonical path and query without `#document-navigator`; an allowed destination retains the existing fragment decoration. This applies to `open` and inline `cat`'s Open document action. Link text and guidance must not promise the navigator when the destination is ordinary reading. Unknown or disabled capability records continue to fall back to canonical navigation.

## Validation and rollback

Test the profile default/validation and lookup round trip, then inspect emitted HTML and browser behavior for Firefly and semantic documents in desktop, touch phone portrait/landscape, touch tablet, and narrow fine-pointer contexts. Cover direct navigator fragments, ordinary heading fragments, Terminal destinations, no-JavaScript content, and `none`. Recheck the existing desktop navigator suite. A focused PLR110/Via pass should confirm ordinary reading and absence of the fixed status; restore any ADB reverse mapping and local service afterwards.

Rollback is one coherent application/configuration revision: revert the profile field, CSS/runtime gate, and lookup contract together. The lookup is generated with the publication, so there is no persisted-data migration or compatibility alias.
