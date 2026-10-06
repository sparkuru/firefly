# Static Memo cutover preparation

Date: 2026-10-06. Owner approval of the revised Markdown publisher plan is
recorded; implementation and integrated acceptance are still in progress.

## Read-only migration checks

The current production static release has no Memo surface and no published
Memo history manifest at the inspected owning boundaries. The previously
validated initial private empty projection has legacy schema 1, zero records
and deletion floor 0. Local retained blog publication metadata has disabled
legacy schema-1 Memo history and floor 0; its final migration decoder remains
part of integrated checks. No legacy bodies are imported. First independent
bootstrap therefore selects floor 0 only after these explicit observations,
not by resetting or treating corrupt established history as empty.

## Reviewed ephemeral tooling

The separately built minimal publisher image passed isolated empty candidate,
state/bootstrap/promotion and public/private permission checks. Main verified
its retained archive checksum, streamed it to the authorized deployment host,
and checked exact image identity and non-root default user. No Memo process,
public route or blog pointer was changed by this preparation.

The first capacity probe used the temporary staging filesystem, which is not
where Docker stores streamed image layers. It stopped before loading. A
subsequent task-relevant read-only check of actual Docker image storage proved
adequate capacity; loading then completed. No unrelated cleanup was performed.
Exact endpoints, paths, image identity and raw logs stay in owner-only inputs.

## Owner-local inputs

Prepared an ignored 0600 publisher configuration with a separate empty source
root and candidate root, immutable reviewed remote image, strict known-host
checking and the existing verified connection. Prepared a contained ignored
navigation-only site projection; current owner site configuration is untouched.
The host path alias review requires repository-local output/deployment roots
inside the dedicated Memo boundary before wrapper mounts, with focused refusal
coverage. Public mounting, private-runtime retirement, authenticated publish,
one-time blog integration and preservation baseline remain pending local gates.

## Final deployment-boundary selection

A read-only review of the owner's existing blog permission helper found a
recursive ownership change over the web-root tree. The new independent Memo
root is selected outside that tree, protecting private receipt ownership during
ordinary future blog pushes. The old helper was not executed or modified.
Final-source default/combined packages and actual combined preview lifecycle
passed before any production route/pointer/service change. A fresh live private
read-only SQL probe confirmed zero metadata/counter state, and a fresh legacy
public projection was captured through the existing private admin entry. Exact
pointers and protected comment/blob/source baselines remain owner-only.
