FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci --ignore-scripts
COPY migrations ./migrations
COPY src ./src
COPY scripts ./scripts
RUN npm run build

FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production \
    COMMENTS_BIND=0.0.0.0 \
    COMMENTS_PORT=8787 \
    COMMENTS_DATABASE_PATH=/var/lib/firefly-comments/comments.sqlite \
    COMMENTS_OUTBOX_PATH=/var/lib/firefly-comments/notifications.jsonl

RUN mkdir -p /var/lib/firefly-comments \
    && chown -R node:node /var/lib/firefly-comments
COPY --from=build --chown=node:node /app/package.json /app/package-lock.json /app/
COPY --from=build --chown=node:node /app/dist/src /app/dist/src
COPY --from=build --chown=node:node /app/migrations /app/migrations
COPY --from=build --chown=node:node /app/scripts /app/scripts

USER node
VOLUME ["/var/lib/firefly-comments"]
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:8787/healthz').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"]
ENTRYPOINT ["node", "dist/src/server.js"]
