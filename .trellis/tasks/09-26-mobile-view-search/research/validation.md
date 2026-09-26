# Validation evidence: mobile homepage article search

## Scope and command boundary

The implementation is confined to `apps/site`, with task/spec records maintained separately. No content schema, X Core, presentation command semantics, authored content, lockfile, deployment, or external search service changed. Node/browser checks use the existing `./sam` and `./render.sh` wrappers and explicitly select the tracked `content/` fixture through `FIREFLY_CONTENT_ROOT`.

## Implementation gates

| Check | Observed result |
| --- | --- |
| `./sam npm --prefix apps/site ci` | Passed from the existing lockfile |
| Site `run check` | Zero Astro diagnostics |
| Site `run test:content` | 96 passed, including 6 new search helper cases |
| Site `run test:x-core` | 8 passed |
| Final site `run build` | Zero Astro diagnostics; 18 static-output tests passed |
| Four-project `home-search.spec.ts` run | 13 passed; 35 expected per-project skips; no retry in the successful run |
| Final optimized search-helper run | 6 passed |
| Focused expanded browser performance case | 1 passed; 400 article results, no result cap |
| `git diff --check` | Passed |

The full-scope Trellis reviewer completed the final content, type, build, and affected browser gates after the recovery/startup/layout fixes. X Core remained unchanged; its successful gate was verified from the existing log.

## Final review gates

All site commands used `FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site`.

| Check | Final observed result |
| --- | --- |
| `run test:content` | 96 passed, zero failures |
| `run check` | 101 files; zero errors, warnings, or hints |
| `run build` | Zero Astro diagnostics; 18 static-output tests passed |
| Mobile search, Terminal, and document navigation | 70 passed; 2 expected project skips; no retries |
| Static desktop/mobile site and search | 26 passed; 26 expected project skips |
| Full desktop search, Terminal, and document navigation | 77 passed; 12 expected project skips; no retries |
| Desktop cases affected by the final fixes, rerun on latest build | 11 passed; no skips or retries |
| `git diff --check` | Passed |

The final mobile run includes `tests/home-search.spec.ts`, `tests/terminal.spec.ts`, and `tests/document-navigator-mobile.spec.ts` on `chromium-mobile-interactive`. The static run uses `tests/site.spec.ts` and `tests/home-search.spec.ts` on both static projects. Desktop affected startup, clear, and search cases were rerun after the final fixes; document navigation was unchanged since the full desktop run. No lint script is declared; whitespace checking and Astro diagnostics are the applicable checks.

Final local reviewer logs are `/tmp/mobile-search-review-{content-final,check-final,build-final,mobile-final,static,desktop-final}.log`; the earlier full desktop log is `/tmp/mobile-search-review-desktop.log`.

The successful four-project command is:

```bash
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run test:e2e -- tests/home-search.spec.ts --project=chromium-mobile-interactive --project=chromium-desktop-interactive --project=chromium-desktop-static --project=chromium-mobile-static
```

The pinned CLI's variadic project flag can consume a following test path. Use file paths first and `--project=<name>` for reproducible selection.

## Performance and visual evidence

- A browser fixture with 400 public articles and approximately 4 MB of longer rendered bodies returned all 400 results. The final reviewer run measured first extraction/search/render at 120.9ms and cached search/render at 53.4ms, passing first `<1000ms` and cached `<500ms` guards. These are local automated-browser timings, not physical-device guarantees.
- Before optimization, the same workload took about 4.1 seconds even when cached. Per-character locale conversion in excerpt offset mapping caused the cost. The optimized whole-prefix fast path retains length-expansion/surrogate regression coverage without changing search semantics.
- The main session inspected the saved portrait and landscape viewport captures: form controls, article title/date/path, plain-text excerpt, focus ring, and wrapping were visible without page overflow. Local preview captures are `/tmp/mobile-search-portrait.png` and `/tmp/mobile-search-landscape.png`.
- An isolated diagnostic showed a full-page screenshot changing emulated touch points from 1 to 0, no-hover/coarse-pointer from true to false, and search availability from visible to hidden. Landscape resize retained the changed input mode. Viewport capture avoids this observed automation effect; product media eligibility remains unchanged.

## Resolved validation obstacles

- The default sandbox denied Docker socket access. Exact repository-wrapper validation commands were allowed through automatic escalation review; subsequent checks ran successfully.
- Initial static-output order assertions matched a CSS selector containing the recovery attribute before the actual recovery section. Assertions now compare the actual script/section markup and still enforce the startup order. The formerly global no-buttons rule now permits exactly the two hidden search controls while prohibiting unrelated buttons outside templates.
- The initial before/after-boot browser flow failed after a full-page screenshot because emulated input mode changed, rather than because landscape touch support failed. Viewport captures and independent media-transition/layout tests validate the intended branch.
- Missing required search nodes now enter the normal failure path rather than silently returning. Failed search exposes complete native browsing during connecting and after boot; the recovery CSS has sufficient specificity.
- Startup Escape handling now exempts events inside native search controls, preserving their behavior while Terminal connects.
- Empty touch Terminal sessions now use the remaining viewport below the search header. Regression assertions measure the independent visible header contribution while preserving Terminal-local geometry and desktop behavior.
- Strict metadata decoding rejects getter properties without executing them; the helper regression confirms this boundary.

## Review outcome

Full-scope Trellis review is complete, with no unresolved findings or required checks. The main session reviewed the implementation/spec changes and portrait/landscape captures. Real-device software-keyboard geometry and subjective owner review remain optional; no physical device or deployment target was used. Commit approval is the next workflow step.
