#!/usr/bin/env bash
# Proves a release archive works the way a user installs it: unzip into qBittorrent's config folder,
# then point "Use alternative WebUI" at it (done through the same WebAPI call the Options dialog uses).
# Usage: e2e/smoke-release.sh <path/to/torvia.zip> [qbittorrent-image-tag]
set -euo pipefail
ZIP="$(realpath "$1")"; TAG="${2:-latest}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROFILE="$(mktemp -d)"
node "$ROOT/e2e/qbt-config.mjs" "$PROFILE" none >/dev/null       # fresh qBittorrent: stock WebUI
unzip -q "$ZIP" -d "$PROFILE"                                    # "place the files in the qBittorrent folder"
test -f "$PROFILE/torvia/public/index.html" && test -f "$PROFILE/torvia/private/index.html" || { echo "archive layout wrong"; exit 1; }
docker rm -f torvia-qbt >/dev/null 2>&1 || true
docker run -d --name torvia-qbt -e QBT_LEGAL_NOTICE=confirm -e QBT_WEBUI_PORT=8080 -p 8080:8080 \
  -v "$PROFILE:/config" "qbittorrentofficial/qbittorrent-nox:$TAG" >/dev/null
for _ in $(seq 1 60); do curl -fsS -o /dev/null http://localhost:8080/ && break; sleep 1; done

JAR="$(mktemp)"; PASS=torvia-e2e-password
curl -fsS -c "$JAR" -d "username=admin&password=$PASS" http://localhost:8080/api/v2/auth/login -o /dev/null
curl -fsS http://localhost:8080/ | grep -qi "<title>Torvia" && { echo "Torvia was active BEFORE being pointed at: test is invalid"; exit 1; }
echo "stock WebUI is active (expected)"

# Tools > Options > Web UI > Use alternative WebUI + Files location
curl -fsS -b "$JAR" -H "Referer: http://localhost:8080/" -H "Origin: http://localhost:8080" \
  --data-urlencode 'json={"alternative_webui_enabled":true,"alternative_webui_path":"/config/torvia"}' \
  http://localhost:8080/api/v2/app/setPreferences -o /dev/null
sleep 1
curl -fsS http://localhost:8080/ | grep -qi "<title>Torvia" || { echo "signed-out page is not Torvia"; docker logs torvia-qbt | tail -20; exit 1; }
curl -fsS -b "$JAR" http://localhost:8080/ | grep -qi "<title>Torvia" || { echo "signed-in page is not Torvia"; exit 1; }
echo "OK: Torvia served after pointing qBittorrent at the unzipped release (qBittorrent $TAG)"
if [ "${RUN_E2E:-0}" = 1 ]; then
  cd "$ROOT" && pnpm e2e
fi
