# Android board mobile reading acceptance

## Goal

Verify that Firefly's Terminal inline `cat` reading and canonical document navigator remain usable on the supplied Android development board when the software keyboard opens and closes. Record reproducible evidence and resolve confirmed repository defects within this reading flow.

## Background

- The owner selected the real-device reading follow-up from the completed Terminal reading work and supplied `192.168.9.14` for ADB or scrcpy access.
- The board identifies as AIO-3568J on Android 11. Its physical display is 1920×1080 at density 280, LatinIME is the default IME, and `show_ime_with_hard_keyboard` is currently `0`. Via and Lightning browsers are installed; Chrome is not listed.
- Existing Playwright coverage exercises desktop and simulated mobile viewports, but the 2026-09-23 journal explicitly leaves physical soft-keyboard behavior unverified.

## Requirements

- R1. Serve a newly built local publication using the tracked demo content and open it in a browser on the supplied board. Do not use the production site or owner-local content as acceptance evidence.
- R2. On the board, exercise Terminal command entry, inline `cat` of a substantial page, reading and scrolling its content, return to prompt, and transition into the canonical document navigator.
- R3. Exercise navigator movement, search entry and exit, and return to ordinary reading while the Android software keyboard opens and closes. Verify focus, text entry, visible controls, and scroll position where those interactions apply.
- R4. Check the board's native landscape presentation and a temporary narrow portrait-sized display override. Clearly label the latter as an Android display override rather than a separate physical phone test.
- R5. Capture screenshots and concise steps for each result. If a repository defect is confirmed, make the smallest coherent fix and run focused regression checks; report device or browser limitations separately.
- R6. Restore all changed board settings, display overrides, ADB reverse mappings, and local test services after acceptance.

## Acceptance Criteria

- [x] A fresh local build is loaded on the board, with the browser and build revision recorded.
- [x] `cat` output remains readable and scrollable, and the prompt can be regained without losing its draft or unexpectedly opening a different page.
- [ ] With the software keyboard visible and hidden, the active input or navigator control stays reachable, accepts intended input, and does not become covered by fixed UI or horizontal page overflow. **Partial:** the prompt and an already activated navigator search input passed; a touch-only way to activate the hidden navigator search input was not established.
- [ ] Navigator movement and search can be entered and exited without stranded focus or unexpected keyboard behavior. **Partial:** shortcut-driven movement/search passed using ADB key injection, including LatinIME text entry and exit; touch-only entry and movement remain unverified.
- [x] Native landscape and the temporary narrow portrait-sized override are both inspected, with evidence and any limits labeled accurately.
- [x] Every temporary device and local service change is restored; final ADB/display/IME state is checked.

## Out of Scope

- Publishing to the live site, using private author content, altering other Android apps, or claiming coverage of a physical phone or other browsers.
- Broad visual redesign or unrelated Terminal features. Any such findings are recorded for a separate decision.
