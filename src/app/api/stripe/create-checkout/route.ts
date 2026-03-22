import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { orderId, tenantSlug, successUrl, cancelUrl } = await request.json()

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

    // Haal order op
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('tenant_slug', tenantSlug)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Bestelling niet gevonden' }, { status: 404 })
    }

    const stripe = new Stripe(settings.stripe_secret_key)

    // Bouw line items op vanuit order items
    const items = Array.isArray(order.items) ? order.items : []
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.length > 0
      ? items.map((item: any) => ({
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
            unit_amount: Math.round(order.total * 100),
          },
          quantity: 1,
        }]

    // Voeg bezorgkosten toe als lijn item
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

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['bancontact', 'card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl || `${request.nextUrl.origin}/shop/${tenantSlug}?payment=success&order=${order.order_number}`,
      cancel_url: cancelUrl || `${request.nextUrl.origin}/shop/${tenantSlug}/checkout?payment=cancelled`,
      customer_email: order.customer_email || undefined,
      metadata: {
        order_id: orderId,
        tenant_slug: tenantSlug,
        order_number: String(order.order_number),
      },
    })

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (error: any) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json({ error: error.message || 'Stripe fout' }, { status: 500 })
  }
}
