# Terminal relative resource paths

## Goal

Make the interactive Terminal honor its visible virtual current directory: an
item presented by `ls` must be usable by the relevant read/open command as a
relative operand when doing so is safe and unambiguous. Preserve canonical
absolute-style operands and the existing static/no-JavaScript recovery surface.

## Confirmed facts

- During production acceptance, `ls` inside the virtual lab directory displayed
  `nerv/`, while `open nerv` returned a usage error and the longer canonical
  spelling worked.
- The reported behavior is deterministic in the Terminal command layer, not an
  intermittent deployment failure.
- This task is a child of the production-rollout record. The parent stays
  incomplete until this defect is fixed, released, and re-verified.
- UI research reinforces preserving keyboard-first interaction, visible focus,
  clear local error recovery, and the existing Terminal visual language; this
  task does not introduce a new visual design, asset, font, or motion system.
- The complete command-surface audit found no equivalent defect in `cat`,
  `vim`, `cd`, or `ls`: they already resolve their supported operands through
  the current virtual cwd. `open` and its completion are the only confirmed
  canonical-only mismatch. See
  `research/terminal-resource-path-contract.md`.

## Requirements

- R1: Define one consistent relative/absolute virtual-path contract across the
  resource-facing Terminal commands and their completion behavior: only
  `~/blog` and `~/blog/<path>` are absolute user operands; a leading slash is
  rejected rather than reinterpreted as the blog root.
- R2: Fix the reported relative `open` behavior without weakening experiment
  catalog validation, resource containment, canonical URL generation, or
  native recovery links. `open` must not retain a cwd-independent shorthand
  that makes a root-relative spelling unexpectedly work from a nested cwd.
- R3: Inspect equivalent nested/root/absolute, ambiguous, invalid, and
  completion cases for `open`, `cat`, `vim`, `cd`, and `ls`; fix every confirmed
  inconsistency that belongs to the same path-resolution contract, including
  `tree`, named-resource `grep`, and scratch-file redirects.
- R4: Add focused unit and browser coverage for the corrected interaction,
  including keyboard ownership and no-focus-loss behavior where applicable.

## Out of scope

- New Terminal commands, new resource types, changes to published URL grammar,
  direct filesystem access, or a change to the experiment registry/security
  model.
- Visual redesign, new animations, remote data loading, SSR, or M5.1 work.

## Resolved path-root decision

`~/blog/` is the only public absolute virtual-path root. Every other accepted
operand is relative to the current virtual cwd. The short `/...` virtual-root
form is removed from command input, help, completion, and tests so an apparent
Unix-root path never silently means the blog root.

Internal VFS keys and browser URL/href values remain slash-rooted; they are not
user operands and must not be migrated.

## Acceptance criteria

- [ ] A listed resource can be opened/read from its containing virtual
      directory using the same safe relative spelling the user sees.
- [ ] Safe `~/blog` absolute spellings work from every cwd, while slash-root,
      unsafe, control-bearing, ambiguous, and unknown operands remain rejected
      without navigation or focus loss.
- [ ] Equivalent path-bearing commands and completion have an explicit,
      evidence-backed consistency decision; each confirmed defect is fixed and
      covered.
- [ ] Focused unit/browser checks and relevant existing full checks pass; the
      fixed release is re-verified in the parent production task.
