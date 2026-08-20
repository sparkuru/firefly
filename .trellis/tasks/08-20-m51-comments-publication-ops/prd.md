# M5.1 Comment Publication and Operations

## Scope

Connect the approved service export to the existing contained static build and
publication flow. Keep the service and database outside the public runtime,
preserve exact release/inventory/atomic-promotion gates, and make deleted
comment tombstones prevent unsafe rollback.

## Acceptance criteria

- `./sam` accepts only an explicit repository-relative comments export handoff;
  it cannot broaden content mounts or expose private host paths.
- Build validation verifies export schema/digest/route catalog/tombstone epoch
  before site output is assembled; no service/network call occurs in publication.
- Publication scans reject private comment material, unsafe HTML, secrets,
  source paths, and internal service fields in emitted artifacts.
- Release evidence records export revision/tombstone epoch, and rollback
  refuses any candidate predating an active deletion tombstone.
- Service runtime/backup/restore/staging contracts are documented and tested
  without committing credentials, production identifiers, or deployments.

## Out of scope

No production deployment, DNS/email provisioning, real credentials, historical
data, or automatic service-triggered release.
