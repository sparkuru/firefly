# Audit migrated fields for unintended legacy compatibility

## Goal

Read-only audit of the repository's authored-data and configuration contracts to
identify fields whose replacements still silently accept, translate, ignore, or
special-case retired names. Report confirmed findings, non-findings, and the
smallest follow-up changes without modifying product code or external content.

## Audit question

After a field is replaced by a canonical name, does the repository still give
the retired name any behavior beyond the normal strict unknown-field contract?
The current `articleTheme` cleanup is the reference case, not permission to
assume that every similarly named field is defective.

## Requirements

1. Inspect authored content schemas and collection validation, especially
   frontmatter fields and their defaults.
2. Inspect site/application configuration schemas, parsers, preprocessors,
   normalizers, aliases, fallback chains, migration diagnostics, and CLI
   validation paths.
3. Search tests and live Trellis specifications for evidence of old-to-new
   field mappings, deprecated-name handling, compatibility promises, or
   contradictory contract descriptions.
4. For each candidate, classify the observed behavior as one of:
   - canonical-only and strict;
   - ordinary unknown-field rejection;
   - intentional compatibility with an explicit current contract; or
   - unintended legacy acceptance, translation, ignoring, or bespoke warning.
5. Record evidence with repository-relative file paths and relevant symbols or
     line locations, separating confirmed facts from inferences.
6. Recommend only the smallest behavior-preserving follow-up for confirmed
     unintended compatibility, including its validation and the durable spec
     location that should change.
7. Do not edit source code, tests, content, external repositories, or unrelated
     task records during the audit.

## Acceptance Criteria

- [x] The audit covers content schemas, configuration parsing/normalization,
      CLI validation, tests, and current relevant Trellis specifications.
- [x] A candidate inventory identifies each field with a possible replacement
      or legacy name and states whether evidence was found.
- [x] Every positive finding includes the exact compatibility mechanism,
      impact, and smallest follow-up recommendation.
- [x] Every apparent non-finding is backed by the strict rejection or
      canonical-only evidence that was checked.
- [x] Intentional compatibility is not reported as a defect when an explicit
      current contract and tests justify it.
- [x] The `articleTheme` case is included as a baseline and distinguished from
      the audit's findings about other fields.
- [x] The result is recorded in the task's research/audit notes; no product or
      external-content files are changed.

## Scope boundaries

- In scope: this repository's source, tests, documentation, `.trellis/spec/**`,
  and task-local research notes relevant to field contracts.
- Out of scope: implementing fixes, broad schema redesign, dependency upgrades,
  editing `/home/wkyuu/cargo/repo/04-flyMe2theStar`, and runtime issues unrelated
  to legacy-field handling.

## Planning note

This is a focused read-only audit, so a PRD-only task is sufficient; separate
`design.md` and `implement.md` files are not required.

## Notes

- Created with `task.py create --no-start` after user approval.
