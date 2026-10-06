# Memo private runtime and initial recovery evidence

This records completed work under the superseded interactive plan. Its old
mail/outer-log next gate is cancelled by the current owner-Markdown PRD/design.
Use the retained runtime/recovery facts only for exact-service retirement and
preservation; they do not authorize new mail or public-write work.

> Historical interactive-scope evidence/proposal. On 2026-10-06 the owner
> replaced this direction with an owner-authored static Markdown publisher.
> Current root PRD/design/implementation artifacts govern further work.
> The proposed POST-verification change is abandoned; no mail was sent.

## Scope and authorization

The owner-approved implementation plan authorizes isolated Memo provisioning,
private service startup/restart and consistent backup with absent-destination
restore on the confirmed existing host. The owner confirmed the SMTP identity
as the dedicated recipient and will personally confirm mailbox receipt. This
stage sent no mail, opened no public route and promoted no static release.
Outer HTTPS account logging remains an unresolved required edge gate.

Exact connection, directory, mailbox, image and container values remain in
owner-only temporary operational inputs. No credential value or raw remote
diagnostic is retained here. Product code and tracked defaults were unchanged.

## Runtime preparation and checks

- Transferred the minimal reviewed service image archive; verified its checksum
  and loaded content ID before use. No owner inputs entered its build context.
- Generated independent token, encryption and admin keys once. Reused only the
  approved SMTP password; comments keys, database and outbox were not attached.
- Passed a production-shaped readiness preflight with network disabled, no
  public port and the actual private config/key shape. Removed the exact-owned
  preflight container before attaching the new live data directory.
- Selected only the standalone same-host Compose shape. Both services use
  1000:1000, host networking, a loopback HTTP bind, no published port, read-only
  roots, bounded temporary storage, dropped capabilities and no-new-privileges.
  Config and keys mount read-only; only the private Memo data mount is writable.
- Verified 0700 private directories, 0600 config/keys/database, independent
  worker tick health, HTTP health/readiness and an empty private admin listing.
  Submissions, outbox, rate events and audit were empty; initial epoch was zero.
- Recorded exact new service identities privately, then stopped only those
  services gracefully. Both exited 0 without OOM and restarted successfully.
  Health/readiness and worker checks passed again. The database inode, owner,
  mode and complete empty logical state remained unchanged.

The existing private parent directory belongs to a different numeric identity
and prevents login-account traversal. Initial child installation failed after
creating the new empty Memo root. A guarded resume verified that root was still
empty and preserved the already-generated keys, then used scoped noninteractive
sudo installation with explicit 1000:1000 ownership. Parent modes, groups and
unrelated data were not changed. No preflight database was copied to live data.

## Initial consistent snapshot and restore

The service snapshot command ran against the active empty database. Its backup
manifest and matching-key restore validated checksum, canonical schema,
integrity, epoch/revision and key identity. Restore used a previously absent
isolated temporary destination, never the live database. Independent checks
confirmed byte-identical restored database content and 0700/0600 modes.

The container archive-copy command could not access the snapshot in its
temporary mount. The already-validated files were instead read inside the
container into owner-only staging files, then installed with explicit private
ownership into new recovery directories. No backup or restore was rerun and
no existing recovery destination was overwritten. The initial backup and its
restored candidate are retained in private recovery storage; matching keys
remain separately in the live private key file.

Before/after checks preserved the current static release target, Memo runtime
configuration and key checksums, comments secret checksum and empty logical
database state. A private admin export contained no records and epoch zero.

## Limits and next gate

These checks prove the actual empty private runtime and initial recovery
boundary. They do not certify real SMTP delivery or mailbox receipt, public
HTTPS routing, external client identity, token-free outer logs, nonempty
encrypted queue recovery, static publication/deletion history or release
rollback. Public exposure and the one authorized mail test must wait for the
outer logging evidence. Runtime and recovery inputs remain intentionally
private and retained for the remaining authorized acceptance stages.
