# Validation: native mobile homepage without Terminal

## Scope and runtime boundary

Product edits are confined to `apps/site`; task/spec records are main-owned.
No authored content, dependency/lockfile, command semantics, schema, deployment,
or remote service changed. Site gates use `./sam`/`./render.sh` and the tracked
public fixture through `FIREFLY_CONTENT_ROOT="$PWD/content"`.

## Final quality evidence

| Gate | Observed result |
| --- | --- |
| `./sam npm --prefix apps/site ci` | Passed from unchanged lockfile |
| Site `run test:content` | 96 passed |
| Site `run test:x-core` | 8 passed |
| Site `run check` | 102 files; zero errors, warnings, hints |
| Site `run build` | Zero Astro diagnostics; 18 static-output tests passed |
| Mobile search/native homepage/article policy | 22 passed; 6 expected project skips; no retries |
| Full desktop Terminal/search/homepage/navigation | 81 passed; 16 expected project skips; no retries |
| Desktop/mobile static site/search/homepage | 27 passed; 39 expected project skips; no retries |
| Viewport capture case | 1 passed |
| `git diff --check` | Passed |

Commands for the browser matrix:

```bash
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run test:e2e -- tests/mobile-homepage.spec.ts tests/home-search.spec.ts tests/document-navigator-mobile.spec.ts --project=chromium-mobile-interactive
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run test:e2e -- tests/terminal.spec.ts tests/home-search.spec.ts tests/mobile-homepage.spec.ts tests/document-navigator.spec.ts --project=chromium-desktop-interactive
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run test:e2e -- tests/site.spec.ts tests/home-search.spec.ts tests/mobile-homepage.spec.ts --project=chromium-desktop-static --project=chromium-mobile-static
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run test:e2e -- tests/mobile-homepage.spec.ts --project=chromium-mobile-interactive --grep "mobile first paint"
```

The obsolete mobile command-session baseline is replaced by explicit native
homepage absence/input/link tests. Desktop retains the full command suite.
Both static and interactive mobile projects now enable touch; their article
assertions follow the already established mobile navigator policy rather than
mistaking a narrow fine-pointer window for a phone. Static cases explicitly
assert hidden navigator controls and complete native content/fragment reading;
desktop cases retain visible controls.

Implementation logs are `/tmp/mobile-home-policy-{install,content,xcore,check,build,mobile,desktop,static,visual}.log`.
The independent reviewer rebuilt after its two inline-startup fixes and ran the
same complete browser matrix. Final reviewer logs are
`/tmp/mobile-home-policy-review-{check,build,desktop,mobile,static}.log`.
Content/X Core helpers and projection were unchanged by these final inline-only
fixes; their 96/8 successful gate evidence remains applicable. No lint script is
declared, so only actual Astro diagnostics and whitespace checks are reported.

## Visual and performance evidence

The main session inspected `/tmp/mobile-home-policy-portrait.png` and
`/tmp/mobile-home-policy-landscape.png`. Both show the labeled search above the
native article list without boot logs, prompts, `ls` or optional-shell/error
framing. Wrapping is readable and document-level horizontal overflow is absent.
The implementation also inspected `/tmp/mobile-home-policy-tablet.png`.

The unchanged search helpers returned all 400 synthetic public entries in an
approximately 4 MB body fixture: final reviewer first extraction/search/render
140.2ms, cached search/render 50.0ms. These are automated-browser timings, not a physical-device
guarantee. Only viewport captures were used because the pinned full-page capture
previously reset emulated input mode.

## Resolved implementation obstacles

- Astro `define:vars` removed the inline script marker from output. The shared
  predicate now lives on `data-terminal-mobile-query`; the inline script reads
  it and the static test verifies media gating before connecting state.
- An initial concurrent build/content run competed over temporary content
  materialization. Final mutating build/content gates were run sequentially.
- Fixture materialization produced 18 documents, while guest projection exposes
  16 (12 posts and 4 pages). Native-home tests assert the actual public inventory,
  including click-through to a public page.
- CDP touch disabling before navigation was overwritten by context touch setup;
  the transition test now changes media after navigation and asserts both modes.
- Static touch hides navigator entry from the accessibility role query. Tests
  locate its explicit native anchor and assert text/href plus policy-correct
  hidden/visible state, using a direct native fragment in the hidden branch.

## Independent review outcome

The reviewer reproduced and fixed two desktop-origin startup detours on the
built artifact. Both new regressions failed consistently before the fixes:

- Desktop connecting -> touch -> module failure -> desktop left the root
  indefinitely connecting and hid native recovery. The desktop-origin inline
  failure callback now marks uninitialized startup failed even during the touch
  detour. Initial mobile still does not install that callback or start Terminal.
- Desktop connecting -> touch native keys -> desktop with module still delayed
  destroyed the early Ctrl+L/Escape guards. While touch, those handlers now
  return inertly rather than destroying desktop-origin protection; cleanup waits
  until startup leaves connecting.

Failure evidence is `/tmp/mobile-home-policy-review-detour-before.log`. Both
regressions and the full final desktop/mobile/static matrix passed after the
fixes without retries. The main session reviewed the final diff and synchronized
the mobile/search/workspace/validation specs, including the second deterministic
boot scenario that still explicitly required mobile animations.

Independent review is complete with no unresolved product findings or required
checks. Real-device software-keyboard review is optional and has not been
performed; no deployment target was used. The owner approved the Phase 3.4
commit plan with "提交" after final review.
