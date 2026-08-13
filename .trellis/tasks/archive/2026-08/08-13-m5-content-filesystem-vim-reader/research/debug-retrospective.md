# Debug Retrospective: Terminal Focus and Breadcrumb Geometry

## 1. Root Cause Category

- **Category:** B/D/E — cross-layer contract, test gap, and implicit assumption.
- **Specific cause:** Pure completion state did not model ownership for a safe
  zero-result path, so the DOM controller let native Tab move focus. Breadcrumb
  tests validated normalized text but assumed whitespace inside inline-flex
  children would remain visibly spaced.

## 2. Why Earlier Fixes Failed

1. Unique-only Tab handling covered successful insertion but intentionally left
   every other cardinality native.
2. Adding ambiguous ownership fixed the reported multi-match case but still
   collapsed safe zero-result and unsafe input into generic `none`.
3. Correcting breadcrumb token text removed `cd` and duplicate slashes, but flex
   collapsed separator-adjacent text whitespace.
4. Initial geometry assertions compared neighboring tokens and could fail on
   legitimate responsive line wrapping instead of measuring the owned gaps.

## 3. Prevention Mechanisms

| Priority | Mechanism | Specific action | Status |
| --- | --- | --- | --- |
| P0 | Architecture | Distinct exhaustive `no-match` completion state owns safe empty results | Done |
| P0 | Browser tests | Assert focus/native Tab for unique, ambiguous, safe empty, unsafe, modifiers, and IME | Done |
| P0 | Markup/CSS | Represent approved separators and spacing as explicit slash/gap elements | Done |
| P1 | Geometry tests | Measure six owned gap boxes across desktop/mobile rather than token co-line assumptions | Done |
| P1 | Documentation | Record browser ownership and visual-token checklist in the cross-layer guide | Done |

## 4. Systematic Expansion

- **Similar issues:** Global typing, Vim key ownership, completion candidates,
  focus settlement, and any UI that mixes native keyboard traversal with a pure
  state machine.
- **Design improvement:** Make behavior ownership part of typed results whenever
  a controller decides whether to call `preventDefault()`.
- **Process improvement:** Validate exact visual grammar with semantic assertions
  plus real geometry at both configured viewports.

## 5. Knowledge Capture

- [x] Updated the executable content-workspace contract.
- [x] Updated the cross-layer thinking guide.
- [x] Added unit, static-output, focused browser, full browser, and screenshot
      evidence.
- [x] No template sync was required because this repository has no
      `src/templates/markdown/spec/` source tree; `.trellis/spec/` is authoritative.
