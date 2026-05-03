import { expect, test, type Page } from '@playwright/test'

const tenant = process.env.E2E_TENANT || 'frituurnolim'
const kassaUrl = `/shop/${tenant}/admin/kassa?alleen_lezen=1`

async function waitKassaMenuReady(page: Page) {
  await page.locator('[data-testid="kassa-menu-loading"]').waitFor({ state: 'detached', timeout: 120_000 })
}

/** Per optiegroep eerste keuze tikken, dan bevestigen (alle tenants / alle talen). */
async function fillKassaOptionsModal(page: Page) {
  const modal = page.getByTestId('kassa-options-modal')
  const scrollArea = modal.locator('.flex-1.overflow-y-auto')
  const optionBlocks = scrollArea.locator(':scope > div')
  const n = await optionBlocks.count()
  for (let i = 0; i < n; i++) {
    const choiceBtn = optionBlocks.nth(i).locator('.grid.grid-cols-3.gap-2 button').first()
    if ((await choiceBtn.count()) > 0) {
      await choiceBtn.click()
    }
  }
  await page.getByTestId('kassa-options-confirm').click()
  await expect(modal).toBeHidden({ timeout: 15_000 })
}

async function tryAddLineViaMenu(page: Page): Promise<boolean> {
  const catGrid = page.getByTestId('kassa-category-grid')
  if ((await catGrid.count()) === 0) return false

  await expect(catGrid).toBeVisible({ timeout: 60_000 })
  await catGrid.locator('button').first().click()

  const prodGrid = page.getByTestId('kassa-product-grid')
  await expect(prodGrid).toBeVisible({ timeout: 30_000 })
  const productBtns = prodGrid.locator('button')
  if ((await productBtns.count()) === 0) return false

  await productBtns.first().click()

  const modal = page.getByTestId('kassa-options-modal')
  const firstLine = page.getByTestId('kassa-cart-lines').locator(':scope > div').first()
  await Promise.race([
    modal.waitFor({ state: 'visible', timeout: 30_000 }),
    firstLine.waitFor({ state: 'visible', timeout: 30_000 }),
  ]).catch(() => {})

  if (await modal.isVisible()) {
    await fillKassaOptionsModal(page)
  }

  try {
    await expect(firstLine).toBeVisible({ timeout: 15_000 })
    return true
  } catch {
    return false
  }
}

async function addLineViaNumpad(page: Page) {
  const root = page.getByTestId('kassa-app')
  await root.getByRole('button', { name: '5', exact: true }).click()
  await root.getByRole('button', { name: '0', exact: true }).click()
  await root.getByRole('button', { name: '=', exact: true }).click()
  await root.getByTestId('kassa-add-custom-amount').click()
}

test.describe('Kassa (smoke)', () => {
  test.describe.configure({ timeout: 120_000 })

  test('laadt publieke demo-kassa (interactief; reset elk uur op server)', async ({ page }) => {
    await page.goto(kassaUrl, {
      waitUntil: 'domcontentloaded',
    })

    const root = page.getByTestId('kassa-app')
    await expect(root).toBeVisible({ timeout: 60_000 })

    await expect(root.getByRole('button', { name: 'Menu' })).toBeVisible()
  })

  test('menu laadt; orderregel via product of vrije bedrag-knop', async ({ page }) => {
    await page.goto(kassaUrl, { waitUntil: 'domcontentloaded' })

    await expect(page.getByTestId('kassa-app')).toBeVisible({ timeout: 60_000 })
    await waitKassaMenuReady(page)

    await expect(page.getByTestId('kassa-menu-scroll')).toBeVisible()

    const viaMenu = await tryAddLineViaMenu(page)
    if (!viaMenu) {
      await addLineViaNumpad(page)
    }

    const cartLines = page.getByTestId('kassa-cart-lines').locator(':scope > div')
    await expect(cartLines.first()).toBeVisible({ timeout: 15_000 })
  })
})
