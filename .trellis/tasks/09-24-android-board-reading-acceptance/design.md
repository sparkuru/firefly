# Real-device validation design

## Boundaries

- Build from the repository's tracked `content/` fixture through the Docker-backed `./render.sh`/`./sam` path. Serve the resulting static publication locally.
- Use `adb reverse tcp:4321 tcp:4321` so the Android browser can reach `http://127.0.0.1:4321/` through ADB without exposing the host development server to the LAN.
- Prefer the installed Via browser for the first pass; record its package/version. This is a WebView-based browser environment, not a Chrome-device claim.
- Drive observable interaction through ADB input and screenshots. Use `scrcpy` only if needed for direct visual inspection; its supplied monitor script turns the screen off and holds it awake, so direct ADB screenshots are the lower-impact default.

## Device state and rollback

- Snapshot display size/density, rotation-related settings, `show_ime_with_hard_keyboard`, active IME, and existing reverse mappings before changes.
- Temporarily set `show_ime_with_hard_keyboard=1` if a hardware keyboard suppresses LatinIME. Exercise the native 1920×1080 display first.
- For a narrow portrait-sized pass, use reversible `wm size` and, only if needed, `wm density` overrides. Record the effective CSS viewport and screenshot dimensions; do not describe this as a physical phone.
- On exit, remove only reverse mappings created by this task; restore exact original setting values and display overrides, then re-read the state. Stop only the local test server started by this task.

## Evidence and defect handling

- Save screenshots and a short observation log under the task `research/` directory or `/tmp` if screenshots are large. Keep browser history, private notifications, and unrelated device content out of artifacts.
- Compare each observed issue against the existing Terminal and document navigator contracts. Reproduce a site defect in a focused local test before changing code where practical.
- A fix stays inside the `cat`/navigator mobile interaction and gets a focused automated regression plus a repeat of the affected board scenario. Device/browser-only behavior is documented without changing unrelated code.
