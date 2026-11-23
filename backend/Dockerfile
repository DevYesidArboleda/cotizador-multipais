# syntax=docker/dockerfile:1.7
# Strapi 5 — imagen de producción multi-stage (ADR-002, ADR-003).
# El admin se compila en build: el contenedor de runtime no necesita toolchain ni memoria extra.

FROM node:26-alpine AS build
RUN apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev vips-dev python3 git
WORKDIR /opt/app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund
COPY . .
ENV NODE_ENV=production
RUN npm run build && npm prune --omit=dev

FROM node:26-alpine AS runtime
RUN apk add --no-cache vips wget
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=1337 \
    NODE_OPTIONS=--max-old-space-size=384
WORKDIR /opt/app
COPY --from=build --chown=node:node /opt/app ./
# Directorio del volumen SQLite con dueño no-root (Docker copia la propiedad al volumen nuevo).
RUN mkdir -p /opt/app/.tmp /opt/app/public/uploads && chown -R node:node /opt/app/.tmp /opt/app/public/uploads
USER node
EXPOSE 1337
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=10 \
  CMD wget -q --spider "http://127.0.0.1:${PORT}/_health" || exit 1
CMD ["npm", "run", "start"]
