# Review, Archive Attribution and Continuity

Read before proposing staging/commit, completing/archiving a task, or selecting
next work. Installing this policy never changes task state or grants commit,
archive, deployment or product-continuation authority.

## Submit-ready review

Compare the authorized acceptance, final diff and actual validation profile.
Classify `human-required`, `human-optional`, or `human-not-needed` before commit
or archive. Reuse prior explicit authorization; do not repeat permission.

`human-required` blocks commit/archive when a material runnable check remains
unverified, auth/deletion/permissions/deployment behavior changes, or judgment
requires subjective design, physical devices, assistive technology, private
credentials or an inaccessible environment. Complete automatable checks first.
Request only the residual scenario, with already-passed commands and exact
expected behavior; ask for pass/fail and reproduction/logs/screenshots on failure.
`human-optional` is nonblocking when relevant automation passed and a small
preference check could help. `human-not-needed` is appropriate for focused-test
covered mechanics/docs with no remaining meaningful human judgment; state why.
Unavailable checks remain unavailable, never PASS. No generic page smoke is
required after relevant browser/state/viewport automation passes.

## Supported archive route

The installed `task.py archive <name>` moves one normal task into its monthly
archive, updates completion/relationship state, clears runtime pointers and
can auto-commit with a fixed message. Its supported `--no-commit` skips Git
staging/commit. Use that route for Codex-assisted task attribution:

```sh
python3 .trellis/scripts/task.py archive <name> --no-commit
git status --short
# Inspect source removal, monthly archive destination, and changed child task.json paths.
# Stage only those explicit authorized paths, plus approved mainline evidence.
git diff --check
git diff --cached --name-only
git commit -F /tmp/<prepared-archive-message>
git log -1 --format=%B
git show --stat --oneline HEAD
```

After successful archival, use the repository subject form
`chore(task): archive <name>`, a proportional completion/validation summary,
work-commit references, then exactly one trailer separated by a blank line:

```text
Co-authored-by: OpenAI Codex <codex@openai.com>
```

The normal automatic archive staging is limited to source/destination and
relationship task records; the explicit route must inspect the real changes
instead of staging the whole task tree. Session journals use
`python3 .trellis/scripts/add_session.py ... --no-commit` when an explicit
commit is required; otherwise its auto-commit stages developer workspace and
the resolved current task only. Separate journals/ordinary work receive no
task attribution through this rule. Never rewrite historical attribution or
Git identity, create an empty attribution commit, or patch protected runtime.

Before retrying a partial archive/commit, inspect task location, Git state and
history. Resume only the unfinished operation; do not archive twice or repeat
the trailer. If the runtime loses `--no-commit` and offers no message interface,
report `archive-attribution-blocked` before archival. No task exists in the
preview consolidation session; no archive/trailer execution is claimed.

## Mainline continuity

Read `.trellis/mainline.md`, relevant approved source requirements, task/archive
evidence and Git/check state at start/resume/finish. Preserve approved/proposed,
superseded and unresolved boundaries; source existence alone is not approval.
Record accepted changes, actual check evidence, archive/commit locations and
remaining work without rewriting source PRDs or manufacturing a parallel queue.

For relevant no-task status/next-work requests or after archive, Project Pulse
is read-only: state initiative and completed evidence, dirty/blocker evidence,
one uniquely ready candidate if established, and the next permitted action.
Default `guided` recommends and waits for user choice; `paused` reports only.
`serial` may advance only an explicitly authorized ordered list of ready tasks,
stopping on ambiguity, risk, scope change or unmet dependencies. It grants no
automatic commit/deployment permission. The main session owns direction,
acceptance, transitions, dispatch, commit/archive and mainline; workers report
bounded changes/checks and never choose future product work.

Explicit owner-directed no-task repository maintenance proceeds within that
scope and records meaningful decisions in mainline, without invented task
artifacts or status changes. Unrelated product priorities remain guided.

## File and notice boundary

Classify candidates before staging. Trellis runtime/templates and managed
platform material stay read-only. Project-authored shared specs, normal code
and safe examples are trackable; `.env`, private data and agent settings stay
local. Use only explicit authorized path lists after diff review; no broad or
forced add. Recheck `third_party/index.md` for retained-source/version notice
gaps before distribution; report `license-notice-needed` without inventing a
root license. Following `trellis update`, recheck shared specs/mainline/context
paths without restoring additions to protected files or changing update skips.
