# Owner review revision context

## Authoritative revision

The owner requested restoration of previous page-dependent text width, a
first-index-visit-only `help` placeholder and viewport settlement for Tab
completion after long output. PRD/design revision sections supersede the first
candidate's narrow measure and recurring hint. Implementation is authorized;
Git/archival permission remains separate and pending.

## Focused source guidance

`content-workspace-contract.md` is too large for complete context injection.
Read its Terminal controller boundaries directly, especially lines 1038–1100,
1180–1255 and 1628–1655, together with actual controller/tests. Some older
completion presentation prose describes an earlier two-line ambiguous state;
the live listbox controller and maintained keyboard tests are the current
selection/acceptance contract. Do not restore obsolete presentation.

- `terminal-home.ts` owns prompt focus, Tab guards, completion rendering,
  active option and input selection/acceptance, viewport settlement, startup
  lifecycle and no-shell input-mode gating.
- The command runtime/presentation package remains the command-resolution
  source. This revision changes browser presentation only.
- Preserve exact input/focus for ambiguity/no-match, unique completion rewrite,
  modified/composing keyboard behavior and candidate acceptance/history.
- Fit prompt/candidate group into the viewport when possible, clamp upward
  prompt movement at its midpoint for oversized lists, and reveal active
  selection with local scrolling. Honor reduced motion.
- Read pre-task `HEAD` CSS for restoration instead of selecting another fixed
  paragraph measure. Wide code/table/paper boundaries retain independent rules.
- Browser-local hint storage is guarded; mobile must not consume a first
  desktop hint. No owner configuration/content or lab design changes.

## Evidence ownership

The initial complete gate and packaging passed, but are historical evidence
for the first candidate. Revised source needs focused and integrated checks.
Record new results separately; never report old totals as a revised pass.
Synthetic browser fixtures and ignored screenshots preserve owner privacy.
