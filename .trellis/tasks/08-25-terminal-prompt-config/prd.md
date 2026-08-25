# Make terminal prompt marker configurable

## Goal

Expose the decorative marker currently hard-coded in the Terminal prompt as a
public `[terminal]` TOML setting. Site owners can change the marker without
editing TypeScript, while the existing marker remains the compatibility
default.

## Confirmed Facts

- `config/site.toml` is the active public build-time input and
  `config/site.toml.example` is its tracked commented template.
- `apps/site/src/lib/site-config.mjs:117-129` owns the strict `[terminal]`
  schema, and `terminalIdentityFromConfig()` maps validated settings into the
  Terminal package boundary at `:282-289`.
- `presentations/terminal/src/runtime.ts:44-49` defines `TerminalIdentity`;
  `terminalPrompt()` at `:214-216` currently embeds `(.ᗜ ᴗ ᗜ.)` and is reused
  by `formatTerminalPrompt()` at `:251-256`.
- The site renders the identity into `TerminalHome.astro` data attributes,
  `terminal-home.ts` decodes and validates it with `decodeTerminalIdentity()`,
  and `ContentDirectoryIndex.astro` formats directory prompts from the same
  server-side identity. This is the complete prompt data path.
- Existing package and site-config tests assert the current marker and exact
  identity shape in `presentations/terminal/tests/terminal.test.ts` and
  `apps/site/tests/site-config.test.mjs`.

## Requirements

1. Add `terminal.promptMarker` to the active TOML configuration and the
   commented example, using `(.ᗜ ᴗ ᗜ.)` as the documented/default value.
2. Extend the strict site-config schema and `TerminalIdentity` projection so
   the value is validated once at the TOML boundary, deeply frozen with the
   public config, and available to the framework-neutral Terminal runtime.
3. Preserve compatibility when older config objects omit the field by
   normalizing the omitted value to `(.ᗜ ᴗ ᗜ.)`.
4. Validate the marker as non-empty, trimmed, safe single-line public text;
   reject controls, line breaks, and unsafe browser-payload values with the
   existing source/field error context and browser fail-closed behavior.
5. Make every existing prompt consumer use the configured value: initial
   server-rendered boot/recovery prompt, enhanced browser prompt and command
   transcript, and directory-index prompt. Keep the package-level default
   identity/prompt unchanged for standalone consumers.
6. Update focused unit/config tests and configuration documentation. Do not
   change prompt layout, command behavior, content routes, or other site
   metadata.

## Out of Scope

- Configuring the complete prompt format, user/host/cwd separators, shell
  suffix, colors, or CSS.
- Making the marker user-editable at runtime or loading configuration in the
  browser from a network/file request.
- Changing the default marker, Terminal command semantics, or unrelated
  prompt test fixtures beyond carrying the new identity field.

## Acceptance Criteria

- [ ] A TOML value such as `terminal.promptMarker = "[firefly]"` is accepted,
      reaches `formatTerminalPrompt()`, and is rendered in place of the
      built-in marker across server and enhanced-browser prompt consumers.
- [ ] Omitting `terminal.promptMarker` preserves
      `guest(.ᗜ ᴗ ᗜ.)firefly:~/blog/posts #` and existing standalone package
      behavior.
- [ ] Unsafe, empty, multiline, or unknown marker values fail strict config or
      Terminal identity decoding with actionable field context; native
      recovery remains available when browser enhancement rejects its payload.
- [ ] The active TOML, tracked example, site-config tests, Terminal runtime
      tests, and relevant generated prompt assertions agree on the new field.
- [ ] Applicable package checks pass through `./sam`, and `git diff --check`
      reports no whitespace errors.

## Technical Notes

- The proposed field name is `terminal.promptMarker`: it describes the exact
  inserted segment without implying that the whole prompt is configurable.
- This is a lightweight cross-layer configuration change. `prd.md` is the only
  required task artifact; no `design.md` or `implement.md` is needed unless
  implementation reveals a broader boundary change.
- The pre-development evidence and applicable frontend contracts are recorded
  in `.trellis/spec/frontend/site-configuration-contract.md` and
  `.trellis/spec/frontend/quality-guidelines.md`.
