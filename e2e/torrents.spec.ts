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
  await expect(page.getByRole('region', { name: 'Unsaved changes' }).getByRole('button', { name: 'Save', exact: true })).toBeDisabled()
  await port.fill(original)
  // Save a real change and see it persist across a reload.
  const limit = page.getByLabel(/^Download limit/)
  await limit.fill('750')
  await page.getByRole('region', { name: 'Unsaved changes' }).getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Saved 1 setting')).toBeVisible()
  await page.reload()
  await expect(page.getByLabel(/^Download limit/)).toHaveValue('750')
  // Restore.
  await page.getByLabel(/^Download limit/).fill('0')
  await page.getByRole('region', { name: 'Unsaved changes' }).getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Saved 1 setting')).toBeVisible()
  expect(errors).toEqual([])
})

test('categories and tags: create, edit and delete from settings', async ({ page }) => {
  const errors = trackErrors(page)
  await setAppearance(page, 'graphite')
  await signIn(page)
  const id = Date.now()
  const cat = `e2e-lib-${id}`
  const tag = `e2e-tag-${id}`
  await page.getByRole('link', { name: 'Settings' }).click()
  // Create
  await page.getByLabel('New category name').fill(cat)
  await page.getByLabel('New category save path').fill('/downloads/e2e')
  await page.getByRole('button', { name: 'Add category' }).click()
  await expect(page.getByLabel(`Save path for ${cat}`)).toHaveValue('/downloads/e2e', { timeout: 10_000 })
  await page.getByLabel('New tags').fill(tag)
  await page.getByRole('button', { name: 'Add tags' }).click()
  await expect(page.getByRole('button', { name: `Delete tag ${tag}` })).toBeVisible({ timeout: 10_000 })
  // Duplicate is rejected before hitting the server
  await page.getByLabel('New category name').fill(cat.toUpperCase())
  await expect(page.getByText('That category already exists')).toBeVisible()
  await page.getByLabel('New category name').fill('')
  // Edit
  await page.getByLabel(`Save path for ${cat}`).fill('/downloads/e2e2')
  await page.getByRole('button', { name: `Save category ${cat}` }).click()
  await expect(page.getByText(`Updated “${cat}”`)).toBeVisible()
  // Delete both (confirmation required)
  await page.getByRole('button', { name: `Delete category ${cat}` }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete category' }).click()
  await expect(page.getByLabel(`Save path for ${cat}`)).toHaveCount(0, { timeout: 10_000 })
  await page.getByRole('button', { name: `Delete tag ${tag}` }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete tag' }).click()
  await expect(page.getByRole('button', { name: `Delete tag ${tag}` })).toHaveCount(0, { timeout: 10_000 })
  expect(errors).toEqual([])
})

test('column chooser: show, reorder, persist and reset', async ({ page }) => {
  const errors = trackErrors(page)
  await setAppearance(page, 'graphite')
  await signIn(page)
  const grid = page.getByRole('grid', { name: 'Torrents' })
  const headers = () => grid.getByRole('columnheader').allInnerTexts()
  expect(await headers()).not.toContain('Added')
  await grid.getByRole('button', { name: 'Choose columns' }).click()
  const panel = page.getByRole('dialog', { name: 'Columns' })
  await expect(panel.getByRole('checkbox', { name: 'Name' })).toBeDisabled()
  await panel.getByRole('checkbox', { name: 'Added' }).check()
  await expect(grid.getByRole('columnheader', { name: 'Added' })).toBeVisible()
  await panel.getByRole('checkbox', { name: 'Ratio' }).uncheck()
  await expect(grid.getByRole('columnheader', { name: 'Ratio' })).toHaveCount(0)
  await panel.getByRole('button', { name: 'Move Added earlier' }).click()
  await page.keyboard.press('Escape')
  const before = await headers()
  await page.reload()
  await expect(grid).toBeVisible()
  expect(await headers()).toEqual(before) // remembered across reloads
  await grid.getByRole('button', { name: 'Choose columns' }).click()
  await page.getByRole('dialog', { name: 'Columns' }).getByRole('button', { name: 'Reset to default' }).click()
  await expect(grid.getByRole('columnheader', { name: 'Added' })).toHaveCount(0)
  await expect(grid.getByRole('columnheader', { name: 'Ratio' })).toBeVisible()
  expect(errors).toEqual([])
})

test('global speed limits: set from the status bar, shown, and cleared', async ({ page }) => {
  const errors = trackErrors(page)
  await setAppearance(page, 'graphite')
  await signIn(page)
  const open = () => page.getByRole('button', { name: /^Global speed limits/ }).click()
  await open()
  const dlg = page.getByRole('dialog', { name: 'Global speed limits' })
  await expect(dlg.getByLabel('Download', { exact: true })).toBeVisible()
  await dlg.getByLabel('Download', { exact: true }).fill('2')
  await dlg.getByLabel('Download unit', { exact: true }).selectOption('MiB/s')
  await dlg.getByLabel('Upload', { exact: true }).fill('300')
  await dlg.getByLabel('Upload unit', { exact: true }).selectOption('KiB/s')
  await dlg.getByLabel('Upload', { exact: true }).fill('abc')
  await expect(dlg.getByText('Enter a positive number')).toBeVisible()
  await expect(dlg.getByRole('button', { name: 'Save' })).toBeDisabled()
  await dlg.getByLabel('Upload', { exact: true }).fill('300')
  await dlg.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Speed limits saved')).toBeVisible()
  await expect(page.getByRole('button', { name: /^Global speed limits/ })).toContainText('2.0 MiB/s', { timeout: 10_000 })
  await expect(page.getByRole('button', { name: /^Global speed limits/ })).toContainText('300.0 KiB/s')
  // Reopen: values and units come back from the server, then clear them.
  await open()
  await expect(dlg.getByLabel('Download', { exact: true })).toHaveValue('2')
  await expect(dlg.getByLabel('Download unit', { exact: true })).toHaveValue('MiB/s')
  await dlg.getByLabel('Download', { exact: true }).fill('')
  await dlg.getByLabel('Upload', { exact: true }).fill('')
  await dlg.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('button', { name: /^Global speed limits/ })).toContainText('↓ ∞ ↑ ∞', { timeout: 10_000 })
  expect(errors).toEqual([])
})
