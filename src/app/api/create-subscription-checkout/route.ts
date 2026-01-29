import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import { logger } from '@/lib/logger'

// Plan pricing in cents
const planPrices: Record<string, number> = {
  starter: 6900,  // €69
  pro: 7900,      // €79
}

const planNames: Record<string, string> = {
  starter: 'Vysion Starter',
  pro: 'Vysion Pro',
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  
  try {
    // Validate Supabase configuration
    const supabase = getServerSupabaseClient()
    if (!supabase) {
      logger.error('Subscription checkout failed: Supabase not configured', { requestId })
      return NextResponse.json(
        { error: 'Database niet geconfigureerd. Neem contact op met support.' },
        { status: 503 }
      )
    }

    const { tenantSlug, planId } = await request.json()

    if (!tenantSlug || !planId) {
      return NextResponse.json(
        { error: 'Ontbrekende gegevens' },
        { status: 400 }
      )
    }

    // Verify user has access to this tenant
    const access = await verifyTenantOrSuperAdmin(request, tenantSlug)
    if (!access.authorized) {
      logger.warn('Subscription checkout unauthorized', { requestId, tenantSlug, error: access.error })
      return NextResponse.json(
        { error: access.error || 'Geen toegang tot deze tenant' },
        { status: 403 }
      )
    }

    // Check if Stripe is configured
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: 'Betalingen zijn nog niet geconfigureerd. Neem contact op met support.' },
        { status: 500 }
      )
    }

    // Get tenant info
    const { data: tenant, error: tenantError } = await supabase
      .from('tenant_settings')
      .select('business_name, email')
      .eq('tenant_slug', tenantSlug)
      .single()

    if (tenantError) {
      logger.error('Tenant lookup error', { requestId, tenantSlug, error: tenantError.message })
      return NextResponse.json(
        { error: `Tenant niet gevonden: ${tenantSlug}` },
        { status: 404 }
      )
    }
    
    if (!tenant) {
      return NextResponse.json(
        { error: `Geen tenant gevonden met slug: ${tenantSlug}` },
        { status: 404 }
      )
    }
    
    if (!tenant.email) {
      return NextResponse.json(
        { error: 'Tenant heeft geen email adres ingesteld' },
        { status: 400 }
      )
    }

    // Get or create subscription record
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('tenant_slug', tenantSlug)
      .single()

    const price = planPrices[planId] || planPrices.starter
    const planName = planNames[planId] || planNames.starter

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey)

    // Create Stripe Checkout Session for subscription
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: tenant.email,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: planName,
              description: `Maandelijks abonnement voor ${tenant.business_name}`,
            },
            unit_amount: price,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          tenant_slug: tenantSlug,
          plan_id: planId,
        },
      },
      metadata: {
        tenant_slug: tenantSlug,
        plan_id: planId,
        subscription_id: subscription?.id || '',
      },
      success_url: `${request.headers.get('origin')}/shop/${tenantSlug}/admin/abonnement?success=true`,
      cancel_url: `${request.headers.get('origin')}/shop/${tenantSlug}/admin/abonnement?cancelled=true`,
      allow_promotion_codes: true,
    })

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    })

  } catch (error: unknown) {
    logger.error('Subscription checkout error', { 
      requestId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Er ging iets mis bij het aanmaken van de betaling' },
      { status: 500 }
    )
  }
}
