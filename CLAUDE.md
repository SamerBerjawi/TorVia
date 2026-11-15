# CLAUDE.md — Torvia

Alternative WebUI for qBittorrent. Static build only; **no backend**. Verify with `pnpm check` before finishing any change.

## Layers (never import upward)
- `src/api/`    typed fetch transport + endpoint helpers. No React.
- `src/sync/`   `sync/maindata` engine: `reconcile.ts` (pure reducer: torrents, categories, tags, server state), `connection.ts` (pure state machine), `history.ts` (speed samples), `engine.ts` (side effects). No React.
- `src/domain/` pure logic: `files.ts` (file tree), `filters.ts` (status views), `query.ts` (query language), `sort.ts`, `fileKind.ts` (extension → file kind), `format.ts`, `status.ts`. No React.
- `src/ui/`     `theme.ts` (skin × mode, no React), `tokens.css` (all colours/fonts), `app.css`, `login.css`.
- `src/app/`    React. `store.ts` (engine snapshot), `uiStore.ts` (zustand: filters, sort, selection, details), `useTorrentView.ts` (derived rows/groups/counts), `router.ts` (hash routes, see `ROUTES`: torrents, search, rss, create, logs, statistics, settings), `columns.tsx` (per-skin column sets), `components/`, `layouts/` (one per skin), `charts/` (lazy-loaded: `Charts.tsx` wrappers, `StatisticsView`, `TorrentStats`).
- `src/vendor/bklit/` Bklit UI charts (MIT), **generated** by `scripts/vendor-bklit.mjs` — never edit by hand; import only via `src/app/charts/Charts.tsx`.
- `src/entries/login` → `dist/torvia/public`; `src/entries/app` → `dist/torvia/private`.

## Skins
Three skins — `graphite`, `paper`, `signal` — each with light and dark, selected via `<html data-skin data-mode>`.
- Colours, fonts, row height: **only** in `src/ui/tokens.css` as semantic variables (`--text-3`, `--st-dl`, …). Never hard-code colours in components.
- Layout differences live in `src/app/layouts/*Layout.tsx`; shared behaviour (filtering, sorting, selection, keyboard) must stay in shared components/hooks so all skins stay in sync.
- New UI glyphs: add to `src/app/icons.ts` (Hugeicons Free, stroke rounded) and render with `<Icon>`. Never import `@hugeicons/core-free-icons` elsewhere.
- File-type icons: `domain/fileKind.ts` decides the kind; `scripts/gen-file-icons.mjs` maps kinds to Material Icon Theme and generates `app/fileIcons.generated.ts`; `FileIcon.tsx` renders it. Re-run the script after changing kinds.
- Fonts are self-hosted via @fontsource (no external requests; CSP forbids them).

## Actions, dialogs, feedback
- Every user action is defined once in `src/app/actions/catalogue.ts` (label, icon, shortcut, visibility, enablement, run). The context menu, selection bar, command palette and keyboard shortcuts all render from it — add new actions there, never ad hoc.
- Mutations go through `actions/run.ts` (`run()`): success/error toast + immediate sync refresh. No optimistic UI; sync confirms.
- Dialogs: request via `openDialog()` (`dialogs/dialogStore.ts`); `DialogHost` renders exactly one. Destructive operations use `alert` modals; "delete files" is opt-in and visibly dangerous.
- Version-dependent API behaviour: read flags from `api/capabilities.ts` (`useServerInfo().caps`); never compare versions elsewhere.
- UI primitives: Base UI (`@base-ui/react`). `CSPProvider disableStyleElements` must wrap the app (our CSP forbids inline <style>).

## Testing
- Unit: `pnpm test` (Vitest) — pure logic in api/, sync/, domain/.
- E2E: `pnpm build && pnpm e2e:qbt [tag] && pnpm e2e` — Playwright against a **real** qbittorrent-nox container serving `dist/torvia` as its alternative WebUI. CI runs 5.0, 5.1, 5.2 and latest. Never replace this with a mock; mocks hid a real login bug (5.x returns 204).

## Charts
- Bklit UI components are vendored source (shadcn-style), styled with Tailwind v4 utilities. `src/ui/charts.css` loads Tailwind **theme + utilities only (no preflight)** and maps Bklit's `--chart-*` variables onto skin tokens — charts never get their own colours.
- Chart code is lazy-loaded (`React.lazy`): keep `Charts.tsx` imports out of the main bundle.
- Speed history is client-side only (`sync/history.ts`): it starts when the page opens. Never back-fill or invent samples.
- Quirk: `LiveXAxis` `formatTime` receives **milliseconds** (its docs say seconds).

## qBittorrent constraints (verified in qBittorrent `webapplication.cpp`)
- Anonymous requests get `public/`, authenticated get `private/` (fallback `public/`). No SPA fallback → hash routing for any future routes.
- Server rewrites `${LANG}`, `${CACHEID}`, `QBT_TR(` in every text file it serves → `scripts/guard-package.mjs` fails the build if present. Never write those literals in source (including template strings).
- Symlinks forbidden; per-file limit 10 MiB; JS/CSS cached 12 h → keep content-hashed filenames.
- No CSP is sent for alt UIs → CSP lives in each `index.html`. No inline scripts; keep `style-src 'self'` (React style props are fine).
- Same-origin relative URLs only (`api/v2/...`, `base: './'`) so reverse-proxy sub-paths work.
- Login (verified live on 5.3.0): success = 204 empty body (5.x) or 200 `Ok.`; bad credentials = 401 (≥ 2.14) or 200 `Fails.`; 403 = IP banned. See `api/auth.ts` `interpretLogin`.
- 5.x renamed `paused*` → `stopped*` states; keep both in `domain/status.ts` and `domain/filters.ts`.
- Clipboard API only works in secure contexts (HTTPS/localhost); always handle failure.

## Rules
- Strict TS (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`). No `any`.
- No fabricated data in production code; test fixtures stay in `*.test.ts`.
- No silent failures; destructive actions need explicit confirmation (remove, recheck, delete files).
- No buttons for features that don't work yet.
- Add a test for any change to `src/sync/` or `src/domain/` (stats aggregations live in `domain/stats.ts`).

## Settings
- Categories & tags management lives in `app/settings/LibrarySection.tsx`; name rules are in `domain/labels.ts`.
- `domain/settingsSchema.ts` declares which qBittorrent preferences are exposed (pure, tested); `app/settings/SettingsView.tsx` renders it. Fields the server doesn't report are hidden, never faked. Add a preference by adding one entry to `FIELDS`.
- Web UI port/credentials/certificates are deliberately not editable (lock-out risk). Saves send only changed keys via `app/setPreferences`.
- Full-page routes render through the layouts' `page` slot (lazy-loaded).

## Table columns, density, layouts
- Each skin defines its column set in `app/columns.tsx` (`locked`, `defaultHidden`, `hideInChooser` flags). `domain/columns.ts` resolves the user's order/visibility (pure, tested); `app/columnPrefs.ts` stores it per skin in localStorage; `ColumnChooser` is the UI. New columns: add to `EXTRA` (and a sort key in `domain/sort.ts` if sortable).

## Global speed limits
- `dialogs/GlobalSpeedDialog.tsx` edits the normal and alternative limits via `app/setPreferences` (bytes/s; `domain/rate.ts` handles KiB/s ↔ MiB/s). The status bar button shows the limits in force from sync (`server_state.dl_rate_limit/up_rate_limit`); it is hidden on phones but reachable from the command palette.
- Density (`compact | comfortable | spacious`) shifts each skin's base row height (`domain/layouts.ts` `DENSITY_DELTA`); phones keep tap-sized rows. Saved layouts = columns + sort + density, per skin, validated on load (`parseLayouts`). Stores: `app/tablePrefs.ts`. UI: the "Table options" popover (`ColumnChooser.tsx`).

## Feature views (lazy-loaded pages in the layouts' `page` slot)
- `app/logs` (log/main, incremental `last_known_id`), `app/rss` (feeds, articles, auto-download rules), `app/search` (search plugins; needs Python on the server), `app/creator` (torrentcreator; server-side source path). Pure logic is in `domain/{logs,rss,search,creator}.ts` with tests; API wrappers in `api/`.
- Endpoints that may not exist on older qBittorrent (torrent creator) are probed by calling them: a 404 shows an explanation, never a broken page.
- Notifications: `app/notifications.ts` (opt-in, Settings). PWA: manifest + icons in `public-assets/` (regenerate PNGs with `scripts/gen-icons.mjs`); deliberately **no service worker** (ADR 0012).
- Decisions live in `docs/adr/`; accessibility gates and the manual checklist in `docs/accessibility.md`. Run the axe audit with `pnpm e2e:a11y` (set `A11Y_REPORT=path.tsv` to collect everything).

## Changelog and screenshots
- Every release needs a `## [x.y.z]` section in `CHANGELOG.md` (Keep a Changelog). `scripts/release-notes.mjs` turns it into the GitHub release notes and fails without it; a unit test checks the current `package.json` version has an entry. Add user-visible changes under `## [Unreleased]` as you go.
- README screenshots live in `docs/screenshots/` and come from `bash scripts/screenshots/run.sh` (real qBittorrent in Docker, sample torrents built by `make-sample-data.mjs` with real hashes). Never hand-edit or use mock data; re-run it after visible UI changes.

## Update check
- `app/updates.ts` + `domain/version.ts`: the only request outside qBittorrent (anonymous GitHub releases API, daily, user can disable). The app page CSP allows exactly `https://api.github.com` for it. The running version comes from `package.json` via Vite `define` (`__TORVIA_VERSION__`). E2E stubs only this request (default in `e2e/helpers.ts` `setAppearance`).
