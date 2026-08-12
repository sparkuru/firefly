# UUPM Context — Restrained Semantic Editorial Surface

## Status

Approved product direction. The owner selected **restrained editorial** on
2026-08-12. This file is shared implementation/check context, not a second PRD.

## Query and Result

The project-local UUPM search ran with:

```text
personal blog long-form reading content-first semantic editorial minimal static
no-javascript accessible
```

Design dials were variance `3/10`, motion `1/10`, and density `4/10`. A second
UX-domain query covered long-form reading, accessibility, responsive navigation,
focus, typography, and overflow.

The useful recommendations were:

- content-first/editorial composition with excellent static performance;
- high-contrast text on a paper-like light surface;
- a 65–75-character long-form measure;
- visible keyboard focus and a skip link;
- sequential headings and predictable navigation;
- responsive behavior at 375, 768, 1024, and 1440 widths;
- no document-width horizontal overflow, with local overflow handling for wide
  tables or code;
- restrained motion and explicit reduced-motion handling if motion exists.

## Approved Interpretation

M2 refines the M1 neutral foundation rather than replacing it:

- retain the system-font stack; no network font request;
- retain neutral `--surface`, `--text`, `--border`, subdued link, and visible
  focus semantics, adjusting values only when measured contrast requires it;
- keep content at the center, using whitespace and type scale for hierarchy;
- add a compact on-page outline only when the document has enough headings to
  make it useful;
- make wide tables/code locally scrollable and visibly keyboard focusable when
  needed;
- add no decorative route transition, entrance choreography, or client script.

## Explicitly Rejected UUPM Output

The generated newsletter pattern, subscription CTA, subscriber proof, hot-pink
accent, external Atkinson Hyperlegible Google Font import, exaggerated statement
type, and GSAP route transition do not fit the approved milestone or repository
constraints. They must not appear in implementation as accidental defaults.

## Verification Context

- Desktop: Chromium `1440x900`.
- Mobile: Chromium `375x812`.
- Browser JavaScript remains disabled for the main-site suite.
- Verify visible skip-link/focus behavior, readable measure, sequential headings,
  outline navigation when present, localized table/code overflow, and absence of
  document-width overflow.
- Human residuals are limited to subjective typographic rhythm, real devices,
  and assistive technology after automated evidence passes.
