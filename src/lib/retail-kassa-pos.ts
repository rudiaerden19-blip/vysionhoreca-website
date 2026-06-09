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
  track_stock: boolean
  stock_quantity: number
}

export type RetailCartLine = {
  product: RetailPosProduct
  quantity: number
}

const RETAIL_SELECT =
  'id, name, description, price, article_number, barcode, size_label, track_stock, stock_quantity'

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
    track_stock: !!p.track_stock,
    stock_quantity: Number(p.stock_quantity) || 0,
  }))
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
