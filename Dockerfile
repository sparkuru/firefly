FROM node:22-alpine AS builder

WORKDIR /app

COPY . .

RUN npm --prefix tooling/validate-experiments ci --ignore-scripts \
    && npm --prefix tooling/validate-experiments run build \
    && npm --prefix tooling/validate-experiments run validate -- --root /app \
    && npm --prefix packages/x-core ci --ignore-scripts \
    && npm --prefix packages/x-core run build \
    && npm --prefix presentations/semantic ci --ignore-scripts \
    && npm --prefix presentations/semantic run build \
    && npm --prefix presentations/terminal ci --ignore-scripts \
    && npm --prefix presentations/terminal run build \
    && npm --prefix tooling/assemble-publication ci --ignore-scripts \
    && npm --prefix tooling/assemble-publication run build \
    && npm --prefix apps/site ci --ignore-scripts \
    && npm --prefix apps/site run build \
    && npm --prefix experiments/nerv ci --ignore-scripts \
    && npm --prefix tooling/assemble-publication run build:experiments -- --root /app \
    && npm --prefix tooling/assemble-publication run assemble -- --root /app

FROM nginx:1.28-alpine AS runtime-base

RUN rm /etc/nginx/conf.d/default.conf /usr/share/nginx/html/50x.html

COPY nginx.conf /etc/nginx/nginx.conf

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --spider --tries=1 http://127.0.0.1:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]

FROM runtime-base AS runtime

COPY --from=builder --chown=nginx:nginx /app/dist/ /usr/share/nginx/html/

FROM runtime-base AS runtime-publication

COPY --chown=nginx:nginx dist/ /usr/share/nginx/html/
