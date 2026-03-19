import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

// Maakt een SetupIntent aan voor no-show bescherming
// Kaart wordt bewaard maar NIET belast - alleen bij no-show

export async function POST(request: NextRequest) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) return NextResponse.json({ error: 'Stripe niet geconfigureerd' }, { status: 503 })

    const { guestEmail, guestName, reservationId, tenantSlug } = await request.json()

    const stripe = new Stripe(stripeKey)

    // Maak of haal klant op
    let customerId: string | undefined
    if (guestEmail) {
      const existing = await stripe.customers.list({ email: guestEmail, limit: 1 })
      if (existing.data.length > 0) {
        customerId = existing.data[0].id
      } else {
        const customer = await stripe.customers.create({ email: guestEmail, name: guestName })
        customerId = customer.id
      }
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      metadata: { reservationId, tenantSlug },
      usage: 'off_session',
    })

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId,
    })
  } catch (error) {
    console.error('Card auth error:', error)
    return NextResponse.json({ error: 'Kaart registratie mislukt' }, { status: 500 })
  }
}

// Belast kaart bij no-show
export async function PUT(request: NextRequest) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) return NextResponse.json({ error: 'Stripe niet geconfigureerd' }, { status: 503 })

    const { paymentMethodId, customerId, amount, businessName, guestName } = await request.json()

    const stripe = new Stripe(stripeKey)

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'eur',
      customer: customerId,
      payment_method: paymentMethodId,
      confirm: true,
      off_session: true,
      description: `No-show kost - ${guestName} bij ${businessName}`,
    })

    return NextResponse.json({ success: true, paymentIntentId: paymentIntent.id })
  } catch (error) {
    console.error('No-show charge error:', error)
    return NextResponse.json({ error: 'Betaling mislukt' }, { status: 500 })
  }
}
