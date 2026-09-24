# Validation on 2026-09-24

- The pinned renderer's focused content tests passed (90/90), and Astro checked 97 files with zero diagnostics.
- `./verify.sh` passed. Its site Playwright run reported 164 passed and 34 expected skips; NERV reported 8 passed; publication reported 6 passed. The mobile navigator suite covers portrait, landscape, touch tablet, no JavaScript, direct fragment, Terminal links, opt-in, and input-mode transitions. Desktop navigator regression tests also passed.
- Independent `trellis-check` review found a Terminal inline-link input-mode transition issue, fixed it, and added a regression test before the full gate.
- `git diff --check` passed after implementation and spec updates.
- `adb -d devices -l` listed only a network Android board, while `adb -d reverse --list` returned `no devices found`. The USB PLR110 was therefore unavailable.
- At the owner's direction, `192.168.9.14:5555` was used for a physical-browser smoke check. It identifies as AIO-3568J with a 1920×1080 display; `dumpsys input` reported no touchscreen. Via loaded the pinned fixture's semantic page and its JS/CSS with HTTP 200. The page showed full ordinary content and the desktop `Read document` entry, consistent with this device's non-touch input. This board cannot establish touch-primary mobile behavior; Playwright covers that branch until the PLR110 is reconnected.
- The task-created ADB reverse mapping was removed, the temporary HTTP server stopped, and Via was sent Back once. The public-page capture is `/tmp/firefly-mobile-policy-aio-semantic.png`.
