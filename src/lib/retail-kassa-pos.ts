import { adminDb } from '@/lib/admin-db-client'
import {
  fetchRetailPosSkus,
  findRetailSkuByCode,
  invalidateRetailPosSkuCache,
  parseRetailScanPayload,
  resolveRetailSkuForGoodsReceipt,
  resolveRetailSkuLookup,
  retailSkuInStock,
  type RetailCartLine,
  type RetailPosSku,
  type RetailScanPayload,
} from '@/lib/retail-pos-catalog'
import { authFetch } from '@/lib/auth-headers'
import { syncZReportAfterOrderSafe } from '@/lib/kassa-z-sync-safe'
import type { KassaPaymentMethod } from '@/lib/kassa-cart-types'
import type { RetailImportRow } from '@/lib/retail-product-import'

export type { RetailCartLine, RetailPosSku, RetailScanPayload }
export {
  fetchRetailPosSkus,
  findRetailSkuByCode,
  parseRetailScanPayload,
  resolveRetailSkuForGoodsReceipt,
  resolveRetailSkuLookup,
  retailSkuInStock,
} from '@/lib/retail-pos-catalog'

/** @deprecated gebruik RetailPosSku */
export type RetailPosProduct = RetailPosSku

export async function fetchRetailPosProducts(tenantSlug: string): Promise<RetailPosSku[]> {
  return fetchRetailPosSkus(tenantSlug)
}

export function findRetailProductByBarcode(skus: RetailPosSku[], code: string): RetailPosSku | null {
  return resolveRetailSkuLookup(skus, code)
}

export function retailLineInStock(sku: RetailPosSku, addQty: number): boolean {
  return retailSkuInStock(sku, addQty)
}

const VARIANT_SELECT =
  'id, product_id, article_number, barcode, size_label, color_label, price_override, track_stock, stock_quantity, low_stock_threshold, is_active, sort_order'

const PRODUCT_STOCK_SELECT =
  'id, name, description, price, image_url, category_id, article_number, barcode, size_label, color_label, track_stock, stock_quantity, low_stock_threshold'

async function updateSkuStock(
  tenantSlug: string,
  sku: RetailPosSku,
  nextQty: number,
  extra?: { size_label?: string; color_label?: string },
  opts?: { skipCatalogRefresh?: boolean },
): Promise<{ ok: boolean; sku?: RetailPosSku; error?: string }> {
  if (sku.variantId) {
    const patch: Record<string, unknown> = {
      track_stock: true,
      stock_quantity: nextQty,
    }
    if (extra?.size_label?.trim()) patch.size_label = extra.size_label.trim()
    if (extra?.color_label?.trim()) patch.color_label = extra.color_label.trim()

    const r = await adminDb.update(
      'menu_product_variants',
      patch,
      { id: sku.variantId, tenant_slug: tenantSlug },
      { tenantSlug, select: VARIANT_SELECT },
    )
    if (!r.ok) return { ok: false, error: r.error || 'update_failed' }
    const row = (Array.isArray(r.data) ? r.data[0] : r.data) as Record<string, unknown> | undefined
    if (!row) return { ok: false, error: 'empty_row' }

    if (opts?.skipCatalogRefresh) {
      return { ok: true, sku: { ...sku, stock_quantity: nextQty, track_stock: true } }
    }
    const refreshed = await fetchRetailPosSkus(tenantSlug, { fresh: true })
    const updated = refreshed.find((s) => s.lineKey === sku.lineKey)
    return updated ? { ok: true, sku: updated } : { ok: true, sku }
  }

  const patch: Record<string, unknown> = {
    track_stock: true,
    stock_quantity: nextQty,
  }
  if (extra?.size_label?.trim()) patch.size_label = extra.size_label.trim()
  if (extra?.color_label?.trim()) patch.color_label = extra.color_label.trim()

  const r = await adminDb.update(
    'menu_products',
    patch,
    { id: sku.productId, tenant_slug: tenantSlug },
    { tenantSlug, select: PRODUCT_STOCK_SELECT },
  )
  if (!r.ok) return { ok: false, error: r.error || 'update_failed' }
  if (opts?.skipCatalogRefresh) {
    return { ok: true, sku: { ...sku, stock_quantity: nextQty, track_stock: true } }
  }
  const refreshed = await fetchRetailPosSkus(tenantSlug, { fresh: true })
  const updated = refreshed.find((s) => s.lineKey === sku.lineKey)
  return updated ? { ok: true, sku: updated } : { ok: true, sku }
}

export async function completeRetailSale(
  tenantSlug: string,
  lines: RetailCartLine[],
  method: KassaPaymentMethod,
  splitAmounts?: { cash: number; card: number },
  options?: {
    loyaltyMemberId?: string | null
    loyaltyDiscountEuro?: number
    loyaltyRedeemPoints?: number
    kassaStaffId?: string | null
    storeCreditId?: string | null
    storeCreditEuro?: number
  },
): Promise<{ ok: boolean; orderNumber?: number; orderId?: string; error?: string }> {
  if (lines.length === 0) return { ok: false, error: 'empty_cart' }

  const grossTotal = lines.reduce((s, l) => s + l.sku.price * l.quantity, 0)
  const loyaltyDiscountRaw = Math.max(0, options?.loyaltyDiscountEuro ?? 0)
  const afterLoyalty = Math.max(0, grossTotal - loyaltyDiscountRaw)
  const creditRaw = Math.max(0, options?.storeCreditEuro ?? 0)
  const creditApplied = Math.round(Math.min(creditRaw, afterLoyalty) * 100) / 100
  const discount = Math.round(Math.min(loyaltyDiscountRaw, grossTotal) * 100) / 100
  const totalDiscount = Math.round((discount + creditApplied) * 100) / 100
  const roundedTotal = Math.round((grossTotal - totalDiscount) * 100) / 100

  if (method === 'SPLIT') {
    const sc = splitAmounts?.cash ?? 0
    const sd = splitAmounts?.card ?? 0
    if (Math.abs(roundedTotal - sc - sd) > 0.02) {
      return { ok: false, error: 'split_mismatch' }
    }
  }

  const subtotal = Math.round((roundedTotal / 1.21) * 100) / 100
  const tax = Math.round((roundedTotal - subtotal) * 100) / 100
  const createdAt = new Date()
  const kassa_client_uuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${tenantSlug}-${createdAt.getTime()}`

  const orderPayload: Record<string, unknown> = {
    tenant_slug: tenantSlug,
    kassa_client_uuid,
    customer_name: 'Winkel',
    status: 'confirmed',
    payment_status: 'paid',
    payment_method: method === 'SPLIT' ? 'SPLIT' : method,
    order_type: 'TAKEAWAY',
    subtotal,
    tax,
    total: roundedTotal,
    discount_amount: totalDiscount > 0 ? totalDiscount : 0,
    items: lines.map((l) => ({
      product_id: l.sku.productId,
      variant_id: l.sku.variantId,
      name: l.sku.name,
      price: l.sku.price,
      quantity: l.quantity,
      article_number: l.sku.article_number,
      barcode: l.sku.barcode,
      size_label: l.sku.size_label,
      color_label: l.sku.color_label,
    })),
    created_at: createdAt.toISOString(),
  }

  if (options?.loyaltyMemberId) {
    orderPayload.retail_loyalty_member_id = options.loyaltyMemberId
  }
  const redeemPts = options?.loyaltyRedeemPoints
  if (redeemPts != null && redeemPts > 0) {
    orderPayload.retail_loyalty_points_redeemed = Math.floor(redeemPts)
  }
  if (options?.kassaStaffId) {
    orderPayload.kassa_staff_id = options.kassaStaffId
  }

  if (method === 'SPLIT' && splitAmounts) {
    orderPayload.payment_split_cash = Math.round(splitAmounts.cash * 100) / 100
    orderPayload.payment_split_card = Math.round(splitAmounts.card * 100) / 100
  }

  const insRes = await adminDb.insert('orders', orderPayload, {
    tenantSlug,
    select: 'id, order_number',
  })

  if (!insRes.ok) {
    return { ok: false, error: insRes.error || 'insert_failed' }
  }

  const raw = insRes.data as unknown
  const row = (Array.isArray(raw) ? raw[0] : raw) as
    | { id?: string; order_number?: number }
    | undefined
  const orderNumber = row?.order_number != null ? Number(row.order_number) : undefined
  const orderId = row?.id

  if (creditApplied > 0 && options?.storeCreditId && orderId && orderNumber) {
    const redeemRes = await authFetch('/api/retail/store-credit/redeem', {
      method: 'POST',
      body: JSON.stringify({
        tenantSlug,
        creditId: options.storeCreditId,
        amount: creditApplied,
        orderId,
        orderNumber,
      }),
    })
    const redeemJson = (await redeemRes.json().catch(() => ({}))) as { ok?: boolean; error?: string }
    if (!redeemRes.ok || !redeemJson.ok) {
      return { ok: false, error: redeemJson.error || 'store_credit_redeem_failed' }
    }
  }

  for (const line of lines) {
    if (!line.sku.track_stock) continue
    const nextQty = Math.max(0, line.sku.stock_quantity - line.quantity)
    await updateSkuStock(tenantSlug, line.sku, nextQty, undefined, { skipCatalogRefresh: true })
  }
  invalidateRetailPosSkuCache(tenantSlug)

  syncZReportAfterOrderSafe(tenantSlug, createdAt.toISOString())
  return { ok: true, orderNumber, orderId }
}

/** @deprecated gebruik completeRetailSale */
export async function completeRetailCashSale(
  tenantSlug: string,
  lines: RetailCartLine[],
): Promise<{ ok: boolean; orderNumber?: number; error?: string }> {
  return completeRetailSale(tenantSlug, lines, 'CASH')
}

export async function applyRetailStockScanIncrement(
  tenantSlug: string,
  sku: RetailPosSku,
): Promise<{ ok: boolean; product?: RetailPosSku; sku?: RetailPosSku; error?: string }> {
  const nextQty = (sku.track_stock ? sku.stock_quantity : 0) + 1
  const res = await updateSkuStock(tenantSlug, sku, nextQty)
  return { ...res, product: res.sku }
}

/** Eerste scan onbekende EAN: product aanmaken (naam + prijs), daarna normale lookup. */
export async function createRetailSkuFromScan(
  tenantSlug: string,
  input: { barcode: string; name: string; price: number },
): Promise<{ ok: boolean; sku?: RetailPosSku; error?: string }> {
  const name = input.name.trim()
  const barcodeRaw = input.barcode.trim()
  const price = Math.round(Number(input.price) * 100) / 100
  if (!name || !barcodeRaw || !(price >= 0)) {
    return { ok: false, error: 'invalid_input' }
  }

  const catalog = await fetchRetailPosSkus(tenantSlug)
  const existing = findRetailSkuByCode(catalog, barcodeRaw)
  if (existing) {
    return { ok: true, sku: existing }
  }

  const digits = barcodeRaw.replace(/\D/g, '')
  const storeBarcode = digits.length >= 8 ? digits : barcodeRaw

  const ins = await adminDb.insert(
    'menu_products',
    {
      tenant_slug: tenantSlug,
      name,
      description: '',
      price,
      barcode: storeBarcode,
      article_number: storeBarcode,
      is_active: true,
      track_stock: false,
      stock_quantity: 0,
      low_stock_threshold: 5,
      image_url: '',
      sort_order: 0,
    },
    { tenantSlug, select: PRODUCT_STOCK_SELECT },
  )
  if (!ins.ok) {
    return { ok: false, error: ins.error || 'insert_failed' }
  }

  const refreshed = await fetchRetailPosSkus(tenantSlug, { fresh: true })
  const sku = findRetailSkuByCode(refreshed, barcodeRaw) ?? refreshed[refreshed.length - 1]
  return sku ? { ok: true, sku } : { ok: false, error: 'sku_missing' }
}

/** CSV/Excel → menu_products (bestaande barcode wordt overgeslagen). */
export async function importRetailProductsBatch(
  tenantSlug: string,
  rows: RetailImportRow[],
): Promise<{ ok: boolean; created: number; skipped: number; failed: number }> {
  let created = 0
  let skipped = 0
  let failed = 0
  const catalog = await fetchRetailPosSkus(tenantSlug)
  const seenBarcodes = new Set<string>()
  for (const row of rows) {
    const bc = row.barcode.trim()
    if (seenBarcodes.has(bc) || findRetailSkuByCode(catalog, bc)) {
      skipped++
      continue
    }
    const ins = await adminDb.insert(
      'menu_products',
      {
        tenant_slug: tenantSlug,
        name: row.name.trim(),
        description: '',
        price: row.price,
        barcode: row.barcode,
        article_number: row.article_number?.trim() || row.barcode,
        is_active: true,
        track_stock: row.stock > 0,
        stock_quantity: row.stock,
        low_stock_threshold: 5,
        image_url: '',
        sort_order: 0,
      },
      { tenantSlug, select: 'id' },
    )
    if (!ins.ok) failed++
    else {
      created++
      seenBarcodes.add(bc)
    }
  }
  return { ok: created > 0 || (skipped > 0 && failed === 0), created, skipped, failed }
}

export async function updateRetailSkuPrice(
  tenantSlug: string,
  sku: RetailPosSku,
  price: number,
  name?: string,
): Promise<{ ok: boolean; sku?: RetailPosSku; error?: string }> {
  const nextPrice = Math.round(price * 100) / 100
  if (!(nextPrice >= 0)) return { ok: false, error: 'invalid_price' }

  const trimmedName = name?.trim()
  if (name !== undefined && !trimmedName) return { ok: false, error: 'invalid_name' }

  const id = sku.variantId ?? sku.productId
  const r = sku.variantId
    ? await adminDb.update(
        'menu_product_variants',
        { price_override: nextPrice },
        { id, tenant_slug: tenantSlug },
        { tenantSlug },
      )
    : await adminDb.update(
        'menu_products',
        {
          price: nextPrice,
          track_stock: false,
          ...(trimmedName ? { name: trimmedName } : {}),
          ...(sku.barcode && !sku.article_number ? { article_number: sku.barcode } : {}),
        },
        { id, tenant_slug: tenantSlug },
        { tenantSlug },
      )
  if (!r.ok) return { ok: false, error: r.error || 'update_failed' }

  if (trimmedName && sku.variantId) {
    const nameRes = await adminDb.update(
      'menu_products',
      { name: trimmedName },
      { id: sku.productId, tenant_slug: tenantSlug },
      { tenantSlug },
    )
    if (!nameRes.ok) return { ok: false, error: nameRes.error || 'update_failed' }
  }

  const refreshed = await fetchRetailPosSkus(tenantSlug, { fresh: true })
  const updated = refreshed.find((s) => s.lineKey === sku.lineKey)
  if (!updated) return { ok: false, error: 'sku_missing' }
  return { ok: true, sku: updated }
}

export async function applyRetailGoodsReceipt(
  tenantSlug: string,
  sku: RetailPosSku,
  payload: Pick<RetailScanPayload, 'quantity' | 'size_label' | 'color_label'>,
): Promise<{ ok: boolean; product?: RetailPosSku; sku?: RetailPosSku; error?: string }> {
  const add = Math.max(1, Math.floor(payload.quantity || 1))
  const nextQty = (sku.track_stock ? sku.stock_quantity : 0) + add
  const res = await updateSkuStock(tenantSlug, sku, nextQty, {
    size_label: payload.size_label ?? undefined,
    color_label: payload.color_label ?? undefined,
  })
  return { ...res, product: res.sku }
}
