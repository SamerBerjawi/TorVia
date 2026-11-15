# Nuvora

A next-generation alternative WebUI for [qBittorrent](https://github.com/qbittorrent/qBittorrent).
Static assets only — no backend, database or extra container. qBittorrent serves it and handles authentication.

> **Status: early preview.** Sign in, live torrent list, filters, query language, details overview, three skins. Torrent actions, adding torrents, RSS, search and settings are on the roadmap.

## Features so far
- **Three skins, each light & dark** (or follow the system): *Graphite* (sidebar + side details), *Paper* (desktop toolbar + bottom details), *Signal* (query-first console with grouped rows and live speed sparklines). Switch under **Appearance**.
- Virtualised table for large libraries, sortable columns, multi-select (click, ⌘/Ctrl-click, Shift-click), keyboard navigation (↑↓ / j k, Space, Enter, Esc, ⌘/Ctrl-A, `/` or ⌘/Ctrl-K to search).
- Status views, categories and tags with live counts.
- Query language in every search box: `ubuntu state:downloading cat:linux tag:4k size:>1GB ratio:<1 progress:>=50 -cat:films`. Signal adds chips, autocomplete and saved views.
- IDE-style file-type icons from the torrent's extension.
- Connection-loss banner with automatic recovery.

## Install (qBittorrent Alternative WebUI)

1. Build (`pnpm install && pnpm build`) or download a release zip, so you have a folder `nuvora/` containing `public/` and `private/`.
2. qBittorrent → **Tools → Options → Web UI → Use alternative WebUI**.
3. Set **Root Folder** to the path of `nuvora/` **as seen by qBittorrent** (inside the container if you use Docker).
4. Save, then reload the WebUI page.

### Docker / Portainer
Mount the folder into the container, e.g. `./nuvora:/config/nuvora:ro`, and set Root Folder to `/config/nuvora`.
Upgrade by replacing the folder contents atomically (extract next to it, then swap) — `qbittorrent-nox` switches the
alternative UI **off** if `index.html` is momentarily missing.

If anything goes wrong, untick "Use alternative WebUI" (or remove `WebUI\AlternativeUIEnabled` from `qBittorrent.conf`) to get the stock UI back.

## Develop

```bash
pnpm install
NUVORA_QBT_URL=http://localhost:8080 pnpm dev:login   # sign in at http://localhost:5174
NUVORA_QBT_URL=http://localhost:8080 pnpm dev         # app at http://localhost:5173
pnpm check                                            # typecheck + tests + build + package guards
pnpm build && pnpm package                            # dist/nuvora-<version>.zip
```

## How packaging works
qBittorrent serves `public/` to signed-out clients and `private/` to signed-in ones (falling back to `public/`). So the build
produces two independent bundles: a tiny sign-in page and the app. See `CLAUDE.md` for the constraints this imposes.
