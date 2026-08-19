# Implementation Plan

1. Keep the synchronous home-only startup marker, DOM-ready recovery guard,
   direct top-flow boot-log staging surface and static prompt in
   `TerminalHome.astro`; do not render a separator or separate visible
   connecting status.
2. Add direct Terminal-flow CSS using the existing Terminal theme tokens,
  persistent transcript-record styling, reduced-motion behavior, and preserved
  no-JavaScript/failure visibility. Keep staging and transcript boot-log
  geometry identical, use a short non-blocking line reveal, disable that reveal
  once the log becomes history, delay only the staging prompt until the final
  line reveal (with immediate reduced-motion behavior), and do not add an
  output delay.
3. Update `terminal-home.ts` so successful validation moves the existing boot
   log into the first transcript record before marking `ready`; early validation
   failure marks `failed`, and post-start fatal recovery marks `failed` before
   restoring the existing recovery target. The moved historical lines must not
   restart their staging animation.
4. Extend static-output and browser assertions for marker ordering, complete
  direct pending output plus static prompt, persistent boot-log history,
  JavaScript-disabled recovery, successful startup, reduced motion, and failure
  restoration. Cover centered empty-session prompts after `clear`, `cls`, and
  `Ctrl+L`, plus removal of the empty state after the next output.
5. Update the frontend Terminal-home guidance to document the staging-to-history
   transition, persistent first record, and DOM-ready recovery contract.
6. Change `dev.sh` so its default `start`/`up` path launches the site through
   `astro dev` without a publication build; retain the existing full build and
   assembled server under explicit `preview`/`build` commands.

## Validation

- `./sam npm --prefix apps/site run check`
- `./sam npm --prefix apps/site run test:content`
- `./sam npm --prefix apps/site run test:x-core`
- `./sam npm --prefix apps/site run build`
- `SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- tests/site.spec.ts tests/terminal.spec.ts`
- `git diff --check`

## Review Gates

- Confirm no-JavaScript home output has no startup marker and retains native
  document links.
- Confirm the successful interactive path leaves `data-terminal-startup-state`
  at `ready`, retains one boot-log record as the first transcript child, removes
  the connecting staging section, and hides recovery.
- Confirm malformed startup and post-start failures do not leave the page in
  `connecting`.
- Inspect emitted `dist/index.html` ordering and ensure no other route receives
  home-only behavior.
- Confirm the direct `dev.sh` path reaches Astro without invoking `build:m5`,
  while explicit preview mode still builds and serves the assembled publication.
