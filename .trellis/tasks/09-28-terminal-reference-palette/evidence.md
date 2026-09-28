# Terminal reference palette — verification

- `./render.sh npm --prefix apps/site run check`: passed, Astro 0 errors/warnings/hints. This initial run used the locally configured external content root.
- The first tracked-fixture build generated 30 pages but its strict output inventory failed on two newly present favicon files. The owner explicitly included both in this task; the static inventory and shared-head checks were updated.
- Final tracked-fixture `FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run build`: passed with Astro 0 diagnostics and static-output tests 18/18 green. It publishes `favicon.ico` and `favicon.png` and emits one PNG icon link in home, Terminal, and Semantic route heads.
- Focused tracked-fixture Playwright palette test in `site.spec.ts`: desktop static and mobile static both passed (2/2). It checks exact swatches, layered colors, home/document foreground contrast, orange accents, and the native mobile home.
- Quality reviewer reported 8/8 focused desktop/mobile static checks, including paper theme isolation. The reviewer removed an incorrect error color from the successful `[ OK ]` boot line and reran Astro check with 0 diagnostics.
- Focused tracked-fixture desktop interactive Playwright tests for theme/font delivery and inline `cat` passed (2/2).
- Calculated `#7886a2` structural border against the lightest `#22313d` surface at 3.64:1; yellow focus against that surface is 9.84:1. Teal link and orange status foreground variants against that surface are 5.28:1 and 5.08:1.
- Reviewed Chromium screenshots under `apps/site/test-results/palette-review/` for the ready desktop home, desktop document, mobile home, and mobile document. These ignored local artifacts show the intended dark hierarchy and legibility.
- Favicon review confirmed valid ICO (three icon sizes) and 512×512 PNG; built copies match the source bytes. The supplied artwork was not transformed.
- `git diff --check` and `task.py validate` passed. Unrelated dirty files remain untouched. The favicon files and existing shared-head link are now part of this task.
