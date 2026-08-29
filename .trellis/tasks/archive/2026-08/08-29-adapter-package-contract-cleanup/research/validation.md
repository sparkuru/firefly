# Validation evidence

## Focused gates

- ./sam npm run install:m3 — passed. X Core, Semantic, Terminal, and site
  lockfile installs completed with zero reported vulnerabilities.
- ./sam npm run check:m3 — passed. X Core, Semantic, Terminal, and Astro site
  checks reported zero errors, warnings, or hints.
- ./sam npm run test:m3 — passed: X Core 14/14, Semantic 3/3, Terminal 30/30,
  site content 66/66, and site X Core integration 6/6.
- ./sam npm run build:m3 — passed. The site built 122 pages and its 17 static
  output tests passed. The existing CSS optimizer notices for highlight
  selectors remained non-fatal.
- JSON parsing of both changed manifests and lockfiles — passed.
- git diff --check — passed.
- task.py validate for this task — passed with five real entries in both
  implement.jsonl and check.jsonl.

## Full fixture gate

- ./verify.sh — the repository fixture gate passed all check, unit/integration,
  package build, site build, and Experiment build stages reached before
  publication assembly. It stopped at assemble:publication with:

      comments tombstone epoch 0 predates the published epoch 4; refusing rollback.

  This is the existing publication-state rollback guard, not a failure in the
  adapter or package changes. The command did not enter the browser stages and
  no publication state was changed.

## Scope review

The implementation diff contains only the two presentation manifest/lockfile
pairs, Semantic source, and Semantic tests, in addition to pre-existing
mainline and task-tree bookkeeping. No route, comments configuration, authored
content, generated artifact, or Terminal runtime-subpath change was found.
