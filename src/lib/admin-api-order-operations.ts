import { supabase } from './supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getBelgiumDateString, getZRapportDateBounds } from './belgium-date-bounds'
import {
  distributeOrderPaymentForZRaport,
  isWebshopOrder,
  orderCountsTowardRevenueAndZReport,
  type Order,
} from './admin-api-order-helpers'

// =====================================================
// ORDERS / BESTELLINGEN — types & pure helpers: `./admin-api-order-helpers`
// =====================================================

/** PostgREST/Supabase cap (~1000 rows per request zonder range): analytics moet alle rijen binnen het venster ophalen. */
const ORDERS_ANALYTICS_PAGE_SIZE = 1000
const ORDERS_ANALYTICS_MAX_PAGES = 500

const ANALYTICS_ORDER_STATUS_EXCLUDE =
  '("cancelled","rejected","CANCELLED","REJECTED")' as const

/**
 * Haalt alle orders voor tenant binnen [startUTC, endUTC] op (stabiele sortering voor range-paginatie).
 * Gebruikt voor maandrapport, Z-herberekening, verkoopstats — voorkomt stilzwijgend afsnijden na 1000 orders.
 */
export async function fetchAllOrdersInCreatedAtRange(
  client: SupabaseClient,
  tenantSlug: string,
  startUTC: string,
  endUTC: string,
  selectColumns: string
): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = []
  let from = 0
  for (let page = 0; page < ORDERS_ANALYTICS_MAX_PAGES; page++) {
    const { data, error } = await client
      .from('orders')
      .select(selectColumns)
      .eq('tenant_slug', tenantSlug)
      .gte('created_at', startUTC)
      .lte('created_at', endUTC)
      .not('status', 'in', ANALYTICS_ORDER_STATUS_EXCLUDE)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + ORDERS_ANALYTICS_PAGE_SIZE - 1)

    if (error) {
      console.error('fetchAllOrdersInCreatedAtRange:', error)
      break
    }
    const chunk = (data || []) as unknown as Record<string, unknown>[]
    all.push(...chunk)
    if (chunk.length < ORDERS_ANALYTICS_PAGE_SIZE) break
    from += ORDERS_ANALYTICS_PAGE_SIZE
  }
  return all
}

/** Nieuwste orders eerst; geen impliciete 1000-limiet (PostgREST). */
async function fetchAllTenantOrdersNewestFirst(
  tenantSlug: string,
  selectColumns: string
): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = []
  let from = 0
  for (let page = 0; page < ORDERS_ANALYTICS_MAX_PAGES; page++) {
    const { data, error } = await supabase
      .from('orders')
      .select(selectColumns)
      .eq('tenant_slug', tenantSlug)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, from + ORDERS_ANALYTICS_PAGE_SIZE - 1)

    if (error) {
      console.error('fetchAllTenantOrdersNewestFirst:', error)
      break
    }
    const chunk = (data || []) as unknown as Record<string, unknown>[]
    all.push(...chunk)
    if (chunk.length < ORDERS_ANALYTICS_PAGE_SIZE) break
    from += ORDERS_ANALYTICS_PAGE_SIZE
  }
  return all
}

/** Client: Z-rapport / dagvenster — zelfde paginatie als server-side regenerateZReportForDate. */
export async function fetchAllTenantOrdersInCreatedAtRange(
  tenantSlug: string,
  startUTC: string,
  endUTC: string,
  selectColumns: string
): Promise<Record<string, unknown>[]> {
  return fetchAllOrdersInCreatedAtRange(supabase, tenantSlug, startUTC, endUTC, selectColumns)
}

/** Admin startdashboard: alle orders voor tenant (volledige rijen). */
export async function fetchAllTenantOrdersForDashboard(tenantSlug: string): Promise<Record<string, unknown>[]> {
  return fetchAllTenantOrdersNewestFirst(tenantSlug, '*')
}

/** Rapporten-UI: alle orders (nieuwste eerst), zonder 3000-limiet. */
export async function fetchAllOrdersForRapporten(tenantSlug: string): Promise<Record<string, unknown>[]> {
  return fetchAllTenantOrdersNewestFirst(
    tenantSlug,
    'id,order_number,status,payment_status,payment_method,order_type,total,subtotal,tax,discount_amount,created_at,customer_name,customer_email,items'
  )
}

export async function getOrders(tenantSlug: string, status?: string, dateFrom?: string, dateTo?: string): Promise<Order[]> {
  let query = supabase
    .from('orders')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .order('created_at', { ascending: false })
  
  if (status && status !== 'all') {
    if (status === 'active') {
      query = query.not('status', 'in', '("completed","cancelled","rejected")')
    } else {
      query = query.eq('status', status)
    }
  }

  // Archief: filter op datumbereik
  if (dateFrom) query = query.gte('created_at', dateFrom)
  if (dateTo) query = query.lte('created_at', dateTo)

  const limit = dateFrom ? 500 : 100
  const { data, error } = await query.limit(limit)
  
  if (error) {
    console.error('Error fetching orders:', error)
    return []
  }
  return data || []
}

export async function getOrderWithItems(tenantSlug: string, orderId: string): Promise<Order | null> {
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .eq('tenant_slug', tenantSlug)
    .single()
  
  if (error || !order) {
    console.error('Error fetching order:', error)
    return null
  }
  
  const { data: items } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId)
  
  return { ...order, items: items || [] }
}

export async function updateOrderStatus(
  tenantSlug: string,
  id: string,
  status: Order['status'],
  rejectionReason?: string,
  rejectionNotes?: string,
  opts?: { skipZReportSync?: boolean },
): Promise<boolean> {
  if (!supabase) {
    console.error('Supabase not configured')
    return false
  }
  
  const updateData: Record<string, unknown> = { status }
  
  // Add rejection fields if provided
  if (rejectionReason) {
    updateData.rejection_reason = rejectionReason
  }
  if (rejectionNotes) {
    updateData.rejection_notes = rejectionNotes
  }
  
  console.log('Updating order status:', tenantSlug, id, status)
  
  const { data: updated, error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', id)
    .eq('tenant_slug', tenantSlug)
    .select('created_at')
  
  if (error) {
    console.error('Error updating order status:', JSON.stringify(error, null, 2))
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    console.error('Error details:', error.details)
    return false
  }
  if (!updated?.length) {
    console.warn('updateOrderStatus: geen rij bijgewerkt (verkeerde tenant of id?)')
    return false
  }
  console.log('Order status updated successfully')

  const s = String(status).toLowerCase()
  if (
    !opts?.skipZReportSync &&
    ['completed', 'confirmed', 'preparing', 'ready', 'delivered', 'rejected', 'cancelled'].includes(
      s,
    )
  ) {
    await syncZReportAfterOrder(tenantSlug, updated[0].created_at as string)
  }

  return true
}

// Helper functie om hash te genereren (werkt in Node.js en browser)
async function generateSimpleHash(input: string): Promise<string> {
  try {
    // Probeer Web Crypto API (werkt in moderne Node.js en browsers)
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder()
      const dataBuffer = encoder.encode(input)
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    }
  } catch (e) {
    console.warn('crypto.subtle niet beschikbaar, gebruik fallback hash')
  }
  
  // Fallback: simpele hash voor als crypto.subtle niet werkt
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16).padStart(16, '0')
}

/**
 * Herbereken en upsert één Z-rapportdag (fiscale dag België).
 * Gebruikt door kassa, bevestigingen, Stripe-webhook (server client).
 */
export async function regenerateZReportForDate(
  client: SupabaseClient,
  tenantSlug: string,
  date: string
): Promise<void> {
  console.log(`regenerateZReportForDate: Start voor ${tenantSlug} op ${date}`)

  try {
    const { startUTC, endUTC } = getZRapportDateBounds(date)
    console.log(`regenerateZReportForDate: Query van ${startUTC} tot ${endUTC}`)

    const ordersRaw = await fetchAllOrdersInCreatedAtRange(
      client,
      tenantSlug,
      startUTC,
      endUTC,
      'id, total, payment_method, payment_split_cash, payment_split_card, order_type, status, payment_status'
    )

    const orders = ordersRaw.filter((o) =>
      orderCountsTowardRevenueAndZReport(
        o as Pick<Order, 'order_type' | 'status' | 'payment_status'>
      )
    ) as Array<
      Pick<
        Order,
        | 'id'
        | 'total'
        | 'payment_method'
        | 'payment_split_cash'
        | 'payment_split_card'
        | 'order_type'
        | 'status'
        | 'payment_status'
      > & { id: string }
    >

    console.log(`regenerateZReportForDate: ${orders?.length || 0} orders voor rapport`)

    if (!orders || orders.length === 0) {
      console.log('regenerateZReportForDate: Geen tellende orders, skip upsert (bestaand Z-rapport ongewijzigd)')
      return
    }

    const { data: settings } = await client
      .from('tenant_settings')
      .select('btw_percentage, business_name, address, btw_number')
      .eq('tenant_slug', tenantSlug)
      .single()

    const btwPercentage = settings?.btw_percentage || 6

    let total = 0
    let cashPayments = 0
    let onlinePayments = 0
    let cardPayments = 0
    const orderIds: string[] = []

    orders.forEach((order) => {
      orderIds.push(order.id)
      const orderTotal = order.total || 0
      total += orderTotal

      const d = distributeOrderPaymentForZRaport(order)
      cashPayments += d.cash
      cardPayments += d.card
      onlinePayments += d.online
    })

    const taxRate = btwPercentage / 100
    const subtotal = total / (1 + taxRate)
    const tax = total - subtotal

    const hashInput = JSON.stringify({
      tenant: tenantSlug,
      date: date,
      orderCount: orders.length,
      total: Math.round(total * 100),
      orderIds: orderIds.sort(),
      version: 'v1',
    })
    const reportHash = await generateSimpleHash(hashInput)

    console.log(`regenerateZReportForDate: Upsert z_report voor ${tenantSlug}, ${date}, total: €${total.toFixed(2)}`)

    const { error: upsertError } = await client
      .from('z_reports')
      .upsert(
        {
          tenant_slug: tenantSlug,
          report_date: date,
          order_count: orders.length,
          subtotal: subtotal,
          tax_low: btwPercentage === 6 ? tax : 0,
          tax_mid: btwPercentage === 12 ? tax : 0,
          tax_high: btwPercentage === 21 ? tax : 0,
          total: total,
          cash_payments: cashPayments,
          card_payments: cardPayments,
          online_payments: onlinePayments,
          btw_percentage: btwPercentage,
          business_name: settings?.business_name,
          business_address: settings?.address,
          btw_number: settings?.btw_number,
          order_ids: orderIds,
          report_hash: reportHash,
          generated_at: new Date().toISOString(),
        },
        {
          onConflict: 'tenant_slug,report_date',
          ignoreDuplicates: false,
        }
      )

    if (upsertError) {
      console.error('regenerateZReportForDate: Fout bij upsert:', upsertError)

      await client.from('z_reports').delete().eq('tenant_slug', tenantSlug).eq('report_date', date)

      const { error: insertError } = await client.from('z_reports').insert({
        tenant_slug: tenantSlug,
        report_date: date,
        order_count: orders.length,
        subtotal: subtotal,
        tax_low: btwPercentage === 6 ? tax : 0,
        tax_mid: btwPercentage === 12 ? tax : 0,
        tax_high: btwPercentage === 21 ? tax : 0,
        total: total,
        cash_payments: cashPayments,
        card_payments: cardPayments,
        online_payments: onlinePayments,
        btw_percentage: btwPercentage,
        business_name: settings?.business_name,
        business_address: settings?.address,
        btw_number: settings?.btw_number,
        order_ids: orderIds,
        report_hash: reportHash,
        generated_at: new Date().toISOString(),
      })

      if (insertError) {
        console.error('regenerateZReportForDate: Fallback insert ook gefaald:', insertError)
        return
      }
    }

    console.log(
      `✅ Z-rapport bijgewerkt voor ${tenantSlug} op ${date}: ${orders.length} bestellingen, €${total.toFixed(2)}`
    )
  } catch (error) {
    console.error('regenerateZReportForDate: Onverwachte fout:', error)
  }
}

// AUTOMATISCH: Update Z-rapport voor een specifieke dag (browser Supabase)
async function autoUpdateZReport(tenantSlug: string, date: string): Promise<void> {
  if (!supabase) {
    console.error('autoUpdateZReport: Supabase niet beschikbaar')
    return
  }
  await regenerateZReportForDate(supabase, tenantSlug, date)
}

/** Herbereken opgeslagen Z-rapportdag (België) na order — kassa-betaling, bevestiging, weigeren, … */
export async function syncZReportAfterOrder(tenantSlug: string, orderCreatedAt: string): Promise<void> {
  const dayYmd = getBelgiumDateString(new Date(orderCreatedAt))
  await autoUpdateZReport(tenantSlug, dayYmd)
}

// Confirm order (goedkeuren)
export async function confirmOrder(tenantSlug: string, id: string): Promise<boolean> {
  if (!supabase) return false
  
  const { data: updated, error } = await supabase
    .from('orders')
    .update({
      status: 'confirmed',
      confirmed_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('tenant_slug', tenantSlug)
    .select('created_at')
  
  if (error) {
    console.error('Error confirming order:', error)
    return false
  }
  if (!updated?.length) {
    console.warn('confirmOrder: geen rij bijgewerkt')
    return false
  }

  await syncZReportAfterOrder(tenantSlug, updated[0].created_at as string)

  return true
}

/**
 * Webshop: goedkeuren → confirmed — payment_status niet aanpassen (cash).
 * Online: Stripe-webhook zet `paid` — telt dan al in rapporten vóór bevestiging.
 * Rapportage gebruikt orderCountsTowardRevenueAndZReport (confirmed+ of paid).
 */
export async function approveWebshopOrder(tenantSlug: string, id: string): Promise<boolean> {
  if (!supabase) return false

  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('tenant_slug, created_at, payment_status, order_type, status')
    .eq('id', id)
    .eq('tenant_slug', tenantSlug)
    .single()

  if (fetchError || !order) {
    console.error('approveWebshopOrder: order niet gevonden', fetchError)
    return false
  }

  if (!isWebshopOrder(order)) {
    console.warn('approveWebshopOrder: geen webshop-order')
    return false
  }

  const st = (order.status || '').toLowerCase()
  if (st === 'rejected' || st === 'cancelled' || st === 'completed') {
    return false
  }

  const updates: Record<string, unknown> = {
    status: 'confirmed',
    confirmed_at: new Date().toISOString(),
  }

  const { data: updated, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', id)
    .eq('tenant_slug', tenantSlug)
    .select('id')

  if (error) {
    console.error('approveWebshopOrder:', error)
    return false
  }
  if (!updated?.length) {
    console.warn('approveWebshopOrder: geen rij bijgewerkt')
    return false
  }

  await syncZReportAfterOrder(tenantSlug, order.created_at as string)
  return true
}

/**
 * Webshop: definitief afgerond (na keuken / Afronden-knop).
 * `paid` voor online betaalmethode alleen als webhook dat al zette; nooit pending→paid voor online.
 * Cash bij afhaal: bij afronden nog pending → markeer paid (ontvangen bij afhalen).
 */
export async function completeWebshopOrder(
  tenantSlug: string,
  id: string,
  opts?: { skipZReportSync?: boolean },
): Promise<boolean> {
  if (!supabase) return false

  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('tenant_slug, created_at, payment_status, order_type, status, payment_method')
    .eq('id', id)
    .eq('tenant_slug', tenantSlug)
    .single()

  if (fetchError || !order) {
    console.error('completeWebshopOrder: order niet gevonden', fetchError)
    return false
  }

  if (!isWebshopOrder(order)) {
    console.warn('completeWebshopOrder: geen webshop-order')
    return false
  }

  const st = (order.status || '').toLowerCase()
  if (st === 'rejected' || st === 'cancelled' || st === 'completed') {
    return false
  }

  const updates: Record<string, unknown> = {
    status: 'completed',
    completed_at: new Date().toISOString(),
  }

  const ps = (order.payment_status || '').toLowerCase()
  const pm = (order.payment_method || '').toLowerCase()
  if (ps === 'pending' && pm === 'cash') {
    updates.payment_status = 'paid'
  }

  const { data: updated, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', id)
    .eq('tenant_slug', tenantSlug)
    .select('id')

  if (error) {
    console.error('completeWebshopOrder:', error)
    return false
  }
  if (!updated?.length) {
    console.warn('completeWebshopOrder: geen rij bijgewerkt')
    return false
  }

  if (!opts?.skipZReportSync) {
    await syncZReportAfterOrder(tenantSlug, order.created_at as string)
  }
  return true
}

// Reject order (weigeren)
export async function rejectOrder(
  tenantSlug: string,
  id: string,
  reason: string,
  notes?: string
): Promise<boolean> {
  if (!supabase) return false
  
  const { data: updated, error } = await supabase
    .from('orders')
    .update({ 
      status: 'rejected',
      rejection_reason: reason,
      rejection_notes: notes || null,
      rejected_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('tenant_slug', tenantSlug)
    .select('created_at')
  
  if (error) {
    console.error('Error rejecting order:', error)
    return false
  }
  if (!updated?.length) {
    console.warn('rejectOrder: geen rij bijgewerkt')
    return false
  }
  await syncZReportAfterOrder(tenantSlug, updated[0].created_at as string)
  return true
}
