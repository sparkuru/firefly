FROM node:24.22.1-bookworm-slim AS patched-node

FROM mcr.microsoft.com/playwright:v1.64.1-noble

# The browser release predates Node's security patch. Replace its NodeSource
# binary while retaining the matching Playwright browsers and Noble libraries.
COPY --from=patched-node /usr/local/bin/node /usr/bin/node
RUN test "$(command -v node)" = /usr/bin/node \
    && test "$(node --version)" = v24.22.1
