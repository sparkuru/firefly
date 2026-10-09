# Firefly Terminal refinement, excluding lab

## Goal

Refine the main site's reading, navigation and interaction craft while preserving the Terminal mental model and restrained appearance the owner likes. Award-level work is a reference for execution quality; award qualification is not a deliverable.

## Authorization

The owner approved task creation and planning, then selected refinement of the existing Terminal identity rather than a larger redesign. The owner wants the agent to exercise experienced frontend judgment on details. On 2026-10-08, after the final planning summary was presented, the owner explicitly approved implementation with “开始实施”.

## Background

The assessment in `research/assessment.md` covered eight design dimensions and six routes in existing-build desktop/mobile captures. Standalone prose occupied approximately 1150px at 1440px desktop width; native mobile directory anchors had approximately 21px element height. Homepage inline mobile directories already provide larger targets. Terminal and Memo intentionally have distinct presentations.

Further source inspection found that the early 82ch stream paragraph declaration is overridden by a later 100% rule in `terminal.css:1666`. Effective reading measure must therefore be reviewed in both standalone and streamed documents.

## Requirements

### Owner revision after visual review (2026-10-08)

The owner requested these changes after inspecting the implemented preview.
This explicit revision authorizes continued implementation and supersedes the
earlier narrow-measure and recurring-placeholder decisions below.

- Restore the previous page-dependent wide default prose in standalone and
  `cat` reading. Retain unrelated typography, touch and feedback improvements.
- Show the empty-input `help` hint only on the first interactive index visit
  in the same browser; retire it after initial use and suppress it on subsequent
  reloads/returns. It remains a placeholder, never a command value. Storage
  failure must not prevent the Terminal from operating.
- After safe Tab completion, settle the command row and candidate panel into
  view. Center the group when it fits; cap upward prompt movement at the
  viewport midpoint for oversized panels and keep the active candidate visible.
  Preserve candidate selection/acceptance, focus, IME and modified-key guards,
  local scrolling, reduced motion and mobile no-shell ownership.
- Regression acceptance replaces AC1's narrower-measure expectation with
  previous page-wide prose alignment, AC4's repeated hint with first-visit
  behavior, and adds completion visibility after long transcript output,
  repeated selection and oversized candidate sets.

- R1: Retain the previous page-dependent wide default prose in standalone and `cat` reading, preserving intentional authored line breaks, complete content, headings, IDs and locally scrollable wide code/tables.
- R2: Refine typography and vertical rhythm across document titles, metadata, outline, body and native directories. Preserve the existing font family, tree/path vocabulary, alignment and deliberate breathing room.
- R3: Give primary touch navigation controls in canonical directories and article outlines comfortable non-overlapping targets, consistent with the homepage's existing touch policy. Fix the Memo mobile month-index target within its independent reader.
- R4: Improve discoverability of `help` through a subdued first-index-visit-only empty-input hint, and polish link/control hover, press and focus feedback using existing semantic colors and restrained motion. Hint text must not become executable input or a new onboarding surface.
- R5: Preserve desktop command/input/history/completion/navigation semantics, authored boot voice, search/IME/history and mobile no-Terminal ownership. Add completion viewport settlement without changing command resolution or selection/acceptance. Preserve no-JS reading/navigation, theme selection and paper content isolation.
- R6: Apply frontend judgment through measured and visual before/after comparison. Reuse existing components/styles; retain only improvements with observable benefit. Distinguish measured results from subjective assessment.

## Out of Scope

- `/lab/` pages and experiments, broad rebranding, new fonts/palettes, immersive effects, scroll interception, new command/navigation systems and onboarding panels.
- Replacing Memo's independent reading layout or adding a dark-mode/theme system to it. Its current colors and time mapping remain intact.
- Authored content/configuration changes, X Core/adapters, routes, publication or private services, source migration, production deployment and automatic commits.

## Acceptance Criteria

- AC1 (R1): On a wide viewport, default prose retains its previous page-dependent shell alignment in both reading entry points; Chinese/English/mixed examples remain complete. Wide content scrolls locally and paper content keeps its own styling.
- AC2 (R2): Before/after captures show deliberate heading/metadata/outline/body hierarchy and coherent spacing for short/long documents and directories; no heading, source text, anchor or outline entry is removed.
- AC3 (R3): Sampled primary canonical-directory navigation, outline links and Memo month control have at least 44px touch height without overlap; long labels wrap and keyboard access remains usable.
- AC4 (R4): First interactive index visit provides a subtle help placeholder with empty value. Initial use retires it and reload/return suppress it; blocked storage retains usable commands and mobile does not consume the first desktop hint. Focus is visible and feedback does not block input.
- AC5 (R5): Static and interactive desktop/mobile gates pass, including mobile no-shell behavior, theme persistence, paper isolation, command/navigator behavior and search/browse regressions. Safe completion after long output centers fitting prompt/candidate groups; oversized lists keep the prompt at midpoint and reveal active options locally. Repeated Tab/Arrow, Enter/Space acceptance, unique/no-match, IME/modifier guards and input focus remain correct.
- AC6 (R1–R5): Desktop, 375px mobile, touch tablet, landscape, enlarged text and reduced-motion checks on affected surfaces show no page-level overflow, clipped controls or fixed-toolbar overlap. Emulation and subjective judgment are reported separately from physical-device/assistive-technology acceptance.
- AC7 (R6): Each retained change has a documented reason and before/after evidence. Stop once acceptance passes, no high-priority finding remains and two successive visual review rounds reveal no material improvement justified by the extra complexity. New product decisions return to the owner.

## Assessment Evidence

`research/assessment.md` records the initial assessment. `design.md` and `implement.md` define the approved bounded refinement and verification plan. Implement/check manifests contain explicit context. Implementation and validation evidence will be recorded separately from the initial existing-build observations.

The initial implementation and verification are recorded in `research/implementation-results.md`, `research/check-results.md` and `research/final-validation.md`. They describe the first candidate. The owner revision is implemented, independently reviewed and verified in `research/owner-revision-validation.md`: complete gate, normal packaging and local preview readiness passed. Final owner visual/Git acceptance remains pending.
