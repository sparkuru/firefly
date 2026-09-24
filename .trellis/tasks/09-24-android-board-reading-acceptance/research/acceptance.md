# Android board reading acceptance — 2026-09-24

**Result: partial acceptance.** The built fixture passed the observed `cat`, keyboard layout, and shortcut-driven navigator flows on this board in Via. The navigator has no visible touch control to open search or move between reading units, so this run does not establish touch-only navigator usability. The two partial PRD criteria remain unchecked.

## Build and device

- Revision: `8601e9e`; fresh tracked-fixture build: `FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm run build:m4` exited 0. The site build reported 0 Astro errors/warnings/hints and all 18 static-output checks passed. The assembled `dist/` served locally on `127.0.0.1:4321`; Via fetched `/`, `/pages/markdown-template/`, and their JS/font assets with HTTP 200 (or 304 on revisit) through `adb reverse tcp:4321 tcp:4321`.
- Board: AIO-3568J, Android 11, Via `mark.via.gp` 6.8.0, default `com.android.inputmethod.latin/.LatinIME`. This is a Via/WebView result, not a Chrome or physical-phone result.
- Baseline: physical `wm size` 1920×1080, physical density 280, `show_ime_with_hard_keyboard=0`, `accelerometer_rotation=1`, `user_rotation=2`, `screen_off_timeout=2147483647`, and no ADB reverse mappings. Testing temporarily used `show_ime_with_hard_keyboard=1` and `wm size 720x1280`; density and rotation were not changed.
- Narrow override screenshot size: 720×1280 px. A temporary local diagnostic page measured Via `screen.width/height=412×732` CSS px, `devicePixelRatio=1.75`, `visualViewport.width/height=412×596` CSS px, and `innerWidth/innerHeight=421×610` CSS px with browser chrome visible and keyboard closed. This is a display override on the same board.

## Observations

| Scenario | Result | Evidence |
| --- | --- | --- |
| Landscape prompt and LatinIME | Prompt/input remain visible above keyboard; tapping the editable part after `#` opens LatinIME. | [landscape-prompt-ime.png](screenshots/landscape-prompt-ime.png) |
| Landscape inline `cat` | `cat ~/blog/pages/markdown-template.md` opened the tracked fixture inline; vertical scrolling reached table/code content. Sticky Command returned to a visible prompt and reopened LatinIME. | [landscape-cat-wide.png](screenshots/landscape-cat-wide.png) |
| Landscape navigator search | Open document loaded `/pages/markdown-template/#document-navigator`. `/` entered search using ADB key injection; tapping its input opened LatinIME. Fixed status, search input, and article stayed above keyboard. Typing `Reading` then Enter selected the matching heading, hid LatinIME, and returned to normal mode; `j` moved from unit 3/8 to 4/8. | [landscape-navigator-search-keyboard.png](screenshots/landscape-navigator-search-keyboard.png), [landscape-navigator-search-result.png](screenshots/landscape-navigator-search-result.png) |
| Narrow inline `cat` | Prompt and keyboard were visible. The same `cat` command rendered inline with reachable sticky Command/Open document controls; scrolling reached table/code blocks. Command returned to prompt above LatinIME. A typed `draft` remained after Android Back hid the keyboard and after browser Back from the temporary diagnostic page. | [narrow-cat-wide.png](screenshots/narrow-cat-wide.png), [narrow-cat-return-ime.png](screenshots/narrow-cat-return-ime.png) |
| Narrow navigator search | Search input and fixed status remained visible above LatinIME. Typing `table` and using the IME action returned to normal mode at the matching table (5/8). `:q` via the IME action returned to the site home. | [narrow-navigator-search-ime.png](screenshots/narrow-navigator-search-ime.png), [narrow-navigator-search-result.png](screenshots/narrow-navigator-search-result.png) |
| Narrow wide table | A horizontal swipe inside the table changed its visible columns while the page/status stayed in place; no whole-page horizontal displacement was seen. The table is tall and dense at this width but remains readable through local scrolling. | [narrow-navigator-table-scroll.png](screenshots/narrow-navigator-table-scroll.png) |
| Narrow CSS viewport | Local measurement only; the temporary diagnostic file was removed from `dist/` after measurement. | [narrow-viewport.png](screenshots/narrow-viewport.png) |

## Limits and restoration

- Navigation shortcuts (`/`, `j`, `:`) were sent with `adb shell input text`, which behaves like hardware key injection. Normal navigator markup exposes no visible touch control for entering search or movement. This run validates LatinIME once the search field is active but **does not establish a touch-only route into navigator search**. That is a separate mobile usability decision; no code change was made without a confirmed scope for such controls.
- The native landscape CSS viewport was not measured numerically; screenshots and `wm size` establish the physical display state. This test did not cover Chrome, Lightning, an independent phone, or private content.
- The task-owned cleanup trap ran, and a separate final probe read: `wm size` physical 1920×1080 with no override, density physical 280 with no override, `show_ime_with_hard_keyboard=0`, default LatinIME unchanged, rotation 1/2 and timeout unchanged, ADB reverse list empty, and no task Python server or supervisor process. The temporary diagnostic page was removed. No tracked product files changed.
- Reviewer independently repeated read-only ADB probes: physical `wm size` 1920×1080, physical density 280, `show_ime_with_hard_keyboard=0`, default LatinIME, rotation 1/2, timeout 2147483647, and no reverse mappings. `ss -ltnp '( sport = :4321 )'` showed no listener; no `http.server 4321` process remained.
- Reviewer ran `FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run check`: pass, 96 Astro files, 0 errors/warnings/hints. There is no site lint script; no product source changed during this task.
