# Execution plan

1. Record device baseline, installed browser version, current display/IME state, and ADB reverse mappings.
2. Build the tracked fixture with the supported Docker wrapper, start a loopback-only static publication server, add a task-owned ADB reverse mapping, and verify HTTP from the board browser.
3. Inspect native landscape: Terminal prompt and `cat`, scroll/code or wide content, return to prompt, canonical document opening, navigator movement and search with IME visible/hidden.
4. Apply a temporary narrow portrait-sized display override, repeat the key keyboard/focus/layout cases, and capture screenshots plus observations.
5. For confirmed site defects, implement a focused fix, run the relevant package and Playwright checks through `./sam`/`./render.sh`, rebuild, and repeat the failing board scenario. Otherwise record a pass or precise limitation.
6. Restore board settings/display and task-owned ADB reverse mapping; stop the local server; verify final state and inspect the Git diff.

## Validation gates

- Supported build: `FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm run build:m4` (or the smallest supported fresh site/publication build that preserves the same static artifact boundary).
- Focused automated checks when code changes: site/Terminal checks and relevant Playwright cases through the pinned browser image, followed by the repository gate if the changed surface warrants it.
- Device checks: screenshots before/during/after IME, visible focus and controls, no unintended horizontal overflow, and exact restoration of baseline ADB/display/IME state.

## Rollback points

- Before changing Android settings or display overrides, save exact baseline values. Restore in a shell trap where possible, then inspect manually.
- Local service and ADB reverse ownership are task-specific; never remove pre-existing mappings or unrelated containers.
