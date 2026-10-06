# Unified Development and Preview

Read this profile before changing the Docker wrapper, root CLI, environment
configuration, lifecycle or runtime packaging. `preview.sh` replaces the
former four root shell entrypoints; `sam` remains the shared Docker executor.

## Setup and commands

```sh
cp .env.example .env             # only if .env is absent
./sam npm run install:m51        # explicit locked dependency preparation
./preview.sh build              # assemble public site and Experiments
./preview.sh start              # serve existing assembled output, background
./preview.sh status
./preview.sh stop                # down is the data-preserving alias
./preview.sh dev                 # main-site Astro hot reload, background
./preview.sh preview             # explicit build followed by start
./preview.sh render npm --prefix apps/site run check
./preview.sh verify              # complete tracked-fixture gate
./preview.sh package             # build/probe the minimal Nginx runtime image
```

Build creates the prepared static publication rather than a separate preview
image. Startup requires the selected cached image and performs no pull,
dependency install, build or test. `package` explicitly builds the deployable
image. It retains inventory/hash/privacy/route/header/non-root/read-only
assertions; it is not the full `verify` gate. Neither command deploys.

`start` requires existing assembled root `dist/` and its compiled publication
server. `dev` requires the installed Astro executable. Both start through
`sam` in detached mode, wait for the owned web listener, and return control.
Repeated healthy starts preserve the same container; a mode/config mismatch
requires explicit stop/restart. `status` does not start anything. Failures
return nonzero, name the failing prerequisite/service and never print ready.
An invocation from another directory resolves paths from the script location.

## Environment

The shared literal parser is `tooling/shared/dev-env.sh`. Both `sam` and
`preview.sh` read root `.env`; explicit environment values, including empty
ones, take precedence. `.env.example` is trackable; `.env`, `config.dev` and
private plugin configuration stay ignored and out of Docker build contexts.
The old local `config.dev` is retained as user data but is no longer loaded.
Migrate literal settings into `.env`; do not execute dotenv as shell code.
Quotes delimit literal values, CRLF is accepted, interpolation/escapes and
multiline values are unsupported. Duplicate/malformed assignments fail without
printing their values. Unknown keys are left for Compose; supported wrapper
namespaces are `SAM_`, `WEB_`, `FIREFLY_`, `COMMENTS_` and `MEMOS_`.

| Key | Actual consumer / meaning |
| --- | --- |
| `SAM_IMAGE` | `sam` Docker image; ordinary commands use Node Alpine |
| `SAM_IPC` | `sam` IPC: `private` or `host` |
| `SAM_BIND_HOST` | preview host publishing address; configured LAN or loopback |
| `WEB_BIND_HOST` | container listener, `0.0.0.0` or `::`; passed to Astro/`PUBLICATION_HOST` |
| `WEB_HOST_PORT` | host web port; lifecycle inspects the actual mapping |
| `WEB_CONTAINER_PORT` | publication/Astro listener and `sam` target port |
| `FIREFLY_CONTENT_ROOT` | optional absolute readable blog root; empty selects tracked `content/` |
| `FIREFLY_RUNTIME_IMAGE` | `package` output tag; no deployment implied |
| `FIREFLY_COMMENTS_EXPORT` | optional existing comments public input; selects packaging `build:m51` |
| `FIREFLY_MEMOS_CANDIDATE` | selected already-built Memo candidate; combined preview/package validates it and serves public bytes only |
| `SAM_CONTENT_MODE` | `blog` default or `none` for independent publisher work without blog discovery |

The ordinary public preview requires no account/password. Optional private
comments consumers retain `config/plugins/comments/secrets.env` and their existing
Compose paths; this CLI does not start those services or print their secrets.
`render` pins Playwright Noble 1.62.0 with host IPC after loading configuration.
`verify` forces tracked content before `sam` reads `.env` and preserves explicit
diagnostic image/IPC overrides. Memo uses a host-owned publisher and static
mount; its retired visitor/mail runtime is not started. Disposable static Memo
fixture state belongs to its exact owned check, not default Compose.

When keys change, update the example and consumer together. If `.env` exists,
append only absent keys with safe defaults; preserve existing empty values,
comments, quoting and line endings. A second synchronization adds nothing.
If absent, prepare the complete file, never a partial new-key file. Report
renamed/removed keys for manual local migration; never delete unknown values.
Changing bind/ports/image/content requires stop/start; rebuilding is needed
for changed static input or source, not merely a different host port.

## Ownership, readiness and console

Lifecycle operations select exact `sam.repo=<root>`, `sam.scope=preview.sh`,
`sam.service=web` labels. Packaging has a separate scope/container trap;
manual `sam` jobs, default Compose services and private storage are excluded.
Stop waits for the selected auto-removing containers to disappear before
returning, so an immediate `down` or new start does not race Docker removal.
Disappearance during inspection/stop is harmless only after the exact owned
ID is verified absent; genuine Docker errors and bounded removal timeouts fail.
The generated Astro dev lock is cleared only during owned dev startup/teardown.
Use `SAM_DETACH=1` with `sam` to reuse UID mapping, content mounts, HOME, labels
and port flags; never maintain another development `docker run` implementation.

Only an actually ready required web listener may produce `System is ready.`.
Use one renderer for successful/repeated start and ready status. Sections are
`Open:`, `Local only (preview host):`, `Listeners:`, `Published:`,
`Internal only:`, `Notes:` in this order, omitting empty ones. Browser entries
use `Website (web):` followed by one complete URL per line. Actual experiment
entries may be listed when the assembled output exists. Never invent routes,
print wildcard destinations, credentials or routine framework/Docker banners.
Listeners show scope/protocol; published mappings come from Docker inspection,
and a mapping alone is not listener evidence. Capture routine startup logs;
show actionable sanitized diagnostics on failure or explicit verbose output.

For host wildcard publishing, run host-side `ip -br a` on every ready summary.
Accept `UP`/`UNKNOWN` rows, enumerate all valid addresses, strip CIDR and
deduplicate. IPv4 wildcard includes all non-loopback/non-unspecified IPv4
addresses, including secondary/bridge/VPN/tunnel candidates. IPv6 URLs require
actual IPv6 publishing and brackets; exclude link-local addresses. Specific
binds advertise that address; loopback appears only under Local only. Missing
or failed `ip` is an actionable error, not a fallback to a guessed address.
If no candidate exists, state that explicitly. A remote Docker daemon needs
an authorized publishing-host inspection path; never use caller-local IPs as
remote-daemon evidence. Cross-device reachability remains unverified until
tested on the intended device; list that limitation in Notes.

Docker access depends on the active sandbox. Reuse narrowly authorized `sam`
or `preview.sh` invocation approval; do not relax security settings or add
broad Docker/shell/package-manager allow rules.

## Verification

Run Bash syntax, ShellCheck and shfmt on `sam`, `preview.sh`, and the dotenv
helper, then the existing site command tests through `sam`.
CLI fixtures use the Bash-capable pinned image, for example
`./preview.sh render node --test apps/site/tests/preview-command.test.mjs`;
the ordinary Node Alpine image does not provide Bash for shell fixtures.
Exercise real
start/status/repeated start/stop/down/dev on a free configured port, prove
only owned services stop and that the port closes. Test address/config/error
branches with temporary fixtures. Run `preview.sh verify` and `package` for
the preserved gate and packaging boundary; record their actual results.
Physical-device LAN, production TLS/SMTP and private deployment are separate
owner-authorized validation, never implied by localhost checks.
