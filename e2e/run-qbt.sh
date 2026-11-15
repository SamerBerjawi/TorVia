#!/usr/bin/env bash
# Starts qbittorrent-nox in Docker with dist/nuvora mounted as the alternative WebUI.
# Usage: e2e/run-qbt.sh [image-tag]   (default: latest). Requires `pnpm build` first.
set -euo pipefail
TAG="${1:-latest}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROFILE="$(mktemp -d)"
node "$ROOT/e2e/qbt-config.mjs" "$PROFILE" /nuvora
docker rm -f nuvora-qbt >/dev/null 2>&1 || true
docker run -d --name nuvora-qbt \
  -e QBT_LEGAL_NOTICE=confirm -e QBT_WEBUI_PORT=8080 -p 8080:8080 \
  -v "$PROFILE:/config" -v "$ROOT/dist/nuvora:/nuvora:ro" \
  "qbittorrentofficial/qbittorrent-nox:$TAG" >/dev/null
for _ in $(seq 1 60); do
  if curl -fsS -o /dev/null http://localhost:8080/; then echo "qBittorrent $TAG ready on :8080"; exit 0; fi
  sleep 1
done
echo "qBittorrent did not start"; docker logs nuvora-qbt; exit 1
