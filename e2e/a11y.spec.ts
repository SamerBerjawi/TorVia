import AxeBuilder from '@axe-core/playwright'
import { appendFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { fakeMagnet, setAppearance, signIn } from './helpers'

/** WCAG 2.2 AA automated audit of every screen in every skin and mode. Automated checks catch roughly a third of issues: see docs/accessibility.md for the manual checklist. */
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function audit(page: Page, where: string) {
  // Toasts fade in and out; wait until none is on screen so we never sample one mid-fade.
  await page.locator('.toast').first().waitFor({ state: 'detached', timeout: 10_000 }).catch(() => undefined)
  // Never sample mid-transition (fading toasts and menus have transient, meaningless contrast).
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))))
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  const summary = violations.map((v) => `${v.id} (${v.impact}) ×${v.nodes.length}: ${v.help}\n    ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join('\n    ')}`)
  // A report of every finding (set A11Y_REPORT=path) makes triage faster than stopping at the first failure.
  if (process.env['A11Y_REPORT']) for (const v of violations) for (const n of v.nodes) appendFileSync(process.env['A11Y_REPORT'], `${v.id}\t${v.impact}\t${where}\t${n.target.join(' ')}\t${(n.failureSummary ?? '').split('\n').slice(1, 2).join(' ').trim()}\n`)
  expect.soft(summary, `${where}\n${summary.join('\n')}`).toEqual([])
}

const SKINS = ['graphite', 'paper', 'signal'] as const
const MODES = ['light', 'dark'] as const

test.describe.configure({ mode: 'default' })
test.setTimeout(300_000)
/** Escape, then let close animations finish so axe never samples a half-faded overlay. */
const dismiss = async (page: Page) => { await page.keyboard.press('Escape'); await page.waitForTimeout(450) }
for (const skin of SKINS) {
  for (const mode of MODES) {
    test(`a11y: ${skin} ${mode}`, async ({ page }) => {
      await setAppearance(page, skin, mode)
      await signIn(page)
      // One torrent so rows, selection and details are audited with real content.
      await page.keyboard.press('n')
      const add = page.getByRole('dialog', { name: 'Add torrents' })
      await audit(page, `${skin}/${mode} add dialog`)
      await add.getByLabel(/magnet links or urls/i).fill(fakeMagnet(`a11y-${skin}-${mode}.iso`))
      await add.getByLabel('Start torrent').uncheck()
      await add.getByRole('button', { name: /add stopped/i }).click()
      const row = page.getByRole('grid', { name: 'Torrents' }).getByRole('row').filter({ hasText: `a11y-${skin}-${mode}` })
      await expect(row).toBeVisible({ timeout: 15_000 })
      await audit(page, `${skin}/${mode} torrent list`)

      await row.click()
      // Graphite has a toolbar toggle; Paper and Signal open details with Enter on the focused row.
      const toggle = page.getByRole('button', { name: 'Show details' })
      if (await toggle.count()) await toggle.click()
      else await page.keyboard.press('Enter')
      const details = page.getByRole('complementary', { name: 'Torrent details' })
      for (const tab of ['Overview', 'Files', 'Trackers', 'Peers', 'Statistics']) {
        await details.getByRole('tab', { name: tab }).click()
        await page.waitForTimeout(400)
        await audit(page, `${skin}/${mode} details ${tab}`)
      }

      await dismiss(page)
      await page.getByRole('grid', { name: 'Torrents' }).getByRole('button', { name: 'Table options' }).click()
      await audit(page, `${skin}/${mode} table options`)
      await dismiss(page)

      await page.keyboard.press('ControlOrMeta+k')
      await audit(page, `${skin}/${mode} command palette`)
      await dismiss(page)

      await row.click({ button: 'right' })
      await audit(page, `${skin}/${mode} context menu`)
      await dismiss(page)

      await page.getByRole('button', { name: /^Global speed limits/ }).click().catch(async () => { await page.keyboard.press('ControlOrMeta+k') })
      await audit(page, `${skin}/${mode} speed limits / palette`)
      await dismiss(page)

      await page.goto('/#/statistics')
      await page.waitForTimeout(800)
      await audit(page, `${skin}/${mode} statistics`)
      await page.goto('/#/settings')
      await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible()
      await audit(page, `${skin}/${mode} settings`)

      // cleanup
      await page.goto('/#/')
      await row.click()
      await page.keyboard.press('Delete')
      await page.getByRole('alertdialog').getByRole('button', { name: /^remove/i }).click()
      await expect(row).toHaveCount(0, { timeout: 10_000 })
    })
  }
}

// The Search results page only has content when plugins exist; a test qBittorrent has none, so its search endpoints are stubbed.
for (const [skin, mode] of [['signal', 'light'], ['paper', 'dark'], ['graphite', 'light']] as const) {
  test(`a11y: search results with a same-size match, ${skin} ${mode}`, async ({ page }) => {
    const json = (body: unknown) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    await page.route('**/api/v2/search/plugins', (r) => r.fulfill(json([{ name: 's', fullName: 'Sample', enabled: true, supportedCategories: [{ id: 'all', name: 'All' }] }])))
    await page.route('**/api/v2/search/start', (r) => r.fulfill(json({ id: 3 })))
    await page.route('**/api/v2/search/results**', (r) => r.fulfill(json({ status: 'Stopped', total: 2, results: [
      { fileName: 'Sample.Show.2020.1080p', fileUrl: 'magnet:?a', fileSize: 5000, nbSeeders: 9, nbLeechers: 1 },
      { fileName: 'Sample.Show.2020.720p', fileUrl: 'magnet:?b', fileSize: 1234, nbSeeders: -1, nbLeechers: -1 }] })))
    await page.route('**/api/v2/search/stop', (r) => r.fulfill({ status: 200, body: '' }))
    await page.route('**/api/v2/search/delete', (r) => r.fulfill({ status: 200, body: '' }))
    await setAppearance(page, skin, mode)
    await signIn(page)
    await page.goto('/#/search?q=Sample+Show+2020&size=5000')
    await expect(page.getByText('Same size')).toBeVisible({ timeout: 10_000 })
    await page.waitForTimeout(400)
    await audit(page, `${skin}/${mode} search results`)
  })
}
