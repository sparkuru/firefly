# Zoho Mail SMTP research

Status: planning input; no credentials or production provisioning are part of
this task.

Primary source: <https://www.zoho.com/mail/help/zoho-smtp.html>

## Confirmed provider facts

- Zoho documents `smtp.zoho.com` for personal/free organization accounts and
  `smtppro.zoho.com` for paid custom-domain organization accounts.
- Port `465` uses SSL; port `587` uses TLS/STARTTLS.
- SMTP authentication is required and the username is the full mailbox email
  address.
- The sender must be the authenticated mailbox or a permitted alias.
- An app-specific password may be required when two-factor authentication is
  enabled.

## Design consequence

The plugin should expose provider-neutral SMTP settings and map Zoho through
host/port/security configuration. It must not hard-code a mailbox, put a
credential in the repository, or send directly from the browser, static build,
or comment-submission request path. Automated fake delivery tests are the
primary validation path; a controlled staging SMTP sink or real Zoho send is
a later operator-owned staging check.
