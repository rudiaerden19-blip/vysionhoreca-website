import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'
import { trackError } from '@/lib/monitoring'

// Stripe Checkout sessions verlopen automatisch na 24h.
// Hergebruik wordt gestopt iets eerder (23h) zodat de klant nooit op een
// expired-URL belandt nadat hij doorklikt.
const SESSION_REUSE_MAX_AGE_MS = 23 * 60 * 60 * 1000

type OrderItem = { name?: string; price?: number; quantity?: number }

type OrderRow = {
  id: string
  tenant_slug: string | null
  total: number | null
  delivery_fee: number | null
  customer_email: string | null
  order_number: number | null
  items: OrderItem[] | null
  payment_status: string | null
  stripe_session_id: string | null
  stripe_session_url: string | null
  stripe_session_created_at: string | null
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  let tenantSlugLog: string | undefined

  try {
    const { orderId, tenantSlug, successUrl, cancelUrl } = await request.json()
    tenantSlugLog = tenantSlug

    if (!orderId || !tenantSlug) {
      return NextResponse.json({ error: 'orderId en tenantSlug zijn verplicht' }, { status: 400 })
    }

    const supabase = getServerSupabaseClient()
    if (!supabase) return NextResponse.json({ error: 'DB niet beschikbaar' }, { status: 500 })

    // Haal Stripe keys op van de tenant (server-side only)
    const { data: settings } = await supabase
      .from('tenant_settings')
      .select('stripe_secret_key, business_name')
      .eq('tenant_slug', tenantSlug)
      .single()

    if (!settings?.stripe_secret_key) {
      return NextResponse.json({ error: 'Stripe niet geconfigureerd voor deze tenant' }, { status: 400 })
    }

    // Haal order op (incl. cache-velden voor dedupe)
    const { data: orderRaw } = await supabase
      .from('orders')
      .select(
        'id, tenant_slug, total, delivery_fee, customer_email, order_number, items, payment_status, stripe_session_id, stripe_session_url, stripe_session_created_at'
      )
      .eq('id', orderId)
      .eq('tenant_slug', tenantSlug)
      .maybeSingle()
    const order = orderRaw as OrderRow | null

    if (!order) {
      return NextResponse.json({ error: 'Bestelling niet gevonden' }, { status: 404 })
    }

    // ── Al betaald? Stuur de klant niet nog eens naar Stripe. ─────────────
    if (String(order.payment_status || '').toLowerCase() === 'paid') {
      logger.info('Stripe checkout geweigerd: order al betaald', { requestId, orderId, tenantSlug })
      return NextResponse.json({ error: 'Bestelling is al betaald.' }, { status: 409 })
    }

    const stripe = new Stripe(settings.stripe_secret_key)

    // ── Hergebruik bestaande sessie als die jong genoeg is ─────────────────
    // Dit dekt: dubbele klikken, browser-back, F5 op de checkout, of de
    // klant die via de cancel-URL terugkomt op de webshop. We doen één
    // Stripe-API-call (sessions.retrieve) om zeker te weten dat de sessie
    // nog 'open' is — anders maken we een nieuwe.
    if (order.stripe_session_id && order.stripe_session_url && order.stripe_session_created_at) {
      const ageMs = Date.now() - new Date(order.stripe_session_created_at).getTime()
      if (ageMs >= 0 && ageMs < SESSION_REUSE_MAX_AGE_MS) {
        try {
          const existing = await stripe.checkout.sessions.retrieve(order.stripe_session_id)
          const stillOpen =
            existing.status === 'open' &&
            existing.payment_status !== 'paid' &&
            existing.payment_status !== 'no_payment_required'
          if (stillOpen && existing.url) {
            logger.info('Stripe checkout-sessie hergebruikt', {
              requestId,
              orderId,
              tenantSlug,
              sessionId: existing.id,
              ageMs,
            })
            return NextResponse.json({ url: existing.url, sessionId: existing.id, reused: true })
          }
          // Sessie is verlopen / al betaald / closed: nieuwe maken hieronder.
        } catch (e) {
          // Stripe-API onbereikbaar of sessie bestaat niet meer (bv. test-key
          // gewisseld). Negeren en nieuwe sessie aanmaken.
          logger.warn('Stripe sessions.retrieve faalde — maak nieuwe sessie', {
            requestId,
            orderId,
            error: e instanceof Error ? e.message : String(e),
          })
        }
      }
    }

    // ── Bouw line items op vanuit order items ─────────────────────────────
    const items: OrderItem[] = Array.isArray(order.items) ? order.items : []
    const orderTotal = Number(order.total) || 0
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.length > 0
      ? items.map((item) => ({
          price_data: {
            currency: 'eur',
            product_data: {
              name: item.name || 'Product',
            },
            unit_amount: Math.round((item.price || 0) * 100),
          },
          quantity: item.quantity || 1,
        }))
      : [{
          price_data: {
            currency: 'eur',
            product_data: { name: 'Bestelling' },
            unit_amount: Math.round(orderTotal * 100),
          },
          quantity: 1,
        }]

    if (order.delivery_fee && order.delivery_fee > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: { name: 'Bezorgkosten' },
          unit_amount: Math.round(order.delivery_fee * 100),
        },
        quantity: 1,
      })
    }

    // ── Maak nieuwe sessie aan ─────────────────────────────────────────────
    // Stripe-idempotencyKey: bij een netwerk-retry met IDENTIEKE body geeft
    // Stripe dezelfde sessie terug ipv een nieuwe (= geen dubbele sessies
    // wegens connection-resets in mobiele netwerken). Versie-suffix maakt
    // dat we een nieuwe sessie kunnen forceren als de body bewust verandert
    // (bv. nieuwe successUrl). Voor échte dedupe vertrouwen we op de DB-cache.
    const session = await stripe.checkout.sessions.create(
      {
        payment_method_types: ['bancontact', 'card'],
        line_items: lineItems,
        mode: 'payment',
        success_url:
          successUrl ||
          `${request.nextUrl.origin}/shop/${tenantSlug}?payment=success&order=${order.order_number ?? ''}`,
        cancel_url:
          cancelUrl || `${request.nextUrl.origin}/shop/${tenantSlug}/checkout?payment=cancelled`,
        customer_email: order.customer_email || undefined,
        metadata: {
          order_id: orderId,
          tenant_slug: tenantSlug,
          order_number: String(order.order_number ?? ''),
        },
      },
      {
        idempotencyKey: `checkout-${orderId}-${Math.floor(Date.now() / (60 * 60 * 1000))}`,
      }
    )

    // Cache in orders zodat een retry binnen 23h dezelfde URL terugkrijgt.
    if (session.id && session.url) {
      const { error: updateErr } = await supabase
        .from('orders')
        .update({
          stripe_session_id: session.id,
          stripe_session_url: session.url,
          stripe_session_created_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .eq('tenant_slug', tenantSlug)
      if (updateErr) {
        logger.warn('orders.stripe_session_* update faalde — sessie wel doorgestuurd', {
          requestId,
          orderId,
          error: updateErr.message,
        })
      }
    }

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Stripe fout'
    logger.error('Stripe checkout error', {
      requestId,
      error: message,
      tenantSlug: tenantSlugLog,
    })
    trackError(error, { requestId, route: '/api/stripe/create-checkout', tenantSlug: tenantSlugLog })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
