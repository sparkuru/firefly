# Research: outer-edge path logging and Memo verification

> Historical interactive-scope evidence/proposal. On 2026-10-06 the owner
> replaced this direction with an owner-authored static Markdown publisher.
> Current root PRD/design/implementation artifacts govern further work.
> The proposed POST-verification change is abandoned; no mail was sent.

- Query: Does the supplied sampled HTTP export and the absence of configured
  log-push jobs establish that verification credentials stay out of URI logs?
- Scope: mixed; focused source inspection and current primary provider docs.
- Date: 2026-10-06

## Findings

### Decisive result

The existing verification protocol cannot satisfy strict R2 through the current
proxied public origin. Its credential is in the **path**, not the query string.
The supplied export demonstrates that sampled HTTP analytics records request
paths. Missing URI/query fields, no configured log-push jobs, no Worker, and no
visible Security Events do not remove this exposure. This is a protocol/edge
incompatibility, not an additional account-setting search gate. It does not
establish that a Memo credential has already leaked: this task has not sent
mail or opened verification traffic.

### Files and code patterns

- `services/memos/src/smtp.ts:13-16`: validates a 43-character credential and
  places it in `/v1/memos/verify/<token>` in the email.
- `services/memos/src/http.ts:78-81`: GET verification consumes the path suffix;
  query strings are explicitly rejected. Moving the existing credential into a
  query is neither supported nor a solution to all edge logs.
- `services/memos/src/http.ts:18-21`: responses already use no-store,
  no-referrer and restrictive CSP; the global `form-action 'none'` would require
  a deliberate narrow override for a future native verification form.
- `services/memos/src/http.ts:33-60`: bounded, strict JSON/native-form body
  parsing is available to reuse in a planned POST verification protocol.
- Task `prd.md`, R2: verification tokens must stay out of URI logs.
- Task `implement.md:83-85`: source logging suppression does not certify the
  actual outer edge, and verification remains closed until resolved.

### Owner evidence and its limits

The main session's redacted parser result identifies 464 sampled HTTP records
with `clientRequestPath`, without an exported URI/query field. It also reports
27 records categorized as blocked by a managed firewall. These are HTTP dataset
records, not proof of a separate Security Events export. The owner reports a
free tier, no log-push jobs, no Worker and no visible security events. None of
these statements promises that future verification paths are excluded.

This researcher did not reread raw owner records, contact the account, or open
a remote connection. The counts/categories above are main-session supplied
evidence; no owner identities or record contents are retained here.

### Primary documentation

1. [Security Analytics](https://developers.cloudflare.com/waf/analytics/security-analytics/)
   describes analytics for both mitigated and ordinary incoming traffic,
   availability on all plans, sampled individual-request logs, and the
   `httpRequestsAdaptive`/`httpRequestsAdaptiveGroups` datasets. Log Explorer
   raw logs are a separate facility. Therefore absence of an external log-push
   job is not absence of sampled request logs. Sampling also prevents a
   missing specific request from proving non-retention.
2. [HTTP requests dataset fields](https://developers.cloudflare.com/logs/logpush/logpush-job/datasets/zone/http_requests/)
   distinguishes path-only `ClientRequestPath` from path-plus-query
   `ClientRequestURI`. This is the Logpush field reference, not a claim that
   the owner's export came from Logpush.
3. [HTTP analytics GraphQL tutorial](https://developers.cloudflare.com/analytics/graphql-api/tutorials/end-customer-analytics/)
   independently demonstrates `clientRequestPath` in adaptive HTTP analytics.
4. [Firewall Events GraphQL tutorial](https://developers.cloudflare.com/analytics/graphql-api/tutorials/querying-firewall-events/)
   explicitly selects both `clientRequestPath` and `clientRequestQuery` from
   `firewallEventsAdaptive`. Omitting these fields from a particular export
   does not establish their absence from the dataset.
5. [Security Events](https://developers.cloudflare.com/waf/analytics/security-events/)
   describes sampled events for flagged/actioned requests and explains that
   sampling, filters and time windows can hide individual events. A clear
   dashboard does not provide an exclusion policy.
6. [Skip options](https://developers.cloudflare.com/waf/custom-rules/skip/options/)
   documents `logging.enabled=false` for requests matching a skip rule and
   their absence from Security Events. It does not document disabling the
   independent HTTP adaptive analytics dataset. Applying such a rule is not
   sufficient evidence for strict R2 and may weaken unrelated protections.

### Concrete resolution options

**Recommended plan amendment:** email a credential separately from a stable,
credential-free verification-page URL. GET renders a native HTML form; the
owner pastes the credential and submits POST to a stable path. No JavaScript
is required. Neither the path nor query contains the credential. Preserve the
existing expiry, hashed storage, atomic single-use consumption, generic
results and private moderation gate. Reject legacy credential-bearing GET
verification rather than supporting it as a production fallback. Validate
actual request URLs, mail rendering, no-JS form/CSP behavior, replay/expiry and
bounded diagnostics before replacing the deployed private image or sending
mail. This is a material user-flow/API amendment and needs the owner's review
under the task's existing plan-change rule, not permission to inspect more logs.

**Infrastructure alternative:** bypass the HTTP proxy for the verification
origin, with independently valid TLS and source URI-log suppression.
[Proxy status](https://developers.cloudflare.com/dns/proxy-status/) states that
DNS-only traffic goes directly to the origin and has no provider HTTP
analytics. This changes the authorized topology/DNS/TLS boundary and is outside
the current approved assumptions. It is less aligned with preserving the
existing site deployment; no such change is authorized by this research.

No additional owner log export or invisible-event search is needed to establish
the present path-credential conflict. Keeping the existing protocol would
instead require concrete provider-supported exclusion/redaction evidence for
both HTTP adaptive paths and security-event fields, or an explicitly revised
R2. No sufficient free-tier per-route control was found in the primary docs
reviewed here. Do not substitute a WAF skip rule for that evidence.

## Related specs

- `.trellis/spec/frontend/memo-service-contract.md`: current path verification,
  encrypted delivery, one-time use and pending-moderation contract.
- `.trellis/spec/frontend/memo-publication-runtime-contract.md`: source URI-log
  suppression, restrictive response headers and operator validation of the
  actual outer edge.
- `.trellis/spec/guides/project-record-privacy.md`: generic evidence only;
  operational identities, raw records and credentials stay owner-controlled.

## Caveats / Not Found

- Current official analytics/event pages disagree on some retention durations;
  no numeric retention promise is needed or made for this conclusion.
- A POST body is still visible to a TLS-terminating edge. Removing a credential
  from URLs satisfies the URI-log boundary; it does not prove that every
  possible payload-capture feature is disabled. Preserve the existing bounded
  diagnostics and prevent request-body logging or matched-payload capture from
  being introduced by the amended deployment.
- This report contains research and proposed options only. No product,
  configuration, DNS, edge rule, service image or task-status mutation occurred.
