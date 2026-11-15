# CLAUDE.md — Torvia

Alternative WebUI for qBittorrent. Static build only; **no backend**. Verify with `pnpm check` before finishing any change.

## Layers (never import upward)
- `src/api/`    typed fetch transport + endpoint helpers. No React.
- `src/sync/`   `sync/maindata` engine: `reconcile.ts` (pure reducer: torrents, categories, tags, server state), `connection.ts` (pure state machine), `history.ts` (speed samples), `engine.ts` (side effects). No React.
- `src/domain/` pure logic: `files.ts` (file tree), `filters.ts` (status views), `query.ts` (query language), `sort.ts`, `fileKind.ts` (extension → file kind), `format.ts`, `status.ts`. No React.
- `src/ui/`     `theme.ts` (skin × mode, no React), `tokens.css` (all colours/fonts), `app.css`, `login.css`.
- `src/app/`    React. `store.ts` (engine snapshot), `uiStore.ts` (zustand: filters, sort, selection, details), `useTorrentView.ts` (derived rows/groups/counts), `router.ts` (hash routes: `#/`, `#/statistics`, `#/settings`), `columns.tsx` (per-skin column sets), `components/`, `layouts/` (one per skin), `charts/` (lazy-loaded: `Charts.tsx` wrappers, `StatisticsView`, `TorrentStats`).
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
