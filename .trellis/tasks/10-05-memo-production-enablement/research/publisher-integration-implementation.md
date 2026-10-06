# Independent Memo integration implementation

Date: 2026-10-06. Implemented after main's CORE-READY signal and the approved
owner-only Markdown publisher plan. No remote operation, owner config edit,
service stop, commit, task transition or spec edit was performed by this worker.
Core source/contracts/shared policy/image remain owned by the core worker; final
core image inputs were not changed here. Other workers' edits were preserved.

## Files and behavior changed

- Site integration: `apps/site/src/lib/site-config.mjs`, `site-plugins.ts`,
  `content.ts`, `site-seo.mjs`, Terminal home copy, package scripts and static
  inventory assertions. Activation reads no Memo config/export/source even
  when enabled. It controls navigation/sitemap only. The complete namespace
  stays reserved while discovery is hidden. Removed the Astro Memo route,
  stream/form/loader components and obsolete prebuild validator.
- Site fixtures/tests: rebuilt Memo fixture preparation and the contained static
  server for a separately prebuilt public tree. Reading browser tests now
  exercise owner Markdown, GFM lists/code/tables, Unicode owned media, no visitor
  form/script/draft projection, native links, empty state, focus, enlarged text,
  reduced motion and bounded viewport overflow.
- Full assembler: removed Memo config/export/DOM generation ownership and public
  snapshot copying. Retains strictly validated legacy metadata/floor as migration
  evidence, never as current independent Memo state. Established missing,
  corrupt or symlinked history fails closed. Blog output cannot own ordinary,
  case-folded, encoded or Unicode-equivalent Memo paths or retired stream markup.
  Comments/Experiment safe-tree/reference/history/promotion behavior stays intact.
- Public composition: `sam`, `preview.sh`, `Dockerfile`, `nginx.conf`,
  `compose.yml`, new `compose.memos-static.yml`, runtime metadata checks and root
  scripts. Default blog build/package remains independent. Explicit prebuilt
  candidate selection validates first; the background preview mounts only its
  `public/` subtree. The package target copies public-only output separately from
  blog `dist/`, comparing inventories and hashes independently. Missing/invalid
  selected input fails. Memo responses use GET/HEAD only, strict headers and
  `Cache-Control: no-cache`; stable CSS/media paths revalidate. Package probes
  URI-encode individual path segments for Unicode/space-containing media names.
- Wrapper independence: explicit `SAM_CONTENT_MODE=none` skips blog discovery,
  unused site/comment exports, owner-config mounts and comment environment
  forwarding. Selected source/assets/history/prior/public roots mount read-only;
  work/deployment roots mount writable. Source writing requires the explicit
  authoring flag used by `new`. Canonical regular directories, narrow mount
  constraints and host-repository `.firefly/memos` output guards prevent host
  absolute aliases from bypassing the container's `/app` protection.
- Retirement: removed the maintained `services/memos` package/source/tests/image/
  SMTP and HTTP fixtures, root private-service/profile/proxy wiring, standalone
  `plugins/memos/compose.yml`, old secret example and old built-publication check.
  Kept a short service retirement/recovery README. Existing ignored private data,
  config, keys, generated local remnants and owner recovery material were not
  deleted or imported. Added ignored source/output/config boundaries.
- Host operations: `tooling/publish-memos/publish.sh` and `ops/` config example,
  Nginx template, owner guide, shell contract fixtures and disposable static
  lifecycle fixture. Added `tooling/publish-memos/README.md` and exact host commands
  to the pure-plugin guide under main's final documentation ownership transfer.
  The root npm `memos` alias is core CLI only; SSH orchestration stays on the host.

## Host publisher contract

`publish.sh new NAME|build|publish|rollback --config FILE [--local] [--dry-run]
[--prior-candidate PATH]`. Publication flags are refused on new/build; a prior
candidate belongs only to rollback.

Owner-owned 0600 JSON requires canonical independent `sourceRoot`, existing
`outputRoot`, and `displayName`. Optional assets are an independent contained
root. Remote publication additionally needs precreated owner-writable
`deploymentRoot`, `sshTarget`, regular absolute `knownHosts`, immutable
`remoteImage: sha256:<content-id>`, and optional `sshConfig` or `/dev/null`
fallback. Optional `remoteSudo` enables only `sudo -n docker`. The host command
never provisions directories outside its own unique incoming upload, changes
owner-parent permissions, invokes blog sync/build, or mounts SSH config/keys.

`build` is a prospective local null-history validation. Publish/dry-run first
read established state; dry-run has no upload, remote mkdir or promotion. The
explicit initial floor applies only to a proven empty bootstrap. Core CLI runs
through sam locally and the reviewed ephemeral network-disabled/read-only image
remotely, with only the selected deployment mounted. Remote publication uploads
only the validated Memo public tree and matching private receipt to a unique
incoming directory. Core promotion rechecks expected base/lock and switches one
Memo pointer. Upload/promotion failure preserves accepted state; ambiguous loss
inspects the exact current receipt. Cleanup is limited to that upload. Rollback
uses an owner-retained local prior candidate and current history, builds a new
sequence, and refuses retired IDs.

## Completed focused evidence

All Node/browser work used sam or the pinned preview renderer. A synthetic
tracked-template-derived site config selected tracked blog content; no owner
Memo source/config/export was read.

| Gate | Result |
| --- | --- |
| Affected site/assembler lockfile `ci` | Both succeeded |
| Assembler `check`, final `test` (including comments/Experiment and Memo migration) | Passed; 13/13 tests |
| Real enabled/disabled blog builds with unavailable/invalid Memo inputs | Both passed, discovery only and no emitted Memo tree |
| Hidden-discovery root/subtree alias collision builds | Both correctly refused |
| Site Memo config/server tests | 2/2 passed |
| Site `check` | 0 errors, 0 warnings, 0 hints |
| Preview lifecycle/wrapper regressions | Final 23/23 passed |
| Host publish/wrapper contract fixtures | Final 7/7 passed: new/build/local/dry-run, key policy, auto push, ambiguous state inspection, transfer/promotion preservation, mode/path guards and blog-unavailable operation |
| Memo browser fixture preparation + pinned Playwright | Final 6/6 passed; desktop-static, mobile-static and mobile-interactive, including Unicode raster route |
| Independent filesystem/static Docker fixture | Passed, including invocation under private umask 077 with public context creation scoped to 022 |
| Static fixture confinement/inventory/routes/headers | Exact public inventory, non-root/read-only, native Memo and blog reads, CSS/raster assets, no private receipt route, refused POST and old write endpoint, no-cache on HTML/style/media |
| Default Compose and combined static Memo/comments Compose syntax | Passed; no services started |
| Bash syntax, ShellCheck `-x`, shfmt diff, git diff whitespace | Passed |
| Exact-owned static fixture Docker cleanup | Confirmed no fixture containers/images remained |

The filesystem fixture compares complete blog path/content/pointer inventory
across Memo add/edit/rollback/withdrawal/new-ID publication. A later ordinary blog
pointer switch preserves complete Memo state/inventory. Stale same-base promotion,
withdrawn rollback and restored retired source are refused. The actual static
runtime probes the newest accepted nonempty candidate after withdrawal, not an
old lower-history release.

The SSH/Docker/jq adapters in host contract tests are synthetic and execute real
publisher transitions. They prove orchestration commands and failure handling,
not real SSH, actual server privilege policy, TLS/CDN behavior or production
preservation. The static Docker fixture uses real host Docker and Nginx without
starting the owner/default stack or mounting private publisher metadata.

Earlier fixture-only failures (template escaping, missing Alpine Bash/browser
jq, an overbroad tar regex matching the synthetic target name, a raw site fixture
missing required sections, and new-command fixture argument order) were corrected
and rerun. No failed check is counted as passing. The initial sandbox Docker
socket denial was rerun through approved Docker execution.

## Main-session follow-up and limits

Main owns sequential `check:m51`, `test:m51`, full `preview.sh verify`, default
and requested combined `preview.sh package`, independent review, exact private
service retirement and all real SSH/HTTPS deployment acceptance. Root verify now
avoids rerunning the same assembler suite as a redundant Memo-publication phase;
the focused standalone alias remains available. Host operation fixtures are part
of `test:m51`; the real static fixture runs only after the inner verify gate.

Main must validate applicable legacy floors before bootstrap and preserve actual
non-Memo/mirror/pointer inventories across production Memo publish and subsequent
blog deployment. No production claim is inferred from these fixtures. Physical
devices, assistive technology and subjective reading design remain outside this
browser evidence. Lockfile installation emitted existing dependency audit
summaries; no version change or audit autofix was performed in this integration.
