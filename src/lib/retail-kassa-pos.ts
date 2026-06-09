import { adminDb } from '@/lib/admin-db-client'
import {
  fetchRetailPosSkus,
  findRetailSkuByCode,
  parseRetailScanPayload,
  resolveRetailSkuForGoodsReceipt,
  resolveRetailSkuLookup,
  retailSkuInStock,
  type RetailCartLine,
  type RetailPosSku,
  type RetailScanPayload,
} from '@/lib/retail-pos-catalog'
import { syncZReportAfterOrderSafe } from '@/lib/kassa-z-sync-safe'

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

    const refreshed = await fetchRetailPosSkus(tenantSlug)
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
  const refreshed = await fetchRetailPosSkus(tenantSlug)
  const updated = refreshed.find((s) => s.lineKey === sku.lineKey)
  return updated ? { ok: true, sku: updated } : { ok: true, sku }
}

export async function completeRetailCashSale(
  tenantSlug: string,
  lines: RetailCartLine[],
): Promise<{ ok: boolean; orderNumber?: number; error?: string }> {
  if (lines.length === 0) return { ok: false, error: 'empty_cart' }

  const total = lines.reduce((s, l) => s + l.sku.price * l.quantity, 0)
  const subtotal = Math.round((total / 1.21) * 100) / 100
  const tax = Math.round((total - subtotal) * 100) / 100
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
    payment_method: 'CASH',
    order_type: 'TAKEAWAY',
    subtotal,
    tax,
    total: Math.round(total * 100) / 100,
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

  const insRes = await adminDb.insert('orders', orderPayload, {
    tenantSlug,
    select: 'order_number',
  })

  if (!insRes.ok) {
    return { ok: false, error: insRes.error || 'insert_failed' }
  }

  const raw = insRes.data as unknown
  const row = (Array.isArray(raw) ? raw[0] : raw) as { order_number?: number } | undefined
  const orderNumber = row?.order_number != null ? Number(row.order_number) : undefined

  for (const line of lines) {
    if (!line.sku.track_stock) continue
    const nextQty = Math.max(0, line.sku.stock_quantity - line.quantity)
    await updateSkuStock(tenantSlug, line.sku, nextQty)
  }

  syncZReportAfterOrderSafe(tenantSlug, createdAt.toISOString())
  return { ok: true, orderNumber }
}

export async function applyRetailStockScanIncrement(
  tenantSlug: string,
  sku: RetailPosSku,
): Promise<{ ok: boolean; product?: RetailPosSku; sku?: RetailPosSku; error?: string }> {
  const nextQty = (sku.track_stock ? sku.stock_quantity : 0) + 1
  const res = await updateSkuStock(tenantSlug, sku, nextQty)
  return { ...res, product: res.sku }
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
