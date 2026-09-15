import type { KassaLastOrderReceipt, KassaPaymentMethod } from '@/lib/kassa-cart-types'
import { hydrateKassaCartItemsFromCatalog } from '@/lib/kassa-receipt-vat'
import { getMenuCategories, getMenuProducts, getTenantSettings } from '@/lib/admin-api'
import { dedupeCatalogById } from '@/lib/admin-api-menu-catalog'
import { adminDb } from '@/lib/admin-db-client'
import {
  allocateNameTabPayment,
  normalizeNameTabLines,
  tabOpenTotalIncl,
  type KassaNameTabLine,
  type KassaNameTabRow,
} from '@/lib/kassa-name-account'
import { insertKassaOrderForNameAccountPayment } from '@/lib/kassa-name-account-order'
import {
  buildCategoryVatLookupForJurisdiction,
  buildProductCategoryLookup,
  computeInclusiveVatSplitFromCart,
  inferVatJurisdictionCountry,
  normalizeCategoryVatPercent,
  resolveVatPercentForCartLine,
} from '@/lib/order-vat'

/** Registreer betaling op open tab → betaalde order + tab bijwerken (Z/verkoop op betaaldatum). */
export async function registerKassaNameTabPayment(params: {
  tenantSlug: string
  tab: KassaNameTabRow
  amountEur: number
  paymentMethod: KassaPaymentMethod
  staffId?: string | null
}): Promise<{ ok: boolean; error?: string; orderNumber?: number; receipt?: KassaLastOrderReceipt }> {
  const { tenantSlug, tab, amountEur, paymentMethod, staffId } = params
  const selectedLines = normalizeNameTabLines((tab.items ?? []) as KassaNameTabLine[])
  const selectedOpen = tabOpenTotalIncl(selectedLines)

  if (!Number.isFinite(amountEur) || amountEur <= 0) {
    return { ok: false, error: 'invalid_amount' }
  }
  if (selectedOpen <= 0.001) {
    return { ok: false, error: 'tab_already_settled' }
  }
  if (amountEur > selectedOpen + 0.02) {
    return { ok: false, error: 'amount_too_high' }
  }

  const payIncl =
    amountEur >= selectedOpen - 0.02 ? selectedOpen : Math.round(amountEur * 100) / 100
  const { orderLines, nextTabLines, appliedIncl } = allocateNameTabPayment(selectedLines, payIncl)
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

  const tabCleared = tabOpenTotalIncl(nextTabLines) <= 0.001
  const dbRes = tabCleared
    ? await adminDb.delete(
        'kassa_name_tabs',
        { id: tab.id, tenant_slug: tenantSlug },
        { tenantSlug },
      )
    : await adminDb.update(
        'kassa_name_tabs',
        { items: nextTabLines, updated_at: new Date().toISOString() },
        { id: tab.id, tenant_slug: tenantSlug },
        { tenantSlug },
      )

  if (!dbRes.ok) {
    return { ok: false, error: 'tab_update_failed', orderNumber: orderRes.orderNumber }
  }

  const hydrated = hydrateKassaCartItemsFromCatalog(orderLines, prods)
  const resolveLineVat = (line: (typeof hydrated)[number]) =>
    resolveVatPercentForCartLine(
      line.product,
      vatLookup,
      btw,
      'TAKEAWAY',
      productCategoryById,
      tenantCountry,
      line.choices,
    )
  const vatSplit = computeInclusiveVatSplitFromCart(hydrated, resolveLineVat)
  const receipt: KassaLastOrderReceipt = {
    orderNumber: orderRes.orderNumber ?? 0,
    items: hydrated,
    total: Math.round(vatSplit.grossTotal * 100) / 100,
    vatSplit: vatSplit.byRate.map((r) => ({
      rate: r.rate,
      baseExcl: r.baseExcl,
      tax: r.tax,
    })),
    subtotalExclVat: vatSplit.subtotalExcl,
    totalTax: vatSplit.totalTax,
    paymentMethod,
    orderType: 'TAKEAWAY',
    tableNumber: '',
    createdAt: new Date(),
    onAccountCustomerName: tab.customer_name.trim(),
  }

  return { ok: true, orderNumber: orderRes.orderNumber, receipt }
}
