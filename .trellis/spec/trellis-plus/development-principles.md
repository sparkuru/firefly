# Development Principles

These project-authored rules apply before implementation, diagnosis and final
verification. Read them with the mainline and the relevant boundary contract.

- Firefly is under active development. Existing public Markdown URLs, deployed
  comments/Memo wire formats, private data and publication deletion history
  have compatibility/retention obligations; preserve their contracts. The
  root developer CLI is owner-approved for replacement by `preview.sh`.
- Solve the authorized requirement through the existing execution path. Reuse
  components, helpers, tests and Docker boundaries. Do not add speculative
  adapters, caches, plugin frameworks, fallback paths or unrelated cleanup.
  Replace unreleased names together with their actual callers.
- Preserve unknown data and user edits. A development label does not authorize
  deletion. Preview stop removes only exact owned containers, retaining all
  mounted inputs, build outputs, databases and volumes. Private services and
  owner Compose stacks are outside the public preview lifecycle.
- Trusted-LAN preview may publish `0.0.0.0` when selected in `.env`; honor
  existing loopback restrictions. Keep authentication, secret handling and
  production defaults intact. No firewall changes or additional published
  private-service ports accompany a development convenience change.
- Diagnose against the actual path and reproduce when possible. Label an
  untested cause as a hypothesis. Do not rewrite contracts/tests around a
  guess or weaken assertions, increase timeouts or hide errors to claim a pass.
- Use the narrowest meaningful checks, then the validation profile's required
  broader gate. CLI checks exercise arguments/output/status; browser checks
  exercise actions and final states. Build, HTTP 200, and container running
  each prove only their own scope. Preserve failure artifacts and name missing
  prerequisites. Do not repeatedly rerun passing checks without new evidence.
- Add dependencies only for a demonstrated need. Keep scratch fixtures and
  logs in `/tmp`; clean only artifacts created by the current work. Preserve
  intentional tests and existing private configuration.
- README belongs to the owner. Edit it only under explicit authorization;
  otherwise prepare a concrete command migration and report stale references.
  Keep development rules here, not in a parallel task system or copied skill.
- Read approved direction at start/resume and before finish. Update mainline
  from user-approved changes and actual evidence; do not promote unverified
  implementation to completed acceptance. Never stage unrelated dirty files.
