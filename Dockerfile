FROM node:22-alpine AS builder

WORKDIR /app/experiments/nerv

COPY experiments/nerv/package*.json ./
RUN npm ci --ignore-scripts

COPY experiments/nerv/ ./
RUN npm run build

FROM nginx:1.28-alpine AS runtime

RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=builder --chown=nginx:nginx /app/experiments/nerv/dist/ /usr/share/nginx/html/lab/nerv/

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --spider --tries=1 http://127.0.0.1:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
