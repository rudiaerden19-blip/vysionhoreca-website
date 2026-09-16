import type { KassaCartItem, KassaPaymentMethod, KassaRegisterOrderType } from '@/lib/kassa-cart-types'
import type { MenuProduct } from '@/lib/admin-api'
import type { FloorPlanZone } from '@/lib/kassa-floor-plan-zone'
import {
  buildCategoryVatLookupForJurisdiction,
  computeInclusiveVatSplitFromCart,
  resolveVatPercentForCartLine,
} from '@/lib/order-vat'
import { hydrateKassaCartItemsFromCatalog } from '@/lib/kassa-receipt-vat'
import { adminDb } from '@/lib/admin-db-client'

export type NameAccountOrderInsertResult = {
  ok: boolean
  orderNumber?: number
  error?: string
  createdAtIso?: string
  hydrated?: KassaCartItem[]
  grossTotal?: number
  subtotalExcl?: number
  totalTax?: number
  vatByRate?: { rate: number; baseExcl: number; tax: number }[]
}

export async function insertKassaOrderForNameAccountPayment(params: {
  tenantSlug: string
  customerName: string
  lines: KassaCartItem[]
  paymentMethod: KassaPaymentMethod
  orderType: KassaRegisterOrderType
  products: MenuProduct[]
  categoryVatLookup: ReturnType<typeof buildCategoryVatLookupForJurisdiction>
  productCategoryById: Map<string, string | null>
  tenantDefaultBtw: number
  tenantCountry: string
  staffId?: string | null
  splitCash?: number
  splitCard?: number
  createdAt?: Date
  tableNumber?: string
  floorPlanZone?: FloorPlanZone
  customerNotes?: string
}): Promise<NameAccountOrderInsertResult> {
  const {
    tenantSlug,
    customerName,
    lines,
    paymentMethod,
    orderType,
    products,
    categoryVatLookup,
    productCategoryById,
    tenantDefaultBtw,
    tenantCountry,
    staffId,
    splitCash,
    splitCard,
    tableNumber,
    floorPlanZone,
  } = params

  if (!lines.length) return { ok: false, error: 'Geen regels' }

  const hydrated = hydrateKassaCartItemsFromCatalog(lines, products, { preserveLinePrices: true })
  const resolveLineVat = (line: KassaCartItem) =>
    resolveVatPercentForCartLine(
      line.product,
      categoryVatLookup,
      tenantDefaultBtw,
      orderType,
      productCategoryById,
      tenantCountry,
      line.choices,
    )
  const vatSplit = computeInclusiveVatSplitFromCart(hydrated, resolveLineVat)
  const total = Math.round(vatSplit.grossTotal * 100) / 100
  const createdAt = params.createdAt ?? new Date()
  const kassa_client_uuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${tenantSlug}-${createdAt.getTime()}`

  const method = paymentMethod === 'SPLIT' ? 'SPLIT' : paymentMethod
  const orderPayload: Record<string, unknown> = {
    tenant_slug: tenantSlug,
    kassa_client_uuid,
    customer_name: customerName.trim(),
    status: 'confirmed',
    payment_status: 'paid',
    payment_method: method,
    order_type: orderType,
    customer_notes: params.customerNotes?.trim() || 'Op rekening — betaling',
    subtotal: Math.round(vatSplit.subtotalExcl * 100) / 100,
    tax: Math.round(vatSplit.totalTax * 100) / 100,
    total,
    kassa_staff_id: staffId ?? null,
    items: hydrated.map((i) => ({
      product_id: i.product.id,
      name: i.product.name,
      price: i.product.price,
      quantity: i.quantity,
      btw_percentage: resolveLineVat(i),
      options: (i.choices || []).map((c) => ({
        name: c.choiceName || c.optionName || '',
        price: c.price || 0,
      })),
      total_price: undefined,
    })),
    created_at: createdAt.toISOString(),
  }

  if (orderType === 'DINE_IN' && tableNumber) {
    orderPayload.table_number = tableNumber
  }
  if (orderType === 'DINE_IN' && floorPlanZone) {
    orderPayload.floor_plan_zone = floorPlanZone
  }

  if (method === 'SPLIT' && splitCash != null && splitCard != null) {
    orderPayload.payment_split_cash = Math.round(splitCash * 100) / 100
    orderPayload.payment_split_card = Math.round(splitCard * 100) / 100
  }

  const insRes = await adminDb.insert('orders', orderPayload, {
    tenantSlug,
    select: 'order_number',
  })
  if (!insRes.ok) {
    return { ok: false, error: insRes.error || 'Order insert mislukt' }
  }
  const raw = insRes.data as unknown
  const row = (Array.isArray(raw) ? raw[0] : raw) as { order_number?: number } | undefined
  return {
    ok: true,
    orderNumber: row?.order_number ?? 0,
    createdAtIso: createdAt.toISOString(),
    hydrated,
    grossTotal: total,
    subtotalExcl: Math.round(vatSplit.subtotalExcl * 100) / 100,
    totalTax: Math.round(vatSplit.totalTax * 100) / 100,
    vatByRate: vatSplit.byRate.map((r) => ({
      rate: r.rate,
      baseExcl: r.baseExcl,
      tax: r.tax,
    })),
  }
}
