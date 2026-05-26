# ── Stage 1: build client ─────────────────────────────────────────────────────
FROM node:22-alpine AS client-build
WORKDIR /build/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ── Stage 2: build server ─────────────────────────────────────────────────────
FROM node:22-alpine AS server-build
WORKDIR /build/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# ── Stage 3: production runtime ───────────────────────────────────────────────
FROM node:22-alpine
WORKDIR /app

# Production deps only
COPY server/package*.json ./
RUN npm ci --omit=dev

# Compiled server
COPY --from=server-build /build/server/dist ./dist

# Built client (served as static files by Express)
COPY --from=client-build /build/client/dist ./public

# Mount a volume here for SQLite persistence: -v finance-data:/data
VOLUME /data

ENV NODE_ENV=production
ENV DB_PATH=/data/finance.db
ENV STATIC_PATH=/app/public
ENV PORT=3001

EXPOSE 3001

CMD ["node", "dist/index.js"]
