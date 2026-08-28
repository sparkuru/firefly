FROM node:22-alpine AS build

WORKDIR /app/services/comments
COPY services/comments/package.json services/comments/package-lock.json services/comments/tsconfig.json ./
RUN npm ci --ignore-scripts
COPY services/comments/migrations ./migrations
COPY services/comments/src ./src
COPY services/comments/scripts ./scripts
COPY plugins/comments/config.mjs /app/plugins/comments/config.mjs
COPY plugins/comments/config.d.mts /app/plugins/comments/config.d.mts
COPY plugins/comments/public.mjs /app/plugins/comments/public.mjs
COPY plugins/comments/public.d.mts /app/plugins/comments/public.d.mts
RUN npm run build

FROM node:22-alpine

WORKDIR /app/services/comments
ENV NODE_ENV=production \
    COMMENTS_BIND=127.0.0.1 \
    COMMENTS_PORT=8787 \
    COMMENTS_DATABASE_PATH=/var/lib/firefly-comments/core.db \
    COMMENTS_SECRETS_FILE=/run/secrets/comments.env

RUN mkdir -p /var/lib/firefly-comments \
    && chmod 700 /var/lib/firefly-comments \
    && chown -R node:node /var/lib/firefly-comments
COPY --from=build --chown=node:node /app/services/comments/package.json /app/services/comments/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=build --chown=node:node /app/services/comments/dist/src ./dist/src
COPY --from=build --chown=node:node /app/services/comments/migrations ./migrations
COPY --from=build --chown=node:node /app/services/comments/scripts ./scripts
COPY --from=build --chown=node:node /app/plugins/comments/config.mjs /app/plugins/comments/config.mjs
COPY --from=build --chown=node:node /app/plugins/comments/public.mjs /app/plugins/comments/public.mjs

USER node
VOLUME ["/var/lib/firefly-comments"]
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:8787/healthz').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"]
ENTRYPOINT ["node", "dist/src/server.js"]
