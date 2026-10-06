# Memo production execution evidence

> Historical interactive-scope evidence/proposal. On 2026-10-06 the owner
> replaced this direction with an owner-authored static Markdown publisher.
> Current root PRD/design/implementation artifacts govern further work.
> The proposed POST-verification change is abandoned; no mail was sent.

## Execution authorization and local progress

The owner explicitly approved the current plan on 2026-10-05. Context validation
passed and `task.py start` transitioned the task to `in_progress`. A Trellis
implementation agent owns the local readiness checks; its final results belong
in `research/local-readiness.md`. No product source changes are planned or made.

The full `./preview.sh verify` invocation passed, including maintained synthetic
HTTPS/SMTP/private-runtime lifecycle evidence. The separate runtime packager
initially failed at temporary-container port discovery. Actual-image diagnosis
proved startup refusal because process `umask 077` made its copied public
Nginx config root-owned 0600. A corrected full invocation with process
`umask 022` passed, preserving private log permissions and the publication
manifest. Both the original failure and corrected pass remain in the record;
no product source patch was made.

## Read-only operational baseline

- The recovered local sync input resolved using the readable user SSH config.
  System-wide SSH config resolution failed on an ownership/permissions check;
  the session fallback preserved strict known-host verification.
- Key-only SSH, numeric login identity and noninteractive privilege probes
  passed for the recovered sync endpoint. Static release pointers, release
  storage and existing comments configuration/secrets were present.
- The inspected endpoint had no observed comments/Memo container or private
  service listener. Its effective Nginx configuration had a Firefly current
  root, but no comments/Memo prefix or comments upstream reference. No retained
  publication metadata was found in the bounded release-layout scan. These
  findings establish a target mismatch or changed environment; they do not
  identify its cause or authorize replacing history.
- The prior M5 operational note used a different SSH connection parameter;
  that key-only probe closed before a usable session. Neither probe relaxed
  host-key verification or modified the endpoint.
- Current owner-local public HTTPS read-only checks returned 200 for the root
  and 404 for unknown comments/Memo paths and public readiness. These statuses
  alone do not prove a working comments proxy, private runtime or correct
  correspondence with the inspected SSH endpoint.
- The owner initially supplied a private operational directory to search. A bounded
  two-level remote inventory found that directory absent at the recovered
  endpoint; it was also absent locally. No mailbox/credential values were
  read or displayed. The owner subsequently corrected the directory to the
  existing comments runtime on the recovered sync endpoint. Its SMTP config
  has the same public origin as the owner-local site and one mailbox identity
  shared by account and sender. No separate acceptance recipient is configured;
  the owner subsequently confirmed that identity as the approved recipient
  and chose to confirm actual mailbox receipt personally.
- Earlier public probes accidentally selected multiple TOML URL fields and
  failed locally as malformed URLs. Scoped site-table extraction corrected
  the invocation; only the corrected requests count as HTTPS evidence.

Exact endpoint/account/path/configuration values and raw diagnostics stay in
owner-only temporary operational files. They are excluded from this record.
The baseline probes themselves did not start/reload a production service,
change edge configuration, send mail, modify data, create a backup or promote
a release. Subsequent authorized private-runtime actions are recorded below.

The corrected baseline identified one HTTPS server block matching the selected
origin, absent Memo surface/runtime and no comments/Memo private listener. The
configured owner content workspace contains 156 Markdown files; its complete
relative-path/content manifest exactly matches the current production mirror.
The current release has 114 article routes and 127 index routes. Production
builds must use that verified workspace to preserve existing routes; the
tracked `content/` selection belongs to local fixture validation only.

An active outer HTTPS proxy was observed. Existing trusted-address ranges match
its current official list without blanket trust. Account logging policy still
requires owner evidence before opening token-bearing verification traffic.
Only independent private runtime preparation may continue meanwhile. The
reviewed service image archive was transferred to an owner-only remote
temporary directory; that transfer itself did not start a runtime.

## Private runtime and initial recovery

The verified image was loaded after archive-checksum and content-ID checks.
Independent Memo keys were generated once, with only the approved SMTP secret
reused. A production-shaped, network-disabled no-send preflight passed. The
standalone same-host HTTP and worker subsequently started with numeric
1000:1000 ownership, read-only roots/config/key mounts, a private writable data
mount, dropped capabilities, no-new-privileges and no published port. The HTTP
listener is loopback-only. Readiness, private empty admin listing and independent
worker health passed. The source edge still has no Memo prefix.

Both new services stopped gracefully with exit 0 and no OOM, then restarted
successfully. The empty logical database state and database inode/ownership/mode
were retained. A consistent initial snapshot and matching-key restore into an
absent isolated destination passed checksum, SQLite integrity and mode checks.
Both were retained under private recovery storage, separately from the live
key file. The static release pointer, Memo config/keys and comments secret
checksum were preserved. These checks cover empty state only; they do not prove
the later encrypted queued-mail or post-deletion recovery criteria.

Operational corrections and precise limits are in
`research/private-runtime-evidence.md`. No public route was opened, test mail
sent, public candidate promoted or active database replaced.

The initial exact-owned raw operational temporary files were removed after review.
Local synthetic runner logs remain owner-only outside the repository for
packaging-failure investigation. No production credentials were copied into
those runner logs.

## Production acceptance status

### Outer-proxy evidence update (2026-10-06)

The owner reported Free plan, no Logpush jobs and no Worker, and supplied an
HTTP analytics export. The inspected export has 464 `httpRequestsAdaptive`
records with request-path fields and no complete-URI/query fields; 27 rows
are marked as managed-firewall blocks. No raw records, visitor identities or
exact owner file path are retained here. The current service's credential is
in the path, so this evidence does not clear R2. It identifies a material
verification-transport blocker. The earlier query-focused owner instructions
were insufficient for the actual path-token contract.

The task returned to `planning`, retaining the private runtime and initial
recovery evidence. A concrete native POST/code-entry amendment is prepared in
`research/verification-transport-amendment.md` for owner approval. No further
owner log search is required before that decision. No mail was sent and no
public Memo route or release was activated.

| Criterion | Current result | Remaining evidence |
| --- | --- | --- |
| AC1 | unavailable | Owner-local public activation and representative existing site/comments smoke |
| AC2 | deferred | Private runtime/readiness/worker/empty-state restart passed; actual edge identity, confinement from outside and token-free logging remain |
| AC3 | unavailable | Recipient confirmed; actual SMTP acceptance, receipt, verification, approval and deployed static stream remain |
| AC4 | unavailable | Production removal and retained-history stale refusal |
| AC5 | deferred | Initial empty backup and isolated restore passed; lifecycle snapshots and static-only rollback remain |
| AC6 | deferred | Final temporary-input cleanup, local readiness/privacy review and production privacy/cleanup evidence |

Public edge exposure and real mail now remain gated on the URI-token design
correction and owner approval of the material amendment. The confirmed target's independent private preparation proceeded
under the original approval.
In accordance with implementation step 1, the task temporarily returned to
`planning` after its failed packaging check, then resumed `in_progress` under
the original approval once diagnosis established a nonmaterial environment
correction. Current requirements and production boundaries are unchanged.
The task is not complete or archived; local readiness does not complete any
production criterion.
