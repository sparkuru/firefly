# Memos Redesign Implementation Evidence

## Implemented Boundary

The approved light reader is implemented in the site-owned Memo components,
layout, scoped stylesheet and runtime. No authored content, dependency,
canonical route, publication, import or shared Terminal behavior changed.

- `MemoLayout.astro`: one site identity, one primary navigation landmark,
  desktop left navigation, responsive top navigation and a stable-height header.
- `MemoDocument.astro`: generous feed intro with actual public-entry count and
  newest-first label; coordinated detail return navigation.
- `MemoTimeline.astro`: right desktop history rail, horizontal narrow rail and
  an ARIA-hidden cursor date bubble; empty timelines omit the month disclosure.
- `memo.css`: silver/white surfaces, clear muted text, fine dividers, roomy feed
  padding, bounded prose, local wide-content scrolling and control feedback.
- `memo-shell.ts`: route-owned measured header clearance and compact label when
  the intro leaves view. Header height stays stable throughout the feedback.
- `memo-timeline.ts`: UTC+8 date bubble during drag/keyboard/fragment seeking;
  bounded bubble position and 1.4-second target emphasis on discrete seeks.
  Existing immediate alignment, interaction ownership and history remain intact.
- `memos.spec.ts`: maintains all existing scenarios and adds layout, feedback,
  final settled appearance and explicit native-anchor clearance checks.

Both CSS and runtime retain the 48rem horizontal-rail breakpoint. Desktop left
navigation begins at 75rem. Short narrow viewports cap the rail while leaving
reading space; the rail can scroll internally. Static CSS reserves tail space
and expanded-month anchor clearance; initialized runtime still measures precise
tail space and target clearance.

## Executed Checks

Existing repository-local dependencies were available; no installation or
lockfile modification was needed. Docker execution used the approved wrappers.

| Command | Result |
| --- | --- |
| `./sam npm --prefix apps/site run check` | Passed; 0 errors, 0 warnings, 9 existing deprecation hints in other tests |
| `./sam npm --prefix apps/site run test:content` | 113 passed, 0 failures |
| `./sam npm --prefix apps/site run test:x-core` | 9 passed, 0 failures |
| `./preview.sh render npm run prepare:test:memos` | Public/empty/single synthetic builds passed |
| `./preview.sh render npm run test:e2e:memos` | Final matrix: 23 passed, 9 intentional project-specific skips |
| `git diff --check` | Passed |

Browser projects were recorded independently:

| Project | Passed | Intentional skips |
| --- | --- | --- |
| Desktop interactive, 1440x900 | 7 | 1 mobile touch scenario |
| Desktop static, 1440x900 | 4 | 4 enhancement/touch scenarios |
| Mobile interactive, 375x812 | 8 | 0 |
| Mobile static, 375x812 | 4 | 4 enhancement/touch scenarios |

Additional maintained scenarios exercise feed/details at 900x900, 768x1024 and
667x375, plus 200% root text sizing. Checks cover page-wide overflow, right-rail
placement, comfortable detail reading, single H1, current navigation, actual
pointer/touch/keyboard actions, active dates, native scroll, orientation changes,
detail Back/return, empty/single states, controller failure, reduced motion and
native month/oldest-target clearance with and without JavaScript.

New token contrast was calculated using WCAG relative luminance: body text on
white 16.83:1, muted text on silver 5.56:1 and white 6.05:1, accent on its light
active surface 5.02:1 and white 5.57:1, white date-bubble text on charcoal 16.83:1.
Existing highlighted-code colors are unchanged.

## Diagnostic Captures

Ignored output remains under `apps/site/test-results/memos-browser/`.

- `memos-unified-static-feed--11c7a--policy-and-Pages-discovery-memos-desktop-interactive/`
  contains `integrated-memo-reading.png` and `integrated-memo-detail.png`.
- The corresponding `memos-mobile-interactive/` project directory contains
  the narrow feed/detail captures.
- `memos-compact-heading-keep-87eb8-k-identifies-discrete-seeks-memos-desktop-interactive/`
  and its mobile counterpart contain `integrated-memo-compact-seek.png`.
  These now poll final label/bubble opacity before capture; the final heading
  contains no overlapping resting text.
- `memos-spacious-light-feed--986ec-ation-and-readable-measures-memos-desktop-interactive/`
  contains feed/detail captures suffixed `900`, `768` and `667`.
- Empty/single/overflow scenarios retain their existing zoom captures.

These are synthetic diagnostic evidence, not an accepted visual baseline.
The implementation pass inspected representative desktop/mobile feed/details,
zoom and settled compact-heading captures.

## Main-Session Follow-Ups

- Independently check implementation/spec agreement and the final browser gate.
- Run broader repository verification, packaging and restore the normal preview;
  synthetic fixture output is not the owner's normal publication build.
- Inspect actual selected-corpus reading and request the owner's subjective
  feed/detail acceptance. Device emulation does not certify physical devices or
  assistive technology.
- The main session owns shared Memo contract/mainline updates. Include the right
  rail, shared light shell, stable compact heading, visual-only date feedback,
  discrete seek emphasis, empty disclosure omission, static tail/expanded-month
  clearance and bounded short-viewport rail as appropriate.

No commit, archive, publication or deployment was performed by the implementer.
