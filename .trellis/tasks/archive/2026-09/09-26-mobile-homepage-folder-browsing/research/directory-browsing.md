# Directory browsing research

Latest owner refinement: use the same existing base font size throughout mobile
home/inline directory text (including headings, breadcrumbs, rows, search and
friends). Root section and inline sibling rows share decorative `├──` / final
`└──` tree prefixes instead of native bullets, with aligned wrapping. Preserve
canonical links, list accessibility and existing native/desktop presentation;
friend links and search results keep their non-tree composition. This supersedes
the previous 1.1rem heading exception; no architecture/history change is needed.

## Resolved product scope

Mobile home retains search and exactly `pages/`, `lab/`, `posts/` native entries,
in that order, followed by the retained existing friend links group. Section
contents are not expanded on home. Post folders are entered through `/posts/`,
not placed directly on home. Clear returns to this root-and-friends view.
No blocking owner decision remains.

Owner review of the uncommitted first implementation selected inline homepage
browsing: eligible JavaScript clients open section/folder lists in the same
document, using existing public data, with breadcrumb ancestors/root and Back/Forward. Article,
experiment, friend and modified links stay native; unavailable enhancement keeps
the existing canonical routes as fallback. Search stays global inside folders;
friends appear only at browse root and Clear returns to root. Use underlined
clickable `~/blogs/...` path navigation, replacing separate home/parent controls.
Match mobile browse/friend headings and remove
decorative directory-link boxes. R9/R10 and the revised design own this scope;
the earlier native-only implementation evidence is historical.

## Existing route and data boundaries

`ContentDirectory` owns name, virtual path, canonical href and immediate children.
Its immutable projection orders directories before files after guest filtering;
private-only branches produce no public routes. Reuse that tree rather than
reinterpreting authored paths in the homepage.

Native `/posts/` and nested directory routes already list one level and expose
home/parent anchors. `/pages/` already lists public standalone pages; its existing
document route is `pages/[slug].astro`. `/lab/` lists public experiments using
their entry hrefs, with empty-state feedback. It is not part of markdown search.
No Terminal controller, site-wide SPA router or nested pages directory router is
necessary. A small independent local browse controller is now in scope.

Friend links already come from `SITE_CONFIG.terminal.friends` and render native
name/description/URL links or empty feedback in `TerminalHome.astro:322`. Retain
that group separately from the mobile-hidden expanded sections. Preserve its
configured order/destinations and unique `data-terminal-friend` metadata rather
than adding a new route or duplicated mobile projection. Friends remain outside
the public posts/pages article search corpus.

The tracked posts fixture has category folders at its first level; bounded
synthetic fixtures can exercise deeper descendants and root files using existing
test/materialization machinery. Do not modify authored content for tests. The
posts/pages indexes currently require a public mount; empty-mount support is
unrelated to this homepage composition change.

Desktop Terminal and homepage search consume the full public entry/template
projection. Search requires exact one-to-one paths/hrefs. Keep visual directory
browsing separate from that complete corpus; do not remove pages or descendant
bodies, and do not duplicate entry records while adding root links. Search reads
inert metadata/text and must work when expanded groups are hidden on mobile.

## Spec and validation implications

The pre-task mobile spec/test baseline required every article link visible on
home. Replace that expectation with exactly three section entries, retained friend
links and verified native reachability, retaining complete desktop recovery and
no-Terminal policy.
Do not simply weaken tests into accepting an empty browsing surface.

Validation will use wrapper-built tracked fixtures for root/native hierarchy clicks,
parent/home/Back, friend links, static mobile, search outside the view, failure, touch geometry,
private-only exclusion and desktop regressions. No product edits or gates have
run during planning. Rendering/materialization/build gates share fixture state
and run sequentially. Use viewport captures; pinned full-page screenshots can
reset touch emulation.

## Inline refinement feasibility and boundaries

The canonical guest tree already provides deterministic immediate children,
display names and destinations; public experiment descriptors already feed home.
Build-render minimal inert directory snapshots from these sources rather than
fetching routes or serializing canonical documents/raw metadata. Reusing the
native immediate-child renderer prevents sorting/label drift. Browse clones must
not duplicate the complete Terminal metadata selectors or search-body templates.

Posts/pages native layouts inline Terminal CSS; lab uses light DocumentLayout
and an external stylesheet. Full-page navigation/theme changes are confirmed,
but local source does not prove the cause of every reported white interval.
The chosen inline section/folder view removes those document requests/theme
changes without changing the destination article or experiment theme.

Keep a namespaced validated public-directory value in local browser history,
with the homepage URL unchanged; no global router, search-query persistence or
network requests. Browser Back/Forward, root/parent/Clear, failure/native fallback,
modified links and media/focus ownership need explicit built-artifact assertions.
Refinement results will be appended to `validation.md` after implementation.

The content-workspace spec exceeds the context injection cap. Directly read its
canonical directory, homepage availability, startup/failure and native-route
sections alongside the smaller mobile/search contracts. Existing visible-index
wording is a baseline to update under R7, not an override of resolved scope.
