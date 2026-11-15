# 0002 — Hash routing

**Context.** qBittorrent serves files by path with no SPA fallback; a deep link such as `/statistics` would 404 on reload.

**Decision.** Routes live in the hash (`#/statistics`, `#/settings`, …) parsed by `app/router.ts`. Full-page routes render in the layouts’ `page` slot and are lazy-loaded.

**Consequences.** Reload and bookmarks work with no server cooperation and under any base path. Query-like state (filters) is not yet in the URL.
