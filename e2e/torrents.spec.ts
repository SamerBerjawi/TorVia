import { expect, test } from '@playwright/test'
import { fakeMagnet, fakeTorrentFile, setAppearance, signIn, trackErrors } from './helpers'

test.describe.configure({ mode: 'serial' })

test('rejects a wrong password with a clear message', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Username').fill('admin')
  await page.getByLabel('Password').fill('definitely-wrong')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('alert')).toHaveText(/incorrect username or password/i)
})

test('add, organise, stop and remove a torrent end to end', async ({ page }) => {
  const errors = trackErrors(page)
  await setAppearance(page, 'graphite')
  await signIn(page)
  const stamp = Date.now()
  const name = `torvia-e2e-${stamp}.iso`
  const category = `e2e-cat-${stamp}`

  // Add via the dialog (keyboard shortcut N), stopped, with a tag.
  await page.keyboard.press('n')
  const add = page.getByRole('dialog', { name: 'Add torrents' })
  await add.getByLabel(/magnet links or urls/i).fill(fakeMagnet(name))
  await add.getByLabel('Start torrent').uncheck()
  await add.getByLabel(/tags/i).fill('e2e')
  await add.getByRole('button', { name: /add stopped/i }).click()
  const row = page.getByRole('grid', { name: 'Torrents' }).getByRole('row').filter({ hasText: name })
  await expect(row).toBeVisible({ timeout: 15_000 })

  // New category through the category dialog.
  await row.click()
  await page.keyboard.press('c')
  const cat = page.getByRole('dialog', { name: 'Set category' })
  await cat.getByLabel('New category…').check()
  await cat.getByLabel('Name').fill(category)
  await cat.getByRole('button', { name: 'Apply' }).click()
  await expect(page.getByRole('button', { name: new RegExp(`^${category}`) })).toBeVisible({ timeout: 10_000 })
  await expect(row).toContainText(category)

  // Start then stop through the context menu; toasts confirm each.
  await row.click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Start', exact: true }).click()
  await expect(page.getByText(/started 1 torrent/i)).toBeVisible()
  await row.click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Stop', exact: true }).click()
  await expect(page.getByText(/stopped 1 torrent/i)).toBeVisible()
  await expect(row).toContainText('Stopped', { timeout: 10_000 })

  // Remove (without files) with confirmation.
  await row.click()
  await page.keyboard.press('Delete')
  const del = page.getByRole('alertdialog', { name: /remove 1 torrent/i })
  await expect(del.getByLabel(/also delete downloaded files/i)).not.toBeChecked()
  await del.getByRole('button', { name: 'Remove', exact: true }).click()
  await expect(row).toHaveCount(0, { timeout: 10_000 })

  expect(errors).toEqual([])
})

test('command palette toggles alternative speed limits', async ({ page }) => {
  await signIn(page)
  const toggle = page.locator('.altspeed')
  const before = await toggle.getAttribute('aria-pressed')
  await page.keyboard.press('Control+k')
  await page.getByRole('combobox').fill('alternative speed')
  await page.keyboard.press('Enter')
  await expect(toggle).not.toHaveAttribute('aria-pressed', before ?? 'false', { timeout: 10_000 })
  // restore
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', before ?? 'false', { timeout: 10_000 })
})

for (const skin of ['graphite', 'paper', 'signal'] as const) {
  test(`${skin}: torrents and statistics render without errors`, async ({ page }) => {
    const errors = trackErrors(page)
    await setAppearance(page, skin, skin === 'paper' ? 'light' : 'dark')
    await signIn(page)
    await page.goto('/#/statistics')
    await expect(page.getByRole('region', { name: 'Torrents by status' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Download speed' })).toBeVisible()
    expect(errors).toEqual([])
  })
}

test('details tabs load trackers, peers and files without errors', async ({ page }) => {
  const errors = trackErrors(page)
  await setAppearance(page, 'graphite')
  await signIn(page)
  const name = `torvia-e2e-tabs-${Date.now()}.iso`
  await page.keyboard.press('n')
  const add = page.getByRole('dialog', { name: 'Add torrents' })
  await add.getByLabel(/magnet links or urls/i).fill(fakeMagnet(name))
  await add.getByLabel('Start torrent').uncheck()
  await add.getByRole('button', { name: /add stopped/i }).click()
  const row = page.getByRole('grid', { name: 'Torrents' }).getByRole('row').filter({ hasText: name })
  await expect(row).toBeVisible({ timeout: 15_000 })
  await row.click()
  await page.getByRole('button', { name: 'Show details' }).click()
  const details = page.getByRole('complementary', { name: 'Torrent details' })
  for (const tab of ['Trackers', 'Peers', 'Files']) {
    await details.getByRole('tab', { name: tab }).click()
    const panel = details.getByRole('tabpanel')
    // A magnet without metadata has no file list: a table or a visible explanation are both valid.
    await expect(panel.locator('table, p')).not.toHaveCount(0, { timeout: 10_000 })
    await expect(panel).not.toContainText('Loading…', { timeout: 10_000 })
  }
  // cleanup
  await row.click()
  await page.keyboard.press('Delete')
  await page.getByRole('alertdialog').getByRole('button', { name: /^remove/i }).click()
  await expect(row).toHaveCount(0, { timeout: 10_000 })
  expect(errors).toEqual([])
})

test('files tab: tree, folder priority and rename on a real torrent', async ({ page }) => {
  const errors = trackErrors(page)
  await setAppearance(page, 'graphite')
  await signIn(page)
  const root = `torvia-tree-${Date.now()}`
  await page.keyboard.press('n')
  const add = page.getByRole('dialog', { name: 'Add torrents' })
  await add.locator('input[type=file]').setInputFiles(fakeTorrentFile(root, { 'extras/notes.txt': 2000, 'extras/cover.jpg': 5000, 'movie.mkv': 40000 }))
  await add.getByLabel('Start torrent').uncheck()
  await add.getByRole('button', { name: /add stopped/i }).click()
  const row = page.getByRole('grid', { name: 'Torrents' }).getByRole('row').filter({ hasText: root })
  await expect(row).toBeVisible({ timeout: 15_000 })
  await row.click()
  await page.getByRole('button', { name: 'Show details' }).click()
  const details = page.getByRole('complementary', { name: 'Torrent details' })
  await details.getByRole('tab', { name: 'Files' }).click()
  const tree = details.getByRole('tabpanel')
  await expect(tree.getByText('movie.mkv')).toBeVisible()
  // Collapse and expand the folder.
  await tree.getByRole('button', { name: 'Collapse extras' }).click()
  await expect(tree.getByText('notes.txt')).toHaveCount(0)
  await tree.getByRole('button', { name: 'Expand extras' }).click()
  // Skip the whole folder: both children follow.
  await tree.getByLabel('Priority for extras').selectOption('0')
  await expect(tree.getByLabel('Priority for notes.txt')).toHaveValue('0', { timeout: 10_000 })
  await expect(tree.getByLabel('Priority for movie.mkv')).toHaveValue('1')
  // Rename a file.
  await tree.getByRole('button', { name: 'Rename notes.txt' }).click()
  await tree.getByLabel('New name for notes.txt').fill('readme.txt')
  await page.keyboard.press('Enter')
  await expect(tree.getByText('readme.txt')).toBeVisible({ timeout: 10_000 })
  // cleanup
  await row.click()
  await page.keyboard.press('Delete')
  await page.getByRole('alertdialog').getByRole('button', { name: /^remove/i }).click()
  await expect(row).toHaveCount(0, { timeout: 10_000 })
  expect(errors).toEqual([])
})

test('settings: search, validate, save and persist a preference', async ({ page }) => {
  const errors = trackErrors(page)
  await setAppearance(page, 'graphite')
  await signIn(page)
  await page.getByRole('link', { name: 'Settings' }).click()
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible()
  // Search narrows the list.
  await page.getByLabel('Search settings').fill('turtle')
  await expect(page.getByLabel('Alternative download limit')).toBeVisible()
  await expect(page.getByLabel('Listening port')).toHaveCount(0)
  await page.getByLabel('Search settings').fill('')
  // Validation blocks saving.
  const port = page.getByLabel('Listening port')
  const original = await port.inputValue()
  await port.fill('70000')
  await expect(page.getByText('At most 65535')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled()
  await port.fill(original)
  // Save a real change and see it persist across a reload.
  const limit = page.getByLabel(/^Download limit/)
  await limit.fill('750')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Saved 1 setting')).toBeVisible()
  await page.reload()
  await expect(page.getByLabel(/^Download limit/)).toHaveValue('750')
  // Restore.
  await page.getByLabel(/^Download limit/).fill('0')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Saved 1 setting')).toBeVisible()
  expect(errors).toEqual([])
})
