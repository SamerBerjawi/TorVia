import { expect, type Page } from '@playwright/test'

export const PASSWORD = 'nuvora-e2e-password' // matches e2e/qbt-config.mjs (test container only)

export async function setAppearance(page: Page, skin: 'graphite' | 'paper' | 'signal', mode: 'light' | 'dark' = 'dark') {
  await page.addInitScript(([s, m]) => localStorage.setItem('nuvora.appearance', JSON.stringify({ skin: s, mode: m })), [skin, mode] as const)
}

/** Signs in through Nuvora's own login page (served from public/ by qBittorrent). */
export async function signIn(page: Page) {
  await page.goto('/')
  await page.getByLabel('Username').fill('admin')
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('grid', { name: 'Torrents' })).toBeVisible()
}

/** Collects console errors / CSP violations so tests can assert none happened. */
export function trackErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error' || /Content Security Policy/i.test(m.text())) errors.push(m.text())
  })
  return errors
}

/** A syntactically valid magnet with a unique fake info-hash; qBittorrent keeps it in "metadata" state offline. */
export function fakeMagnet(name: string): string {
  const hex = [...crypto.getRandomValues(new Uint8Array(20))].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `magnet:?xt=urn:btih:${hex}&dn=${encodeURIComponent(name)}`
}
