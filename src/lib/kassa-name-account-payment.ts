import {
  kassaReceiptTableNumber,
  type KassaLastOrderReceipt,
  type KassaPaymentMethod,
} from '@/lib/kassa-cart-types'
import { getMenuCategories, getMenuProducts, getTenantSettings, type MenuCategory, type MenuProduct, type TenantSettings } from '@/lib/admin-api'
import { dedupeCatalogById } from '@/lib/admin-api-menu-catalog'
import { adminDb } from '@/lib/admin-db-client'
import {
  normalizeNameTabLines,
  orderLinesGrossIncl,
  isNameTabContextColumnError,
  nameTabItemsOnlyPayload,
  resolveNameTabOrderContext,
  resolveNameTabOrderStaffId,
  resolveNameTabPaymentOrderPlan,
  tabOpenTotalIncl,
  type KassaNameTabLine,
  type KassaNameTabRow,
} from '@/lib/kassa-name-account'
import { validateNameTabPaymentRequest } from '@/lib/kassa-name-account-guard'
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
}): Promise<{
  ok: boolean
  error?: string
  orderNumber?: number
  receipt?: KassaLastOrderReceipt
  tabId?: string
  tabCleared?: boolean
  nextTabItems?: KassaNameTabLine[]
}> {
  const { tenantSlug, tab, amountEur, paymentMethod, staffId, catalog } = params

  const guard = validateNameTabPaymentRequest({
    tenantSlug,
    tab,
    amountEur,
    paymentMethod,
  })
  if (!guard.ok) {
    if (guard.error === 'invalid_amount') return { ok: false, error: 'invalid_amount' }
    if (guard.error === 'invalid_payment_method') return { ok: false, error: 'invalid_amount' }
    return { ok: false, error: 'scope_denied' }
  }
  const amountResolved = guard.amountEur

  const selectedLines = normalizeNameTabLines((tab.items ?? []) as KassaNameTabLine[])
  const selectedOpen = tabOpenTotalIncl(selectedLines)
  const orderCtx = resolveNameTabOrderContext(tab)
  if (selectedOpen <= 0.001) {
    return { ok: false, error: 'tab_already_settled' }
  }
  if (amountResolved > selectedOpen + 0.02) {
    return { ok: false, error: 'amount_too_high' }
  }

  const payIncl =
    amountResolved >= selectedOpen - 0.02 ? selectedOpen : amountResolved
  const plan = resolveNameTabPaymentOrderPlan(selectedLines, payIncl)
  const { orderLines, nextTabLines, showProductsOnReceipt } = plan

  if (!orderLines.length) {
    return { ok: false, error: 'invalid_amount' }
  }

  const grossFromLines = Math.round(orderLinesGrossIncl(orderLines) * 100) / 100
  if (Math.abs(grossFromLines - payIncl) > 0.03) {
    return { ok: false, error: 'amount_not_allocatable' }
  }

  const payInclResolved = payIncl

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
  const orderStaffId = resolveNameTabOrderStaffId(tab, staffId)

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
    staffId: orderStaffId,
    createdAt: paidAt,
    tableNumber: orderCtx.tableNumber,
    floorPlanZone: orderCtx.floorPlanZone,
    customerNotes: showProductsOnReceipt
      ? 'Op rekening — afrekening'
      : 'Op rekening — deelbetaling',
  })

  if (!orderRes.ok) {
    return { ok: false, error: orderRes.error || 'pay_failed' }
  }

  const orderTotal = orderRes.grossTotal ?? 0
  if (Math.abs(orderTotal - payInclResolved) > 0.03) {
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

  const hydratedItems = orderRes.hydrated ?? orderLines
  const receipt: KassaLastOrderReceipt = {
    orderNumber: orderRes.orderNumber ?? 0,
    items: showProductsOnReceipt ? hydratedItems : [],
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
    onAccountReceiptShowProducts: showProductsOnReceipt,
  }

  return {
    ok: true,
    orderNumber: orderRes.orderNumber,
    receipt,
    tabId: tab.id,
    tabCleared,
    nextTabItems: tabCleared ? [] : nextTabLines,
  }
}
