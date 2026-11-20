# One image with the API and the built website. The API serves both.

FROM node:22-alpine AS web
WORKDIR /src/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npx ng build

FROM golang:1.26-alpine AS api
WORKDIR /src/api
COPY api/go.mod api/go.sum ./
RUN go mod download
COPY api/ ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/rychta-api ./cmd/rychta-api

FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /app
COPY --from=api /out/rychta-api /app/rychta-api
COPY --from=web /src/web/dist/web/browser /app/web
ENV RC_ENV=production \
    RC_ADDR=:8080 \
    RC_DB_PATH=/data/rychta.db \
    RC_MEDIA_DIR=/data/media \
    RC_WEB_DIR=/app/web
VOLUME /data
EXPOSE 8080
ENTRYPOINT ["/app/rychta-api"]
CMD ["serve"]
