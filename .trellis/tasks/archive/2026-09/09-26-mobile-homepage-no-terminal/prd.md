# Keep the mobile homepage free of Terminal

## Goal

Mobile readers should enter a normal homepage with article search and native article browsing, without Terminal startup or command interaction. Fix the incorrect mobile baseline and preserve desktop Terminal behavior. The owner explicitly requested a new repair task and a durable mobile constraint spec.

## Background and evidence

- The 09-24 decision said mobile should be ordinary page browsing, but its task scoped the rule to document navigation (`.trellis/tasks/archive/2026-09/09-24-mobile-document-navigation-policy/prd.md:18`). The search task then explicitly assumed mobile Terminal startup (`.trellis/tasks/archive/2026-09/09-26-mobile-view-search/prd.md:26`). Passing tests therefore missed the intended homepage outcome.
- The inline startup marker installs connecting state and key guards before modules (`apps/site/src/components/TerminalHome.astro:78`). The module entry calls search and Terminal unconditionally. `startTerminalHome` creates state/listeners/boot work and then hides native recovery and reveals the command session (`apps/site/src/scripts/terminal-home.ts:1083`).
- Mobile CSS and the search spec explicitly retain a Terminal session below search (`apps/site/src/styles/terminal.css:151`, `.trellis/spec/frontend/homepage-search-contract.md:117`). These expectations must be corrected.
- Existing device eligibility is `MOBILE_DOCUMENT_NAVIGATION_QUERY = '(hover: none) and (pointer: coarse)'` (`apps/site/src/lib/document-navigation.ts:16`). Reuse it for portrait/landscape phones and touch-primary tablets; narrow fine-pointer desktop remains desktop.

## Requirements

- R1. Mobile home displays existing search and the complete native public article index. Do not show boot logs, command prompts/input, transcript, completion, or shell-only instructions, before modules load or afterward.
- R2. An initially mobile page must not initialize Terminal session state, its boot gate, command execution, or input ownership. Terminal must not capture typing, Escape, Ctrl+L, composition, touch, or native links. No autofocus or automatic software keyboard.
- R3. Preserve search title/body matching, IME, Enter, clear, counts, no-results feedback, canonical links, public-only projection, and local-only queries. Native browsing remains available with disabled/delayed/missing JavaScript and search failure; search must not depend on Terminal readiness.
- R4. CSS and runtime use the existing touch/no-hover predicate. Desktop-to-mobile transitions release hidden Terminal focus, suspend its interaction and pending boot, and expose native browsing. Returning to desktop establishes one usable session without duplicate listeners or command effects.
- R5. Preserve desktop startup, command semantics/history, transcript, shortcuts, and recovery, plus existing article rendering and document navigator mobile policy.
- R6. Add a focused mobile experience contract under `.trellis/spec/frontend/` and link it from the index. Distinguish homepage Terminal availability from document navigator support. Correct conflicting mobile-startup/remaining-viewport paragraphs in search and content-workspace contracts.
- R7. Replace obsolete mobile-Terminal-enabled test expectations with observable absence/input/native-browsing coverage, while retaining desktop command coverage. Validate built artifacts and inspect mobile captures; do not simply hide every homepage surface or skip failures.

## Acceptance Criteria

- [x] Phone portrait/landscape and touch-tablet homepages show search and complete native links, with no boot or command UI before/after the normal boot delay. (R1, R4)
- [x] Initially mobile pages have no initialized Terminal controller or boot transcript; native typing/Escape/Ctrl+L/composition events are not prevented or redirected by Terminal, and search is not autofocused. (R2)
- [x] Metadata/body queries, Chinese IME, Enter, clear, counts, no-results and canonical result navigation work; clear keeps ordinary browsing available. (R3)
- [x] Disabled/delayed/unavailable JavaScript and search failure retain native browsing without a Terminal flash or inert search controls. (R1, R3)
- [x] Desktop-to-touch changes during connecting and ready states hide/suspend Terminal and release its focus; touch-to-desktop initializes/resumes once without duplicate command effects. (R4, R5)
- [x] Normal/narrow fine-pointer desktop startup, commands, shortcuts, clear, recovery and document navigation pass regressions. (R4, R5)
- [x] Mobile search/list layouts do not overflow horizontally; controls retain visible focus and at least 44px targets. (R1, R3)
- [x] The indexed mobile spec contains concrete eligibility, lifecycle, failure and test constraints, and conflicting search/workspace paragraphs are corrected. (R6)
- [x] Site gates, affected browser checks and viewport visual review pass and are recorded, with no authored/private content, dependency or schema changes. (R7)

Final evidence and the independent review are recorded in `research/validation.md`.

## Scope Boundaries

Changes belong to site homepage composition, browser lifecycle, styles, tests, and Trellis records. No command feature, navigator redesign, configuration field, dependency, content migration, deployment or remote service is requested. Retain public templates and existing native non-shell links; this is not a general homepage redesign.

## Decisions and Deferred Items

The owner confirmed mobile home should show search and article browsing without startup animation or command line; desktop retains Terminal. Task creation and spec capture are explicitly authorized. No product decisions remain unresolved. Real-device software-keyboard review is optional; automated touch/input-mode checks and viewport inspection are required. The owner approved the final planning summary with "开始", authorizing implementation.
