# Document open and experiment launch commands

## Goal

Implement R6's direct command vocabulary split: `open <document-path>` opens a
canonical document, `launch <experiment-path>` opens an exact listed experiment,
and `cat <document-path>` keeps inline reading.

## Dependency and scope

This child depends on child A being accepted for destination-aware document
capability lookup. It owns R6/AC10 and contributes to AC3; R5/AC8 remains a shared
gate. Command registry work may be implemented separately, but final browser
destination tests must use A's enabled/disabled resolver.

In scope: command registration/descriptors, help/usage/examples, completion,
execution, wrong-resource hints, browser announcements and Terminal tests/specs.
Remove built-in `vim`; move the old experiment meaning of `open` to `launch`.

Out of scope: editors, editing/save, editor flags, aliases/history conversion,
deprecation, old-command dispatch, special `lab/<id>` syntax, arbitrary URLs,
host process execution/building and changes to canonical route validation.

## Requirements

- `open` resolves only public documents using existing cwd/root/path rules and
  emits the existing fragment-free document-navigation/open-document effect; the
  browser decorates the destination based on its capability, not the source page.
- `launch` resolves only exact listed experiment leaves with existing cwd rules:
  from `~/blog`, `launch lab/nerv`; from `~/blog/lab`, `launch nerv` or `launch
  ./nerv`; elsewhere, `launch ~/blog/lab/nerv`. `lab` alone is a directory.
- `cat` remains inline document reading. Documents passed to `launch` and
  experiments passed to `open` fail with an actionable appropriate-command hint.
- Completion follows the command's resource kind and retains safe physical path/
  metadata matching, cwd-sensitive relative/rooted forms, listed filtering,
  ambiguous/no-match focus behavior, standalone restrictions and private exclusion.
- Help, usage, completion, execution, errors, examples, browser announcements,
  live specs and tests agree. `vim` follows ordinary unknown-command behavior;
  there is no built-in compatibility alias or fallback dispatch.

## Acceptance Criteria

- [ ] Help/registry/completion/execution use `open` for documents and `launch` for
      experiments; `cat` stays inline and `vim` is not registered.
- [ ] Cwd-relative/rooted paths, exact listed leaves, missing/extra operands,
      directories, wrong resource kinds, unknown/private/unlisted targets and
      standalone policies have bounded errors and no navigation on failure.
- [ ] Document `open` destination navigation preserves canonical route/query,
      same-origin validation and A's enabled/disabled fragment behavior; pure
      effects remain fragment-free.
- [ ] Completion inserts safe physical operands, never titles/host paths, and
      uses the correct command's candidates and labels.
- [ ] No old experiment-open dispatch, vim alias, history conversion, redirect or
      compatibility branch exists; active legacy fragment behavior is absent.

## Risks and rollback

Command-name swaps can leave help/completion/error surfaces out of sync. Treat the
registry descriptor as the source of truth and update all projections together.
There is no legacy rollback alias; revert the complete command revision if needed.
