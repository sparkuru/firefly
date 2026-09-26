# Mobile Experience Contract

## 1. Scope / Trigger

Read this contract when changing homepage composition, Terminal startup or input
ownership, mobile article search, input-mode detection, or document navigation.
The mobile homepage provides local article search, inline directory browsing with
native fallback, and friend links. It does not display or start a command terminal.
This is independent of the article's visual presentation and of a presentation's
document navigator support.

The owner confirmed this homepage constraint in repair task
`mobile-homepage-no-terminal`. Future search or layout work
must preserve it rather than treating mobile Terminal as the baseline.
Task `mobile-homepage-folder-browsing` refines the native homepage into three
section entries and retained friend links rather than an expanded article list.
Owner review then selected inline section/folder navigation to avoid full-page
and theme transitions, with native routes retained as progressive fallback.

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

`[data-home-root-navigation]` holds the three mobile section entries. The three
`[data-home-expanded-group]` sections contain the complete posts/pages/lab index
and are hidden only under the shared mobile policy. `[data-home-friends]` marks
the single shared configured friend group; retain its unique Terminal metadata.
These are static native surfaces, not controllers. Mobile visibility must work
without JavaScript and outrank shell recovery hidden/connecting rules.

The separate site-owned `startHomeBrowse(root: HTMLElement): void` entry enhances
only mobile directory navigation. It does not initialize Terminal or replace
documents. Its public directory projection comes from canonical guest tree
immediate children and public experiment descriptors at build time, not fetches,
command output or raw authored paths. Keep browse copies free of Terminal data
selectors; do not serialize canonical documents, entries or raw front matter.

`HomeBrowseSnapshots.astro` emits inert `[data-home-browse-template]` records with
`data-home-browse-href`, `data-home-browse-path` and `data-home-browse-parent`.
`ContentDirectoryChildren.astro` shares immediate-child labels/order/hrefs with
native directory indexes. `[data-home-browse-directory]` marks directory links
only; files/experiments retain ordinary anchors. Active copies live in
`[data-home-browse-panel]` / `[data-home-browse-list]`, with a single focusable
`[data-home-browse-breadcrumbs]` navigation replacing the separate home/parent
controls and heading. It has a descriptive aria label and `tabindex="-1"` for
owned-focus transfer, while its native segment anchors stay keyboard reachable.
`data-home-browse-view="directory"` withdraws root links and, only under the
shared mobile media condition, the friend group. Preserve friend metadata in
DOM; ready/failed markers belong only to browse availability.
`data-home-browse-experiment-href` on the existing public lab records carries the
exact public experiment entry destination. Snapshot validation matches those
entry hrefs, not inferred descendants of Terminal mount paths; the Terminal
decoder remains unchanged. Cache validated browse fragments privately and
prepare a usable clone before history mutation or consuming native activation.

`DirectoryEntryRow.astro` shares row markup across root and directory snapshots.
Its props are `{ kind?: string; homeBrowse?: boolean; last?: boolean }`, with
homeBrowse/last defaulting false. The native variant preserves a plain
`li[data-kind]` slot. The homeBrowse variant adds `.home-browse-tree-row`, a
decorative `[data-home-browse-tree-prefix][aria-hidden="true"]`, and a
`.home-browse-tree-content` slot wrapper. `last` selects `└──` versus `├──`.
Mobile `.home-browse-tree` lists suppress bullets; rows use a 3ch marker column,
1ch gap and flexible text column. Root and all inline section lists use this
same presentation; keep labels and public markers inside the text column.

The pure history helpers in `apps/site/src/lib/home-browse-history.ts` are:

```ts
export const HOME_BROWSE_HISTORY_KEY = 'fireflyHomeBrowse';
homeBrowseHref(state: unknown, directories: ReadonlySet<string>): string;
homeBrowseState(state: unknown, href: string): Record<string, unknown>;
```

The namespaced state is exactly `{ version: 1, href }`; href is `/` or a registered
directory. The decoder returns root for missing, extra-field, wrong-version or
unregistered values. The writer preserves other object-state fields and accepts
only the controller's already-registered hrefs at its call sites. It changes no
URL. `popstate` and `pageshow` restore valid visit-local browse state.

Search emits `firefly:home-search-clear` on the homepage root after resetting its
input/results and returning focus to the input. Browse listens for that explicit
action and resets root without stealing search focus. No controller availability
or initialization depends on that event.

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
- The homepage section entries are exactly `pages/`, `lab/`, `posts/`, in that
  order, with native `/pages/`, `/lab/`, `/posts/` destinations. Their article,
  page and experiment lists are not expanded on mobile home. Retain the existing
  configured `friend links` group below, including names, descriptions, native
  URLs, configured order and empty feedback. Friends are outside article search.
- After successful independent browse initialization, ordinary mobile directory
  activation opens pages/lab/posts lists and post subfolders within the same
  homepage document. No fetch, reload or theme change occurs. Display only
  canonical immediate children and an underlined clickable path such as
  `~/blogs/posts/infra`. Plain text `~` and slashes separate native anchors:
  `blogs` links to `/`, each public path segment to its registered directory.
  The current segment remains clickable with `aria-current="page"`; reactivation
  is a history no-op. This replaces separate home/parent controls and duplicate
  headings. Root files remain reachable; search remains global at every depth.
  Friends appear only at mobile browse root, hidden from accessibility/tab order
  within a directory; root/Back/Clear/browse failure restores them. Desktop friend
  rendering and no-JavaScript root visibility remain unchanged.
- Keep real native directory hrefs as no-JavaScript, failed/delayed enhancement
  and modified/new-tab fallback. Articles, experiments and friend links remain
  canonical native destinations. Do not add a site-wide router, shell command,
  new friends route or authored hierarchy change.
- Mobile home and inline directory UI share `var(--terminal-font-size)` (default
  1rem): browse/friend headings, breadcrumbs, section/folder/file/experiment
  links, friend text and search text/controls/results. Preserve heading command
  color and 500 weight; the owner's uniform-size refinement supersedes the old
  1.1rem heading exception. Directory links have no decorative borders/boxes;
  retain 44px targets, visible focus and readable wrapping. Preserve desktop
  recovery and destination article typography.
- Root section rows and all inline sibling rows use matching tree prefixes:
  `├──` for non-final items, `└──` for the final item. Remove native bullet dots,
  keep markers outside anchors and hidden from assistive technology, preserve
  native link names/hrefs and list semantics, and align wrapped labels beneath
  their text column. Apply shared listing changes only to the homeBrowse variant;
  native standalone indexes and desktop/Terminal retain their presentation.
  Search results and friend links keep their non-tree composition.
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
- Keep the root or current inline browse view available regardless of
  connecting/ready/failed state or desktop-written `hidden` flags. Friends follow
  root-only mobile visibility. Suppress shell-only recovery
  framing and expanded section groups. Hidden descendants leave accessibility
  and focus order. Public articles remain reachable through native indexes.
- Preserve the complete public entry/template projection for search and desktop
  Terminal even when expanded browse groups are hidden on mobile. Do not filter
  the corpus to the three visible entries or duplicate entry/friend metadata.
  Desktop retains its expanded native recovery surface.
- Validate registered directory snapshots before intercepting activation. Missing
  or invalid browse data withdraws only the enhancement and restores native root
  links; search remains independent. A click is not swallowed before its next
  list is usable. Initial/mobile mode never opens a shell on browse failure.
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
- Local directory history uses a namespaced validated public browse value,
  preserving unrelated history fields and the homepage URL. Push only real view
  changes. Back/Forward and returning from an article restore a valid registered
  directory; stale/unknown state returns to root. Do not store search queries,
  private metadata or commands, and do not install global keyboard ownership.
- Browse initialization and mode changes are single-instance. Replacing a list
  may move its owned focus to the breadcrumb navigation; initial load must
  not autofocus. Desktop mode leaves native/Terminal events untouched, withdraws
  hidden browse focus, and returning mobile restores the valid current view.
  If restoring a mobile directory would hide the currently focused friend link,
  transfer that owned focus to breadcrumbs. Preserve independently focused
  search controls and explicit Clear's input focus.

### Search and reading

- Preserve the matching/data/failure contract in
  [Homepage Search](./homepage-search-contract.md): public posts/pages, metadata
  and rendered body, literal matching, safe bounded excerpts, IME, clear/count,
  canonical links, and local visit-only queries. Clear restores empty search
  feedback and explicitly returns inline browsing to the three-entry root, with
  friends retained. Blank query handling alone does not reset a chosen directory.
- With JavaScript disabled, blocked, delayed, or search initialization/extraction
  failed, native browsing stays usable. Do not expose inert search controls or
  fall back to a mobile shell. Search and desktop Terminal failure are separate.
  Search failure also leaves independently initialized directory browsing usable;
  browse failure does not disable search.
- Article pages keep complete content, outline, native links, comments and their
  configured visual theme. Navigator `supportsMobile` defaults to false; an
  explicit presentation opt-in remains supported. `navigator = "none"` remains
  the stronger all-device disable. Homepage shell availability is not that flag.
- Do not change authored metadata, public access projection, Terminal command
  semantics, or remote services to implement this UI policy.

## 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| Initial touch-primary/no-hover home | Search after its initialization; three section entries and friend links; no expanded sections, Terminal initialization or visible boot/session |
| Modules delayed/blocked or JavaScript disabled | Section entries and friend links from first paint; no boot flash, prompt, or inert working-looking search |
| Search metadata/template/extraction failure | Withdraw search, preserve current browse/breadcrumbs and bounded feedback; friends follow root-only visibility; never start a shell |
| Ordinary registered directory activation | Inline immediate children and clickable path; same document/theme and no network request; mobile friends hidden |
| Breadcrumb root/ancestor activation | Same-document registered view; root restores friends; current segment adds no history |
| Browse initialization/projection failure | Restore native root links, preserve independent search/friends |
| Modified/new-tab or final article/experiment/friend link | Preserve canonical native browser navigation |
| Browser Back/Forward or article return | Restore valid local directory state; unknown/stale state becomes root |
| Explicit search Clear | Empty feedback and three-entry root, with friends retained |
| Blank query | Empty feedback without resetting selected directory |
| Native post directory | Immediate children only; nested folders and root files reachable with parent/home/Back |
| No configured friends | Existing explicit empty feedback, no fabricated friend links |
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

- On built public artifacts, assert visible search, exactly three section links
  in the required order, and configured native friend links; expanded section
  links are hidden on mobile. Preserve complete public entry/template counts
  and unique friend metadata. Verify native pages/lab/posts destinations, nested
  post browsing, root files, parent/home/Back and friend labels/descriptions/URLs,
  including no-JavaScript and empty-friend behavior. On interactive mobile,
  verify inline pages/lab/post traversal with no document/fetch requests,
  `~/blogs/...` breadcrumb labels/canonical hrefs/underlines, ancestor/root/current
  activation, current aria state, Back/Forward and article-return restoration.
  Assert friends hidden within directories and restored at root/Back/Clear/failure,
  with unchanged desktop behavior. Verify modified
  links retain canonical destinations, projection/history failures recover and
  repeated initialization does not duplicate events/history. Assert absent
  startup/session both immediately and after the boot interval. On an initially
  mobile page, assert no initialized Terminal controller or boot transcript.
- Dispatch native typing/Escape/Ctrl+L/composition events and verify Terminal
  neither prevents them nor redirects focus/commands. Verify no autofocus.
- Cover delayed/blocked modules, JavaScript disabled, search failure, and normal
  query/IME/Enter/clear/no-results/canonical-link behavior with section navigation
  and root-only friends. Search must find public pages and descendant body hits
  outside visible section entries; friends do not become article results.
  Search from inside a folder remains global; Clear returns root without losing
  friends. Cover independent browse/search initialization and failure.
- Cover repeated mode changes during connecting and ready states, hidden-focus
  release, absence of late boot/effect revival, and one desktop command effect
  after resume. Include desktop-origin blocked/delayed-module detours: return to
  desktop must retain native recovery on failure and startup guards while pending.
  Retain desktop startup/command/recovery regressions and article
  navigator/ordinary-reading coverage.
- Cover portrait/landscape phones, touch tablets, narrow fine-pointer desktop,
  long paths/results, at least 44px targets, focus and horizontal overflow.
  Inspect viewport captures; do not infer absence solely from a root flag.
  Compare computed shared typography across root/folder headings, breadcrumb,
  rows and search/friends. Assert correct non-final/final tree prefixes, no native
  bullets, decorative marker accessibility and aligned long-label wrapping.
  Compare heading color/weight; assert directory borders absent and breadcrumb
  44px targets/wrapping, and inspect non-flashing inline transitions.
- Use the tracked public fixture and wrapper/built-artifact gates in
  [Validation Profile](../trellis-plus/validation-profile.md). Register new suites
  in explicit Playwright project patterns. Replace obsolete mobile-shell-positive
  assumptions with these assertions; do not merely skip the failing scenario.
  In mixed suites, command rendering cases (such as repeated `cat` diagrams)
  belong to desktop interactive mode; retain canonical native diagram/article
  coverage in mobile and static modes. Fixture mutations must target the actual
  friend group rather than assuming recovery contains exactly one navigation.

## 7. Wrong vs Correct

```ts
// Wrong: CSS visibility does not suspend an eager controller's input ownership.
root.querySelector<HTMLElement>('[data-terminal-session]')!.hidden = true;

// Correct: these public entries independently own availability. The Terminal
// entry is the media-gated lifecycle, not the eager controller initializer.
startHomeBrowse(root);
startHomeSearch(root);
startTerminalHome(root);
```

```text
Wrong acceptance: a visible search form plus a usable mobile command prompt.
Correct acceptance: visible search, inline pages/lab/posts browsing with native
fallback and friend links; articles reached through browse or search; no mobile boot
or command UI and no invisible Terminal input ownership.
```
