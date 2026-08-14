# Typecho and SQL Source Analysis — M5 Planning and Implementation Evidence

## Method and privacy boundary

This is a privacy-safe, aggregate analysis of the SHA-256-checked private SQL
backup. The planning pass imported the dump into a disposable, no-persistence
MariaDB 11.8 container and queried `information_schema` and aggregate SQL; the
implementation pass repeats the checksum and source-boundary checks through the
owner-local importer. No source body, title, email, URL, IP, credential, server
path, database identifier, or memo content is stored in this document. The
temporary database is not a site runtime and is removed after analysis.

The counts below are evidence for the migration design, not publication data.
The importer must repeat the checks against the declared backup checksum before
it materializes any candidate corpus.

## Source table map

| Source table | Rows | Role | M5 disposition |
| --- | ---: | --- | --- |
| `typecho_contents` | 100 | post/page title, slug, timestamps, body, template/type/status, state flags, historic counters | Source of article/page documents; map only reviewed semantic fields |
| `typecho_fields` | 2,276 | Typecho custom key/value fields | Candidate report only; 1,196 rows attach to current content and 1,080 are orphaned historical rows |
| `typecho_metas` | 36 | categories and tags | Category relationships drive folders; used tags may become public tags |
| `typecho_relationships` | 107 | content-to-category/tag edges | Source of taxonomy membership; never expose numeric IDs |
| `typecho_comments` | 189 | historical comments and commenter metadata | Private M5.1 handoff only; no public rendering |
| `typecho_users` | 2 | Typecho author/account identity fields | Private identity source; public alias requires owner approval |
| `typecho_options` | 77 rows / 70 names | site, theme, plugin, and runtime settings | Configuration evidence only; never article front matter |
| `Notes` | 376 | memo-like collaborative records with permissions and soft-delete marker | Ignored private discovery export; no M5 route |
| `Revisions` / `Authors` / `Sessions` / `Temp` | 1,019 / 103 / 26 / 0 | Hedgedoc collaboration/runtime support tables | Not public corpus; retain only if a later memo audit needs correspondence |

The source has 100 current content rows: 93 published `post` rows and 7
published `page` rows. All rows have the three Typecho comment/ping/feed flags
enabled and none has a password. Ninety-eight rows have no template name; one
page uses `cross.php` and one page uses `files.php`. Those template names are
layout candidates for review, not instructions to recreate Typecho special
routes. All content rows are root-valued for the Typecho `parent` field.

## Taxonomy and folder route evidence

- There are 7 root categories and 29 tag definitions. Every one of the 93 posts
  has exactly one category relationship, so the current corpus has a deterministic
  category folder without a tie-breaking policy.
- There are 14 tag relationships across 10 content rows. Only 4 tag definitions
  have a positive denormalized count; the other definitions are historical and
  unused by the current relationship table.
- Category descriptions are present for all 7 categories. They are candidates
  for directory-index descriptions, not automatic article front matter.
- A category slug and a tag slug collide once across the two taxonomy
  namespaces. Separate `/posts/<category>/...` and `/tags/<tag>/` namespaces keep
  this safe; the importer still validates normalized route collisions.

The native route proposal is therefore:

```text
content/posts/<category-slug>/<normalized-content-slug>.md
```

and `content/pages/<normalized-page-slug>.md` for the 7 pages. The source
category display name and description can remain in the migration ledger and a
reviewed directory index. No Typecho numeric ID or legacy permalink grammar is
needed.

## Base content field classification

| Field group | Evidence | Initial classification |
| --- | --- | --- |
| `title`, `created`, `modified`, `text` | Present on all 100 rows; 87 rows have a later modified time | Safe baseline after normalization; `created` becomes `date`, meaningful later `modified` becomes `updated` |
| `slug` | 100 distinct values across 100 rows | Normalize and validate as the filename stem; record every collision/unsafe segment as an exception |
| `type`, `status` | 93 `post` + 7 `page`, all `publish` | Map to existing `post`/`page` layouts; special template names do not change layout automatically |
| `parent`, `order`, `authorId` | All content is root-valued; one distinct content author | Preserve only in private correspondence or a reviewed semantic field; do not expose source IDs |
| `password` | No non-empty values | Do not create a password gate |
| `commentsNum`, `views`, `stars` | Historic counters exist; non-zero values occur on a subset of posts | Keep private in M5; a future public projection requires a separate schema/display decision |
| `allowComment`, `allowPing`, `allowFeed` | All 100 rows are enabled | Runtime flags, not public front matter |

The planning body inventory is aggregate-only: post bodies range from 20 to 58,452
characters (mean about 8,306), page bodies from 15 to 3,446 characters (mean
about 1,760). All rows contain angle-bracket/HTML-like or wrapper syntax; 65
posts and 1 page contain fenced-code markers, 75 posts and 3 pages contain HTTP
references, and 7 posts contain image-like HTML. No script or iframe token was
observed. The importer therefore needs a deterministic HTML/Markdown wrapper
normalizer, resource extraction, and X Core-safe Markdown output rather than a
blind text copy.

## Custom field classification

There are 12 field names, all stored in `str_value`. The current-content join
has 1,196 rows (the remaining 1,080 rows refer to content no longer present).
The initial candidate policy is:

| Field name | Current-content signal | Initial treatment |
| --- | --- | --- |
| `customSummary` | 95 non-empty rows; 96 distinct values | Candidate for `description` after safe text normalization; missing values use a derived summary |
| `reprint` | 2 distinct values across 100 rows | Deferred rights/attribution candidate; never publish blindly |
| `thumb` | 3 non-empty current rows | Resource candidate; resolve through the checked asset manifest |
| `thumbSmall`, `thumbDesc` | Empty on all current rows | Reject from public front matter; retain only in the private candidate report |
| `mathjax`, `parseWay` | Constant non-empty values where present | Parser/presentation behavior candidates, not document metadata |
| `outdatedNotice` | Constant boolean-like value | Theme presentation flag; reject from front matter |
| `noThumbInfoEmoji`, `noThumbInfoStyle`, `thumbChoice`, `thumbStyle` | Empty or constant theme values | Theme/presentation controls; reject or defer, never auto-publish |

The report must preserve the source field name, current/orphan coverage, a
classification (`approved`, `deferred`, or `rejected`), and the review reason,
without copying raw values.

## Comments and identity evidence

All 189 comment rows are `comment`/`approved`. 187 are root-valued and 2 are
replies. The private field coverage is: 183 rows with mail, 177 with URL, and
189 with IP, user-agent, and text. The content author relation resolves to one
source author; comments reference three distinct author IDs and one distinct
owner ID. These facts support a separate private identity map and comment
handoff, not a static public identity bundle.

The proposed identity boundary is:

- M5 keeps source author/comment identity correspondence in the ignored ledger.
- A future public alias map may contain an owner-approved display name and
  optional external URL. The suggested defaults (`wkyuu`, `mail`, `url`) are
  configuration inputs to review, not permission to publish email or IP data.
- Email, IP, user-agent, moderation state, and raw comment author fields remain
  private database/ledger data for M5.1. The static site never queries them.

## Memo evidence

The `Notes` table has 376 rows, all with a null soft-delete marker in this
backup. Permission values are distributed across `freely`, `editable`,
`limited`, `locked`, `protected`, and `private`; ownership and last-change
relations span a small number of source identities. M5 should export every row
to an ignored discovery artifact while retaining permission/deletion state and
opaque correspondence, then decide separately which memos (if any) become blog
content. No memo title, body, alias, source ID, or permission-bearing record is
copied into the public projection in this task.

## Design conclusions

1. Articles and pages can be migrated completely from the SQL corpus without
   preserving a Typecho runtime.
2. Category relationships are the stable source organization for folder routes;
   used tags are optional navigation metadata, while unused tag definitions stay
   private evidence.
3. Custom fields require a reviewed allowlist and an orphan filter. Only
   `customSummary` is a strong immediate description candidate; presentation and
   asset fields need separate handling.
4. Historical counters are explicitly private in M5. Comments, identity details,
   and memo permissions are useful for future work but are not static public
   metadata by default.
5. Body normalization and resource manifests are first-class migration steps;
   direct SQL text copying would violate the current X Core and static safety
   contracts.

## Implementation evidence

The checksum-verified importer now repeats the source read through the
owner-local `./sam` boundary and writes only the ignored ledger under
`.private/migration/typecho-m5/`. Its aggregate inventory is 93 posts, 7 pages,
7 categories, 4 used tags, 1,196 current-content fields, 1,080 orphan fields,
189 comments, 2 users, and 376 memos. The review candidate contains exactly
100 Markdown files (93 post files under the seven category folders and 7 page
files); the existing site schema check reports zero errors and zero warnings
against its post workspace.

The 961 extracted resource references classify as 931 credential-free HTTPS
externals and 30 owner-approved deferred local image references (23 relative
`assets/...` paths plus 7 legacy drive-style paths) awaiting OSS upload. There
are no document/count, resource, or body-redaction exceptions: the owner has
confirmed that the authored Markdown body is already public and must be
preserved. The private `review-report.json` groups disposition/reason and
exception-code counts without repeating raw references; deferred local assets
appear in the disposition summary but not in blocking exception counts. Private
memo export preserves all permission/deletion states, and
the SQLite identity audit has 9 private identities with no missing
document/comment/memo references. No comment, memo, identity, counter, or raw
source field is present in the review Markdown front matter.
