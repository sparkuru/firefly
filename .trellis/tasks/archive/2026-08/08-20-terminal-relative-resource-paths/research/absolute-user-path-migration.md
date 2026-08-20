# Research: absolute user-path migration

- Query: Map the impact of making `~/blog` the only accepted absolute user-operand root in rshell, so `/...` no longer aliases the blog VFS root; cover command execution, completion, tests, generated text, contracts, and compatibility.
- Scope: internal
- Date: 2026-08-20

## Findings

### Existing representation and boundary

- The prompt identity and persisted terminal state already use `~/blog` display paths. `displayVirtualPath()` maps the internal VFS root `/` to `~/blog`, and `virtualPathFromDisplay()` performs the reverse mapping (`presentations/terminal/src/vfs/paths.ts:38-48`). Site configuration validates that the configured cwd begins with the same display root (`apps/site/src/lib/site-config.mjs:71-72,124`).
- The VFS's canonical/internal paths deliberately remain slash-rooted (`/`, `/posts`, `/pages`, `/lab`, and hidden `/.rshell`) (`presentations/terminal/src/vfs/public-index.ts:29,62-65`). Those values also cross the typed `ReadonlyVirtualFs` interface (`presentations/terminal/src/vfs/contracts.ts:53-66`) and drive DOM navigation links, which must remain web URLs such as `/posts/...` (`apps/site/src/scripts/terminal-home.ts:407-424`). They are not user operands and should not be renamed.
- `resolveVirtualPath()` is the authoritative neutral-command operand parser via `createPublicIndex().resolve()` (`presentations/terminal/src/vfs/public-index.ts:128-131`). It currently accepts both `~/blog/...` and any leading slash as an absolute VFS path (`presentations/terminal/src/vfs/paths.ts:80-95`). This is the primary semantic change point.
- The compatibility facade has a second redirect-only parser, `normaliseVirtualPath()`, which likewise accepts `/...` (`presentations/terminal/src/runtime.ts:900-939,1431-1440`). Neutral stages normally use the VFS, but custom/legacy command registries can reach this fallback; it must use the same grammar or it becomes a bypass.

### Command impact

- `cat`, `vim`, `cd`, `ls`, `tree`, and named-resource `grep` all call `context.fs.resolve()` and therefore inherit the VFS migration (`commands/cat.ts:12-28`, `commands/session.ts:200-208`, `commands/cd.ts:8-17`, `commands/ls.ts:89-142`, `commands/tree.ts:46-70`, `commands/grep.ts:366-379`).
- `open` is a separate defect and contract boundary. It currently prefilters only `lab/...` or `/lab/...`, then prepends `/` to a relative form (`commands/session.ts:188-197`). Therefore it cannot resolve `open nerv` while cwd is `/lab`, and currently treats `/lab/nerv` as an absolute shorthand. It should instead pass the unmodified operand to `fs.resolve(operand, cwd, 'resource')` and require the resolved node to be an experiment. That yields coherent cwd-relative behavior without allowing a non-experiment type.
- Current resource resolution has a special root-only posts default plus mount aliases: at VFS root, bare resource operands default to `/posts/<operand>`, while `posts/...`, `pages/...`, and `lab/...` are accepted as root resource mounts (`vfs/paths.ts:30-35,75-95`). This is compatible with the approved relative-path rule and should remain exactly scoped to relative operands. In `/lab`, `open nerv` becomes `/lab/nerv`; `open lab/nerv` becomes `/lab/lab/nerv` and correctly fails.
- `cd` with no operand currently calls `resolve('~', ...)` (`commands/cd.ts:8-12`). The resolver maps `~` to the blog VFS root (`vfs/paths.ts:80-85`). If the new literal grammar is strictly only `~/blog` / `~/blog/...`, implementation should change the no-operand default to `~/blog`, reject literal `~`, and retain the usual no-operand home behavior without granting an undocumented second absolute spelling.
- Scratch currently appears as `/.rshell/tmp/<safe-name>` in redirects and text-resource errors (`shell/runner.ts:146-173`; `commands/grep.ts:373-376`; `runtime.ts:1431-1440`). Under the requested rule, user-facing scratch operands and redirect targets should be `~/blog/.rshell/tmp/<safe-name>`; their internal VFS paths stay `/.rshell/tmp/<safe-name>`. This avoids preserving an exception to “only accepted absolute user operand root.” Scratch remains hidden from `cd`, public listings, and the public output as currently enforced (`commands/cd.ts:12-15`; `vfs/public-index.ts:73-88`).

### Completion and generated command text

- The compatibility completion functions in `runtime.ts` independently interpret leading `/` as absolute: `pathCompletion()` (`556-629`), `lsCompletion()` (`631-700`), `directoryCompletion()` (`702-765`), and `tree` completion (`832-836`). They must recognize `~/blog` and `~/blog/` as the absolute prefix, preserve that prefix in candidate rewrite/ambiguity values, and return no match for every slash-root input rather than suggesting slash forms.
- `open` completion is currently a context-free `lab/<id>` list (`runtime.ts:835`). It must become VFS/cwd-aware, using the same candidate discipline as other commands, so cwd `/lab` yields `nerv` and `./nerv`; at root it yields `lab/nerv`; and absolute use yields `~/blog/lab/nerv`.
- Generated guidance/help hardcodes slash-root commands in `cat.ts:9`, `session.ts:206`, `ls.ts:137`, `tree.ts:51`, plus `OPEN_USAGE` in `session.ts:13`. User-facing examples should be updated to `tree ~/blog`, `open ~/blog/lab/<id>` where an absolute example is needed, while favoring a cwd-relative `open <id>` in an experiment listing. Usage forms can remain generic (`[path]`); an explicit path convention help line is advisable.
- `formatDocumentOperand()` currently emits page operands as `/pages/about.md` (`runtime.ts:769-771`) and is used for accessible document labels (`apps/site/src/scripts/terminal-home.ts:448-452`). It should emit `~/blog/pages/about.md`; posts may still be relative where their current cwd convention makes that intentional, but a more coherent helper should take cwd or define that all cross-mount displayed operands are `~/blog/...`.
- The static directory-index decorative prompt says `tree /<virtualPath>` (`apps/site/src/components/ContentDirectoryIndex.astro:13-21`). It is a command example, not a browser route, and must become `tree ~/blog/<virtualPath>`.
- Browser URLs/hrefs (`/posts/...`, `/pages/...`, `/lab/...`) are HTTP route syntax, not terminal syntax. Do not change them in `TerminalHome`, content routing, reader tests, or generated site links.

### Tests and compatibility surface

- Unit tests intentionally encode slash-root behavior in the main command flow: `tree /`, `ls /`, `cd /posts`, `cd /`, `cat /posts/...`, `cat /pages/...`, `vim /pages/...`, `/lab/...`, and `grep ... /pages/...` (`presentations/terminal/tests/terminal.test.ts:296-409,469-520,549-624,674-782`). Rewrite their positive absolute forms to `~/blog/...`; retain selected slash cases as negative tests.
- Browser tests contain the same old forms in terminal command/Tab flows and reader navigation, especially `apps/site/tests/terminal.spec.ts:264-354,464-529,677-731,1029,1139` and `apps/site/tests/reader.spec.ts:693-787`. Browser URL expectations remain slash URL paths; only input values and completion values change.
- `ContentDirectoryIndex` is the only searched site-generated terminal command example outside the home runtime. Site configuration and prompt tests already model `~/blog` correctly.
- The project contracts explicitly bless the old contract and must be updated with the implementation: `content-workspace-contract.md:318-350,382-412,450-451,575-579,626-636`; `type-safety.md:422-455,494,531-545`; and `hook-guidelines.md:50-60`. The obsolete wording calls `/` the canonical VFS root and `~/blog` a display alias. Revise it to distinguish **internal canonical VFS paths** from **accepted user operand syntax**, then replace all command examples accordingly.

### Cohesive safe migration

1. Keep all VFS keys, `VirtualPath` values, node paths, effects, route hrefs, and DOM `data-terminal-cd-path` values slash-rooted. They are internal/browser-route values with type and containment meaning.
2. Define one operand grammar at the VFS boundary: relative (`name`, `./name`, permitted `..` only in directory/pattern modes), or absolute `~/blog` / `~/blog/<safe segments>`. A leading `/` is rejected as `unknown-root` (or a dedicated `invalid-absolute-root` reason) before normalization. Do not translate it to `/...`.
3. Preserve normal relative semantics: cwd is internal; root-only resource posts default and explicit relative mount aliases continue to work. Do not special-case `lab` in `open`; resolve it through the same VFS parser and stat its node type.
4. Derive completion from a shared operand-prefix classifier exported by `vfs/paths.ts` rather than maintaining the three bespoke slash-prefix parsers in `runtime.ts`. The classifier should return `{ kind: 'relative' | 'absolute', prefix, displayPrefix }`, with `displayPrefix: '~/blog/'` for absolute operands, and reject `~/`, `~other`, `/...`, URLs, encodings, dot/hidden/traversal inputs as appropriate. Tree completion should enumerate `~/blog`, `~/blog/posts`, `~/blog/pages`, and `~/blog/lab`.
5. Route legacy `normaliseVirtualPath()` through the VFS resolver (or replace it with a wrapper around it) and format all scratch messages/redirects through a display helper. This removes the fallback parser drift and preserves hidden scratch containment.
6. Make error wording intentional: `/`, `/posts`, `/etc/passwd`, and `/lab/nerv` should fail as an unsupported absolute operand, never as successful root navigation. `~` and `~/` should fail rather than be silent aliases; `cd` with no operand separately supplies `~/blog`.

### Recommended exact tests

- Resolver matrix (unit, preferably new direct `vfs/paths` tests): from `/`, `/posts`, `/pages`, and `/lab`, verify `~/blog`, `~/blog/`, `~/blog/posts`, `~/blog/lab/nerv`, and `~/blog/.rshell/tmp/x` normalize to the intended internal values; verify `/`, `/posts`, `/pages/about.md`, `/lab/nerv`, `/etc/passwd`, `~`, `~/`, `~/other`, `~other/...`, encoded/backslash/non-NFC inputs reject. Verify `..` remains allowed only in directory/pattern modes and cannot escape root.
- Per-command execution matrix: `cd ~/blog`, `ls ~/blog`, `tree ~/blog`, `cat ~/blog/pages/about.md`, `vim ~/blog/pages/about.md`, `grep about ~/blog/pages/about.md`, and `open ~/blog/lab/nerv` succeed. At cwd `~/blog/lab`, `open nerv` and `open ./nerv` succeed; `open lab/nerv` fails; at root, `open lab/nerv` succeeds. For every command, a slash-root form rejects and does not mutate cwd, navigate, read a document, search, or create scratch.
- Scratch matrix: redirection to `~/blog/.rshell/tmp/x` and subsequent `cat`/`grep` work; `/.rshell/tmp/x` rejects; scratch remains absent from `ls ~/blog`, `tree ~/blog`, and `cd` targets.
- Completion matrix: unique and ambiguous absolute completions rewrite with `~/blog/...`; root `~/blog/` candidates include mounts; slash-root input returns `none`/no rewrite; cwd `/lab` completes `open n` to `open nerv`, `open ./n` to `open ./nerv`, and no longer offers `open lab/nerv`; root completion continues to offer `open lab/nerv`.
- Browser interaction: execute the same success/negative matrix in `terminal.spec.ts`, assert prompt changes only after accepted `cd`, assert a rejected slash path leaves URL/cwd unchanged, and test Tab values. In `reader.spec.ts`, use `vim ~/blog/pages/about.md` but retain `/pages/about/#terminal-reader` in the expected browser URL.

## Related specs

- `.trellis/spec/frontend/hook-guidelines.md`
- `.trellis/spec/frontend/content-workspace-contract.md`
- `.trellis/spec/frontend/type-safety.md`
- `.trellis/spec/frontend/state-management.md`
- `.trellis/spec/frontend/quality-guidelines.md`

## Caveats / Not Found

- No production state, deployment material, or external reference was inspected.
- The repository contains both the neutral VFS/shell implementation and a compatibility/fallback execution path in `runtime.ts`; changing only `vfs/paths.ts` would leave redirect handling and completion semantics inconsistent.
- Slash-prefixed strings that are public HTTP routes must remain unchanged. The migration applies only to user-entered rshell operands and rshell-generated command examples, not to Astro URLs, `href` values, or internal VFS keys.
