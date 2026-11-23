# Etapa 1: Build de Angular 21+
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci || npm install

COPY . .
RUN npm run build

# Etapa 2: Servidor Nginx ligero (sin tokens ni herramientas de build)
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
