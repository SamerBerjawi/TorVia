# 0001 — Static assets only, served by qBittorrent’s alternative WebUI

**Context.** qBittorrent can serve a folder of static files as its WebUI (`Root Folder`). Anonymous clients get `public/`, signed-in clients get `private/`. There is no backend we can run, and the WebAPI is same-origin.

**Decision.** Torvia is a build of two bundles (`public/` sign-in page, `private/` app) with relative URLs (`base: ./`), no server code, no external requests. A CI guard (`scripts/guard-package.mjs`) fails the build on things qBittorrent would break (symlinks, substituted tokens, oversized files).

**Consequences.** Works in Docker, behind reverse-proxy sub-paths, on NAS boxes. We cannot add server-side features (history, multi-user state); anything persistent is device-local (ADR 0009) until qBittorrent’s `clientdata` store is usable. No CSP header is sent for alternative UIs, so the CSP lives in each `index.html`.
