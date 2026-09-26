# Technical design

## Architecture and boundaries

Refine the uncommitted first implementation in `apps/site`. The mobile root
retains search, three ordinary section anchors in pages/lab/posts order and the
single configured friend group below. Match the browse heading to the friend
heading's existing command color and 500 weight; use one existing base font size
(`var(--terminal-font-size)`, default 1rem) throughout mobile homepage and inline
directory UI, including headings, breadcrumbs, entries, search and friends. The
owner's latest uniform-font request supersedes the earlier 1.1rem heading size.
Remove decorative
link borders while preserving 44px targets and focus. Desktop styling is scoped
out of that change.

Progressively enhance this browse surface with a small independent controller,
`startHomeBrowse(root: HTMLElement): void`, using the shared coarse/no-hover
policy. It switches only directory lists in the existing homepage DOM. It does
not replace documents, operate Terminal, fetch directories, render articles or
install a site-wide client router.

Reuse canonical guest-projected `ContentDirectory` immediate children and public
experiment descriptors at build time. Generate inert directory-list snapshots
(or an equivalently minimal, validated site-owned projection) for existing
pages/posts directories and the lab index. Allow only public names, canonical
hrefs, directory/file kinds, parent relationships and existing public display
markers needed for browsing. Do not serialize entire canonical documents,
Astro entries, raw front matter, host paths or the full tree object.

Prefer sharing the immediate-child renderer with `ContentDirectoryIndex` where
it avoids duplicated semantics. Existing native section/directory routes stay
available as fallback. Do not introduce new authored pages hierarchy support.

Use a shared mobile tree-row presentation for root section entries and inline
folder/file/page/experiment siblings: `├──` before each non-final item and `└──`
before the last. Suppress native bullets and align marker/text columns, including
wrapped long labels and public content markers. Explicit decorative spans may
use `aria-hidden="true"`; keep markers outside anchors, canonical anchor labels/
hrefs and list semantics intact. Scope shared child renderer changes to its
homeBrowse variant; native standalone indexes, desktop and Terminal stay unchanged.
Do not apply tree markers to search results or friend links.

Actual shared row renderer: `DirectoryEntryRow.astro` with optional
`kind`, `homeBrowse` and `last` props. The default/native variant keeps a plain
`li[data-kind]` and slot; homeBrowse adds `.home-browse-tree-row`, an
`aria-hidden="true"` `[data-home-browse-tree-prefix]` and
`.home-browse-tree-content` wrapper. Mobile `.home-browse-tree` rows use a 3ch
marker column and 1ch gap before flexible text. Last-sibling selection is
build-rendered; the browse controller/history needs no new logic.

## DOM and public data contracts

Keep `data-home-root-navigation`, the three `data-home-expanded-group` sections
and the shared `data-home-friends` surface from the first pass. Add a separately
owned inline list/breadcrumb surface and inert browse snapshots. Visible
browse copies must not use Terminal entry/experiment/friend metadata selectors:
the complete original `data-terminal-entry` / `data-terminal-template` mapping
and single friend projection remain authoritative for search/desktop Terminal.

Initial static CSS shows root links and friends, hides expanded sections and
any uninitialized inline panel. After successful mobile browse initialization,
ordinary directory activation reveals only its immediate children. Files and
experiments are real native anchors to canonical public destinations; friend
links remain outside this panel and visible only at the mobile root view.

Build-rendered text is Astro-escaped. Runtime uses existing safe snapshots or
plain text/DOM nodes; do not generate query/authored `innerHTML`, parse command
output, or derive routes from user input. Missing/invalid browse projection
withdraws the enhancement and restores native root links. Search and its full
body corpus remain independently available.

## Interaction, history and focus

Only a registered directory's unmodified same-tab activation is intercepted,
after validation and while mobile-eligible. Modified clicks, new-tab/download/
external links, articles, experiments and friends retain browser ownership.
No click should be swallowed before a usable next list exists.

Display a single path breadcrumb navigation such as `~/blogs/posts/infra`.
The `~` prefix and slash separators are plain text; `blogs` is an underlined
native `/` anchor and every public directory segment is an underlined native
anchor to its registered canonical path. The last segment is also clickable,
marked `aria-current="page"`, and reactivation is a history no-op. Replace
the separate home/parent controls and duplicate path heading. Retain a stable
focusable path navigation container for list-change focus, a descriptive aria
label and 44px targets; long public names wrap without horizontal overflow.
Ancestor/root ordinary clicks reuse the existing local browse controller;
modified/new-tab activations keep native browser ownership. Post lists preserve
directory-before-file canonical order, display names and immediate children,
including root files and nested folders. Lab uses its existing public experiment
index; it does not become part of article search.

Use visit-local browser history state with a namespaced browse key to preserve
the chosen registered directory and root; keep the homepage URL unchanged.
Preserve unrelated history fields. Push only actual directory changes;
Back/Forward restores the registered list without document navigation. On
homepage initialization, a valid current browse state may be restored; unknown
or stale state resolves to root. No search query or private/command data enters
history, storage or network. This is local component history, not route takeover.

When replacing a list that owns focus, put focus on its stable breadcrumb
navigation without autofocus on initial load or keyboard capture.
An input-mode change hides/suspends browse interaction, releases only owned
hidden focus, and restores the current valid view on returning to mobile.
Repeated setup/transitions cannot duplicate listeners or history pushes.

## Search integration and failure

Search stays global and visible while browsing folders; it continues to use the
complete existing public entry/template corpus. Friends and experiments remain
excluded. Explicit Clear resets the search and the browse surface to root,
retaining friends. Coordinate this explicit action through the existing clear
control or a small site-owned event rather than coupling controller lifecycles.

Search failure leaves the current browse view/breadcrumb navigation available. Browse
failure restores canonical native root navigation without disabling search.
Disabled/blocked/delayed JavaScript leaves the existing native hrefs usable.
Desktop keeps its expanded native recovery and original Terminal lifecycle,
including hidden flags and desktop-origin mobile detours.

Scope friend visibility to the shared mobile media query and directory view
marker: mobile root shows the single existing group, an inline directory hides
it from display/accessibility/tab order, and root/Back/explicit Clear/failure
restores it. Preserve the metadata DOM and desktop friend behavior. Search
stays visible and global at every directory depth.

## Compatibility, evidence and rollback

Posts/pages currently navigate into TerminalLayout with inline CSS; lab changes
to the existing light DocumentLayout with external CSS. This explains full
document/theme transitions, without claiming a specific deployment/network cause
for every reported white interval. Inline folder/section changes avoid those
requests and theme changes; opening final articles/experiments still navigates
as explicitly selected by the owner.

Test no additional document/network requests while entering all three sections
and post subfolders, clickable root/ancestor/current path, Back/Forward, modified native
activation, clear from a folder, independent failures and repeated media changes.
Keep canonical no-JavaScript route, complete corpus/private projection, desktop
Terminal and native diagram coverage. Use bounded existing fixtures for deeper
directories and empty friends, without authored changes.

Inspect updated portrait/landscape/tablet viewport captures for equal heading
styles, border-free links, accessible focus/targets and no white/shell flash.
Rollback removes only the local enhancement/style refinement and updated tests/
contracts; native routes and authored data require no migration.
