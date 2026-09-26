# Browse pages, lab and posts from the mobile homepage

## Goal

Reduce the long mobile homepage to search, three directory entry points (`pages/`, `lab/`, `posts/`, in that order), and existing friend links below. On eligible mobile clients with JavaScript, readers browse section contents and post subfolders within the same homepage, then navigate when opening an article or experiment. Keep the heading/link styling consistent, global article search complete and the mobile homepage free of Terminal.

## Confirmed Facts and Decisions

- The owner approved creating a task for planning, then resolved the homepage scope as search plus `pages/`, `lab/`, `posts/`, and subsequently required retaining friend links. Home does not expand article, standalone-page or experiment lists. Search results appear only in response to a query.
- After the uncommitted first implementation, the owner requested a smaller command-colored browse heading, unboxed section links and smoother directory browsing. The owner selected inline homepage browsing over improving whole-page transitions. These refinements stay in the current task.
- `getCanonicalContent()` exposes an immutable guest-projected `ContentDirectory` tree with canonical `href` and immediate children (`apps/site/src/lib/content.ts:134`). Private/draft-only branches are absent.
- Native `/posts/` and nested routes already render one level of folders/articles, with parent/home links (`apps/site/src/pages/posts/index.astro:7`, `apps/site/src/pages/posts/[...path].astro:23`, `apps/site/src/components/ContentDirectoryIndex.astro:24`). Reuse their canonical tree and preserve these routes as no-JavaScript/failure/modified-link fallback; no command execution or site-wide router is needed.
- `/pages/` is an existing native public-page directory index; `/lab/` is the existing public experiment index. Lab is a section entry, not a markdown directory or search corpus extension.
- At planning, home expanded all public posts/pages plus lab/friend groups (`apps/site/src/components/TerminalHome.astro:238`). The tracked posts fixture has only category folders at its first level.
- Search validates the full public entry/template correspondence (`apps/site/src/scripts/home-search.ts:13`). The visible folder view cannot replace or shrink that corpus or desktop Terminal data.
- Existing friend links come from `SITE_CONFIG.terminal.friends` (`apps/site/src/components/TerminalHome.astro:42`) and render as native anchors with names, descriptions and URLs, or explicit empty feedback (`apps/site/src/components/TerminalHome.astro:322`). Reuse this source and preserve its order/destinations.
- Posts/pages use TerminalLayout with inline CSS; lab uses the existing light DocumentLayout and external stylesheet. Repository evidence confirms full document/theme changes, but does not establish the cause of every observed white-screen interval. Inline directory browsing removes that transition for section/folder navigation.

## Requirements

- R1. Eligible mobile homepages initially show exactly three section entry links labeled `pages/`, `lab/`, `posts/`, linking to `/pages/`, `/lab/`, `/posts/` in that order. Do not expand their contents on home. Friend links are a separate retained group under R8.
- R2. Reuse the canonical public content tree and existing section destinations. Each post directory lists only immediate child folders/articles. Readers can descend, open articles, go to parent/home and use browser Back. With JavaScript unavailable, the existing native section/directory routes still provide these actions. Pages and lab retain their existing public entries and destinations.
- R3. Preserve global homepage search across all public posts/pages, including body matching, IME, counts, excerpts and canonical destinations. Search stays global while browsing any folder; clear resets search and returns the browse surface to its three-entry root with friends available. Friend links and experiments are excluded from article search.
- R4. Preserve the touch-primary/no-hover predicate and mobile no-Terminal constraint in portrait/landscape, touch tablets, disabled/delayed JavaScript and media changes. Native root links exist from first paint; search and inline browsing initialize independently. Failed/unavailable browsing enhancement leaves canonical root links usable, without affecting search or enabling a shell.
- R5. Preserve desktop startup/commands, full native recovery, public data projection, article rendering and navigator policy; do not change authored content, schemas or dependencies.
- R6. Preserve access to root-level posts and mixed file/folder directories through inline browsing, native `/posts/` fallback and global search. Do not assume every public post belongs to a category or flatten nested descendants onto home.
- R7. Update mobile/search/workspace specs with three-entry native reachability, failure/no-JavaScript behavior and concrete test assertions. Preserve the stricter complete data projection separately from visible mobile browsing.
- R8. Retain the existing friend links group only on the mobile homepage root view, with configured order, names, descriptions and native destinations. Hide it while an inline directory is open; returning to root, browser Back or explicit search Clear restores it. Native/no-JavaScript home retains friends; desktop behavior is unchanged. Preserve existing empty feedback when no friends are configured; do not introduce a new friends route or duplicate Terminal friend metadata.
- R9. On mobile, use the same existing base font size (`var(--terminal-font-size)`, default 1rem) for homepage and inline folder UI: browse/friend headings, breadcrumb path, section/folder/file/experiment entries, friend text and search text/controls/results. Keep heading command color and 500 weight; this latest owner request supersedes the earlier 1.1rem heading exception. Section/directory links have no decorative boxes; retain accessible 44px targets and visible focus states. Desktop recovery and destination article styling stay unchanged.
- R10. On eligible mobile clients, intercept only ordinary same-tab activation of registered directory links after browse initialization succeeds. Display immediate children in the homepage with clickable underlined path breadcrumbs such as `~/blogs/posts/infra`; `~` and slash separators are plain text, `blogs` links to homepage root, and each public directory segment links to its registered canonical directory. Replace separate home/parent controls and duplicate path heading with this single navigation surface. Keep the current segment underlined/clickable with `aria-current="page"`; reactivating it does not add history. Local Back/Forward remains supported. Pages and lab open their lists inline too. Directory browsing requires no fetch or document navigation; article, experiment, friend and modified/new-tab activations remain canonical native links. Store only validated public browse state in visit-local browser history, never search queries, commands or authored metadata.
- R11. Give the three homepage section entries and every inline directory entry (folder/file/page/experiment) matching tree-style row prefixes: `├──` for all but the last sibling, `└──` for the final sibling. Remove native bullet markers and align wrapped labels below the text column. Prefixes are decorative and hidden from assistive technology; link labels, public hrefs, list semantics and native fallback remain unchanged. Friend links and search results retain their existing non-tree composition; desktop/native standalone directory presentation stays unchanged.

## Acceptance Criteria

- [x] Mobile first paint and settled home show three canonical section entries in the confirmed order and friends below, without expanded descendants, boot or command UI. (R1, R4, R8)
- [x] Ordinary directory activation opens pages/lab/posts and nested post lists within the same document, without network requests or a white/theme transition. Underlined clickable path breadcrumbs navigate home and every ancestor; current segment activation adds no history. Back/Forward restore the right view. Articles/experiments/modified links retain native destinations. (R2, R10)
- [x] Two folder levels, root files and mixed directories are reachable one level at a time in enhanced and native fallback flows; private-only branches remain absent. (R2, R6, R10)
- [x] Global metadata/body search works from inside a directory, including public pages; clear returns the three-entry root with friends retained. Friends/experiments do not enter results. (R3, R8)
- [x] Complete public entry/template correspondence remains intact; no private/draft data or duplicate Terminal entry/friend records are introduced by browse templates. (R1, R3, R5, R10)
- [x] Disabled/blocked/delayed JavaScript or browse initialization failure retains usable canonical links; browse and search failures are independent. (R4, R10)
- [x] Touch layouts and connecting/ready/failed media transitions preserve browse/search/friends, no horizontal overflow or hidden Terminal input ownership, and no duplicate browse handlers/history changes. (R4, R8, R10)
- [x] Desktop Terminal/recovery and canonical route regressions pass. (R5)
- [x] Mobile homepage and inline directory text share the base font size across headings, paths, rows and search/friends. Root and all section/directory rows use correct tree prefixes without bullets; long labels wrap under their text column, native labels/semantics remain intact, and target/focus geometry stays accessible. (R9, R10, R11)
- [x] Configured friend labels/descriptions/destinations and empty feedback appear only at mobile browse root; directory entry hides them and root/Back/Clear restores them, without duplicate metadata or desktop changes. (R8)
- [x] Specs and task evidence match final shared typography/tree rows, breadcrumb and root-only-friends behavior. (R7)

Final breadcrumb/root-only-friends validation and independent review are
recorded in `research/validation.md`, alongside earlier iteration evidence.
The final uniform-typography/tree-row refinement passed validation and independent
review without findings or edits. All acceptance criteria are complete, including
the established breadcrumb/root-only-friends behavior. Final reviewed scope and
the exact commit plan are refreshed. The owner approved submission with
"不错；可以提交"; work commit and archive/journal bookkeeping follow.

## Scope Boundaries

Site-owned mobile homepage composition, a local directory browsing enhancement,
and existing native route fallback. No site-wide SPA router, inline article or
experiment execution, Terminal simulation, command changes, remote search, new
dependency, authored directory migration, pages hierarchy expansion, theme
redesign of destination articles/experiments or deployment. Preserve desktop's
expanded recovery and complete search/Terminal projection. The materially
revised plan was approved with "可以" and implemented; the previous uncommitted
native-only plan is superseded.
