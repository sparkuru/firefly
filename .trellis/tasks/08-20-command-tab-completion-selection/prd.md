# Command Tab completion selection

## Goal

Make the Terminal home feel more like a usable command line: ambiguous `Tab`
completion should expose a readable candidate list and keyboard selection, while
a focused prompt supports a small, predictable line-editing shortcut set.

## Background

- `apps/site/src/scripts/terminal-home.ts` currently renders every ambiguous
  result as `Matches: a, b, c`, followed by `input unchanged by design; type
  more to complete.`
- The browser controller owns an unmodified prompt `Tab` and keeps focus in the
  prompt. It applies only a unique completion.
- `presentations/terminal/src/runtime.ts` returns sorted, deduplicated candidates
  and can distinguish `unique`, `ambiguous`, `no-match`, and `none`; it does not
  currently expose an active candidate or selection state.
- Existing interactive tests explicitly preserve the unchanged-input behavior
  for ambiguous `cd` and path completions.
- The owner selected this interaction: the first `Tab` completes the longest
  shared prefix and renders candidates vertically; subsequent unmodified `Tab`
  presses cycle a visible active candidate; `Enter` or `Space` commits that
  candidate.
- `apps/site/src/scripts/terminal-home.ts` already handles prompt-focused
  `Ctrl+C`, `Ctrl+L`, history arrows, and `Tab`. Its browser tests assert that
  `Ctrl+L` clears the transcript and preserves command history.
- The owner approved `Ctrl+A` (select line), `Ctrl+E` (move to line end),
  `Ctrl+U` (delete from line start through the cursor), and `Escape` (dismiss
  the completion panel) as the initial additional shortcuts.

## Requirements

- R1: The first unmodified `Tab` on an ambiguous completion must apply the
  longest common completion prefix (when it extends the input) and show a
  vertical candidate list without committing a candidate.
- R2: Each following unmodified `Tab` must move a visible active candidate
  forward with wrap-around; `Enter` or `Space` commits that active candidate
  into the prompt without submitting it. A later `Enter` submits normally.
- R3: `Escape` dismisses the completion panel while retaining the current
  prompt text. Any input mutation, command submission, `Ctrl+C`, `Ctrl+L`, or
  history navigation clears the completion panel and active selection.
- R4: Preserve sorted deterministic candidates, unique-completion behavior,
  IME/modifier handling, native Tab behavior outside the prompt, and existing
  safe-path restrictions.
- R5: Establish a single documented shortcut boundary for the focused command
  prompt, so supported command-line shortcuts behave consistently without
  capturing typing in native controls or ARIA widgets elsewhere on the page.
- R6: Treat browser- and operating-system-reserved shortcuts as best-effort
  only. A shortcut is a supported command shortcut only when the browser sends
  a cancelable key event to the page.
- R7: Support exactly these additional prompt-local shortcuts: `Ctrl+A`,
  `Ctrl+E`, `Ctrl+U`, and `Escape`. Do not capture `Ctrl+W`, `Ctrl+R`,
  `Ctrl+T`, browser navigation, browser refresh, browser address-bar, or
  assistive-technology shortcuts.

## Acceptance Criteria

- [ ] An ambiguous completion applies its longest common prefix once, then is
      readable as a vertical, semantically exposed candidate list without the
      reported inline comma-separated sentence.
- [ ] A second and later `Tab` moves a visible active candidate with
      wrap-around; `Enter` or `Space` commits it without executing, and the
      next `Enter` submits normally.
- [ ] Unique and no-match completion, prompt focus ownership, and unsafe-path
      rejection retain their existing behavior.
- [ ] Focused runtime and browser tests cover the adopted ambiguous-completion
      interaction at desktop and mobile viewports.
- [ ] The supported shortcut set and the scope in which it is intercepted are
      documented and browser-tested; unsupported or browser-reserved shortcuts
      retain their native behavior.
- [ ] `Ctrl+A`, `Ctrl+E`, `Ctrl+U`, and `Escape` work only for an unmodified,
      non-composing focused command prompt, preserve focus, and reset the
      completion state as specified.

## Out of Scope

- Replacing the native command input with a third-party terminal/editor widget.
- Changing command parsing, filesystem visibility, completion candidate order,
  or the guest-content model.
- Broader Terminal visual redesign unrelated to ambiguous completion feedback.
- Capturing browser chrome, operating-system, assistive-technology, or
  non-cancelable shortcuts.
