import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  
  try {
    const { tenantSlug, invoiceId, description } = await request.json()

    if (!tenantSlug || !invoiceId) {
      return NextResponse.json(
        { error: 'Tenant slug en invoice ID zijn verplicht' },
        { status: 400 }
      )
    }

    // Verify user has access to this tenant
    const access = await verifyTenantOrSuperAdmin(request, tenantSlug)
    if (!access.authorized) {
      logger.warn('Invoice checkout unauthorized', { requestId, tenantSlug, error: access.error })
      return NextResponse.json(
        { error: access.error || 'Geen toegang tot deze tenant' },
        { status: 403 }
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
      logger.error('Invoice checkout failed: Supabase not configured', { requestId })
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
            // SECURITY: Always use database amount, never trust client-supplied amount
            unit_amount: Math.round(Number(invoice.amount) * 100), // Convert to cents
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

  } catch (error: unknown) {
    logger.error('Invoice checkout error', { 
      requestId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Er ging iets mis' },
      { status: 500 }
    )
  }
}
