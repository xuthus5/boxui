# 前端构建
FROM node:20-alpine AS ui-builder
WORKDIR /app/ui
COPY ui/package.json ui/package-lock.json* ./
RUN npm ci || npm install
COPY ui/ ./
RUN npm run build

# 后端构建
FROM golang:1.26-alpine AS go-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=ui-builder /app/ui/dist ./cmd/boxd/ui/dist
RUN go build -tags "embed_ui with_gvisor with_quic with_dhcp with_wireguard with_utls with_acme with_clash_api" \
    -ldflags "-X github.com/xuthus5/boxd/internal/core.Version=$(git describe --tags --always 2>/dev/null || echo dev) -X github.com/sagernet/sing-box/constant.Version=v1.13.14" \
    -o /bin/boxd ./cmd/boxd/

# 运行
FROM alpine:3.20
RUN apk add --no-cache ca-certificates iptables iproute2 && \
    addgroup -S boxd && adduser -S -G boxd boxd && \
    mkdir -p /var/lib/boxd /etc/sing-box && \
    chmod 0700 /var/lib/boxd && \
    chown -R boxd:boxd /var/lib/boxd /etc/sing-box
WORKDIR /app
COPY --from=go-builder --chown=boxd:boxd /bin/boxd /app/boxd
USER boxd
EXPOSE 9091
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:9091/healthz || exit 1
ENTRYPOINT ["/app/boxd"]
