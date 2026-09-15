import type { KassaPaymentMethod } from '@/lib/kassa-cart-types'
import { getMenuCategories, getMenuProducts, getTenantSettings } from '@/lib/admin-api'
import { dedupeCatalogById } from '@/lib/admin-api-menu-catalog'
import { adminDb } from '@/lib/admin-db-client'
import {
  allocateNameTabPayment,
  tabOpenTotalIncl,
  type KassaNameTabLine,
  type KassaNameTabRow,
} from '@/lib/kassa-name-account'
import { insertKassaOrderForNameAccountPayment } from '@/lib/kassa-name-account-order'
import {
  buildCategoryVatLookupForJurisdiction,
  buildProductCategoryLookup,
  inferVatJurisdictionCountry,
  normalizeCategoryVatPercent,
} from '@/lib/order-vat'

/** Registreer betaling op open tab → betaalde order + tab bijwerken (Z/verkoop op betaaldatum). */
export async function registerKassaNameTabPayment(params: {
  tenantSlug: string
  tab: KassaNameTabRow
  amountEur: number
  paymentMethod: KassaPaymentMethod
  staffId?: string | null
}): Promise<{ ok: boolean; error?: string; orderNumber?: number }> {
  const { tenantSlug, tab, amountEur, paymentMethod, staffId } = params
  const selectedLines = (tab.items ?? []) as KassaNameTabLine[]
  const selectedOpen = tabOpenTotalIncl(selectedLines)

  if (!Number.isFinite(amountEur) || amountEur <= 0) {
    return { ok: false, error: 'invalid_amount' }
  }
  if (amountEur > selectedOpen + 0.02) {
    return { ok: false, error: 'amount_too_high' }
  }

  const { orderLines, nextTabLines, appliedIncl } = allocateNameTabPayment(selectedLines, amountEur)
  if (appliedIncl <= 0 || !orderLines.length) {
    return { ok: false, error: 'invalid_amount' }
  }

  const [settings, catsRaw, prodsRaw] = await Promise.all([
    getTenantSettings(tenantSlug),
    getMenuCategories(tenantSlug),
    getMenuProducts(tenantSlug),
  ])
  const btw = normalizeCategoryVatPercent(settings?.btw_percentage ?? 6, 21)
  const tenantCountry = inferVatJurisdictionCountry(settings?.country, settings?.btw_number, btw) ?? 'BE'
  const cats = dedupeCatalogById(catsRaw.filter((c) => c.is_active))
  const prods = dedupeCatalogById(prodsRaw.filter((p) => p.is_active))
  const vatLookup = buildCategoryVatLookupForJurisdiction(cats, tenantCountry)
  const productCategoryById = buildProductCategoryLookup(prods)

  const orderRes = await insertKassaOrderForNameAccountPayment({
    tenantSlug,
    customerName: tab.customer_name,
    lines: orderLines,
    paymentMethod,
    orderType: 'TAKEAWAY',
    products: prods,
    categoryVatLookup: vatLookup,
    productCategoryById,
    tenantDefaultBtw: btw,
    tenantCountry,
    staffId,
  })

  if (!orderRes.ok) {
    return { ok: false, error: orderRes.error || 'pay_failed' }
  }

  if (tabOpenTotalIncl(nextTabLines) <= 0.001) {
    await adminDb.delete('kassa_name_tabs', { id: tab.id, tenant_slug: tenantSlug })
  } else {
    await adminDb.update(
      'kassa_name_tabs',
      { items: nextTabLines, updated_at: new Date().toISOString() },
      { id: tab.id, tenant_slug: tenantSlug },
      { tenantSlug },
    )
  }

  return { ok: true, orderNumber: orderRes.orderNumber }
}
