import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) return NextResponse.json({ error: 'Stripe niet geconfigureerd' }, { status: 503 })

    const {
      reservationId,
      tenantSlug,
      guestName,
      guestEmail,
      depositAmount,
      reservationDate,
      reservationTime,
      businessName,
    } = await request.json()

    const stripe = new Stripe(stripeKey)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${tenantSlug}.vysionhoreca.com`

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: guestEmail || undefined,
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Reservatie borg - ${businessName}`,
            description: `${reservationDate} om ${reservationTime} - ${guestName}`,
          },
          unit_amount: Math.round(depositAmount * 100),
        },
        quantity: 1,
      }],
      metadata: { reservationId, tenantSlug },
      success_url: `${baseUrl}/shop/${tenantSlug}/reserveren/bevestiging?session_id={CHECKOUT_SESSION_ID}&reservation_id=${reservationId}`,
      cancel_url: `${baseUrl}/shop/${tenantSlug}/reserveren?cancelled=1`,
    })

    // Update reservatie met session id
    const supabase = getServerSupabaseClient()
    if (supabase) {
      await supabase.from('reservations').update({
        stripe_session_id: session.id,
        payment_status: 'pending',
        deposit_amount: depositAmount,
      }).eq('id', reservationId)
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Reservation deposit error:', error)
    return NextResponse.json({ error: 'Betaling aanmaken mislukt' }, { status: 500 })
  }
}
