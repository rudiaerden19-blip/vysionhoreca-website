import { expect, test } from '@playwright/test'

const tenant = process.env.E2E_TENANT || 'frituurnolim'

test.describe('Kassa (smoke)', () => {
  test('laadt in demo / alleen-lezen modus', async ({ page }) => {
    await page.goto(`/shop/${tenant}/admin/kassa?alleen_lezen=1`, {
      waitUntil: 'domcontentloaded',
    })

    const root = page.getByTestId('kassa-app')
    await expect(root).toBeVisible({ timeout: 60_000 })

    await expect(page.getByText('Demo — alleen bekijken')).toBeVisible()
  })
})
