# Official Playwright Constraints

Research date: 2026-08-12

## Sources

- Playwright Docker guide: <https://playwright.dev/docs/docker>
- Playwright web server guide: <https://playwright.dev/docs/test-webserver>
- Playwright configuration guide: <https://playwright.dev/docs/test-configuration>
- Playwright best practices: <https://playwright.dev/docs/best-practices>

## Decisions Supported by the Sources

- Pin `@playwright/test` and the Microsoft Playwright Docker image to the same version. The official Docker guide warns that mismatched versions cannot reliably locate browser executables.
- Use the current documented stable pair `@playwright/test@1.62.0` and `mcr.microsoft.com/playwright:v1.62.0-noble`.
- Do not run browser tests in the existing Alpine image. The official guide states that Playwright's Firefox and WebKit browser builds require glibc and do not support Alpine/musl.
- Reuse the canonical `sam` wrapper with a per-command image override for browser tests instead of creating a competing raw-Docker test path.
- Preserve `--init`, which the wrapper already uses, and add a narrow per-command IPC override so Chromium tests use `--ipc=host` as recommended by the Docker guide.
- Configure Playwright `webServer` to start the Astro server in the same container and wait for `http://127.0.0.1:4321/lab/nerv/`. Set the same origin as `baseURL` so tests use repository-relative paths.
- Configure one desktop Chromium project and one narrow-mobile Chromium project. The current task needs responsive evidence but does not justify downloading or running three browser engines.
- Configure `trace: 'on-first-retry'`, HTML reporting without auto-open, and a stable `test-results` output directory. The official guidance recommends traces for failures rather than recording every passing run.
- Use semantic locators and web-first assertions. Do not create screenshot pass/fail baselines because the repository has no controlled baseline-review environment; screenshots remain diagnostic failure artifacts.

## Planned Commands

The exact durable commands use the repository wrapper and the pinned image:

```bash
./sam npm --prefix experiments/nerv run check
./sam npm --prefix experiments/nerv run build
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host \
  ./sam npm --prefix experiments/nerv run test:e2e -- tests/nerv.spec.ts
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host \
  ./sam npm --prefix experiments/nerv run test:e2e
```

The focused test will exercise `/lab/nerv/` under both configured viewports, assert the document title, semantic main landmark and emergency-notice heading, and detect horizontal overflow. It uses no credentials, external services, mutable data, storage state, or route mocks.
