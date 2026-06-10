import { getServerSupabaseClient } from '@/lib/supabase-server'
import { generateRetailStoreCreditCode, normalizeRetailStoreCreditCode } from '@/lib/retail-store-credit/code'
import type {
  RetailOrderLineForReturn,
  RetailStoreCreditIssueResult,
  RetailStoreCreditPos,
  RetailStoreCreditReturnedItem,
} from '@/lib/retail-store-credit/types'

type OrderItemRow = {
  product_id?: string
  variant_id?: string | null
  name?: string
  price?: number
  quantity?: number
}

function lineKey(productId: string, variantId: string | null | undefined): string {
  return `${productId}:${variantId ?? ''}`
}

function parseOrderItems(items: unknown): OrderItemRow[] {
  if (!Array.isArray(items)) return []
  return items.filter((x) => x && typeof x === 'object') as OrderItemRow[]
}

async function sumReturnedQtyByLine(
  supabase: NonNullable<ReturnType<typeof getServerSupabaseClient>>,
  tenantSlug: string,
  sourceOrderNumber: number,
): Promise<Map<string, number>> {
  const { data } = await supabase
    .from('retail_store_credits')
    .select('returned_items, status')
    .eq('tenant_slug', tenantSlug)
    .eq('source_order_number', sourceOrderNumber)
    .neq('status', 'void')

  const out = new Map<string, number>()
  for (const row of data || []) {
    const items = row.returned_items as RetailStoreCreditReturnedItem[] | null
    if (!Array.isArray(items)) continue
    for (const it of items) {
      if (!it?.product_id) continue
      const k = lineKey(it.product_id, it.variant_id)
      out.set(k, (out.get(k) ?? 0) + Math.max(0, Number(it.quantity) || 0))
    }
  }
  return out
}

export async function lookupRetailOrderForReturn(
  tenantSlug: string,
  orderNumber: number,
): Promise<{ ok: boolean; error?: string; orderId?: string; lines?: RetailOrderLineForReturn[] }> {
  const supabase = getServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'db_unavailable' }
  if (!(orderNumber > 0)) return { ok: false, error: 'invalid_order_number' }

  const { data: order, error } = await supabase
    .from('orders')
    .select('id, order_number, payment_status, items, total')
    .eq('tenant_slug', tenantSlug)
    .eq('order_number', orderNumber)
    .maybeSingle()

  if (error) return { ok: false, error: error.message }
  if (!order) return { ok: false, error: 'order_not_found' }
  if (String(order.payment_status || '').toLowerCase() !== 'paid') {
    return { ok: false, error: 'order_not_paid' }
  }
  const total = Number(order.total) || 0
  if (total < 0) return { ok: false, error: 'order_is_credit_note' }

  const returnedMap = await sumReturnedQtyByLine(supabase, tenantSlug, orderNumber)
  const lines: RetailOrderLineForReturn[] = []
  for (const it of parseOrderItems(order.items)) {
    const productId = String(it.product_id || '').trim()
    if (!productId) continue
    const variantId = it.variant_id ? String(it.variant_id) : null
    const sold = Math.max(0, Math.floor(Number(it.quantity) || 0))
    if (sold <= 0) continue
    const k = lineKey(productId, variantId)
    const already = returnedMap.get(k) ?? 0
    const returnable = Math.max(0, sold - already)
    lines.push({
      lineKey: k,
      product_id: productId,
      variant_id: variantId,
      name: String(it.name || 'Artikel'),
      price: Math.round((Number(it.price) || 0) * 100) / 100,
      quantitySold: sold,
      quantityReturned: already,
      quantityReturnable: returnable,
    })
  }

  if (lines.length === 0) return { ok: false, error: 'no_items' }
  if (lines.every((l) => l.quantityReturnable <= 0)) {
    return { ok: false, error: 'already_fully_returned' }
  }

  return { ok: true, orderId: order.id, lines }
}

async function restockReturnedItem(
  supabase: NonNullable<ReturnType<typeof getServerSupabaseClient>>,
  tenantSlug: string,
  item: RetailStoreCreditReturnedItem,
): Promise<void> {
  const qty = Math.max(0, Math.floor(item.quantity))
  if (qty <= 0) return

  if (item.variant_id) {
    const { data: row } = await supabase
      .from('menu_product_variants')
      .select('stock_quantity, track_stock')
      .eq('tenant_slug', tenantSlug)
      .eq('id', item.variant_id)
      .maybeSingle()
    if (!row?.track_stock) return
    const next = Math.max(0, (Number(row.stock_quantity) || 0) + qty)
    await supabase
      .from('menu_product_variants')
      .update({ stock_quantity: next, track_stock: true })
      .eq('id', item.variant_id)
      .eq('tenant_slug', tenantSlug)
    return
  }

  const { data: row } = await supabase
    .from('menu_products')
    .select('stock_quantity, track_stock')
    .eq('tenant_slug', tenantSlug)
    .eq('id', item.product_id)
    .maybeSingle()
  if (!row?.track_stock) return
  const next = Math.max(0, (Number(row.stock_quantity) || 0) + qty)
  await supabase
    .from('menu_products')
    .update({ stock_quantity: next, track_stock: true })
    .eq('id', item.product_id)
    .eq('tenant_slug', tenantSlug)
}

export async function issueRetailStoreCredit(
  tenantSlug: string,
  sourceOrderNumber: number,
  returnLines: { lineKey: string; quantity: number }[],
  opts?: { kassaStaffId?: string | null },
): Promise<RetailStoreCreditIssueResult> {
  const supabase = getServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'db_unavailable' }

  const lookup = await lookupRetailOrderForReturn(tenantSlug, sourceOrderNumber)
  if (!lookup.ok || !lookup.lines || !lookup.orderId) {
    return { ok: false, error: lookup.error || 'lookup_failed' }
  }

  const byKey = new Map(lookup.lines.map((l) => [l.lineKey, l]))
  const returnedItems: RetailStoreCreditReturnedItem[] = []
  let amount = 0

  for (const req of returnLines) {
    const qty = Math.floor(Number(req.quantity) || 0)
    if (qty <= 0) continue
    const line = byKey.get(req.lineKey)
    if (!line) return { ok: false, error: 'invalid_line' }
    if (qty > line.quantityReturnable) return { ok: false, error: 'qty_exceeds_returnable' }
    returnedItems.push({
      product_id: line.product_id,
      variant_id: line.variant_id,
      name: line.name,
      price: line.price,
      quantity: qty,
    })
    amount += line.price * qty
  }

  if (returnedItems.length === 0) return { ok: false, error: 'empty_return' }
  amount = Math.round(amount * 100) / 100
  if (!(amount > 0)) return { ok: false, error: 'zero_amount' }

  let creditCode = generateRetailStoreCreditCode()
  for (let attempt = 0; attempt < 8; attempt++) {
    const { data: clash } = await supabase
      .from('retail_store_credits')
      .select('id')
      .eq('tenant_slug', tenantSlug)
      .eq('credit_code', creditCode)
      .maybeSingle()
    if (!clash) break
    creditCode = generateRetailStoreCreditCode()
  }

  const createdAt = new Date()
  const subtotal = Math.round((amount / 1.21) * 100) / 100
  const tax = Math.round((amount - subtotal) * 100) / 100
  const negItems = returnedItems.map((it) => ({
    product_id: it.product_id,
    variant_id: it.variant_id,
    name: it.name,
    price: it.price,
    quantity: -it.quantity,
  }))

  const creditNotePayload: Record<string, unknown> = {
    tenant_slug: tenantSlug,
    customer_name: 'Winkel — tegoedbon',
    status: 'confirmed',
    payment_status: 'paid',
    payment_method: 'STORE_CREDIT',
    order_type: 'TAKEAWAY',
    subtotal: -subtotal,
    tax: -tax,
    total: -amount,
    items: negItems,
    retail_source_order_number: sourceOrderNumber,
    retail_credit_code: creditCode,
    created_at: createdAt.toISOString(),
  }

  const { data: noteRow, error: noteErr } = await supabase
    .from('orders')
    .insert(creditNotePayload)
    .select('id, order_number')
    .single()

  if (noteErr || !noteRow) {
    return { ok: false, error: noteErr?.message || 'credit_note_failed' }
  }

  const creditNoteOrderNumber = Number(noteRow.order_number) || undefined

  const { data: creditRow, error: creditErr } = await supabase
    .from('retail_store_credits')
    .insert({
      tenant_slug: tenantSlug,
      credit_code: creditCode,
      source_order_number: sourceOrderNumber,
      source_order_id: lookup.orderId,
      credit_note_order_number: creditNoteOrderNumber ?? null,
      amount_initial: amount,
      amount_remaining: amount,
      returned_items: returnedItems,
      status: 'active',
      kassa_staff_id: opts?.kassaStaffId ?? null,
    })
    .select('id, credit_code, source_order_number, amount_initial, amount_remaining, status')
    .single()

  if (creditErr || !creditRow) {
    return { ok: false, error: creditErr?.message || 'credit_insert_failed' }
  }

  for (const it of returnedItems) {
    await restockReturnedItem(supabase, tenantSlug, it)
  }

  const credit: RetailStoreCreditPos = {
    id: creditRow.id,
    credit_code: creditRow.credit_code,
    source_order_number: Number(creditRow.source_order_number),
    amount_initial: Number(creditRow.amount_initial),
    amount_remaining: Number(creditRow.amount_remaining),
    status: creditRow.status,
  }

  return { ok: true, credit, creditNoteOrderNumber }
}

export async function lookupRetailStoreCreditByCode(
  tenantSlug: string,
  rawCode: string,
): Promise<{ ok: boolean; error?: string; credit?: RetailStoreCreditPos }> {
  const supabase = getServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'db_unavailable' }
  const code = normalizeRetailStoreCreditCode(rawCode)
  if (!code) return { ok: false, error: 'invalid_code' }

  const { data, error } = await supabase
    .from('retail_store_credits')
    .select('id, credit_code, source_order_number, amount_initial, amount_remaining, status')
    .eq('tenant_slug', tenantSlug)
    .eq('credit_code', code)
    .maybeSingle()

  if (error) return { ok: false, error: error.message }
  if (!data) return { ok: false, error: 'not_found' }
  if (data.status === 'void') return { ok: false, error: 'void' }
  const remaining = Number(data.amount_remaining) || 0
  if (remaining <= 0 || data.status === 'depleted') {
    return { ok: false, error: 'depleted' }
  }

  return {
    ok: true,
    credit: {
      id: data.id,
      credit_code: data.credit_code,
      source_order_number: Number(data.source_order_number),
      amount_initial: Number(data.amount_initial),
      amount_remaining: remaining,
      status: data.status,
    },
  }
}

export async function redeemRetailStoreCredit(
  tenantSlug: string,
  creditId: string,
  amount: number,
  orderId: string,
  orderNumber: number,
): Promise<{ ok: boolean; error?: string; remaining?: number }> {
  const supabase = getServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'db_unavailable' }
  const euro = Math.round(amount * 100) / 100
  if (!(euro > 0)) return { ok: false, error: 'invalid_amount' }

  const { data: credit, error: fetchErr } = await supabase
    .from('retail_store_credits')
    .select('id, amount_remaining, status')
    .eq('tenant_slug', tenantSlug)
    .eq('id', creditId)
    .maybeSingle()

  if (fetchErr) return { ok: false, error: fetchErr.message }
  if (!credit) return { ok: false, error: 'not_found' }
  if (credit.status === 'void') return { ok: false, error: 'void' }

  const remainingBefore = Number(credit.amount_remaining) || 0
  if (euro > remainingBefore + 0.001) return { ok: false, error: 'insufficient_balance' }

  const remainingAfter = Math.round((remainingBefore - euro) * 100) / 100
  const nextStatus = remainingAfter <= 0 ? 'depleted' : 'active'

  const { error: upErr } = await supabase
    .from('retail_store_credits')
    .update({
      amount_remaining: Math.max(0, remainingAfter),
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', creditId)
    .eq('tenant_slug', tenantSlug)

  if (upErr) return { ok: false, error: upErr.message }

  const { error: redErr } = await supabase.from('retail_store_credit_redemptions').insert({
    tenant_slug: tenantSlug,
    credit_id: creditId,
    order_id: orderId,
    order_number: orderNumber,
    amount: euro,
  })

  if (redErr) return { ok: false, error: redErr.message }

  await supabase
    .from('orders')
    .update({
      retail_store_credit_id: creditId,
      retail_store_credit_applied: euro,
    })
    .eq('id', orderId)
    .eq('tenant_slug', tenantSlug)

  return { ok: true, remaining: Math.max(0, remainingAfter) }
}
