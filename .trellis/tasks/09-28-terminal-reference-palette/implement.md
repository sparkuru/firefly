# Terminal reference palette — implementation plan

1. Confirm the current CSS token consumers and protect unrelated dirty files. Read the frontend architecture, mobile experience, runtime, and validation contracts before editing.
2. Add the five exact palette primitives and derived dark surface/foreground tokens to the Firefly theme root in `apps/site/src/styles/terminal.css`. Reassign existing semantic roles, add only the semantic accents needed for legible status/controls, and add subtle root ambience for full-bleed home depth. Keep component colors token-based.
3. Update the one stale Terminal palette sentence in the already user-edited `readme.md`, preserving the rest of the file.
4. Add focused meaningful browser coverage for computed theme colors and representative foreground/background contrast. Extend an existing test rather than creating a new runner. Preserve the current static semantic-token contract.
5. Validate with `./render.sh npm --prefix apps/site run check` and `./render.sh npm --prefix apps/site run build`; run focused Playwright desktop/mobile suites through the pinned `SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam ...` boundary after the build. Inspect screenshots for hierarchy, all five source hues, and paper-content isolation. Record unavailable gates exactly.
6. Review the final diff and test evidence against the PRD. Do not include unrelated pre-existing changes in any commit; stage the README change by exact hunk if a commit is approved.
7. Include the user-supplied `apps/site/public/favicon.png` and `favicon.ico` plus the existing shared `SiteHead.astro` PNG icon link in this task. Extend `apps/site/tests/static-output.test.mjs` to expect both static assets and the shared icon link, then rerun the tracked-content site build. Preserve unrelated dirty files. Revise the commit plan to include the favicon files and head/test changes.

The visual/contrast gate is the main rollback point: if a source swatch fails as text on a raised surface, keep the reference value as a primitive or accent and use a brighter derived foreground token.
