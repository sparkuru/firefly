# Co-locate terminal command descriptors and help metadata

## Goal

Make a terminal command module the single authoring point for that command's
identity, help metadata, parsing, execution, policy, and completion behavior.
The registry should remain an explicit, reviewable allowlist/composer, while
the Help framework should derive its command list and command detail views from
the active registry without command-specific placeholders.

## Requirements

- A built-in command module owns its canonical name, aliases, usage, summary,
  group/order, pipeline/substitution/redirect policy, argument parser, executor,
  optional completion handler, and zero or more help examples. The `grep`
  module must demonstrate the complete shape, including its existing `-w` and
  `-E` options and examples that are rendered by Help.
- The registry remains a static composition point: it explicitly imports and
  assembles command descriptors, validates global token/metadata invariants,
  and exposes the active definitions. It must not scan the filesystem, use
  runtime dynamic imports, or rely on module side effects/self-registration.
- Help must enumerate the active registry generically, preserving group and
  order metadata. `help` remains a compact grouped command list; `help
  <command>` (including a built-in alias) presents that command's usage,
  summary, aliases, and co-located examples. Unknown detail targets fail with
  the existing bounded command-error style.
- The neutral shell, terminal runtime adapter, and browser renderer must carry
  the descriptor-owned help data through their existing structured Help
  boundary. No command-specific DOM branch or hardcoded Help row may be needed
  when a new command is added.
- Completion behavior must be associated with the command descriptor rather
  than selected by a command-name switch in the runtime. Existing contextual
  completion results and safety filtering remain unchanged.
- Existing command execution, pipeline policy, aliases, structured effects,
  custom-registry compatibility, and user-visible output remain compatible
  except for the explicitly added `help <command>` detail view and examples.

## Acceptance Criteria

- [ ] Every active built-in command definition is supplied by a command module;
      the registry contains only explicit imports/composition and shared
      validation, with no inline command-specific metadata table.
- [ ] `help` lists all active commands from the supplied registry in the
      expected groups/order, and `help grep`, `help ?`, and an unknown target
      exercise generic detail, alias resolution, and error paths.
- [ ] `help grep` exposes the examples declared by `grep.ts`; adding a test-only
      custom descriptor with examples makes those examples visible without
      changing the Help renderer or adding a command-name branch.
- [ ] The runtime no longer contains a name-based completion dispatch table;
      existing terminal unit/browser completion coverage still passes.
- [ ] Terminal type-check, unit tests, site type-check/static tests, relevant
      browser tests, task validation, and `git diff --check` pass through the
      repository's `./sam` wrapper.

## Notes

- This is one ordered task rather than independent child tasks because Help,
  descriptor projection, and completion ownership share the same registry
  contract and must be verified together.
- Dynamic command discovery is intentionally out of scope: predictable bundles,
  explicit security review, and deterministic command availability are more
  important than eliminating one registry import.
- The existing neutral `CommandSpec` contract and structured Help effect are the
  starting boundaries; implementation may introduce small shared helpers or
  split oversized command modules as long as those boundaries stay explicit.
