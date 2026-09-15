import {
  kassaReceiptTableNumber,
  type KassaLastOrderReceipt,
  type KassaPaymentMethod,
} from '@/lib/kassa-cart-types'
import { getMenuCategories, getMenuProducts, getTenantSettings, type MenuCategory, type MenuProduct, type TenantSettings } from '@/lib/admin-api'
import { dedupeCatalogById } from '@/lib/admin-api-menu-catalog'
import { adminDb } from '@/lib/admin-db-client'
import {
  allocateNameTabPayment,
  normalizeNameTabLines,
  orderLinesGrossIncl,
  isNameTabContextColumnError,
  nameTabItemsOnlyPayload,
  resolveNameTabOrderContext,
  tabOpenTotalIncl,
  type KassaNameTabLine,
  type KassaNameTabRow,
} from '@/lib/kassa-name-account'
import { insertKassaOrderForNameAccountPayment } from '@/lib/kassa-name-account-order'
import { syncZReportAfterOrderSafe } from '@/lib/kassa-z-sync-safe'
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
  /** Kassa-catalogus al in geheugen — scheelt 3 netwerkcalls bij betalen. */
  catalog?: {
    settings: TenantSettings | null
    categories: MenuCategory[]
    products: MenuProduct[]
  }
}): Promise<{ ok: boolean; error?: string; orderNumber?: number; receipt?: KassaLastOrderReceipt }> {
  const { tenantSlug, tab, amountEur, paymentMethod, staffId, catalog } = params
  const selectedLines = normalizeNameTabLines((tab.items ?? []) as KassaNameTabLine[])
  const selectedOpen = tabOpenTotalIncl(selectedLines)
  const orderCtx = resolveNameTabOrderContext(tab)

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

  const grossFromLines = orderLinesGrossIncl(orderLines)
  if (Math.abs(grossFromLines - appliedIncl) > 0.03) {
    return { ok: false, error: 'allocation_mismatch' }
  }
  if (Math.abs(payIncl - appliedIncl) > 0.03) {
    return { ok: false, error: 'amount_not_allocatable' }
  }

  const [settings, catsRaw, prodsRaw] = catalog
    ? [catalog.settings, catalog.categories, catalog.products]
    : await Promise.all([
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

  const paidAt = new Date()

  const orderRes = await insertKassaOrderForNameAccountPayment({
    tenantSlug,
    customerName: tab.customer_name,
    lines: orderLines,
    paymentMethod,
    orderType: orderCtx.orderType,
    products: prods,
    categoryVatLookup: vatLookup,
    productCategoryById,
    tenantDefaultBtw: btw,
    tenantCountry,
    staffId,
    createdAt: paidAt,
    tableNumber: orderCtx.tableNumber,
    floorPlanZone: orderCtx.floorPlanZone,
  })

  if (!orderRes.ok) {
    return { ok: false, error: orderRes.error || 'pay_failed' }
  }

  const orderTotal = orderRes.grossTotal ?? 0
  if (Math.abs(orderTotal - appliedIncl) > 0.03) {
    return { ok: false, error: 'order_total_mismatch', orderNumber: orderRes.orderNumber }
  }

  syncZReportAfterOrderSafe(tenantSlug, paidAt.toISOString())

  const tabCleared = tabOpenTotalIncl(nextTabLines) <= 0.001
  const dbRes = tabCleared
    ? await adminDb.delete(
        'kassa_name_tabs',
        { id: tab.id, tenant_slug: tenantSlug },
        { tenantSlug },
      )
    : await (async () => {
        const updatedAt = paidAt.toISOString()
        const fullPayload = {
          items: nextTabLines,
          updated_at: updatedAt,
          order_type: orderCtx.orderType,
          table_number: orderCtx.tableNumber || null,
          floor_plan_zone: orderCtx.floorPlanZone ?? null,
        }
        let res = await adminDb.update(
          'kassa_name_tabs',
          fullPayload,
          { id: tab.id, tenant_slug: tenantSlug },
          { tenantSlug },
        )
        if (!res.ok && isNameTabContextColumnError(res.error)) {
          res = await adminDb.update(
            'kassa_name_tabs',
            nameTabItemsOnlyPayload(nextTabLines, updatedAt),
            { id: tab.id, tenant_slug: tenantSlug },
            { tenantSlug },
          )
        }
        return res
      })()

  if (!dbRes.ok) {
    return { ok: false, error: 'tab_update_failed', orderNumber: orderRes.orderNumber }
  }

  const receipt: KassaLastOrderReceipt = {
    orderNumber: orderRes.orderNumber ?? 0,
    items: orderRes.hydrated ?? orderLines,
    total: orderTotal,
    vatSplit: orderRes.vatByRate?.map((r) => ({
      rate: r.rate,
      baseExcl: r.baseExcl,
      tax: r.tax,
    })),
    subtotalExclVat: orderRes.subtotalExcl,
    totalTax: orderRes.totalTax,
    paymentMethod,
    orderType: orderCtx.orderType,
    tableNumber: kassaReceiptTableNumber(orderCtx.orderType, orderCtx.tableNumber),
    floorPlanZone: orderCtx.floorPlanZone,
    createdAt: paidAt,
    onAccountCustomerName: tab.customer_name.trim(),
  }

  return { ok: true, orderNumber: orderRes.orderNumber, receipt }
}
