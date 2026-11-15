// Seeds a throwaway qBittorrent (started by run.sh) with the sample torrents and captures README screenshots.
//   node scripts/screenshots/capture.mjs <sample-dir> <out-dir>
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from '@playwright/test'

const [sampleDir, outDir] = process.argv.slice(2)
const BASE = process.env['TORVIA_E2E_URL'] ?? 'http://localhost:8080'
const PASSWORD = 'torvia-e2e-password' // throwaway container only
const manifest = JSON.parse(readFileSync(join(sampleDir, 'manifest.json'), 'utf8'))

// ── seed through the real WebAPI ──────────────────────────────────────────────
const login = await fetch(`${BASE}/api/v2/auth/login`, { method: 'POST', body: new URLSearchParams({ username: 'admin', password: PASSWORD }) })
const cookie = (login.headers.get('set-cookie') ?? '').split(';')[0]
const api = (path, body) => fetch(`${BASE}/api/v2/${path}`, { method: 'POST', body, headers: { cookie, origin: BASE, referer: `${BASE}/` } })
for (const c of [...new Set(manifest.map((m) => m.category))]) await api('torrents/createCategory', new URLSearchParams({ category: c, savePath: '' }))
for (const m of manifest) {
  const f = new FormData()
  f.append('torrents', new Blob([readFileSync(join(sampleDir, 'torrents', m.file))]), m.file)
  f.append('savepath', '/downloads'); f.append('category', m.category); f.append('tags', m.tags.join(','))
  f.append('stopped', String(m.stopped)); f.append('paused', String(m.stopped)); f.append('autoTMM', 'false')
  const r = await api('torrents/add', f)
  if (!r.ok) throw new Error(`add ${m.name}: ${r.status} ${await r.text()}`)
}
// No queueing, so every sample torrent runs; stopped ones are not verified on add, so ask for it.
await api('app/setPreferences', new URLSearchParams({ json: JSON.stringify({ queueing_enabled: false }) }))
const info = async () => (await fetch(`${BASE}/api/v2/torrents/info`, { headers: { cookie } })).json()
const stoppedHashes = (await info()).filter((t) => manifest.find((m) => m.name === t.name)?.stopped).map((t) => t.hash)
if (stoppedHashes.length) await api('torrents/recheck', new URLSearchParams({ hashes: stoppedHashes.join('|') }))
// Wait until every torrent shows its true, settled state (verified progress; complete ones seeding).
const settled = (list) => list.length === manifest.length && manifest.every((m) => {
  const t = list.find((x) => x.name === m.name)
  if (!t || /checking|allocating|metaDL|moving|queued/.test(t.state)) return false
  if (m.missing) return true
  const want = m.present / m.total
  if (Math.abs(t.progress - want) > 0.02) return false
  return want < 1 || /UP$|uploading/.test(t.state)
})
for (let i = 0; i < 120; i++) { if (settled(await info())) break; await new Promise((r) => setTimeout(r, 1000)) }
await new Promise((r) => setTimeout(r, 3000))
const states = await info()
console.log(states.map((t) => `${t.state.padEnd(12)} ${(t.progress * 100).toFixed(0).padStart(3)}%  ${t.name}`).join('\n'))

// ── capture ───────────────────────────────────────────────────────────────────
const browser = await chromium.launch()
async function session(skin, mode, viewport, scale = 1) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: scale })
  await ctx.addInitScript(([s, m]) => { if (!localStorage.getItem('torvia.appearance')) localStorage.setItem('torvia.appearance', JSON.stringify({ skin: s, mode: m })) }, [skin, mode])
  const page = await ctx.newPage()
  await page.goto(BASE)
  await page.getByLabel('Username').fill('admin'); await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByRole('grid', { name: 'Torrents' }).waitFor()
  await page.getByRole('row').filter({ hasText: 'Sintel' }).first().waitFor()
  await page.waitForTimeout(1500) // let sync settle and fonts load
  return { page, ctx }
}
const shot = (page, name, opts = {}) => page.screenshot({ path: join(outDir, name), ...opts })
const rowOf = (page, text) => page.getByRole('grid', { name: 'Torrents' }).getByRole('row').filter({ hasText: text }).first()

{ // Graphite dark: list + details overview
  const { page, ctx } = await session('graphite', 'dark', { width: 1440, height: 900 })
  await rowOf(page, 'Sintel').click(); await page.keyboard.press('Enter')
  await page.getByRole('complementary', { name: 'Torrent details' }).waitFor()
  await page.waitForTimeout(500); await shot(page, 'graphite-dark.png'); await ctx.close()
}
{ // Paper light: Files tab on the multi-file torrent
  const { page, ctx } = await session('paper', 'light', { width: 1440, height: 900 })
  await rowOf(page, 'Open.Movie.Shorts').click(); await page.keyboard.press('Enter')
  const d = page.getByRole('complementary', { name: 'Torrent details' })
  await d.getByRole('tab', { name: 'Files' }).click(); await page.getByRole('button', { name: /Collapse Subs/ }).click().catch(() => {})
  await page.waitForTimeout(800); await shot(page, 'paper-light.png'); await ctx.close()
}
{ // Signal dark: query bar
  const { page, ctx } = await session('signal', 'dark', { width: 1440, height: 900 })
  const q = page.getByRole('combobox', { name: 'Query torrents' })
  await q.click(); await q.pressSequentially('state:seeding size:>1GB ', { delay: 20 }); await page.keyboard.press('Enter')
  await q.pressSequentially('-cat:books', { delay: 20 }); await page.keyboard.press('Enter')
  await rowOf(page, 'Sintel').click()
  await page.waitForTimeout(900); await shot(page, 'signal-dark.png'); await ctx.close()
}
{ // Statistics, Graphite light
  const { page, ctx } = await session('graphite', 'light', { width: 1440, height: 900 })
  await page.goto(`${BASE}/#/statistics`); await page.waitForTimeout(2500); await shot(page, 'statistics-graphite-light.png'); await ctx.close()
}
{ // Settings → Appearance, Paper dark
  const { page, ctx } = await session('paper', 'dark', { width: 1440, height: 900 })
  await page.goto(`${BASE}/#/settings`); await page.locator('.appearance-pick').waitFor(); await page.waitForTimeout(600); await shot(page, 'settings-paper-dark.png'); await ctx.close()
}
{ // Command palette, Signal light
  const { page, ctx } = await session('signal', 'light', { width: 1440, height: 900 })
  await page.keyboard.press('ControlOrMeta+k'); await page.keyboard.type('speed'); await page.waitForTimeout(500); await shot(page, 'palette-signal-light.png'); await ctx.close()
}
await browser.close()
console.log('screenshots written to', outDir)
