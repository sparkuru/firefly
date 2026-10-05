# Frontend Design and Verification Workflow

Firefly has Astro pages, presentation styles and browser interactions; this is
a frontend/UI project. Pure Docker/CLI/spec changes do not require design
generation or mobile UI adaptation. UI-visible tasks read this file and the
single browser profile in `validation-profile.md` before implementation.

Codex's local UUPM entry is `.codex/skills/ui-ux-pro-max/SKILL.md`, with its
`scripts/search.py`, `scripts/core.py`, `scripts/design_system.py` and `data/`
tables present. It remains local/untracked. Recheck those files at UI task
start; if absent/incomplete, ask before `uipro init --ai codex`. Do not install
for all platforms, overwrite skills, or equate a global install with local
initialization. Declining skips UUPM generation, retaining normal UI tests.

For an authorized UI task:

1. Plan: load the local skill and relevant frontend contracts. Run its
   `scripts/search.py --design-system` flow with the actual feature domain,
   direction and supported stack. Store allowed raw research in normal task
   `research/ui-ux-pro-max.md`; distill approved decisions into `design.md`.
   Specify responsive layout, loading/empty/error/disabled/success states,
   focus/keyboard, touch, reduced motion and accessible names. Use a supported
   stack from `search.py --help`, not an invented Astro flag.
2. Context: register approved `design.md`, permitted research, this policy
   and relevant frontend/browser contracts in both implement/check JSONL.
   Preserve existing entries; do not assume links load transitively.
3. Implement: follow the approved design and existing tokens/components.
   Resolve invalidated decisions in the approval/design record, not silently
   in code. Do not introduce a second editable design-system master.
4. Check: exercise actual user actions/states, responsive typography/spacing,
   focus/names/contrast, touch targets, reduced motion and relevant performance.
   Browser-capable acceptance uses maintained Playwright tests with semantic
   locators and controlled fixtures. Report desktop and narrow-mobile results
   separately; emulation does not certify physical-device engines.
5. Update Spec: promote only original stable reusable decisions into shared
   project specs. Research stays task-specific and requires verified source/
   retention permission; do not copy third-party prose/code into project policy.

Classify UI automation as `playwright-required`, `playwright-existing-equivalent`,
`playwright-not-effective` or `playwright-unavailable`. The latter names an
exact prerequisite failure and never counts as pass. Classify mobile before
implementation: `mobile-required` for ordinary supported pages/flows,
`mobile-not-applicable` for evidenced non-UI/desktop-only scope, or
`mobile-unavailable` with the missing check. Missing tests are not an exclusion.
Keep configured trace/screenshots/reports on failure. Do not auto-accept changed
visual baselines or weaken assertions. Human review covers only remaining
subjective, physical-device, assistive-technology or private-environment risk,
through `commit-policy.md` before any authorized commit/archive.
