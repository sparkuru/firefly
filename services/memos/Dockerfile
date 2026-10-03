FROM node:22-alpine AS build
WORKDIR /app/services/memos
COPY services/memos/package.json services/memos/package-lock.json services/memos/tsconfig.json ./
RUN npm ci --ignore-scripts
COPY services/memos/src ./src
COPY plugins/memos /app/plugins/memos
RUN npm run build

FROM node:22-alpine
WORKDIR /app/services/memos
ENV NODE_ENV=production MEMOS_BIND=127.0.0.1 MEMOS_PORT=8788 MEMOS_CONFIG_PATH=config/plugins/memos/config.toml MEMOS_SECRETS_FILE=/run/secrets/memos.env
RUN mkdir -p /var/lib/firefly-memos && chmod 700 /var/lib/firefly-memos && chown node:node /var/lib/firefly-memos
COPY --from=build --chown=node:node /app/services/memos/package.json /app/services/memos/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=build --chown=node:node /app/services/memos/dist/src ./dist/src
COPY services/memos/migrations ./migrations
COPY --from=build /app/plugins/memos/config.mjs /app/plugins/memos/public.mjs /app/plugins/memos/validation.mjs /app/plugins/memos/
USER node
VOLUME ["/var/lib/firefly-memos"]
EXPOSE 8788
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD ["node", "-e", "Promise.all(['/healthz','/readyz'].map(p=>fetch('http://127.0.0.1:8788'+p))).then(r=>process.exit(r.every(v=>v.ok)?0:1)).catch(()=>process.exit(1))"]
ENTRYPOINT ["node", "dist/src/server.js"]
