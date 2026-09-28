# Document open and experiment launch commands — implementation design

## Registry and resource dispatch

Use the existing definition-owned command registry. The document descriptor is
named `open`, uses the existing document resolver/completion and emits the same
fragment-free document effect. The experiment descriptor is named `launch`, uses
the exact listed experiment resolver/completion and emits the existing navigation
effect. `cat` retains its current document stream. Remove `vim` from the built-in
registry and remove the old experiment branch from `open`; do not preserve either
meaning through aliases or fallback dispatch.

Wrong resource kinds are normal validation errors with `open`/`launch`/`cat`
guidance. Directories, URLs and unlisted experiments are not executable targets.
The command parser, standalone policy, redirect/pipeline policy and private
filtering remain unchanged.

## Completion and browser boundary

Bind document completion to `open` and experiment completion to `launch`, not by
renaming display text only. Preserve cwd-sensitive virtual paths, metadata title
matching and aligned physical `candidateValues`/presentation labels. The browser
receives validated structured effects and the fragment-free canonical document
href; A's destination capability lookup is the only source for adding
`#document-navigator`. It never constructs a route from raw command text.

Update command help, examples, error hints (`cat`/`ls`), accessibility
announcements and live contracts in the same change.

## Compatibility policy

This is direct replacement. Ordinary unknown-command handling covers `vim`, and
`open` given an experiment returns a `launch` hint. Do not add deprecation text,
history migration, alias registration, dual command names or special `lab/<id>`
dispatch.
