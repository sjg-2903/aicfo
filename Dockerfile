# ─────────────────────────────────────────────────────────────────────────
# AI CFO frontend: Vite production build served by Caddy.
#
# The same image is used by docker-compose.prod.yml as the edge service:
# it serves the static SPA and reverse-proxies /api and /health to FastAPI.
# Build context = repository root.
# ─────────────────────────────────────────────────────────────────────────

# 1) Build the React app (TypeScript check + Vite production build).
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY index.html vite.config.ts tsconfig.json ./
COPY src ./src

# The default is an empty base URL, so the browser calls the same origin
# (/api, /health) and Caddy routes to the backend. Set this ARG only when
# the API lives on a separate host.
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

# 2) Serve the build with Caddy (SPA fallback + API proxy, see deploy/Caddyfile).
FROM caddy:2-alpine

COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv

EXPOSE 80 443
