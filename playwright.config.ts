import { defineConfig } from '@playwright/test'

/**
 * End-to-end tests against a REAL qBittorrent serving the built `dist/torvia` as its alternative
 * WebUI (see e2e/run-qbt.sh). Never against a mock: these tests exist to catch server behaviour.
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['github'], ['list']] : 'list',
  use: {
    baseURL: process.env['TORVIA_E2E_URL'] ?? 'http://localhost:8080',
    trace: 'off',
    viewport: { width: 1440, height: 900 },
  },
})
