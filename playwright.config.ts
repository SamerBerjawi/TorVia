import { defineConfig } from '@playwright/test'

/**
 * End-to-end tests against a REAL qBittorrent serving the built `dist/torvia` as its alternative
 * WebUI (see e2e/run-qbt.sh). Never against a mock: these tests exist to catch server behaviour.
 */
export default defineConfig({
  testDir: 'e2e',
  // The axe audit walks every screen in six themes (~15 min), so it is opt-in: `pnpm e2e:a11y`.
  testMatch: process.env['A11Y'] ? /a11y\.spec\.ts/ : /^(?!.*a11y).*\.spec\.ts$/,
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['github'], ['list']] : 'list',
  use: {
    baseURL: process.env['TORVIA_E2E_URL'] ?? 'http://localhost:8080',
    trace: 'off',
    // Without this a missing control makes click() wait for the whole test timeout.
    actionTimeout: 15_000,
    viewport: { width: 1440, height: 900 },
  },
})
