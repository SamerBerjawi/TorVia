import { expect, test } from '@playwright/test'
import { fakeMagnet, setAppearance, signIn, trackErrors } from './helpers'

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
  const name = `nuvora-e2e-${stamp}.iso`
  const category = `e2e-cat-${stamp}`

  // Add via the dialog (keyboard shortcut N), stopped, with a tag.
  await page.keyboard.press('n')
  const add = page.getByRole('dialog', { name: 'Add torrents' })
  await add.getByLabel(/magnet links or urls/i).fill(fakeMagnet(name))
  await add.getByLabel('Start torrent').uncheck()
  await add.getByLabel(/tags/i).fill('e2e')
  await add.getByRole('button', { name: /add stopped/i }).click()
  const row = page.getByRole('row').filter({ hasText: name })
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
