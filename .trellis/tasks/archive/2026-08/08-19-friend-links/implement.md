# Friend links implementation plan

The work is intentionally one parent task: configuration, the terminal
runtime effect, and the Astro/browser bridge are tightly coupled and each
depends on the preceding data contract. No independent child task is created.

## Step 1 — Add the strict build-time configuration contract

Dependency: none.

Files to change:

- `config/site.toml`
- `config/site.toml.example`
- `apps/site/src/lib/site-config.mjs`
- `apps/site/tests/site-config.test.mjs`

Actions:

1. Migrate the public config source from YAML to TOML and keep the complete
   commented template in `.toml.example`; optional TOML values are omitted to
   use their null defaults.
2. Add `terminal.friends` with an empty default and define the strict friend
   record schema with `name`, `url`, and optional `desc`.
3. Reuse the safe HTTP URL policy, reject duplicate URLs, and report invalid
   array fields with record/field context.
4. Keep the parsed result deeply frozen and available from the existing
   `SITE_CONFIG` object.
5. Add positive and negative tests for the full boundary, including malformed
   TOML, empty config, unknown fields, unsafe protocols, credentials/fragments,
   invalid desc/control characters, duplicate URLs, and malformed shapes.

Exit condition: met. The site config tests prove an immutable, public,
deterministic `SITE_CONFIG.terminal.friends` value without changing existing
site/terminal/SEO behavior.

## Step 2 — Add a structured external-link command effect

Dependency: Step 1's data contract is approved; unit fixtures may use the
same contract before the Astro bridge exists.

Files to change or add:

- `presentations/terminal/src/commands/links.ts` (new command handler)
- `presentations/terminal/src/commands/registry.ts`
- `presentations/terminal/src/shell/contracts.ts`
- `presentations/terminal/src/runtime.ts`
- `presentations/terminal/tests/terminal.test.ts`

Actions:

1. Add the `friends` command with zero operands, `Explore` grouping, help
   metadata, and deterministic ordering.
2. Add a generic validated link-record input separate from
   `TerminalIdentity`; thread immutable `friendLinks` through
   `executeCommand`, command contexts, and both neutral and registered shell
   paths.
3. Add a structured `links` command value/effect and adapt it through the
   existing result bridge. Direct output carries records; pipeline and
   redirect output serializes each record as `name — url` or `name — desc — url`.
4. Treat empty output as a bounded, announced `No friend links.` result.
5. Add a strict decoder for the browser data boundary and ensure it rejects
   unknown keys, unsafe URL values, duplicates, sparse arrays, accessors, and
   prototype-decorated objects in the same style as existing decoders.
6. Test direct command output, help, completion, aliases/session behavior,
   pipeline/grep/redirection, empty data, invalid operands, and direct-vs-
   neutral equivalence.

Exit condition: met. Package tests prove the command is pure/read-only, shell
semantics remain bounded, and no VFS node or route is created.

## Step 3 — Connect config to Terminal recovery and interactive rendering

Dependency: Steps 1 and 2.

Files to change:

- `apps/site/src/components/TerminalHome.astro`
- `apps/site/src/scripts/terminal-home.ts`
- `apps/site/src/styles/terminal.css` (only if existing list rules do not
  provide sufficient link-list layout)

Actions:

1. Render `SITE_CONFIG.terminal.friends` as a compact native-link section in
   the existing no-JavaScript recovery/catalog surface.
2. Add data attributes for the same records, without JSON string concatenation
   or HTML injection, so the controller can decode the build-time payload.
3. Read and validate those records at startup, pass them to
   `executeCommand`, and preserve the existing fatal recovery behavior when
   required data is malformed.
4. Render the structured `links` effect using DOM-created `<ul>/<li>/<a>`
   elements, `href` properties, and `textContent`; preserve focus, announcer,
   reduced-motion, and prompt-settlement behavior. Use aligned name,
   description, and URL cells like the `ls` listing; reserve the optional
   description cell when absent and stack the cells on narrow screens.
5. Reuse current Terminal colors, type, link focus ring, list spacing, and
   responsive rules. Add only the smallest selector needed for a readable
   multi-link transcript at 375px and 1440px.

Exit condition: met. The generated home page has useful native recovery links
with JavaScript disabled and the interactive `friends` command renders
clickable, aligned links without changing existing startup/failure behavior.

## Step 4 — Add site/static/browser evidence

Dependency: Step 3.

Files to change:

- `apps/site/tests/terminal.spec.ts`
- `apps/site/tests/site.spec.ts`
- `apps/site/tests/static-output.test.mjs`

Actions:

1. Add a repository-local browser fixture link through the existing DOM test
   seam; do not add a real external dependency to production content. The
   build-time TOML/config-schema boundary is covered separately by the site
   config tests.
2. Assert the recovery section is native and visible without shell startup,
   has expected escaped text and safe `href`, and remains within the viewport.
3. Assert `friends`, help, and Tab completion produce the expected transcript
   and native anchors; assert the friend rows share one wide-screen grid and
   keep their cell order at the responsive breakpoint; assert empty
   configuration behavior.
4. Assert the static artifact contains the expected home data only, preserves
   current route/content/VFS inventories, and contains no private/source path
   leakage.

Exit condition: met. Static output, no-JavaScript recovery, empty-state,
help/completion, populated native-anchor, and interactive command behavior are
covered by site tests.

## Step 5 — Run the quality gate

Dependency: Steps 1–4.

Use the repository's `./sam` boundary for package checks, Astro build/static
tests, and the focused/full Playwright projects required by the frontend
specifications. Review the final diff for unrelated changes, check generated
artifact ownership, and confirm no new route, remote request, font, or runtime
service was introduced.

Quality gate evidence: met.

- `./sam npm --prefix apps/site ci`: reproducible install passed; 0 vulnerabilities.
- `./sam npm --prefix apps/site run test:content`: 32 tests passed.
- `./sam npm --prefix apps/site run test:x-core`: 6 tests passed.
- `./sam npm --prefix presentations/terminal run check`: passed.
- `./sam npm --prefix presentations/terminal run test`: 29 tests passed.
- `./sam npm --prefix presentations/terminal run build`: passed.
- `./sam npm --prefix apps/site run check`: 0 errors, warnings, or hints.
- `./sam npm --prefix apps/site run build`: 14 static-output tests passed.
- Focused Playwright: site 20/20 and Terminal 62/62 passed.
- Full Playwright: 118/118 passed.
- Friend-link browser coverage proves wide-screen grid alignment, empty
  description cells, mobile stacking, native anchors, and no overflow.
- Browser decoder regressions cover C1 controls and U+2028/U+2029 alignment
  with the build-time site safety policy.

The plan was approved and `task.py start friend-links` has been run. The
friend-link implementation, TOML migration, and quality gate are complete
inside this boundary. The active task remains unarchived until the normal work
commit/finish phase.
