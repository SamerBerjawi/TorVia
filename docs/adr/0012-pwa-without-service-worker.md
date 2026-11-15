# 0012 — Installable, but no service worker

**Context.** A manifest and icons let browsers install Torvia as an app. A service worker would cache assets, but qBittorrent already sets cache headers, and a stale cached app against a newer qBittorrent is a worse failure than a slow first load. Service workers also need HTTPS or localhost.

**Decision.** Ship `manifest.webmanifest` and PNG icons (in `public/` so the anonymous manifest fetch succeeds), no service worker, no offline mode.

**Consequences.** Torvia is installable where the browser allows it and always loads the current build. No offline shell.
