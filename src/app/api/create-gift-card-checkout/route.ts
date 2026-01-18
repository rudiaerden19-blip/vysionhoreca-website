import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      tenantSlug, 
      amount, 
      occasion, 
      personalMessage, 
      senderName, 
      senderEmail, 
      recipientName, 
      recipientEmail 
    } = body

    // Validate required fields
    if (!tenantSlug || !amount || !recipientEmail) {
      return NextResponse.json(
        { error: 'Ontbrekende velden' },
        { status: 400 }
      )
    }

    // Get tenant's Stripe key
    const { data: tenant, error: tenantError } = await supabase
      .from('tenant_settings')
      .select('stripe_secret_key, business_name')
      .eq('tenant_slug', tenantSlug)
      .single()

    if (tenantError || !tenant?.stripe_secret_key) {
      return NextResponse.json(
        { error: 'Stripe niet geconfigureerd voor deze zaak' },
        { status: 400 }
      )
    }

    // Initialize Stripe with tenant's key
    const stripe = new Stripe(tenant.stripe_secret_key, {
      apiVersion: '2023-10-16',
    })

    // Generate unique gift card code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 12; i++) {
      if (i > 0 && i % 4 === 0) code += '-'
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    // Create gift card record (pending)
    const { data: giftCard, error: giftCardError } = await supabase
      .from('gift_cards')
      .insert({
        tenant_slug: tenantSlug,
        code,
        amount: amount,
        remaining_amount: amount,
        occasion,
        personal_message: personalMessage,
        sender_name: senderName,
        sender_email: senderEmail,
        recipient_name: recipientName,
        recipient_email: recipientEmail,
        status: 'pending',
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      })
      .select()
      .single()

    if (giftCardError) {
      console.error('Gift card creation error:', giftCardError)
      return NextResponse.json(
        { error: 'Kon cadeaubon niet aanmaken' },
        { status: 500 }
      )
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'bancontact', 'ideal'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Cadeaubon ${tenant.business_name}`,
              description: occasion ? `Gelegenheid: ${occasion}` : 'Cadeaubon',
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${request.headers.get('origin')}/shop/${tenantSlug}?gift_card_success=true&code=${code}`,
      cancel_url: `${request.headers.get('origin')}/shop/${tenantSlug}?gift_card_cancelled=true`,
      customer_email: senderEmail,
      metadata: {
        gift_card_id: giftCard.id,
        tenant_slug: tenantSlug,
        recipient_email: recipientEmail,
      },
    })

    // Update gift card with Stripe session ID
    await supabase
      .from('gift_cards')
      .update({ stripe_payment_id: session.id })
      .eq('id', giftCard.id)

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url,
    })

  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Er ging iets mis bij het aanmaken van de betaling' },
      { status: 500 }
    )
  }
}
