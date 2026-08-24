# Project Record Privacy and Scope Guide

## Purpose

Keep the Trellis project flow limited to facts, decisions, contracts, and
validation evidence needed to build, test, maintain, or review this project.
Operational details that belong to a specific owner, host, account, provider,
or one-time deployment must stay outside durable project records.

Use this guide whenever writing or updating:

- `.trellis/mainline.md`;
- `.trellis/tasks/**` planning files and context manifests;
- `.trellis/spec/**` and research notes;
- `.trellis/workspace/**` journals and session summaries.

## Durable-record contract

Durable Trellis records may contain:

- repository-relative paths, package/module names, generic service names, and
  reproducible commands;
- project behavior, API/schema contracts, migration decisions, test results,
  rollback rules, and residual risks;
- provider-neutral configuration keys and topology expressed with placeholders;
- public behavior descriptions when the exact external identity is not needed.

Do not put the following into durable project records unless an exact value is
itself an approved, necessary product contract:

- the site owner's actual domain or other personal/public host identity;
- SSH aliases, IP addresses, login usernames, remote filesystem paths, sync
  endpoints, release IDs, DNS/TLS certificate paths, or raw remote output;
- mailbox addresses, passwords, API tokens, private keys, secret values, or
  account-specific provider details;
- unrelated information copied from another project, host, or operator
  environment.

When a topology must be described, use placeholders such as
`<public-origin>`, `<deployment-host>`, `<operator-account>`,
`<private-service-port>`, and `<release-id>`. The placeholder must preserve the
technical relationship without preserving the private identity.

The product's private runtime/configuration boundary may still contain the
exact value when the application needs it. That value must not be copied into
Trellis task, spec, mainline, journal, or context-manifest files by default.

## Operational handoff boundary

Exact deployment data belongs only in an owner-controlled operational channel,
an explicitly ignored local file, or a short-lived temporary task input with
owner-only permissions. Project records may state that an operator check was
performed and record its redacted result, but must not reproduce the endpoint,
account, command transcript, or credential.

If a later session needs the same operational detail, retrieve it from the
owner-controlled source again. Do not turn a temporary value into a project
fact merely because it appeared during execution.

## Validation checklist

Before saving a Trellis record:

- [ ] Remove exact domains, hostnames, SSH targets, account identities, remote
      paths, synchronization identifiers, and provider-specific values unless
      the value is an explicit product contract and the owner approved its
      durable storage.
- [ ] Replace required topology values with semantic placeholders.
- [ ] Search the proposed record and its context manifests for credentials,
      private keys, tokens, mailbox values, raw remote output, and local-home or
      server paths.
- [ ] Confirm that any exact operational input is in an ignored, owner-only
      location and is not copied by build, task, journal, or spec tooling.
- [ ] Keep the durable record useful after the endpoint, host, account, or
      deployment release changes.

### Error matrix

| Finding | Required action |
| --- | --- |
| Exact host/domain is not needed to understand the contract | remove it and use a placeholder or generic role name |
| Exact host/domain is needed only to execute a deployment | keep it in the operator channel/private input; record only a redacted outcome |
| Credential, token, private key, or mailbox secret appears | stop, redact without echoing the value, and do not commit the record |
| Raw remote command/output is copied into a task or journal | replace it with the command purpose, redacted result, and residual risk |
| External detail is unrelated to the project | omit it entirely |
| A public identity is required by an application config contract | keep it at the owning runtime/config boundary; add only the generic contract to Trellis |

## Good / Base / Bad cases

- **Good:** “The production virtual host forwards `/v1/*` to the private
  comments service; the host-specific edge configuration is operator-owned.”
- **Base:** “An owner-authorized remote probe passed; the exact target and
  release identifier remain in the temporary operational input.”
- **Bad:** copy an SSH alias, a mailbox address, a remote absolute path, a
  synchronization command, or a raw server transcript into `prd.md`,
  `mainline.md`, a journal, or a context manifest.

## Required review checks

- Planning review checks `prd.md`, `design.md`, `implement.md`, manifests, and
  research files for durable-record leakage before task activation.
- Quality review checks the final diff and the full Trellis record set, not only
  product source files.
- A task that performs remote work records only redacted evidence and verifies
  that temporary operational files are ignored, owner-readable, and removed or
  retained under an explicit owner-controlled policy.
- When this guide changes, run the task context validator and a repository
  privacy scan before commit.

## Wrong vs Correct

### Wrong

```text
SSH target: <actual-host>
Sync command: deploy to /opt/<owner>/<release-id>
Sender: <owner-mailbox>
```

### Correct

```text
The owner-authorized deployment target was checked through the local
operational input. The static release passed checksum and rollback probes;
endpoint, account, filesystem, release ID, and sender identity remain outside
the Trellis project record.
```

