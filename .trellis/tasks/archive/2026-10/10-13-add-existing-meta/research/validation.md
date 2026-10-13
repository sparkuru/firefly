# Validation Evidence

## Scope

The repository `content/add.py` is the changed authoring entry point. The
existing Node organizer and content schemas are reused without changes.
Scratch CLI fixtures remain under `/tmp`; private source paths are not copied
into this record.

## Backend Checks

- `SAM_CONTENT_MODE=none ./sam npm --prefix apps/site run test:blog-meta`:
  all 6 metadata-organizer regression tests passed. The Docker execution used
  synthetic fixtures without mounting the external content workspace.

## Earlier Interface Review (Superseded)

The first candidate used `--meta PATH`; the owner subsequently selected
`format PATH`. The following evidence covers the earlier candidate and does
not substitute for revised-interface verification.

- The owner-provided empty external Markdown path was checked using the
  repository entry point with `--meta PATH --preview`: exit status 0; inferred
  filename title/description, UTC date, post layout and draft status appeared
  in the candidate. Source size remained zero bytes afterwards.

## CLI Adapter Checks

The implementer ran 11 scenario groups through the real authoring CLI with
closed stdin and an intentionally unavailable editor. All groups passed:

- empty external post defaults and mode preservation;
- authored title/date/description/draft/tags/access/license/theme/markers,
  exact UTF-8/BOM/CRLF body preservation and repeat stability;
- caller-relative page inference, slug, description and preview/write equality;
- external standalone source defaulting to posts;
- nearest nested workspace recognition;
- dotenv root resolution, CLI/environment priority, and metadata-only tooling;
- missing/non-Markdown/nonregular/symlink/parent-symlink/non-UTF-8 rejection;
- malformed YAML, duplicate keys, unknown schema fields and noncoercible dates;
- incompatible creation/setup/editor/preview options;
- missing/malformed explicit configuration, tooling and Node errors;
- help and existing init/authoring configuration compatibility.

Python lint (`ruff check`), formatting (`ruff format --check`), AST syntax
and `git diff --check` passed. The scratch runner remains under `/tmp`; no
tracked fixture copies or new dependencies were added.

Independent review reran all 11 groups successfully, with no product fixes.
Both role contexts now explicitly register the Trellis Plus index. Python
type checking was not applicable because no Python type checker is configured.
The public-interface change required a subsequent verification pass.

## Final Format Interface

The revised scratch runner passed 12 scenario groups through the real CLI,
retaining the earlier behavior coverage and adding:

- required positional Markdown path;
- old `--meta` rejection;
- `--preview` scoped to `format`, accepted before or after its path;
- format-specific help without creation/editor options;
- configuration options before and after the subcommand;
- existing no-subcommand authoring menu and init behavior.

The owner-provided empty external Markdown path also passed a read-only
`format PATH --preview` run, and `format --help` displayed the positional path
and preview usage. The backend/schema are unchanged; the prior 6/6 package
regressions still cover the same dependency boundary. Revised Ruff lint,
formatting, AST syntax and diff checks passed at implementation handoff.
Independent review reran all 12 groups successfully, with no product-code
fixes. Ruff lint/formatting, AST syntax, diff/context validation and full
record/privacy review passed. The context validator reports the existing
large content-spec injection warning; the applicable organizer and format
sections were read directly. No Python type checker is configured, so type
checking is not counted as passing syntax verification.

## Acceptance Mapping

| Criterion | Evidence | Result |
| --- | --- | --- |
| AC1 | Empty external post defaults, closed stdin and unavailable editor | PASS |
| AC2 | Authored fields, exact UTF-8/BOM/CRLF body/mode, repeated bytes | PASS |
| AC3 | External absolute, caller-relative, standalone and nested/page paths | PASS |
| AC4 | Preview/write candidate equality, source/configuration unchanged | PASS |
| AC5 | Invalid inputs/options, retired flag, scoped help/preview, existing authoring | PASS |
| AC6 | Independently repeated 12-group CLI suite, Python/diff/context gates, 6 backend regressions | PASS |

Human review is not needed for this focused CLI adapter after the relevant
automated checks. Implementation and verification are complete. The owner
authorized submission; work commit `a4fb132` contains the verified feature and
shared contracts. The external entry-point copy and original Markdown example
remain unchanged. Closeout uses the standard task archive and journal commits,
without a remote push or deployment.

## Non-Applicable Gates

Browser, site build, publication and deployment checks are not applicable to
this CLI-only adapter. Host Node is used only to exercise the documented
source-editing authoring command; package regressions use `./sam`.

## Inherited Organizer Limitation

A scratch assertion exposed existing calendar overflow coercion: authored
`date: 2025-02-30` is accepted by the current schema and normalized to
`2025-03-02`. The organizer validates calendar dates supplied through its
`--date` override separately; its authored front-matter coercion is unchanged
by this adapter. This assertion is a known failed expectation, not rejection
coverage. Noncoercible dates remain part of invalid-schema checks. The task
does not introduce a date parser or change the shared schema.
