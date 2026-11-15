# 0009 — Device-local preferences in localStorage

**Context.** Skin/mode, column layout, density, saved layouts, saved queries and notification mode are per-user conveniences. qBittorrent’s `clientdata` store (WebAPI ≥ 2.13.1) is capped at 1 MiB and not yet used.

**Decision.** Keep them in `localStorage` (try/catch everywhere; the UI works without it), validated on read (`parseLayouts`, `resolveColumns`).

**Consequences.** Preferences do not follow the user across browsers. Moving to `clientdata` later is a storage swap behind the same functions.
