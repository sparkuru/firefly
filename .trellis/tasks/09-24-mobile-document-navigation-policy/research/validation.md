# Validation on 2026-09-24

- The pinned renderer's focused content tests passed (90/90), and Astro checked 97 files with zero diagnostics.
- `./verify.sh` passed. Its site Playwright run reported 164 passed and 34 expected skips; NERV reported 8 passed; publication reported 6 passed. The mobile navigator suite covers portrait, landscape, touch tablet, no JavaScript, direct fragment, Terminal links, opt-in, and input-mode transitions. Desktop navigator regression tests also passed.
- Independent `trellis-check` review found a Terminal inline-link input-mode transition issue, fixed it, and added a regression test before the full gate.
- `git diff --check` passed after implementation and spec updates.
- `adb -d devices -l` listed only a network Android board, while `adb -d reverse --list` returned `no devices found`. The USB PLR110 was therefore unavailable.
- At the owner's direction, `192.168.9.14:5555` was used for a physical-browser smoke check. It identifies as AIO-3568J with a 1920×1080 display; `dumpsys input` reported no touchscreen. Via loaded the pinned fixture's semantic page and its JS/CSS with HTTP 200. The page showed full ordinary content and the desktop `Read document` entry, consistent with this device's non-touch input. This board cannot establish touch-primary mobile behavior; Playwright covers that branch until the PLR110 is reconnected.
- The task-created ADB reverse mapping was removed, the temporary HTTP server stopped, and Via was sent Back once. The public-page capture is `/tmp/firefly-mobile-policy-aio-semantic.png`.

## PLR110 touch-phone repeat

- After USB reconnection, `adb -d devices -l` identified serial `3B65CC018KR00000`, model PLR110; display size was 1272×2800. Via was already foreground, and no pre-existing reverse mapping was present.
- Served the pinned fixture on host loopback and created only `tcp:4321` reverse mapping. Via fetched the semantic route and navigator JS/CSS with HTTP 200.
- Opened `/pages/inline-reading-semantic/#document-navigator`: the screen showed ordinary article content at the native fragment position, with no fixed navigator status or focus UI. Opened the same page without a fragment: title, outline, and body were visible, while the `Read document` entry was absent.
- Opened `/pages/about/#document-navigator`: Terminal article content and native outline were visible without a fixed navigator status. The automated browser suite covers Terminal-generated links and keyboard state; the physical pass verifies the final rendered reading surface.
- Captures of these public fixture pages are `/tmp/firefly-mobile-policy-plr110-semantic.png`, `/tmp/firefly-mobile-policy-plr110-semantic-top.png`, and `/tmp/firefly-mobile-policy-plr110-terminal.png`.
- Sent Via Back three times to return through the three task-opened tabs; removed the task-owned reverse mapping and stopped the HTTP server. No device settings were changed.
