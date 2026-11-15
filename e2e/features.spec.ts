import { expect, test } from '@playwright/test'
import { fakeMagnet, fakeTorrentFile, setAppearance, signIn, trackErrors } from './helpers'

test.describe.configure({ mode: 'serial' })

test('logs: shows qBittorrent’s log, filters by level and text', async ({ page }) => {
  const errors = trackErrors(page)
  await setAppearance(page, 'graphite')
  await signIn(page)
  await page.getByRole('link', { name: 'Logs' }).click()
  const list = page.getByRole('list', { name: /Log entries/ })
  await expect(list.getByRole('listitem').first()).toBeVisible({ timeout: 15_000 })
  const total = await list.getByRole('listitem').count()
  await page.getByLabel('Search log').fill('zzz-no-such-text-zzz')
  await expect(page.getByText('No entries match.')).toBeVisible()
  await page.getByLabel('Search log').fill('')
  await page.getByRole('group', { name: 'Show levels' }).getByLabel('Normal').uncheck()
  await page.getByRole('group', { name: 'Show levels' }).getByLabel('Info').uncheck()
  await page.getByRole('group', { name: 'Show levels' }).getByLabel('Warning').uncheck()
  await page.getByRole('group', { name: 'Show levels' }).getByLabel('Critical').uncheck()
  await expect(list.getByRole('listitem')).toHaveCount(0)
  await page.getByRole('group', { name: 'Show levels' }).getByLabel('Normal').check()
  await page.getByRole('group', { name: 'Show levels' }).getByLabel('Info').check()
  await page.getByRole('group', { name: 'Show levels' }).getByLabel('Warning').check()
  await page.getByRole('group', { name: 'Show levels' }).getByLabel('Critical').check()
  expect(await list.getByRole('listitem').count()).toBeGreaterThanOrEqual(total)
  expect(errors).toEqual([])
})

test('rss: add and remove a feed, create edit and delete a rule', async ({ page }) => {
  const errors = trackErrors(page)
  await setAppearance(page, 'graphite')
  await signIn(page)
  await page.getByRole('link', { name: 'RSS' }).click()
  const id = Date.now()
  // Feed (the URL is unreachable on purpose: adding must still work, fetching just fails quietly).
  await page.getByLabel('Feed URL').fill(`http://torvia-e2e-${id}.invalid/feed.xml`)
  await page.getByRole('button', { name: 'Add feed' }).click()
  const feed = page.getByRole('list', { name: 'Feeds' }).getByRole('button', { name: new RegExp(`torvia-e2e-${id}`) })
  await expect(feed).toBeVisible({ timeout: 10_000 })
  await feed.click()
  await page.getByRole('button', { name: /^Remove$/ }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Remove feed' }).click()
  await expect(feed).toHaveCount(0, { timeout: 10_000 })
  // Rule
  await page.getByRole('tab', { name: 'Download rules' }).click()
  const rule = `e2e-rule-${id}`
  await page.getByLabel('New rule name').fill(rule)
  await page.getByRole('button', { name: 'Add rule' }).click()
  await page.getByLabel(`${rule}: must contain`).fill('1080p')
  await page.getByRole('button', { name: 'Save rule' }).click()
  await expect(page.getByText(`Saved ${rule}`)).toBeVisible()
  await expect(page.getByText('matches “1080p”')).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: `Delete rule ${rule}` }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete rule' }).click()
  await expect(page.getByLabel(`Enable rule ${rule}`)).toHaveCount(0, { timeout: 10_000 })
  expect(errors).toEqual([])
})

test('search: explains missing plugins instead of failing', async ({ page }) => {
  const errors = trackErrors(page)
  await setAppearance(page, 'graphite')
  await signIn(page)
  await page.getByRole('link', { name: 'Search' }).click()
  // The test container has no Python/plugins: either the explanation or a usable form is correct, never a blank page.
  await expect(page.getByText(/No search plugins are enabled|Search for torrents|Could not load/).first()).toBeVisible({ timeout: 10_000 })
  expect(errors.filter((e) => !/Failed to load resource/.test(e))).toEqual([])
})

test('create torrent: builds a task for a server-side path, or says it is unsupported', async ({ page }) => {
  const errors = trackErrors(page)
  await setAppearance(page, 'graphite')
  await signIn(page)
  await page.getByRole('link', { name: 'Create' }).click()
  await expect(page.getByRole('heading', { name: 'Create torrent', level: 1 })).toBeVisible()
  const unsupported = page.getByText(/no torrent creator|not found/i)
  const path = page.getByLabel('Source path on the server')
  await expect(path.or(unsupported)).toBeVisible({ timeout: 10_000 })
  if (await path.isVisible()) {
    await path.fill('relative/path')
    await expect(page.getByText(/absolute path/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create torrent' })).toBeDisabled()
    await path.fill('/config/qBittorrent/config/qBittorrent.conf')
    await page.getByLabel(/Trackers/).fill('udp://tracker.invalid:6969/announce')
    await page.getByRole('button', { name: 'Create torrent' }).click()
    await expect(page.getByText('Torrent creation started')).toBeVisible()
    const task = page.locator('.create__tasks li').filter({ hasText: 'qBittorrent.conf' }).first()
    await expect(task).toContainText(/Finished|Failed|Running|Queued/, { timeout: 15_000 })
    await task.getByRole('button', { name: /Remove task/ }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Remove task' }).click()
  }
  expect(errors.filter((e) => !/Failed to load resource/.test(e))).toEqual([])
})

test('app is installable: manifest and icons are served to signed-out clients', async ({ request }) => {
  const m = await request.get('/manifest.webmanifest')
  expect(m.ok()).toBe(true)
  const json = await m.json()
  expect(json.name).toBe('Torvia')
  for (const icon of json.icons as { src: string }[]) expect((await request.get(`/${icon.src}`)).ok(), icon.src).toBe(true)
})

test('notification preference persists', async ({ page }) => {
  await setAppearance(page, 'graphite')
  await signIn(page)
  await page.getByRole('link', { name: 'Settings' }).click()
  const select = page.getByLabel(/When a download finishes/)
  await expect(select).toHaveValue('off')
  await select.selectOption('toast')
  await page.reload()
  await expect(page.getByLabel(/When a download finishes/)).toHaveValue('toast')
  await page.getByLabel(/When a download finishes/).selectOption('off')
})

test('style and mode can be chosen from the sign-in page, Settings and the Appearance menu', async ({ page }) => {
  const html = page.locator('html')
  // No setAppearance() here: its init script would reset the choice on every page load, including the reload after sign-in.
  await page.goto('/')
  await page.getByLabel('Style').selectOption('paper')
  await expect(html).toHaveAttribute('data-skin', 'paper')
  await page.getByLabel('Mode').selectOption('light')
  await expect(html).toHaveAttribute('data-mode', 'light')
  await page.getByLabel('Username').fill('admin')
  await page.getByLabel('Password').fill('torvia-e2e-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('grid', { name: 'Torrents' })).toBeVisible()
  await expect(html).toHaveAttribute('data-skin', 'paper') // remembered after sign-in
  await page.getByRole('link', { name: 'Settings' }).click()
  const picker = page.locator('[data-section="appearance"]')
  await picker.getByLabel(/^Signal/).check()
  await expect(html).toHaveAttribute('data-skin', 'signal')
  await picker.getByLabel('Dark').check()
  await expect(html).toHaveAttribute('data-mode', 'dark')
  await page.getByRole('button', { name: 'Appearance' }).click()
  await page.getByRole('dialog', { name: 'Appearance' }).getByLabel(/^Graphite/).click()
  await expect(html).toHaveAttribute('data-skin', 'graphite')
})

const LONG = `برنامج توب شيف جميع المواسم ${'Top.Chef.Season.One.Episode.Name.With.A.Very.Long.Release.Group.Tag.'.repeat(2)}[WEB-DL][720p-1080p-2160p]`

test('files tab: very long names truncate instead of wrapping one character per line', async ({ page }) => {
  const errors = trackErrors(page)
  await setAppearance(page, 'graphite')
  await page.setViewportSize({ width: 1280, height: 800 })
  await signIn(page)
  const root = `torvia-long-${Date.now()}`
  await page.keyboard.press('n')
  const add = page.getByRole('dialog', { name: 'Add torrents' })
  await add.locator('input[type=file]').setInputFiles(fakeTorrentFile(root, { [`${LONG}.mkv`]: 3000, 'short.txt': 100 }))
  await add.getByLabel('Start torrent').uncheck()
  await add.getByRole('button', { name: /add stopped/i }).click()
  const row = page.getByRole('grid', { name: 'Torrents' }).getByRole('row').filter({ hasText: root })
  await expect(row).toBeVisible({ timeout: 15_000 })
  await row.click()
  await page.getByRole('button', { name: 'Show details' }).click()
  const details = page.getByRole('complementary', { name: 'Torrent details' })
  await details.getByRole('tab', { name: 'Files' }).click()
  const label = details.locator('.ftree__label', { hasText: 'Top.Chef.Season' })
  await expect(label).toBeVisible()
  const box = await label.evaluate((el) => ({ h: el.getBoundingClientRect().height, truncated: el.scrollWidth > el.clientWidth }))
  expect(box.h, 'one line, not a tall column of characters').toBeLessThan(30)
  expect(box.truncated).toBe(true)
  await expect(label).toHaveAttribute('title', new RegExp(root))
  await row.click(); await page.keyboard.press('Delete')
  await page.getByRole('alertdialog').getByRole('button', { name: /^remove/i }).click()
  expect(errors).toEqual([])
})

test('paper: the details panel can be resized by dragging or keyboard, and remembers its size', async ({ page }) => {
  const errors = trackErrors(page)
  await setAppearance(page, 'paper', 'light')
  await page.setViewportSize({ width: 1440, height: 900 })
  await signIn(page)
  const name = `a-resize-${Date.now()}.iso`
  await page.keyboard.press('n')
  const add = page.getByRole('dialog', { name: 'Add torrents' })
  await add.getByLabel(/magnet links or urls/i).fill(fakeMagnet(name))
  await add.getByLabel('Start torrent').uncheck()
  await add.getByRole('button', { name: /add stopped/i }).click()
  const row = page.getByRole('grid', { name: 'Torrents' }).getByRole('row').filter({ hasText: name })
  await expect(row).toBeVisible({ timeout: 15_000 })
  await row.click(); await page.keyboard.press('Enter')
  const details = page.getByRole('complementary', { name: 'Torrent details' })
  const sep = page.getByRole('separator', { name: 'Resize details panel' })
  await expect(details).toBeVisible()
  const heightOf = async () => Math.round((await details.boundingBox())!.height)
  const start = await heightOf()
  // Keyboard: Up grows the panel by 24px.
  await sep.focus(); await page.keyboard.press('ArrowUp')
  await expect.poll(heightOf).toBe(start + 24)
  // Pointer drag upwards grows it further.
  const b = (await sep.boundingBox())!
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down()
  await page.mouse.move(b.x + b.width / 2, b.y - 120, { steps: 6 }); await page.mouse.up()
  await expect.poll(heightOf).toBeGreaterThan(start + 100)
  const resized = await heightOf()
  // Remembered across reloads; double-click resets.
  await page.reload()
  await page.getByRole('grid', { name: 'Torrents' }).getByRole('row').filter({ hasText: name }).click(); await page.keyboard.press('Enter')
  await expect.poll(heightOf).toBe(resized)
  await page.getByRole('separator', { name: 'Resize details panel' }).dblclick()
  await expect.poll(heightOf).toBe(300)
  await page.getByRole('grid', { name: 'Torrents' }).getByRole('row').filter({ hasText: name }).click(); await page.keyboard.press('Delete')
  await page.getByRole('alertdialog').getByRole('button', { name: /^remove/i }).click()
  expect(errors).toEqual([])
})

const release = (tag: string) => ({ tag_name: tag, html_url: `https://github.com/SamerBerjawi/torvia/releases/tag/${tag}`, draft: false, prerelease: false })
const stubGitHub = async (page: import('@playwright/test').Page, body: unknown, counter: { n: number }) =>
  page.route('https://api.github.com/**', (route) => { counter.n++; return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) }) })

test('update notice: appears for a newer release, can be dismissed, and checks can be switched off', async ({ page }) => {
  const errors = trackErrors(page)
  const calls = { n: 0 }
  await stubGitHub(page, release('v99.0.0'), calls) // GitHub is the only thing stubbed; qBittorrent stays real
  await setAppearance(page, 'graphite')
  await signIn(page)
  const banner = page.getByRole('status').filter({ hasText: 'Torvia 99.0.0 is available' })
  await expect(banner).toBeVisible({ timeout: 10_000 })
  await expect(banner.getByRole('link')).toHaveAttribute('href', /github\.com\/SamerBerjawi\/torvia\/releases\/tag\/v99\.0\.0/)
  await expect(page.getByRole('grid', { name: 'Torrents' })).toBeVisible() // banner doesn't push the layout off-screen
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1)).toBe(true)
  await banner.getByRole('button', { name: 'Dismiss update notice' }).click()
  await expect(banner).toHaveCount(0)
  await page.reload()
  await page.getByRole('grid', { name: 'Torrents' }).waitFor()
  await expect(page.getByText('Torvia 99.0.0 is available')).toHaveCount(0) // dismissed for that version
  // Checked once, then cached for a day.
  expect(calls.n).toBe(1)
  // Settings: manual check, then turning checks off stops requests and hides notices.
  await page.getByRole('link', { name: 'Settings' }).click()
  const about = page.locator('[data-section="about"]')
  await expect(about).toContainText('Version 0.')
  await about.getByRole('button', { name: 'Check now' }).click()
  await expect(about).toContainText('Torvia 99.0.0 is available')
  expect(calls.n).toBe(2)
  await about.getByRole('switch', { name: /Tell me when a new version/ }).uncheck()
  await expect(about).toContainText('Update checks are off')
  await expect(about.getByRole('button', { name: 'Check now' })).toBeDisabled()
  expect(errors.filter((e) => !/Failed to load resource/.test(e))).toEqual([])
})

test('update notice: stays quiet when up to date and when GitHub is unreachable', async ({ page }) => {
  const calls = { n: 0 }
  await stubGitHub(page, release('v0.0.1'), calls)
  await setAppearance(page, 'graphite')
  await signIn(page)
  await page.getByRole('link', { name: 'Settings' }).click()
  const about = page.locator('[data-section="about"]')
  await about.getByRole('button', { name: 'Check now' }).click()
  await expect(about).toContainText('Up to date')
  await expect(page.getByText(/is available/)).toHaveCount(0)
  await page.unroute('https://api.github.com/**')
  await page.route('https://api.github.com/**', (r) => r.abort('failed'))
  await about.getByRole('button', { name: 'Check now' }).click()
  await expect(about).toContainText('Couldn’t check')
  await expect(page.getByText(/is available/)).toHaveCount(0)
})

test('peers tab: country flags (rendering uses a stubbed peer list; the flag files come from the real server)', async ({ page }) => {
  // A test qBittorrent cannot have peers with public IPs, so the one request that carries peer data is stubbed
  // (same JSON shape as qBittorrent's sync/torrentPeers). Everything else, including serving the flags, is real.
  const peer = (ip: string, country: string, country_code: string, dl = 0) => ({ ip, port: 6881, client: 'qBittorrent/5.0.0', connection: 'BT', country, country_code, dl_speed: dl, up_speed: 0, downloaded: 0, uploaded: 0, progress: 0.5, flags: 'D' })
  const errors = trackErrors(page)
  await setAppearance(page, 'graphite')
  await signIn(page)
  // The flags are static files in the app folder.
  const flag = await page.request.get('/flags/be.svg')
  expect(flag.ok()).toBe(true)
  expect(flag.headers()['content-type']).toMatch(/svg/)
  expect((await page.request.get('/flags/zz-not-a-flag.svg')).ok()).toBe(false)

  const name = `a-flags-${Date.now()}.iso`
  await page.keyboard.press('n')
  const add = page.getByRole('dialog', { name: 'Add torrents' })
  await add.getByLabel(/magnet links or urls/i).fill(fakeMagnet(name))
  await add.getByLabel('Start torrent').uncheck()
  await add.getByRole('button', { name: /add stopped/i }).click()
  const row = page.getByRole('grid', { name: 'Torrents' }).getByRole('row').filter({ hasText: name })
  await expect(row).toBeVisible({ timeout: 15_000 })
  await row.click()
  await page.getByRole('button', { name: 'Show details' }).click()
  const peers = page.getByRole('complementary', { name: 'Torrent details' })

  await page.route('**/api/v2/sync/torrentPeers**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ full_update: true, rid: 1, show_flags: true, peers: {
    '81.164.0.1:6881': peer('81.164.0.1', 'Belgium', 'be', 500),
    '8.8.8.8:6881': peer('8.8.8.8', 'United States', 'us', 100),
    '192.168.1.20:6881': peer('192.168.1.20', '', ''), // private address: no country
    '1.2.3.4:6881': peer('1.2.3.4', 'Nowhere', 'zz'), // no such flag file: must not show a broken image
  } }) }))
  await peers.getByRole('tab', { name: 'Peers' }).click()
  const be = peers.getByRole('row').filter({ hasText: '81.164.0.1' })
  await expect(be).toBeVisible()
  await expect(be.getByText('Belgium')).toBeAttached() // accessible name
  await expect(be.locator('.peerflag')).toHaveAttribute('title', 'Belgium')
  await expect(be.locator('.peerflag img')).toHaveJSProperty('complete', true)
  expect(await be.locator('.peerflag img').evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0)
  await expect(peers.getByRole('row').filter({ hasText: '8.8.8.8' }).getByText('United States')).toBeAttached()
  await expect(peers.getByRole('row').filter({ hasText: '192.168.1.20' }).getByLabel('Unknown country')).toBeVisible()
  await expect(peers.getByRole('row').filter({ hasText: '1.2.3.4' }).locator('.peerflag img')).toHaveCount(0, { timeout: 5000 }) // 404 flag is dropped
  await expect(peers.getByText('No countries reported')).toHaveCount(0)

  // Peers without any country (GeoIP off) get an explanation instead of a column of dashes.
  await page.unroute('**/api/v2/sync/torrentPeers**')
  await page.route('**/api/v2/sync/torrentPeers**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ full_update: true, rid: 1, peers: { '10.0.0.5:6881': peer('10.0.0.5', '', '') } }) }))
  await expect(peers.getByText('No countries reported')).toBeVisible({ timeout: 10_000 })
  await page.unroute('**/api/v2/sync/torrentPeers**')
  await row.click(); await page.keyboard.press('Delete')
  await page.getByRole('alertdialog').getByRole('button', { name: /^remove/i }).click()
  expect(errors.filter((e) => !/Failed to load resource/.test(e))).toEqual([])
})
