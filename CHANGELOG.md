# Changelog

All notable changes to Torvia are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/). Release notes on GitHub are taken from the matching section below.

## [Unreleased]

### Added
- **Peers tab:** a Country column with the flag and two-letter code for each peer (hover for the country name). Peers on private addresses show a dash; if none of the peers has a country, a note explains how to turn on *Resolve peer countries* in qBittorrent. The 257 flags ship inside the app (flag-icons, MIT), so nothing is fetched from the internet; this adds about 0.9 MB to the download.

### Fixed
- **`docker/compose.yml`:** the Torvia installer step no longer stops qBittorrent from starting when GitHub can't be reached (for example a NAS booting before its network is up). It retries, then keeps the installed version and exits cleanly. Files are now owned by the same user as qBittorrent.

## [0.1.1] - 2026-11-15

Update notice, a resizable details panel in Paper, and layout fixes for the installed app and long file names.

### Added
- **Update notice:** a dismissible banner when a newer Torvia release exists, plus *Settings → About* with the version, a "Check now" button and an on/off switch. It asks GitHub's public releases page once a day, anonymously; this is Torvia's only request outside qBittorrent. On by default, see `docs/adr/0014-update-check.md`.
- **Paper:** the details panel can be resized by dragging the handle above it (or with the arrow keys; double-click resets). The height is remembered.

### Fixed
- **Installed app / notched phones:** content no longer runs under the status bar, notch or home indicator (safe-area insets).
- **Files tab:** very long file and folder names are cut off with an ellipsis (full name in the tooltip) instead of wrapping one character per line; on narrow screens the table scrolls sideways. Right-to-left names display correctly.

## [0.1.0] - 2026-11-15

First public preview. A complete alternative WebUI for qBittorrent 5.0 or newer: static files only, served by qBittorrent itself, installed by extracting a folder and pointing qBittorrent at it.

### Added

**Install and packaging**
- One archive, `torvia.zip`, containing a single `torvia` folder (`public` for the sign-in page, `private` for the app). Extract it into the qBittorrent folder, tick *Use alternative WebUI*, set *Files location* to that folder. `INSTALL.txt` inside the archive covers Windows, macOS, Linux, Docker, Portainer and NAS setups, updating, and going back to the stock WebUI.
- A stable download link (`/releases/latest/download/torvia.zip`), `SHA256SUMS.txt`, and a ready-made `docker/compose.yml` that installs Torvia next to qBittorrent.
- Every archive is installed into a fresh qBittorrent and verified by CI before it is published.

**Looks**
- Three styles, each in light and dark (or following the system): **Graphite** (sidebar and side details), **Paper** (desktop toolbar, bottom details) and **Signal** (query-first console with grouped rows). Choose them in *Settings → Appearance*, from the Appearance button, from the command palette, or on the sign-in page.
- File-type icons by extension (Material Icon Theme), UI icons from Hugeicons.

**Torrent list**
- Virtualised table that stays fast with large libraries; sorting, multi-select (click, Ctrl/⌘-click, Shift-click) and full keyboard navigation.
- Status views, categories and tags with live counts; a query language (`state:seeding cat:movies size:>1GB -tag:archive`) in every search box, with chips, autocomplete and saved views in Signal.
- Column chooser (show, hide and reorder, 8 extra optional columns), row density (compact, comfortable, spacious) and saved table layouts.
- Live connection status with automatic recovery when qBittorrent becomes unreachable.

**Torrent actions**
- Start, stop, force start, recheck, reannounce, remove (deleting files is opt-in and clearly marked), category, tags, location, rename, queue order, per-torrent speed limits, sequential download, first/last piece priority, super seeding, automatic torrent management, copy name, hash or magnet link.
- Available from the right-click menu, the selection bar, single-key shortcuts and the command palette (Ctrl/⌘ K). Every action reports success, or qBittorrent's own reason for failing.
- Add torrents from magnet links, URLs or `.torrent` files with the dialog (`N`), drag and drop, or by pasting a magnet link.

**Details**
- Overview, **Files** (folder tree, per-file and per-folder priority, rename), **Trackers**, **Peers** and **Statistics** (progress, ratio, availability, live speed, swarm) tabs.

**Pages**
- **Statistics** with live speed charts, totals, global ratio, torrents by status, library by category and share-ratio distribution.
- **Search** (qBittorrent search plugins), **RSS** (feeds, articles, auto-download rules), **Create torrent**, and **Logs** (filter by level, search, download).
- **Settings**: about 40 qBittorrent preferences in searchable sections (hidden when your version doesn't report them), category and tag management, global and alternative speed limits, and opt-in download-completion notifications.

**Quality**
- Tested end to end against real qBittorrent 5.0.5, 5.1.4, 5.2.0 and 5.3.0 in CI.
- Automated WCAG 2.2 AA audit across every screen, dialog and menu in all six style and mode combinations, plus a contrast test on every colour pairing. A manual checklist is in `docs/accessibility.md`.
- Strict Content-Security-Policy, no external requests, no analytics. The web app manifest makes Torvia installable from supporting browsers.
- 13 architecture decision records in `docs/adr/`.

### Known limitations
- English only; translations are planned (see `docs/adr/0011-i18n-deferred.md`).
- No offline mode and no service worker, by design (`docs/adr/0012-pwa-without-service-worker.md`).
- Search needs Python and at least one search plugin installed in qBittorrent; Create torrent needs a qBittorrent version that exposes the torrent creator API. Both were only exercised against test servers without real plugins or large sources.
- The phone layout is usable but basic (the section bar and status bar scroll or wrap on narrow screens).
- Opening or downloading a torrent's files from the browser is not supported.
- Speed history charts start when the page opens; qBittorrent does not provide history.
- System notifications need HTTPS or localhost; over plain HTTP only in-page messages are available.

[Unreleased]: https://github.com/SamerBerjawi/torvia/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/SamerBerjawi/torvia/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/SamerBerjawi/torvia/releases/tag/v0.1.0
