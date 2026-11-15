#!/usr/bin/env bash
# Regenerates docs/screenshots/*.png against a throwaway real qBittorrent. Needs docker, a build (pnpm build) and Playwright's Chromium.
#   bash scripts/screenshots/run.sh [qbittorrent-image-tag]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TAG="${1:-latest}"
WORK="$(mktemp -d)"
node "$ROOT/scripts/screenshots/make-sample-data.mjs" "$WORK"
PROFILE="$WORK/profile"; mkdir -p "$PROFILE"
node "$ROOT/e2e/qbt-config.mjs" "$PROFILE" /torvia >/dev/null
docker rm -f torvia-qbt >/dev/null 2>&1 || true
docker run -d --name torvia-qbt -e QBT_LEGAL_NOTICE=confirm -e QBT_WEBUI_PORT=8080 -p 8080:8080 \
  -v "$PROFILE:/config" -v "$ROOT/dist/torvia:/torvia:ro" -v "$WORK/downloads:/downloads" \
  "qbittorrentofficial/qbittorrent-nox:$TAG" >/dev/null
for _ in $(seq 1 60); do curl -fsS -o /dev/null http://localhost:8080/ && break; sleep 1; done
mkdir -p "$ROOT/docs/screenshots"
cd "$ROOT" && node scripts/screenshots/capture.mjs "$WORK" "$ROOT/docs/screenshots"
docker rm -f torvia-qbt >/dev/null 2>&1 || true
