# Comments public-contract boundary matrix

## Evidence snapshot

| Surface | Current owner and evidence | Drift/risk | Planned boundary |
| --- | --- | --- | --- |
| Route conversion | `plugins/comments/config.mjs:200-258` validates canonical routes and converts readable site hrefs to uppercase UTF-8 percent-encoded paths | Site, service, fixture scripts, and route-catalog operations import different facades even though they must agree | Re-export the existing route rule through one `plugins/comments/public.mjs` contract facade; update route consumers without changing the algorithm |
| Site public decoder | `apps/site/src/lib/comments.mjs:19-169` repeats allowlist, text/URL/date checks, parent checks, ordering, and SHA-256 verification; `:12-17` probes cwd/parent roots | A site-only source file is the de facto schema owner and its path probing makes build behavior context-dependent | Move semantic decoding/types/digesting to the repository contract; leave file IO, disabled behavior, and raw-href grouping in the site adapter with a fixed source-root boundary |
| Service public decoder | `services/comments/src/validation.ts:211-347` and `:269-428` repeat public schema and digest logic; `services/comments/src/types.ts:143-166` repeats types | Service and site can accept/reject or order the same export differently; future fixes can land in one package only | Wrap the shared decoder/normalizers and translate generic contract failures to private service error classes; re-export shared public types |
| Publication handoff | `tooling/assemble-publication/src/plugins/comments.ts:27-76` performs contained path/surface/route checks but dynamically imports `apps/site/src/lib/comments.mjs` at `:46-56` | Assembler depends on an application source module and its runtime layout; a site refactor can break publication tooling | Load `plugins/comments/public.mjs` as the declared contract; keep surface scanning, route-to-emitted-file checks, digest presence, and metadata projection in assembler |
| Route-catalog operations | `services/comments/scripts/route-catalog.mjs:7` imports the route predicate from config; Unicode fixture preparation imports the same config facade | Operational/fixture consumers can drift from the public build route boundary | Consume the public contract route facade; configuration parsing remains in `config.mjs` |
| Public/private split | `services/comments/src/types.ts:1-141` contains private service/storage/notification types adjacent to public types; `plugins/comments/config.mjs` owns public/runtime config projections | Extracting too broadly could leak private state or make the contract depend on runtime configuration | Share only public comments, route catalog, and pure validation/digest helpers; keep service and config namespaces private to their adapters |

## Data flow

```text
private service records
        │  service adapter selects approved rows
        ▼
plugins/comments/public.mjs
  route + public model + decoder + order + digest
        ├──────────────► site adapter: file/env load + raw-href grouping
        ├──────────────► service adapter: private error translation/export API
        └──────────────► publication adapter: contained handoff + release metadata
```

The shared module receives untrusted JSON or route values and returns a frozen
public read model. It must not read files, environment variables, databases,
SMTP settings, or site components. Each adapter validates its own boundary
around that model.

## Compatibility notes

- Preserve schema version `1`, the exact public comment field allowlist, one
  direct-reply level, NFC/plain-text/HTTPS constraints, encoded route grammar,
  sorted `(postPath, createdAt, id)` order, and SHA-256 over the normalized
  envelope without `digest`.
- Preserve the site decoder’s accepted `sha256:` digest spelling at the shared
  input boundary if existing fixtures or service exports depend on it; the
  publication metadata boundary may continue to require the bare 64-character
  hex value it currently records.
- Keep generic contract errors independent of `services/comments`; service
  wrappers translate them to `ValidationError` or `ExportValidationError` so
  private HTTP callers retain their status/code behavior.

## Evidence boundary

This matrix uses tracked source, tests, fixtures, specs, task history, and
package manifests only. It deliberately excludes ignored `config.dev`, private
comments config/secrets, owner content roots, generated publication trees, and
operational identifiers.
