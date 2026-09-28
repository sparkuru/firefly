# Document navigator composition — final design for review

Status: implementation authorized 2026-09-17. The composition matrix and site-owned per-presentation
configuration are approved, as is semantic local exit with a visible exit control
and focus restoration; firefly retains its home exit. Direct theme-field migration
to `contentTheme` without compatibility is approved. Themes express authored
presentation intent; no public picker is included. The owner approved document
`open`, experiment `launch`, unchanged inline `cat`, and ordinary reading for
disabled navigation. All renamed contracts replace the old ones directly, without
compatibility. Semantic entry/exit uses immediate page-local mode changes and URL
replacement without new history entries, reloads or forced scrolling. Product
decisions are resolved; child tasks A–D implement the approved boundaries in order.

## Configuration and resolution

Extend the existing `config/site.toml` configuration loader with an optional
`documentNavigation` table keyed by registered presentation ID. Public
shape (illustrative configuration only):

```toml
[documentNavigation.firefly]
navigator = "document-navigator"

[documentNavigation.semantic]
navigator = "none"
```

The selected site configuration file remains authoritative; reuse existing
`FIREFLY_SITE_CONFIG_PATH` loading, without adding environment overrides or
front-matter fields. This is build-time configuration and requires a rebuild.

| Input | Resolution |
| --- | --- |
| Whole table or presentation entry omitted | Existing presentation default |
| Present entry | Require exactly a registered navigator ID or `none` |
| Empty entry, unknown presentation/key/ID, wrong type | Configuration error |
| Explicit `none` | Disabled discriminated result; no enabled profile/assets |

Keep `always` for firefly and `fragment` for semantic as default entry policies.
Do not add a public entry-policy override in this release. These policies describe
the existing navigator's entry behavior, not separate implementations.

Maintain a presentation registry (adapter and renderer/chrome), a navigator
registry (supported profiles, enhancement and asset definitions), and composition
defaults. One site-owned resolver combines the selected presentation with its
configuration override or default and validates the resulting profile. Avoid an
import cycle: config parsing validates structure; a composition module validates
IDs and resolves against registries before document rendering.

The enabled profile also supplies an exit policy: `local` for semantic and `home`
for firefly. The shared controller consumes the resolved entry/exit policy rather
than inspecting presentation IDs. These are internal profile values, not new
public TOML options. Disabled resolution carries neither policy nor assets.

`none` is a disabled result, not a fake navigator registration. Navigator IDs must
not become arbitrary import paths or stylesheet URLs. Definitions refer to known,
build-owned implementations. No runtime plugin discovery is planned.

## Rendering and asset boundaries

Resolve the composition once per canonical document. The renderer receives an
enabled or disabled result; both variants retain the same rendered body, content
theme, headings, outline rules and comments.

Enabled rendering decorates the body with navigator semantics and adds the status
and owned assets. Disabled rendering preserves the ordinary content wrapper but
omits navigator ID/data hooks, focus attributes, region label, status and entry.
Use a shared decoration/composition boundary so each presentation does not
independently implement profile rules.

Separate navigator-specific styles from `global.css` and `terminal.css`, retaining
presentation variants under the navigator's asset ownership. Keep general body
and theme styles available in disabled mode. Explicitly condition resource tags
or a supported build asset entry on the resolved capability. Verify actual Astro
output before selecting the final resource-loading mechanism: omitting a component
at runtime does not prove its processed script or bundled styles are absent.

An enabled page may preload its navigator even when fragment mode is inactive;
`none` pages may not load it. Independently enabled comments and chrome
resources are allowed. The complete publication can still contain navigator
assets needed by other pages.

## Terminal destination capability

Approved behavior: document `open` (renamed from `vim`) opens the canonical URL when the
destination disables navigation and adds `#document-navigator` when enabled.
Keep the Terminal command effect fragment-free and retain same-origin checks.

Generate a site-owned lookup from canonical document paths to resolved navigation
capabilities for destinations available to Terminal. Build it only from the same
public document projection used by Terminal; never serialize private or excluded
document paths. The lookup and document
rendering must use the same resolver and site config. Keep this browser transport
out of X Core metadata and presentation-package command contracts; do not fetch
target pages or infer capability from the current page. Unknown lookup entries
should fail safe to ordinary canonical navigation, with build tests ensuring all
published Terminal document destinations have an entry. Query parameters survive
decoration; route identity remains unchanged.

## Command vocabulary — approved

The owner approved `vim <path>` → `open <path>` for documents and moving the
previous experiment-opening command to `launch <path>`. These are high-frequency shell verbs; follow the
owner's explicit implementation-neutral `open` metaphor and existing shell
vocabulary rather than introduce a branded or cultural name.

| Approved command | Target and behavior |
| --- | --- |
| `open <document-path>` | Resolve a public document and emit the existing `open-document` control / `document-navigation` effect; site resolves navigation capability |
| `launch <experiment-path>` | Resolve an exact listed experiment leaf and emit the existing `open-experiment` control / `navigation` effect |
| `cat <document-path>` | Keep existing inline reading behavior |

The command name does not choose an editor. Future editor support may extend the
site-owned opening composition after its own design; no editor registry, editing
capability or `--editor` option is introduced here. Navigator `none` still has an
ordinary document destination, so `open` falls back to normal reading.

Existing path rules remain authoritative: from `~/blog`, `launch lab/nerv`; from
`~/blog/lab`, `launch nerv` or `launch ./nerv`; from another cwd,
`launch ~/blog/lab/nerv`. Do not introduce a cwd-independent special `lab/<id>`
syntax. Directories, arbitrary URLs and unlisted experiments are not executable
targets. Launching means navigating to the published experiment, not executing a
host process or building an experiment.

Implementation planning must move document completion to `open`, and experiment
completion to `launch`; a textual command-name swap is insufficient. Preserve
document metadata/path matching and safe zero/ambiguous completion behavior.
Update command descriptors, help examples, `cat`'s experiment error, `ls`'s entry
hint, browser accessibility announcements, tests and active contracts together.
Keep existing standalone policy and effect validation; no pipeline expansion.

Approved direct replacement: remove built-in `vim`, do not retain experiment
dispatch under `open`, and give an actionable `launch` hint for an experiment
passed to document `open`. There are no legacy users to accommodate: do not add
alias/history conversion, dual command registration, fallback dispatch or a
deprecation phase. `vim` gets the ordinary unknown-command result. Existing
general-purpose user alias support remains unchanged; no built-in alias reserves
the old name. Historical records are not live contracts and need no rewrite.

Evidence: `presentations/terminal/src/commands/session.ts:17` defines current
usage strings, `:220` / `:230` implement the separate resource-kind dispatch, and
`:247` / `:260` bind different completers. `commands/cat.ts:24` and
`commands/ls.ts:140` embed the old experiment `open` hint. Terminal tests around
`presentations/terminal/tests/terminal.test.ts:614` verify cwd-sensitive experiment
paths. Existing specs also explicitly reject special `open lab/<id>` fallback.

## Semantic entry and exit

Entry: a native header link to `#document-navigator`, shown only for an
enabled navigator. It works even without an outline and remains a body anchor
without JavaScript. With JavaScript, direct fragment loads and same-page clicks
must activate and focus the region; repeated entry cannot duplicate listeners.

Source inspection found two constraints absent from the original baseline:

- `document-navigator.ts:160` returns immediately for a fragment-profile page
  loaded without the navigator fragment. A visible anchor alone cannot activate
  that already-loaded page; the controller needs an inactive lifecycle capable of
  handling later entry.
- `document-navigator.ts:414` currently makes `:q` navigate to `/`. The owner has
  approved changing this behavior for semantic only.

Approved semantic UX: local exit, returning focus to the visible entry link;
preserve firefly's existing `:q` home behavior. A visible semantic exit button
provides the same local-exit action for touch and keyboard users. It appears only
while navigation is active and its handler is ready. Escape within search/command
mode continues to cancel that mode, not leave the document.

### Approved URL and lifecycle contract

Use two semantic states, inactive and active; search/selection/command modes are
substates of active. Disabling navigation by configuration is a separate render
capability, not an inactive controller. Register lifecycle listeners once, even
when the initial page has no navigator fragment.

| Event | State, URL and focus outcome |
| --- | --- |
| Load without navigator fragment | Inactive; leave URL, scroll and focus alone |
| Load with navigator fragment | Activate; focus the body region without a second scripted scroll |
| Unmodified same-tab entry activation with enhancement ready | Remember the current non-navigator fragment; replace the current URL fragment with `#document-navigator`; activate and focus region without forced scrolling or a new history entry |
| Click entry while already active | Focus region; do not add another history entry or reset reading state |
| Semantic `:q` or exit button | Deactivate; replace the current URL fragment with the remembered fragment, or clear it for direct entry; focus visible entry without scrolling |
| Back/Forward or another fragment change | Synchronize active state with the resulting fragment; never write a new history entry in response |
| Navigate to ordinary heading fragment | Deactivate and preserve native heading scrolling; do not redirect focus to the entry |

Entry and exit use URL replacement rather than creating duplicate article history
entries: no
reload, route navigation, added history entry, transition animation or artificial
delay. Ordinary Back/Forward traverses existing browsing history rather than
acting as a navigator-mode undo. Direct fragment links remain shareable.

Use `history.replaceState` while preserving path, query and existing history-state
fields. Explicitly synchronize the controller after replacement, which does not
emit `hashchange`. Observe browser-driven URL changes and page restoration without
creating history entries. Never call `history.back()` to implement local exit.
The restored fragment records the pre-entry URL; exit preserves reading scroll
instead of jumping to that heading or the header. The no-extra-history guarantee
applies to enhanced mode toggles, not normal document and heading navigation.

Keep the actual entry as a native anchor. Intercept only ordinary same-tab
activation when enhancement is ready; modified clicks/new-tab opening retain
browser behavior. Without JS or before initialization, the link performs normal
fragment navigation and does not promise enhanced history behavior.

On browser-driven deactivation, return focus to the visible entry only if focus
would otherwise remain in a now-hidden navigator control. Do not steal focus from
ordinary links or comments. All deactivation paths clear owned search
highlights/selection, close forms, hide navigator status and exit control, restore
the inactive region tabindex, and stop handling reading keys. Preserve unowned
selection. Re-entry starts in normal mode without duplicate handlers; same-page
re-entry retains the last reading unit if it still exists, while a reload starts
fresh. Activating the region never calls the movement routine merely to restore
that unit; scrolling occurs only after an explicit reading-movement command.

No-JS output contains the native entry anchor and complete body but no usable
enhanced exit button. Use “Read document” for the entry and “Exit navigation” for
the enhanced exit button, with keyboard-navigation guidance shown only after
enhancement is ready. If initialization fails, native reading and anchor navigation
remain available. The controls wrap within the header/status at mobile widths,
keep visible focus indicators and use native anchor/button keyboard semantics.

## Theme naming and direct migration — approved

Replace `articleTheme` with `contentTheme` as the only accepted authored theme
field. This is a breaking metadata change, not an optional alias. Keep the existing
theme IDs and omitted-field behavior unchanged.

| Author input | Required result |
| --- | --- |
| Neither field supplied | Normalize `contentTheme` to `default` |
| Only `contentTheme: default` or `paper` | Accept the exact registered ID |
| Only `articleTheme`, with any value | Reject; identify the old key and direct the author to `contentTheme` |
| Both fields, equal or conflicting | Reject the old key; do not choose a precedence |
| Unknown, padded, empty, URL-like or path-like new value | Reject; do not normalize or infer an asset path |
| Explicit null, array, object, boolean or number | Reject; omission alone gets the fallback |

Diagnostics should identify the affected document and field without dumping the
full front matter or body. Strict unknown-key validation remains in place; naming
the expected `contentTheme` field is sufficient. Do not introduce an old-schema
parser or conversion layer merely to produce a specialized migration message.

Synchronize these surfaces in the eventual migration deliverable:

| Surface | New contract |
| --- | --- |
| Post/page schemas and repository authored content | `contentTheme` |
| `blog-meta` read/write validation and docs | New key only; old-key requests fail with migration guidance |
| Theme module/type/resolver/constants | Content-theme vocabulary, including `ContentThemeId` and `resolveContentThemeId` |
| Renderer props | `contentTheme` |
| Body theme attribute and theme CSS selectors | Exactly one `data-content-theme` on the content root |
| Content root structure | Retain `[data-article-content]`; no unrelated structural rename |
| X Core, routes, comments and plugin payloads | No theme-field addition |

Rename the theme module and theme-style directory consistently when migrating
their references; retain theme values, visual rules and scope. Do not rename all
uses of “article” mechanically: article semantics, document structure and ordinary
prose styles are outside this field migration. Old-name references may remain in
negative tests, migration guidance and historical records, but not as accepted
inputs, emitted attributes or compatibility exports.

### Content consistency and external scope

Future work updates schema/tooling and repository authored keys together,
preserving theme values. Do not replace occurrences in article prose or code
examples indiscriminately. No migration tool, compatibility window or staged
release is needed.

Repository fixtures and supported examples migrate with the implementation.
External workspaces are not automatically edited: an unmigrated workspace fails
with a schema diagnostic, and successful external-build acceptance requires
input conforming to the new field. This filesystem boundary is independent of
compatibility policy; direct replacement does not authorize editing external data.
Rollback pairs the previous application/schema with the previous content revision;
an old application and new-field content are not assumed compatible.

## Author-controlled themes — clarified scope

Retain the current registered `default`/`paper` content-only themes and use the
approved `contentTheme` / `data-content-theme` contract.
The authored value is the rendering authority, not a preference for the reader to
override. Resolve it at build time and emit `data-content-theme` on the content
root. An omitted field resolves to `default`. Navigator selection, entry and exit
do not participate in theme resolution or mutate the theme attribute.

No public picker, theme-switching browser controller, URL theme override or stored
reader theme preference is introduced. There is consequently no reader/author
precedence rule or persistence mechanism to design. Both JS-enabled and no-JS
reading retain the authored styling in every supported composition cell.

Author preview tooling is a separate possible future task, not an implicit
replacement for the removed picker. Do not add theme-lock flags or selectable
theme lists without a new requirement. Browser accessibility features and user
stylesheets are not restricted by this application-level presentation contract.
External authored files remain untouched during this design-only work.

## Compatibility and future verification

Omitted navigation configuration preserves existing enabled behavior. The
canonical route and X Core contracts remain stable; front matter gains no
navigator field. Existing fragment migration remains an invariant.

Future verification must cover configuration failures and omission defaults,
the four composition cells for posts/pages and both themes, built asset graphs,
browser requests, no-JS reading, destination-aware Terminal navigation, and the
eventual approved entry/history/theme contracts. A test-only alternate registry
definition can check resolution extensibility; it does not establish support for
unimplemented production navigators.

Rollback of navigation settings is omission of the new table followed by rebuild.
Theme-field rollback requires the paired application/content revisions described
above; removing the navigation table does not reverse metadata migration.
