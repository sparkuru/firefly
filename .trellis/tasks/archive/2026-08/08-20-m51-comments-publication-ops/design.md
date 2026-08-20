# M5.1 Comment Publication and Operations — Design

The handoff is a contained file boundary:

```text
private service export → repository-relative staged artifact
                      → strict site build input
                      → existing assembler/runtime gates
                      → atomic immutable release
```

The public write service never writes the repository or receives release
credentials. The wrapper may pass one validated repository-relative export path
as an explicit environment value; the site build resolves it inside `/app` and
reads it as local input. The default empty export remains buildable for service
outage and rollback recovery.

Publication evidence records export `sourceRevision`, digest, schema version,
and tombstone epoch. Candidate validation scans public text and JSON for email,
IP/user-agent, private IDs, tokens, source paths, secrets, historical handoff
markers, and unsafe comment markup. A rollback selector compares the candidate
epoch with the current deletion tombstone ledger and rejects any older release;
if needed, rebuild the safe prior content with the current filtered export.

The service container uses a private persistent volume and non-public admin
ingress. Backup/restore and staging are explicit operator steps, not automatic
production actions.
