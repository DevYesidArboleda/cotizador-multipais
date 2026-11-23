# syntax=docker/dockerfile:1.7
# Angular 21+ → Nginx no-root. Un solo build sirve CO y CL (ADR-001).
# Ningún secreto entra a esta imagen: el upstream de Strapi se inyecta en runtime (ADR-003).

FROM node:26-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build -- --configuration production

FROM nginxinc/nginx-unprivileged:1.29-alpine AS runtime
ARG APP_NAME=frontend
ENV PORT=8080 \
    STRAPI_UPSTREAM=http://strapi:1337
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/15-resolver.envsh /docker-entrypoint.d/15-resolver.envsh
COPY --from=build /app/dist/${APP_NAME}/browser /usr/share/nginx/html
EXPOSE 8080
