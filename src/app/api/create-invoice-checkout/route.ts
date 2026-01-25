import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { tenantSlug, invoiceId, amount, description } = await request.json()

    if (!tenantSlug || !invoiceId || !amount) {
      return NextResponse.json(
        { error: 'Tenant slug, invoice ID en bedrag zijn verplicht' },
        { status: 400 }
      )
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: 'Stripe is niet geconfigureerd' },
        { status: 500 }
      )
    }

    const stripe = new Stripe(stripeSecretKey)

    const supabase = getServerSupabaseClient()
    if (!supabase) {
      console.error('Invoice checkout failed: Supabase not configured')
      return NextResponse.json(
        { error: 'Database niet geconfigureerd. Neem contact op met support.' },
        { status: 503 }
      )
    }

    // Get invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('tenant_slug', tenantSlug)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Factuur niet gevonden' },
        { status: 404 }
      )
    }

    if (invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Deze factuur is al betaald' },
        { status: 400 }
      )
    }

    // Determine base URL
    const host = request.headers.get('host') || 'ordervysion.com'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const baseUrl = `${protocol}://${host}`

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'bancontact'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: description || `Factuur ${invoice.invoice_number}`,
              description: `Vysion Horeca - ${tenantSlug}`,
            },
            unit_amount: Math.round(Number(amount) * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/shop/${tenantSlug}/admin/abonnement?payment=success&invoice=${invoiceId}`,
      cancel_url: `${baseUrl}/shop/${tenantSlug}/admin/abonnement?payment=cancelled`,
      metadata: {
        tenant_slug: tenantSlug,
        invoice_id: invoiceId,
        type: 'invoice_payment',
      },
    })

    // Update invoice with payment intent
    await supabase
      .from('invoices')
      .update({ 
        stripe_payment_intent_id: session.payment_intent as string,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)

    return NextResponse.json({ url: session.url })

  } catch (error: any) {
    console.error('Invoice checkout error:', error)
    return NextResponse.json(
      { error: error.message || 'Er ging iets mis' },
      { status: 500 }
    )
  }
}
