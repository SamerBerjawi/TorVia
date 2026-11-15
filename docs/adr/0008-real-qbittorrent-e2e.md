# 0008 — E2E against real qBittorrent

**Context.** A mock server hid a critical bug: qBittorrent 5.x answers a successful login with `204` and an empty body.

**Decision.** Playwright tests run against a real `qbittorrent-nox` container serving `dist/torvia` as its alternative WebUI. CI runs 5.0, 5.1, 5.2 and latest. Mocks are not used for these tests.

**Consequences.** Slower than mocks, but catches version differences. Test credentials exist only inside the throwaway container.
