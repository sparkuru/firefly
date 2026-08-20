# Terminal contract extract

## Source

Distilled from `.trellis/spec/frontend/type-safety.md`, “Scenario: Terminal
Index, Registry, and Effects”, and the current `terminal-home.ts`/
`terminal.spec.ts` evidence on 2026-08-20.

## Applicable contract

- The runtime export is pure and side-effect-free. It returns closed typed
  completion/effect values; the home controller owns DOM, focus, announcements,
  and recovery.
- Any completion-result union change must remain exhaustive and update its pure
  producer, browser controller, unit tests, and browser tests together.
- Candidate order remains deterministic. The controller must never reconstruct
  an executable path or route from a display candidate; use a typed runtime
  value for all accepted candidate text.
- The prompt prevents every Tab event only while focused. Only unmodified,
  non-composing Tab may alter completion. Tab outside the prompt remains native.
- Safe ambiguous and safe zero-result path completions retain input/focus and
  their prefixed candidates. Unsafe input must never be rewritten.
- A terminal home interaction keeps native no-JavaScript recovery, active-prompt
  focus, IME guards, global typing exclusions, text-node rendering, and fatal
  recovery behavior.
- Browser tests must cover prompt/history/IME/Tab/recovery/global typing at
  both configured viewport classes; package checks and builds use `./sam`.
