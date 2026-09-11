import Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { regenerateZReportForDate } from '@/lib/admin-api'
import { getBelgiumDateString } from '@/lib/belgium-date-bounds'
import { businessDayForOrder, fetchOpeningHoursForTenant } from '@/lib/tenant-business-day'
import {
  isStripeOnlineCheckoutSecretConfigured,
  stripeCheckoutSessionIsPaid,
} from '@/lib/webshop-online-payment'

type PendingOnlineOrder = {
  id: string
  order_number: number | null
  stripe_session_id: string | null
  payment_status: string | null
  status: string | null
  created_at: string | null
}

async function findPaidStripeSession(
  stripe: Stripe,
  order: PendingOnlineOrder,
  tenantSlug: string,
): Promise<Stripe.Checkout.Session | null> {
  if (order.stripe_session_id) {
    try {
      const existing = await stripe.checkout.sessions.retrieve(order.stripe_session_id)
      if (stripeCheckoutSessionIsPaid(existing)) return existing
    } catch {
      // sessie hoort bij andere key of is weg — zoek via metadata
    }
  }

  const listed = await stripe.checkout.sessions.list({ limit: 40 })
  const match = listed.data.find((session) => {
    const meta = session.metadata || {}
    const sameOrder =
      meta.order_id === order.id ||
      (order.order_number != null && String(meta.order_number) === String(order.order_number))
    return sameOrder && meta.tenant_slug === tenantSlug && stripeCheckoutSessionIsPaid(session)
  })
  return match || null
}

async function markOrderPaid(
  supabase: SupabaseClient,
  tenantSlug: string,
  order: PendingOnlineOrder,
): Promise<void> {
  const updates: { payment_status: string; updated_at: string; status?: string } = {
    payment_status: 'paid',
    updated_at: new Date().toISOString(),
  }
  if ((order.status || '').toLowerCase() === 'awaiting_payment') {
    updates.status = 'new'
  }
  await supabase
    .from('orders')
    .update(updates)
    .eq('id', order.id)
    .eq('tenant_slug', tenantSlug)

  if (order.created_at) {
    const hours = await fetchOpeningHoursForTenant(supabase, tenantSlug)
    const dayYmd =
      businessDayForOrder(order.created_at, hours) ?? getBelgiumDateString(new Date(order.created_at))
    await regenerateZReportForDate(supabase, tenantSlug, dayYmd)
  }
}

/** Zet webshop-orders op betaald als Stripe van déze zaak dat bevestigt. */
export async function syncTenantWebshopStripePayments(
  supabase: SupabaseClient,
  tenantSlug: string,
  orderNumber?: number,
): Promise<{ updated: number }> {
  const { data: settings } = await supabase
    .from('tenant_settings')
    .select('stripe_secret_key')
    .eq('tenant_slug', tenantSlug)
    .maybeSingle()

  const secret = (settings as { stripe_secret_key?: string | null } | null)?.stripe_secret_key
  if (!isStripeOnlineCheckoutSecretConfigured(secret)) {
    return { updated: 0 }
  }

  const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  let query = supabase
    .from('orders')
    .select('id, order_number, stripe_session_id, payment_status, status, created_at')
    .eq('tenant_slug', tenantSlug)
    .eq('payment_method', 'online')
    .in('payment_status', ['pending', 'failed'])
    .gte('created_at', since)

  if (orderNumber != null && Number.isFinite(orderNumber)) {
    query = query.eq('order_number', orderNumber)
  }

  const { data: rows } = await query.limit(40)
  const orders = (rows || []) as PendingOnlineOrder[]
  if (orders.length === 0) return { updated: 0 }

  const stripe = new Stripe(String(secret).trim())
  let updated = 0
  for (const order of orders) {
    const session = await findPaidStripeSession(stripe, order, tenantSlug)
    if (!session) continue
    await markOrderPaid(supabase, tenantSlug, order)
    updated += 1
  }
  return { updated }
}
