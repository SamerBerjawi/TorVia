# CLAUDE.md — Nuvora

Alternative WebUI for qBittorrent. Static build only; **no backend**. Verify with `pnpm check` before finishing any change.

## Layers (never import upward)
- `src/api/`    typed fetch transport + endpoint helpers. No React.
- `src/sync/`   `sync/maindata` engine: `reconcile.ts` (pure reducer), `connection.ts` (pure state machine), `engine.ts` (side effects). No React.
- `src/domain/` pure formatting / status mapping. No React.
- `src/app/`    React UI + `store.ts` (`useSyncExternalStore` over the engine).
- `src/entries/login` → built to `dist/nuvora/public`; `src/entries/app` → `dist/nuvora/private`.
- `src/ui/`     design tokens (`tokens.css`) — use semantic tokens, never raw colours.

## qBittorrent constraints (verified in qBittorrent `webapplication.cpp`)
- Anonymous requests get `public/`, authenticated get `private/` (fallback `public/`). No SPA fallback → hash routing for any future routes.
- Server rewrites `${LANG}`, `${CACHEID}`, `QBT_TR(` in every text file it serves → `scripts/guard-package.mjs` fails the build if present. Never write those literals in source (including template strings).
- Symlinks forbidden; per-file limit 10 MiB; JS/CSS cached 12 h → keep content-hashed filenames.
- No CSP is sent for alt UIs → CSP lives in each `index.html`. No inline scripts; keep `style-src 'self'`.
- Same-origin relative URLs only (`api/v2/...`, `base: './'`) so reverse-proxy sub-paths work.
- Bad login: WebAPI < 2.14 → 200 + body `Fails.`; ≥ 2.14 → 401; 403 = IP banned.
- 5.x renamed `paused*` → `stopped*` states; keep both in `domain/status.ts`.

## Rules
- Strict TS (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`). No `any`.
- No fabricated data in production code; test fixtures stay in `*.test.ts`.
- No silent failures; destructive actions need explicit confirmation (none exist yet).
- Add a test for any change to `reconcile`, `connection`, `format` or `status`.
