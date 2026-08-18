# Make terminal document paths shell-intuitive

## Goal

Make explicit mount-qualified paths in the `~/blog` virtual terminal behave
like ordinary root-relative paths, so a visitor can use `cat pages/about.md`
after discovering `/pages/about.md` in `tree`/`ls` without memorizing a special
absolute-path rule. Keep the existing convenient bare-post path behavior.

## Background and confirmed facts

- `tree` output uses `lab/nerv/` to identify an experiment entry. Experiments are
  not Markdown resources and are opened with `open lab/nerv`.
- The virtual working directory can be `~/blog`. In that directory,
  `resolveVirtualPath()` currently places every non-absolute resource operand
  under `/posts`, so `cat pages/about.md` searches for
  `/posts/pages/about.md`.
- `cat /pages/about.md` and `cd pages` followed by `cat about.md` currently
  work.
- `cat`, `grep`, `vim`, `open`, `cd`, `ls`, and `tree` use the same bounded VFS
  path contract, with the resource commands delegating to
  `presentations/terminal/src/vfs/paths.ts`.
- Existing browser coverage at `apps/site/tests/terminal.spec.ts:193-196`
  intentionally requires `cat ./pages/about.md` to fail. The product change
  must replace that assertion with the new behavior.
- Existing completion already exposes root mount names and absolute page
  paths; the implementation must keep completion output and execution
  semantics aligned.

## Requirements

### R1. Root-relative mount paths

When the current virtual directory is `/`, a resource operand beginning with
`posts/`, `pages/`, or `lab/` must resolve from the virtual root. The same rule
must apply when the operand begins with `./` followed by one of those mount
names. This must work consistently for `cat`, `grep`, and `vim`.

Bare filenames and non-mount-qualified relative paths at `/` must retain their
current posts-default behavior. Absolute paths must retain their current
behavior.

### R2. Experiment navigation feedback

`cat lab/<id>` must not render an experiment as document text. When the path
resolves to a listed experiment, the terminal must explain that it is an
experiment and provide the executable command `open lab/<id>`.

Unknown paths must continue to fail safely without exposing host paths or
unlisted resources.

### R3. Cross-command and completion consistency

The shared resolver remains the source of truth. Directory/pattern commands
must not acquire a conflicting interpretation, and existing root mount
completion, nested post completion, absolute page completion, and experiment
completion must remain valid.

### R4. Regression coverage

Add or update focused neutral-command and runtime/browser tests for root
relative `pages/...`, `./pages/...`, `posts/...`, and `lab/...` operands; retain
coverage for bare posts, absolute pages, nested directories, unsafe traversal,
and `open lab/<id>`.

## Acceptance Criteria

- [ ] From `~/blog`, `cat pages/about.md` and `cat ./pages/about.md` render the
      About page.
- [ ] From `~/blog`, resource search/navigation commands resolve explicit
      `posts/...` and `pages/...` mount paths consistently, while bare post
      filenames still work.
- [ ] `cat lab/nerv` does not render document content and reports an actionable
      `open lab/nerv` suggestion.
- [ ] Absolute paths, nested post paths, safe completion, and traversal/unsafe
      path rejection retain their existing contracts.
- [ ] Terminal package type-check/build/tests and the focused site Terminal
      browser test pass.

## Out of scope

- Enabling `..` traversal for resource operands from nested directories.
- Treating experiments as Markdown documents or adding shell commands beyond
  the existing `open` navigation flow.
- Reworking the virtual filesystem security boundary, content projection, or
  canonical web routes.

## Open questions

None. The approved strategy is root-only, explicit-mount compatibility with
bare posts preserved.
