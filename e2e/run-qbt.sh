#!/usr/bin/env bash
# Starts qbittorrent-nox in Docker with dist/torvia mounted as the alternative WebUI.
# Usage: e2e/run-qbt.sh [image-tag]   (default: latest). Requires `pnpm build` first.
# TORVIA_DIR=/path/to/torvia mounts that folder instead (used to smoke-test an unzipped release).
set -euo pipefail
TAG="${1:-latest}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROFILE="$(mktemp -d)"
node "$ROOT/e2e/qbt-config.mjs" "$PROFILE" /torvia
docker rm -f torvia-qbt >/dev/null 2>&1 || true
docker run -d --name torvia-qbt \
  -e QBT_LEGAL_NOTICE=confirm -e QBT_WEBUI_PORT=8080 -p 8080:8080 \
  -v "$PROFILE:/config" -v "${TORVIA_DIR:-$ROOT/dist/torvia}:/torvia:ro" \
  "qbittorrentofficial/qbittorrent-nox:$TAG" >/dev/null
for _ in $(seq 1 60); do
  if curl -fsS -o /dev/null http://localhost:8080/; then echo "qBittorrent $TAG ready on :8080"; exit 0; fi
  sleep 1
done
echo "qBittorrent did not start"; docker logs torvia-qbt; exit 1
