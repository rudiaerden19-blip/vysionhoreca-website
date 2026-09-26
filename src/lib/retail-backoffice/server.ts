import { getServerSupabaseClient } from '@/lib/supabase-server'
import { createZohoMailTransport, assertZohoSmtpConfigured } from '@/lib/zoho-smtp'

export type RetailSupplier = {
  id: string
  name: string
  email: string | null
  phone: string | null
}

export async function listRetailSuppliers(tenantSlug: string): Promise<RetailSupplier[]> {
  const supabase = getServerSupabaseClient()
  if (!supabase) return []
  const { data } = await supabase
    .from('retail_suppliers')
    .select('id, name, email, phone')
    .eq('tenant_slug', tenantSlug)
    .order('name')
  return (data ?? []) as RetailSupplier[]
}

export async function saveRetailSupplier(
  tenantSlug: string,
  input: { id?: string; name: string; email?: string | null; phone?: string | null },
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'db_unavailable' }
  const row = {
    tenant_slug: tenantSlug,
    name: input.name.trim(),
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
  }
  if (!row.name) return { ok: false, error: 'name_required' }
  const q = input.id
    ? supabase.from('retail_suppliers').update(row).eq('tenant_slug', tenantSlug).eq('id', input.id)
    : supabase.from('retail_suppliers').insert(row)
  const { error } = await q
  return error ? { ok: false, error: error.message } : { ok: true }
}

export async function listRetailPurchaseProducts(tenantSlug: string) {
  const supabase = getServerSupabaseClient()
  if (!supabase) return { ok: false as const, error: 'db_unavailable', products: [] }
  const { data, error } = await supabase
    .from('menu_products')
    .select('id, name, barcode, cost_price, brand, supplier_id, track_stock, stock_quantity, low_stock_threshold')
    .eq('tenant_slug', tenantSlug)
    .eq('is_active', true)
    .order('name')
  if (error) return { ok: false as const, error: error.message, products: [] }
  return { ok: true as const, products: data ?? [] }
}

export async function saveRetailPurchaseFields(
  tenantSlug: string,
  productId: string,
  patch: { cost_price?: number | null; brand?: string | null; supplier_id?: string | null },
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'db_unavailable' }
  const { error } = await supabase
    .from('menu_products')
    .update({
      cost_price: patch.cost_price ?? null,
      brand: patch.brand?.trim() || null,
      supplier_id: patch.supplier_id || null,
    })
    .eq('tenant_slug', tenantSlug)
    .eq('id', productId)
  return error ? { ok: false, error: error.message } : { ok: true }
}

export async function listRetailExtraBarcodes(tenantSlug: string) {
  const supabase = getServerSupabaseClient()
  if (!supabase) return []
  const { data } = await supabase
    .from('retail_product_barcodes')
    .select('id, product_id, variant_id, barcode')
    .eq('tenant_slug', tenantSlug)
    .order('barcode')
  return data ?? []
}

export async function addRetailExtraBarcode(
  tenantSlug: string,
  input: { productId: string; variantId?: string | null; barcode: string },
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'db_unavailable' }
  const barcode = input.barcode.trim()
  if (!barcode) return { ok: false, error: 'barcode_required' }
  const { error } = await supabase.from('retail_product_barcodes').insert({
    tenant_slug: tenantSlug,
    product_id: input.productId,
    variant_id: input.variantId || null,
    barcode,
  })
  return error ? { ok: false, error: error.message } : { ok: true }
}

export async function deleteRetailExtraBarcode(tenantSlug: string, id: string) {
  const supabase = getServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'db_unavailable' }
  const { error } = await supabase
    .from('retail_product_barcodes')
    .delete()
    .eq('tenant_slug', tenantSlug)
    .eq('id', id)
  return error ? { ok: false, error: error.message } : { ok: true }
}

async function mailLowStock(tenantSlug: string, skuName: string, quantityAfter: number) {
  if (assertZohoSmtpConfigured()) return
  const supabase = getServerSupabaseClient()
  if (!supabase) return
  const { data: settings } = await supabase
    .from('tenant_settings')
    .select('email, business_name')
    .eq('tenant_slug', tenantSlug)
    .maybeSingle()
  const to = String(settings?.email || '').trim()
  if (!to.includes('@')) return
  try {
    const transport = createZohoMailTransport()
    await transport.sendMail({
      from: process.env.ZOHO_EMAIL,
      to,
      subject: `Voorraad laag: ${skuName}`,
      text: `${settings?.business_name || tenantSlug}\n${skuName} staat op ${quantityAfter}. Dat is op of onder het minimum.`,
    })
  } catch (err) {
    console.warn('[retail-stock] mail', err)
  }
}

export async function recordRetailStockMovements(
  tenantSlug: string,
  lines: {
    productId?: string | null
    variantId?: string | null
    skuName?: string | null
    reason: string
    delta: number
    quantityAfter?: number | null
    lowStockThreshold?: number | null
    quantityBefore?: number | null
  }[],
) {
  const supabase = getServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'db_unavailable' }
  const rows = lines
    .filter((l) => l.delta !== 0)
    .map((l) => ({
      tenant_slug: tenantSlug,
      product_id: l.productId || null,
      variant_id: l.variantId || null,
      sku_name: l.skuName || null,
      reason: l.reason,
      quantity_delta: Math.trunc(l.delta),
      quantity_after: l.quantityAfter == null ? null : Math.trunc(l.quantityAfter),
    }))
  if (rows.length === 0) return { ok: true }
  const { error } = await supabase.from('retail_stock_movements').insert(rows)
  if (error) return { ok: false, error: error.message }
  for (const line of lines) {
    const after = line.quantityAfter
    const before = line.quantityBefore
    const min = line.lowStockThreshold
    if (after == null || min == null) continue
    const crossed = (before == null || before > min) && after <= min
    if (crossed) await mailLowStock(tenantSlug, line.skuName || 'Artikel', after)
  }
  return { ok: true }
}

export async function listRetailStockMovements(tenantSlug: string) {
  const supabase = getServerSupabaseClient()
  if (!supabase) return []
  const { data } = await supabase
    .from('retail_stock_movements')
    .select('id, sku_name, reason, quantity_delta, quantity_after, created_at')
    .eq('tenant_slug', tenantSlug)
    .order('created_at', { ascending: false })
    .limit(400)
  return data ?? []
}

export async function nextRetailInvoiceNumber(tenantSlug: string): Promise<{ ok: boolean; number?: string; error?: string }> {
  const supabase = getServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'db_unavailable' }
  const { data: existing } = await supabase
    .from('retail_invoice_counters')
    .select('last_number')
    .eq('tenant_slug', tenantSlug)
    .maybeSingle()
  const next = (Number(existing?.last_number) || 0) + 1
  const { error } = await supabase.from('retail_invoice_counters').upsert(
    { tenant_slug: tenantSlug, last_number: next },
    { onConflict: 'tenant_slug' },
  )
  if (error) return { ok: false, error: error.message }
  return { ok: true, number: String(next) }
}

export async function listRetailMemberPurchases(tenantSlug: string, memberId: string) {
  const supabase = getServerSupabaseClient()
  if (!supabase) return []
  const { data } = await supabase
    .from('orders')
    .select('id, order_number, total, created_at, payment_method, retail_invoice_number')
    .eq('tenant_slug', tenantSlug)
    .eq('retail_loyalty_member_id', memberId)
    .order('created_at', { ascending: false })
    .limit(80)
  return data ?? []
}

export async function lookupRetailGiftCard(tenantSlug: string, code: string) {
  const supabase = getServerSupabaseClient()
  if (!supabase) return { ok: false as const, error: 'db_unavailable' }
  const { data, error } = await supabase
    .from('gift_cards')
    .select('id, code, remaining_amount, status')
    .eq('tenant_slug', tenantSlug)
    .eq('code', code.trim())
    .maybeSingle()
  if (error) return { ok: false as const, error: error.message }
  if (!data) return { ok: false as const, error: 'not_found' }
  if (data.status !== 'paid' || !(Number(data.remaining_amount) > 0)) {
    return { ok: false as const, error: 'not_redeemable' }
  }
  return {
    ok: true as const,
    card: {
      id: data.id as string,
      code: data.code as string,
      remaining_amount: Number(data.remaining_amount) || 0,
    },
  }
}

export async function redeemRetailGiftCard(tenantSlug: string, giftCardId: string, amount: number) {
  const supabase = getServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'db_unavailable' }
  const euro = Math.round(Math.max(0, amount) * 100) / 100
  if (!(euro > 0)) return { ok: false, error: 'zero' }
  const { data, error } = await supabase
    .from('gift_cards')
    .select('remaining_amount, status')
    .eq('tenant_slug', tenantSlug)
    .eq('id', giftCardId)
    .maybeSingle()
  if (error || !data) return { ok: false, error: error?.message || 'not_found' }
  const next = Math.round((Number(data.remaining_amount) - euro) * 100) / 100
  if (next < -0.001) return { ok: false, error: 'insufficient' }
  const remaining = Math.max(0, next)
  const { error: updErr } = await supabase
    .from('gift_cards')
    .update({
      remaining_amount: remaining,
      status: remaining === 0 ? 'used' : 'paid',
      used_at: remaining === 0 ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_slug', tenantSlug)
    .eq('id', giftCardId)
  return updErr ? { ok: false, error: updErr.message } : { ok: true }
}

export async function listRetailPurchaseOrders(tenantSlug: string) {
  const supabase = getServerSupabaseClient()
  if (!supabase) return []
  const { data: orders } = await supabase
    .from('retail_purchase_orders')
    .select('id, supplier_id, status, created_at')
    .eq('tenant_slug', tenantSlug)
    .order('created_at', { ascending: false })
    .limit(80)
  const ids = (orders ?? []).map((o) => o.id)
  if (ids.length === 0) return []
  const { data: lines } = await supabase
    .from('retail_purchase_order_lines')
    .select('id, purchase_order_id, product_id, variant_id, quantity, cost_price, received_quantity')
    .eq('tenant_slug', tenantSlug)
    .in('purchase_order_id', ids)
  return (orders ?? []).map((order) => ({
    ...order,
    lines: (lines ?? []).filter((l) => l.purchase_order_id === order.id),
  }))
}

export async function createRetailPurchaseOrder(
  tenantSlug: string,
  input: {
    supplierId?: string | null
    lines: { productId: string; variantId?: string | null; quantity: number; costPrice?: number | null }[]
  },
) {
  const supabase = getServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'db_unavailable' }
  const lines = input.lines.filter((l) => l.quantity > 0 && l.productId)
  if (lines.length === 0) return { ok: false, error: 'empty' }
  const { data, error } = await supabase
    .from('retail_purchase_orders')
    .insert({ tenant_slug: tenantSlug, supplier_id: input.supplierId || null, status: 'open' })
    .select('id')
    .single()
  if (error || !data) return { ok: false, error: error?.message || 'insert_failed' }
  const { error: lineErr } = await supabase.from('retail_purchase_order_lines').insert(
    lines.map((l) => ({
      tenant_slug: tenantSlug,
      purchase_order_id: data.id,
      product_id: l.productId,
      variant_id: l.variantId || null,
      quantity: Math.floor(l.quantity),
      cost_price: l.costPrice ?? null,
    })),
  )
  if (lineErr) return { ok: false, error: lineErr.message }
  return { ok: true, id: data.id as string }
}

export async function receiveRetailPurchaseOrder(tenantSlug: string, orderId: string) {
  const supabase = getServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'db_unavailable' }
  const { data: lines, error } = await supabase
    .from('retail_purchase_order_lines')
    .select('id, product_id, variant_id, quantity, received_quantity, cost_price')
    .eq('tenant_slug', tenantSlug)
    .eq('purchase_order_id', orderId)
  if (error) return { ok: false, error: error.message }
  for (const line of lines ?? []) {
    const open = Math.max(0, Number(line.quantity) - Number(line.received_quantity || 0))
    if (open <= 0) continue
    const table = line.variant_id ? 'menu_product_variants' : 'menu_products'
    const id = line.variant_id || line.product_id
    const { data: row } = await supabase
      .from(table)
      .select('stock_quantity, track_stock')
      .eq('tenant_slug', tenantSlug)
      .eq('id', id)
      .maybeSingle()
    const before = Number(row?.stock_quantity) || 0
    const after = before + open
    await supabase
      .from(table)
      .update({ stock_quantity: after, track_stock: true })
      .eq('tenant_slug', tenantSlug)
      .eq('id', id)
    if (!line.variant_id && line.cost_price != null) {
      await supabase
        .from('menu_products')
        .update({ cost_price: line.cost_price })
        .eq('tenant_slug', tenantSlug)
        .eq('id', line.product_id)
    }
    await supabase
      .from('retail_purchase_order_lines')
      .update({ received_quantity: Number(line.quantity) })
      .eq('tenant_slug', tenantSlug)
      .eq('id', line.id)
    await recordRetailStockMovements(tenantSlug, [
      {
        productId: line.product_id,
        variantId: line.variant_id,
        skuName: (row as { name?: string } | null)?.name || null,
        reason: 'purchase',
        delta: open,
        quantityAfter: after,
        quantityBefore: before,
      },
    ])
  }
  await supabase
    .from('retail_purchase_orders')
    .update({ status: 'received' })
    .eq('tenant_slug', tenantSlug)
    .eq('id', orderId)
  return { ok: true }
}

export async function listRetailReorderSuggestions(tenantSlug: string) {
  const supabase = getServerSupabaseClient()
  if (!supabase) return []
  const products = await listRetailPurchaseProducts(tenantSlug)
  if (!products.ok) return []
  const { data: openLines } = await supabase
    .from('retail_purchase_order_lines')
    .select('product_id, purchase_order_id, quantity, received_quantity')
    .eq('tenant_slug', tenantSlug)
  const { data: openOrders } = await supabase
    .from('retail_purchase_orders')
    .select('id, status')
    .eq('tenant_slug', tenantSlug)
    .eq('status', 'open')
  const openIds = new Set((openOrders ?? []).map((o) => o.id))
  const covered = new Set(
    (openLines ?? [])
      .filter((l) => openIds.has(l.purchase_order_id) && Number(l.quantity) > Number(l.received_quantity || 0))
      .map((l) => l.product_id),
  )
  return products.products.filter((p) => {
    const row = p as { track_stock?: boolean; stock_quantity?: number; low_stock_threshold?: number; id: string }
    if (!row.track_stock) return false
    const qty = Number(row.stock_quantity) || 0
    const min = Number(row.low_stock_threshold) || 0
    return qty <= min && !covered.has(row.id)
  })
}
