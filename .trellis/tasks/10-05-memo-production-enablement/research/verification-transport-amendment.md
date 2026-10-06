# Proposed verification transport amendment

> Historical interactive-scope evidence/proposal. On 2026-10-06 the owner
> replaced this direction with an owner-authored static Markdown publisher.
> Current root PRD/design/implementation artifacts govern further work.
> The proposed POST-verification change is abandoned; no mail was sent.

## Confirmed blocker

On 2026-10-06 the owner reported a Free outer-proxy account, no Logpush jobs,
no Worker and no visible Security Events. The supplied traffic export contains
464 `httpRequestsAdaptive` records with `clientRequestPath`. It has 27 rows
marked `block` / `firewallManaged`. Missing URI/query fields and an empty or
unobserved Security Events view do not establish token-free logging.

The actual credential is in the URL path, not the query string:
`services/memos/src/smtp.ts:16` emits `/v1/memos/verify/<token>` and
`services/memos/src/http.ts:78` accepts that credential-bearing GET. A recorded
request path can therefore contain the verification credential. The previous
query-focused owner instructions did not account for this actual contract.
No actual verification credential was sent through the public route in this
task; no test mail has been sent. Public Memo routing remains closed.

This is a material protocol/UX issue against existing R2, not a missing owner
logging toggle. The operational task returns to planning before any product
change. Existing independent private runtime, keys and initial recovery
artifacts are preserved.

## Recommended owner decision (not yet approved)

Change email verification to a token-free page link and native POST code entry:

1. Email contains a plain link to `/v1/memos/verify` and the existing high-entropy
   43-character verification code separately as text.
2. Opening the link displays a labelled native HTML form. The recipient pastes
   the code from the email and submits it. JavaScript is unnecessary.
3. The form sends the code only in the HTTPS POST body to `/v1/memos/verify`.
   Success consumes it once and leaves the Memo pending owner moderation.

Trade-off: verification gains one paste-and-submit step. The existing random
credential, 24-hour expiry, hashing, encrypted queue, single-use semantics,
moderation, schema, keys and public export remain intact. This proposal does
not replace the credential with a short numeric code or add accounts.

## Concrete proposed contract

- `GET /v1/memos/verify`: token-free HTML form, no database mutation. Reject
  query strings. The form contains no embedded credential or hidden email.
- `POST /v1/memos/verify`: require an allowed Origin before reading the bounded
  body; accept an exact single `token` field with existing credential syntax.
  Use the existing strict form/JSON parser and repository verification method.
  Reject duplicate/extra fields, invalid encoding and oversize input. Do not
  reflect the submitted credential in results or diagnostics.
- Retire credential-bearing `GET /v1/memos/verify/<token>`; return a generic
  failure without consuming the token or redirecting it into another URL.
- Keep no-store, no-referrer and restrictive security headers. Permit the
  form's same-origin POST through the verification-page CSP while retaining
  script and framing restrictions.
- URLs, redirects, query strings, public artifacts and diagnostic codes must
  contain no verification credential. Ordinary proxy path analytics can
  remain enabled. Request-body capture is a separate check: confirm no Worker,
  custom body logging or task diagnostics capture the POST credential.

## Proposed implementation and evidence

After owner approval, use Trellis implementation/check agents for the coherent
service-contract change. Main session continues to own task/spec changes and
remote actions. Product changes are expected in `services/memos/src/http.ts`
and `smtp.ts`; inspect all old-route callers before editing. Update relevant
HTTP/mail tests, image/runtime fixtures and the service/operation guides as
part of the same approved amendment. Update the executable service and runtime
specs from the resulting checked behavior.

Required regression evidence:

- Opening the verification page alone does not verify or mutate a Memo.
- With JavaScript disabled, native POST verifies once; replay fails and the
  record remains private/pending until owner approval.
- Mail's clickable URLs and all request-target/redirect values contain no
  credential. Old path GET fails closed. A logging-enabled fixture records
  the fixed path only while successful verification still works.
- Origin refusal happens before body consumption; invalid/duplicate/extra/
  oversized input fails safely; no credential appears in HTML or diagnostics.
- Existing submission, SMTP, approval/export, deletion/history and recovery
  gates still pass through approved wrappers.

Build a replacement minimal tracked service image after those checks, preserving
the exact production config, keys and live private database. Upgrade only the
new Memo HTTP/worker pair. Recheck readiness, worker health, empty-state
persistence and confinement before returning to the original edge/mail/publication
sequence. Do not replace the active database or regenerate keys.

## Compatibility and retained boundaries

This task has produced no old-format verification emails and the production
queue is empty, so its cutover needs no queued-mail replay or token migration.
The retired endpoint is nevertheless a documented wire-format change; future
rollout instructions must describe old links as unsupported rather than silently
re-enabling URI credentials. No DNS/certificate/proxy bypass, broad security-rule
exception, database schema change or unrelated comments work is proposed.

Approval is pending because the original reviewed operational scope excluded
product changes and the recommendation changes recipient UX. An alternative
that preserves one-click verification would need its own reviewed design;
the current URI-token route cannot satisfy strict token-free path logging on
the observed outer proxy.
