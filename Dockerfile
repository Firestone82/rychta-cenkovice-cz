# One image with the API and the built website. The API serves both.

FROM node:22-slim AS web
WORKDIR /src/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npx ng build

FROM node:22-slim AS api
WORKDIR /src/api
COPY api/package.json api/package-lock.json ./
RUN npm ci
COPY api/ ./
RUN npm run build && npm prune --omit=dev

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production \
    RC_ENV=production \
    RC_PORT=8080 \
    RC_MEDIA_DIR=/data/media \
    RC_OUTBOX_DIR=/data/outbox \
    RC_WEB_DIR=/app/web
COPY --from=api /src/api/package.json ./
COPY --from=api /src/api/node_modules ./node_modules
COPY --from=api /src/api/dist ./dist
COPY --from=web /src/web/dist/web ./web
RUN mkdir /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:8080/api/v1/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "dist/main.js"]
