FROM node:22-alpine
WORKDIR /opt/firefly/tooling/publish-memos
COPY tooling/publish-memos/package.json tooling/publish-memos/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY tooling/publish-memos/src ./src
COPY plugins/memos/public.mjs plugins/memos/validation.mjs /opt/firefly/plugins/memos/
COPY tooling/shared/contained-file.mjs tooling/shared/markdown-html-policy.mjs /opt/firefly/tooling/shared/
USER node
ENTRYPOINT ["node", "src/cli.mjs"]
