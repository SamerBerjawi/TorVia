import { expect, type Page } from '@playwright/test'

export const PASSWORD = 'torvia-e2e-password' // matches e2e/qbt-config.mjs (test container only)

export async function setAppearance(page: Page, skin: 'graphite' | 'paper' | 'signal', mode: 'light' | 'dark' = 'dark') {
  // The update check is the only request Torvia makes outside qBittorrent. By default tests see "up to date" (a context-level
  // route, so a test's own page.route() takes priority); keeps runs offline-safe and free of unrelated console errors.
  await page.context().route('https://api.github.com/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ tag_name: 'v0.0.1', html_url: 'https://github.com/SamerBerjawi/torvia/releases/tag/v0.0.1', draft: false, prerelease: false }) }))
  await page.addInitScript(([s, m]) => localStorage.setItem('torvia.appearance', JSON.stringify({ skin: s, mode: m })), [skin, mode] as const)
}

/** Signs in through Torvia's own login page (served from public/ by qBittorrent). */
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

const bstr = (s: string) => `${Buffer.byteLength(s)}:${s}`
/** Minimal multi-file .torrent (bencoded by hand). Piece hashes are junk: fine for listing, never downloaded. */
export function fakeTorrentFile(root: string, files: Record<string, number>): { name: string; mimeType: string; buffer: Buffer } {
  const total = Object.values(files).reduce((a, b) => a + b, 0)
  const pieceLen = 16384
  const pieces = Buffer.alloc(Math.ceil(total / pieceLen) * 20, 7)
  const list = Object.entries(files).sort(([a], [b]) => a.localeCompare(b)).map(([p, len]) => `d6:lengthi${len}e4:pathl${p.split('/').map(bstr).join('')}ee`).join('')
  const head = `d4:infod5:filesl${list}e4:name${bstr(root)}12:piece lengthi${pieceLen}e6:pieces${pieces.length}:`
  return { name: `${root}.torrent`, mimeType: 'application/x-bittorrent', buffer: Buffer.concat([Buffer.from(head), pieces, Buffer.from('ee')]) }
}
