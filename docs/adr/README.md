# Architecture decision records

Short records of decisions that are costly to reverse. Format: context, decision, consequences. Add a new file (next number) instead of editing history; supersede explicitly.

| # | Decision |
|---|----------|
| [0001](0001-static-assets-only.md) | Static assets only, served by qBittorrent’s alternative WebUI |
| [0002](0002-hash-routing.md) | Hash routing |
| [0003](0003-sync-engine.md) | Pure reducers + one polling engine |
| [0004](0004-skins-and-tokens.md) | Three skins on semantic tokens |
| [0005](0005-vendored-charts.md) | Vendored Bklit charts, lazy-loaded |
| [0006](0006-icons.md) | Hugeicons for UI, Material Icon Theme for files |
| [0007](0007-base-ui-and-csp.md) | Base UI primitives under a strict CSP |
| [0008](0008-real-qbittorrent-e2e.md) | E2E against real qBittorrent |
| [0009](0009-device-local-preferences.md) | Device-local preferences in localStorage |
| [0010](0010-accessibility.md) | Accessibility: automated gates plus a manual checklist |
| [0011](0011-i18n-deferred.md) | Internationalisation deferred |
| [0012](0012-pwa-without-service-worker.md) | Installable, but no service worker |
| [0013](0013-completion-notifications.md) | Opt-in completion notifications |
