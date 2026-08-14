# Repository and Source Evidence — M5 Full Content Migration

## Confirmed repository boundary

- The main site is Astro 7 static output. Its only published input is the
  canonical `guest` projection created from materialized Markdown; routes,
  directory trees, Terminal entries, templates, and aliases share that one
  model.
- The current repository source is intentionally a small fixture, not the
  historic corpus. The schema already accepts `timeline` and `files`, but the
  canonical model correctly rejects those layouts until real semantics are
  supplied.
- The static release and runtime image reject symlinks, private paths, source
  maps, and unsafe references in generated/runtime artifacts. Owner-confirmed
  Markdown article/page bodies are a trusted public-content boundary; strict
  text scanning remains applicable to experiment and non-authored artifacts.
  `nginx.conf` currently has only fixed redirects, so legacy redirect support
  needs a validated generated include/manifest rather than hand-maintained
  locations.
- Existing validation owns static/no-JavaScript routes, interactive Terminal,
  assembled publication, and runtime image probes. No current task may weaken
  the M5 workspace, access-projection, Experiment, or Nginx boundaries.

## Private source evidence

- The SHA-256-checked private backup contains Typecho content, comment, metadata,
  relationship, field, option, and user tables. MariaDB aggregate analysis
  confirms 100 current content rows (93 published posts and 7 published pages),
  2,276 custom-field rows, 36 taxonomy rows, 107 relationships, 189 comments,
  2 Typecho users, and 77 option rows. Article rows provide title, slug,
  publication/update times, body, template/type/status, parent, and historic
  counters; custom fields are stored separately. The independent `Notes` table
  contains 376 memo-like records with ownership, permission, timestamps, aliases,
  and soft-delete state. Values and record contents are intentionally absent from
  tracked evidence; the detailed aggregate source map is in
  `research/sql-source-analysis.md`.
- The 7 categories are all root categories and the 93 posts each have exactly one
  category relationship, making category-slug folders deterministic. The tag
  table has 29 definitions but only 14 active relationships across 10 content
  rows; unused taxonomy stays private unless explicitly reviewed. Of the 2,276
  custom-field rows, 1,196 attach to current content and 1,080 are orphaned
  historical records. `customSummary` is the only strong immediate description
  candidate; theme flags and parser/asset fields require a candidate report.
- The aggregate body inventory shows an HTML/Markdown hybrid with fenced code,
  HTTP references, and a small number of image-like references. Migration
  therefore needs deterministic wrapper normalization and a resource manifest;
  blind text copying would violate the current X Core raw-HTML boundary. The
  owner-approved body remains public authored content and is not subject to a
  release credential/path redaction scan.
- All 189 historical comments are approved; mail, URL, IP, user-agent, and text
  coverage is retained only for a private M5.1 handoff. The content author
  relation resolves to one source author, while comments reference multiple
  source identities. The suggested `wkyuu`/mail/url identity defaults remain a
  reviewed private configuration boundary, not a public bundle.
- An owner-authorized, read-only remote inventory located the live Typecho
  installation and its upload source under the managed web tree. The source is
  accessible to the owner account, currently contains one regular JPEG of roughly
  4.9 MB, and contains no symbolic links. Exact server paths, host data, and
  configuration contents are intentionally omitted from tracked evidence.
- Remote inspection performed no writes, transfers, privilege escalation, or
  configuration reads. Actual transfer remains an implementation step with an
  explicit source manifest and checksums.

## Design consequences

- Migrate articles through a private source ledger and a reviewed public
  projection; never commit/import raw SQL, source credentials, private Typecho
  identifiers, or server paths. Memo and comment records remain private handoff
  data in M5.
- Treat source-upload assets as a second declared input. Copy only regular files
  listed by the resource manifest into managed static assets; trusted external
  URLs stay external; all authored local image references, including safe
  relative `assets/<segments>` and legacy drive-style paths, remain deferred
  until their OSS upload; unsafe URI schemes receive an exception record.
- Treat historic Typecho URLs only as optional migration evidence. The immutable
  site uses native folder-derived f1refly routes rather than shipping a redirect
  subsystem solely for one-time compatibility.
