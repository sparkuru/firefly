# Mobile Experience Contract

## 1. Scope / Trigger

Read this contract when changing homepage composition, Terminal startup or input
ownership, mobile article search, input-mode detection, or document navigation.
The mobile homepage is ordinary article browsing with local search. It does not
display or start a command terminal. This is independent of the article's visual
presentation and of a presentation's document navigator support.

The owner confirmed this homepage constraint in repair task
`mobile-homepage-no-terminal`. Future search or layout work
must preserve it rather than treating mobile Terminal as the baseline.

## 2. Signatures and Surfaces

The existing shared input predicate is defined in
`apps/site/src/lib/document-navigation.ts`:

```ts
export const MOBILE_DOCUMENT_NAVIGATION_QUERY =
  '(hover: none) and (pointer: coarse)' as const;
```

CSS uses that same condition. Browser ownership checks use
`window.matchMedia(MOBILE_DOCUMENT_NAVIGATION_QUERY)`, including change events.
Do not substitute viewport width, a user-agent test, or a second divergent
predicate. A narrow fine-pointer desktop remains a desktop homepage.

`TerminalHome.astro` writes the shared predicate to the static root's
`data-terminal-mobile-query` attribute; its inline marker reads that value before
installing startup guards. Keep `data-terminal-startup-marker` on the script:
Astro `define:vars` dropped that marker in the built artifact, so it must not be
used to pass this value. A static-output assertion checks the real marker script
and media gate before connecting state.

`TerminalHome.astro` owns the shared static `[data-terminal-home]` root, native
`[data-terminal-fallback]` index, `[data-terminal-entry]` public links, inert
`[data-terminal-template]` documents, `[data-terminal-startup]`, and
`[data-terminal-session]`. Search is a separate `[data-home-search]` surface,
initialized by `startHomeSearch(root: HTMLElement): void`. Terminal-owned data
attributes on native links/templates do not make them an interactive shell.

The public `startTerminalHome(root: HTMLElement, seams?: TerminalControllerSeams):
void` entry is a single-instance media lifecycle owner. A WeakSet prevents repeat
setup. `data-terminal-home-mode` is `mobile` or `desktop`; initially mobile only
registers the policy listener and sets mode. Desktop lazily initializes the
internal controller, whose `suspend(): void` and `resume(): void` methods manage
availability. `data-terminal-controller-initialized="true"` is only set after an
actual desktop controller is installed, not on mobile-first entry.

## 3. Contracts

### Homepage availability

- Touch-primary, no-hover phones in portrait/landscape and touch tablets get
  native public article browsing and, after independent initialization, search.
  Boot logs, prompts, command input/transcript/completion, shell instructions,
  and Terminal failure announcements are absent from the mobile interface.
- An initially mobile homepage does not construct Terminal session state,
  install its keyboard ownership, schedule its boot gate, or execute commands.
  Search must not wait for Terminal boot or Terminal-only payload validation.
- Hide startup and session through the static mobile CSS before modules run.
  The inline startup marker must gate before marking `connecting` or adding
  Escape/Ctrl+L guards. CSS alone is insufficient: an invisible shell must not
  retain input ownership, intercept events, or focus a hidden prompt. Suspended
  desktop listeners may remain installed only when they return inertly on mobile.
- Startup guards installed by an initial desktop page check the current media
  policy before every event. While temporarily mobile, return without preventing
  events; do not destroy them merely because a mobile key arrives. They must
  protect a return to desktop while the module is still delayed. Release only
  after startup is no longer connecting.
- If that desktop-origin marker reaches DOMContentLoaded without a controller,
  mark it failed even when temporarily mobile. Mobile CSS still presents only
  browsing; returning to desktop then retains recovery rather than an endless
  connecting state. Initial mobile never installs this failure callback.
- Keep the complete native index available regardless of connecting/ready/
  failed state or desktop-written `hidden` flags. Suppress shell-only recovery
  framing while retaining public article links and other native non-shell links.
- Mobile layout flows as search/results and native browsing, without reserving
  another viewport or centering a nonexistent Terminal prompt beneath search.
  Desktop retains its original startup/command placement and behavior.

### Focus, input, and mode changes

- Do not autofocus mobile search, open the software keyboard on entry, capture
  page typing/Escape/Ctrl+L/composition for Terminal, or redirect native link
  activation into commands. Search owns only its explicit form/input actions.
- A desktop-to-mobile policy change suspends Terminal interaction and pending
  startup work, withdraws completion, releases its focus, and exposes browsing.
  Late boot/effect callbacks cannot reveal the shell or restore mobile focus.
- Mobile-to-desktop may initialize or resume one desktop session. Repeated
  transitions must not duplicate boot records, listeners, submissions, or
  command effects. Preserve existing desktop commands/history/recovery.
- Release focus only when owned by the surface being withdrawn; do not move a
  user's native browse/search focus merely because a media event occurs.

### Search and reading

- Preserve the matching/data/failure contract in
  [Homepage Search](./homepage-search-contract.md): public posts/pages, metadata
  and rendered body, literal matching, safe bounded excerpts, IME, clear/count,
  canonical links, and local visit-only queries. Clear restores empty search
  feedback while ordinary article browsing remains available.
- With JavaScript disabled, blocked, delayed, or search initialization/extraction
  failed, native browsing stays usable. Do not expose inert search controls or
  fall back to a mobile shell. Search and desktop Terminal failure are separate.
- Article pages keep complete content, outline, native links, comments and their
  configured visual theme. Navigator `supportsMobile` defaults to false; an
  explicit presentation opt-in remains supported. `navigator = "none"` remains
  the stronger all-device disable. Homepage shell availability is not that flag.
- Do not change authored metadata, public access projection, Terminal command
  semantics, or remote services to implement this UI policy.

## 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| Initial touch-primary/no-hover home | Search after its initialization; complete native links; no Terminal initialization or visible boot/session |
| Modules delayed/blocked or JavaScript disabled | Native browsing from first paint; no boot flash, prompt, or inert working-looking search |
| Search metadata/template/extraction failure | Withdraw search, preserve native links and bounded search feedback; never start a shell |
| Desktop becomes mobile while connecting | Cancel/suspend boot and guards; show native browsing without later shell reveal/focus |
| Desktop-origin boot, mobile detour, then failed module | Mark uninitialized desktop startup failed; native browsing remains usable in both modes |
| Desktop-origin boot, mobile native keys, then desktop while module still delayed | Native mobile keys are unprevented; desktop startup guards still handle Escape/Ctrl+L |
| Desktop becomes mobile while ready | Hide/suspend session, dismiss completion, release owned focus; native events remain native |
| Mobile becomes desktop repeatedly | One usable Terminal instance and one command effect per submission |
| Portrait/landscape or touch-tablet dimensions | Same mobile policy; no horizontal overflow; usable touch controls |
| Narrow fine-pointer desktop | Existing desktop Terminal; no mobile search |
| Article with mobile navigator disabled | Complete ordinary article without navigator entry/status or key/focus ownership |
| Explicit mobile navigator opt-in | Existing presentation navigator behavior; homepage still follows the no-shell policy |

## 5. Good / Base / Bad Cases

- Good: a phone reader searches a body phrase, opens the canonical article, or
  clears search and browses native links without seeing or operating a shell.
- Base: a fine-pointer desktop retains boot, `help`, command history/shortcuts
  and recovery; a touch tablet follows the native mobile homepage policy.
- Bad: adding search above a still-running mobile Terminal, hiding all browse
  links after boot, or treating document navigator disable as sufficient to
  enforce homepage behavior.

## 6. Tests Required

- On built public artifacts, assert visible search/native links and absent
  startup/session both immediately and after the boot interval. On an initially
  mobile page, assert no initialized Terminal controller or boot transcript.
- Dispatch native typing/Escape/Ctrl+L/composition events and verify Terminal
  neither prevents them nor redirects focus/commands. Verify no autofocus.
- Cover delayed/blocked modules, JavaScript disabled, search failure, and normal
  query/IME/Enter/clear/no-results/canonical-link behavior with browsing retained.
- Cover repeated mode changes during connecting and ready states, hidden-focus
  release, absence of late boot/effect revival, and one desktop command effect
  after resume. Include desktop-origin blocked/delayed-module detours: return to
  desktop must retain native recovery on failure and startup guards while pending.
  Retain desktop startup/command/recovery regressions and article
  navigator/ordinary-reading coverage.
- Cover portrait/landscape phones, touch tablets, narrow fine-pointer desktop,
  long paths/results, at least 44px targets, focus and horizontal overflow.
  Inspect viewport captures; do not infer absence solely from a root flag.
- Use the tracked public fixture and wrapper/built-artifact gates in
  [Validation Profile](../trellis-plus/validation-profile.md). Register new suites
  in explicit Playwright project patterns. Replace obsolete mobile-shell-positive
  assumptions with these assertions; do not merely skip the failing scenario.

## 7. Wrong vs Correct

```ts
// Wrong: CSS visibility does not suspend an eager controller's input ownership.
root.querySelector<HTMLElement>('[data-terminal-session]')!.hidden = true;

// Correct: these public entries independently own availability. The Terminal
// entry is the media-gated lifecycle, not the eager controller initializer.
startHomeSearch(root);
startTerminalHome(root);
```

```text
Wrong acceptance: a visible search form plus a usable mobile command prompt.
Correct acceptance: visible search and native article links, no mobile boot or
command UI, and no invisible Terminal input ownership.
```
