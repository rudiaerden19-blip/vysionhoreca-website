import { adminDb } from '@/lib/admin-db-client'
import { supabase } from '@/lib/supabase'
import { syncZReportAfterOrderSafe } from '@/lib/kassa-z-sync-safe'

export type RetailPosProduct = {
  id: string
  name: string
  description: string
  price: number
  article_number: string | null
  barcode: string | null
  size_label: string | null
  color_label: string | null
  track_stock: boolean
  stock_quantity: number
}

export type RetailCartLine = {
  product: RetailPosProduct
  quantity: number
}

const RETAIL_SELECT =
  'id, name, description, price, article_number, barcode, size_label, color_label, track_stock, stock_quantity'

export async function fetchRetailPosProducts(tenantSlug: string): Promise<RetailPosProduct[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('menu_products')
    .select(RETAIL_SELECT)
    .eq('tenant_slug', tenantSlug)
    .eq('is_active', true)
    .order('name')
  if (error) {
    console.warn('[retail-kassa] load products:', error.message)
    return []
  }
  return (data || []).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description || '',
    price: Number(p.price) || 0,
    article_number: p.article_number?.trim() || null,
    barcode: p.barcode?.trim() || null,
    size_label: p.size_label?.trim() || null,
    color_label: p.color_label?.trim() || null,
    track_stock: !!p.track_stock,
    stock_quantity: Number(p.stock_quantity) || 0,
  }))
}

/** Geparsede scan (doos-label of handmatige invoer). */
export type RetailScanPayload = {
  lookupCode: string
  quantity: number
  size_label: string | null
  color_label: string | null
}

/**
 * Barcode-formaten (één regel):
 * - alleen EAN/SKU → qty 1
 * - `EAN|12` of `EAN|12|M|Blauw` (maat/kleur optioneel)
 * - `12*EAN` (qty vooraan)
 * - `VYSION;bc=EAN;qty=12;size=M;color=Blauw` (hoofdletter keys)
 */
export function parseRetailScanPayload(raw: string): RetailScanPayload {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { lookupCode: '', quantity: 1, size_label: null, color_label: null }
  }

  if (/^VYSION;/i.test(trimmed)) {
    const parts = trimmed.split(';').slice(1)
    const map: Record<string, string> = {}
    for (const p of parts) {
      const eq = p.indexOf('=')
      if (eq < 0) continue
      map[p.slice(0, eq).trim().toLowerCase()] = p.slice(eq + 1).trim()
    }
    const lookupCode = map.bc || map.barcode || map.sku || map.ean || ''
    const qty = Math.max(1, Math.floor(Number(map.qty || map.quantity || '1') || 1))
    return {
      lookupCode: lookupCode || trimmed,
      quantity: qty,
      size_label: map.size || map.maat || map.size_label || null,
      color_label: map.color || map.kleur || map.color_label || null,
    }
  }

  if (trimmed.includes('|')) {
    const [code, qtyRaw, size, color] = trimmed.split('|').map((s) => s.trim())
    const qty = Math.max(1, Math.floor(Number(qtyRaw) || 1))
    return {
      lookupCode: code || trimmed,
      quantity: qty,
      size_label: size || null,
      color_label: color || null,
    }
  }

  const star = trimmed.match(/^(\d+)\*(.+)$/)
  if (star) {
    return {
      lookupCode: star[2].trim(),
      quantity: Math.max(1, Math.floor(Number(star[1]) || 1)),
      size_label: null,
      color_label: null,
    }
  }

  return { lookupCode: trimmed, quantity: 1, size_label: null, color_label: null }
}

export function findRetailProductByBarcode(
  products: RetailPosProduct[],
  code: string,
): RetailPosProduct | null {
  const norm = code.trim()
  if (!norm) return null
  const lower = norm.toLowerCase()
  return (
    products.find((p) => p.barcode && p.barcode.toLowerCase() === lower) ||
    products.find((p) => p.article_number && p.article_number.toLowerCase() === lower) ||
    null
  )
}

export function retailLineInStock(p: RetailPosProduct, addQty: number): boolean {
  if (!p.track_stock) return true
  return p.stock_quantity >= addQty
}

export async function completeRetailCashSale(
  tenantSlug: string,
  lines: RetailCartLine[],
): Promise<{ ok: boolean; orderNumber?: number; error?: string }> {
  if (lines.length === 0) return { ok: false, error: 'empty_cart' }

  const total = lines.reduce((s, l) => s + l.product.price * l.quantity, 0)
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
      product_id: l.product.id,
      name: l.product.name,
      price: l.product.price,
      quantity: l.quantity,
      article_number: l.product.article_number,
      barcode: l.product.barcode,
      size_label: l.product.size_label,
      color_label: l.product.color_label,
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
    if (!line.product.track_stock) continue
    const nextQty = Math.max(0, line.product.stock_quantity - line.quantity)
    await adminDb.update(
      'menu_products',
      { stock_quantity: nextQty },
      { id: line.product.id, tenant_slug: tenantSlug },
      { tenantSlug },
    )
  }

  syncZReportAfterOrderSafe(tenantSlug, createdAt.toISOString())
  return { ok: true, orderNumber }
}

function mapRetailRow(p: Record<string, unknown>): RetailPosProduct {
  return {
    id: String(p.id),
    name: String(p.name ?? ''),
    description: String(p.description ?? ''),
    price: Number(p.price) || 0,
    article_number: typeof p.article_number === 'string' ? p.article_number.trim() || null : null,
    barcode: typeof p.barcode === 'string' ? p.barcode.trim() || null : null,
    size_label: typeof p.size_label === 'string' ? p.size_label.trim() || null : null,
    color_label: typeof p.color_label === 'string' ? p.color_label.trim() || null : null,
    track_stock: !!p.track_stock,
    stock_quantity: Number(p.stock_quantity) || 0,
  }
}

/** Winkelronde: +1 voorraad per scan. */
export async function applyRetailStockScanIncrement(
  tenantSlug: string,
  product: RetailPosProduct,
): Promise<{ ok: boolean; product?: RetailPosProduct; error?: string }> {
  const nextQty = (product.track_stock ? product.stock_quantity : 0) + 1
  const patch: Record<string, unknown> = {
    track_stock: true,
    stock_quantity: nextQty,
  }
  const r = await adminDb.update(
    'menu_products',
    patch,
    { id: product.id, tenant_slug: tenantSlug },
    { tenantSlug, select: RETAIL_SELECT },
  )
  if (!r.ok) return { ok: false, error: r.error || 'update_failed' }
  const raw = r.data as unknown
  const row = (Array.isArray(raw) ? raw[0] : raw) as Record<string, unknown> | undefined
  if (!row) return { ok: false, error: 'empty_row' }
  return { ok: true, product: mapRetailRow(row) }
}

/** Goederenontvangst: qty (en optioneel maat/kleur) van doos-barcode bijboeken. */
export async function applyRetailGoodsReceipt(
  tenantSlug: string,
  product: RetailPosProduct,
  payload: Pick<RetailScanPayload, 'quantity' | 'size_label' | 'color_label'>,
): Promise<{ ok: boolean; product?: RetailPosProduct; error?: string }> {
  const add = Math.max(1, Math.floor(payload.quantity || 1))
  const nextQty = (product.track_stock ? product.stock_quantity : 0) + add
  const patch: Record<string, unknown> = {
    track_stock: true,
    stock_quantity: nextQty,
  }
  if (payload.size_label?.trim()) patch.size_label = payload.size_label.trim()
  if (payload.color_label?.trim()) patch.color_label = payload.color_label.trim()

  const r = await adminDb.update(
    'menu_products',
    patch,
    { id: product.id, tenant_slug: tenantSlug },
    { tenantSlug, select: RETAIL_SELECT },
  )
  if (!r.ok) return { ok: false, error: r.error || 'update_failed' }
  const raw = r.data as unknown
  const row = (Array.isArray(raw) ? raw[0] : raw) as Record<string, unknown> | undefined
  if (!row) return { ok: false, error: 'empty_row' }
  return { ok: true, product: mapRetailRow(row) }
}
