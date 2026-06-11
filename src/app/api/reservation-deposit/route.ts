import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'
import { apiRateLimiter, checkRateLimit, getClientIP } from '@/lib/rate-limit'

/**
 * Public route — wordt aangeroepen door een gast die zojuist een reservering
 * heeft aangemaakt en doorklikt naar Stripe checkout om de borg te betalen.
 *
 * Hardenings t.o.v. de oude versie:
 *   - tenantSlug + reservationId verplicht; reservation moet ook
 *     daadwerkelijk in die tenant bestaan en nog niet betaald zijn.
 *   - Bedrag wordt NIET meer uit de body genomen (was: vrij in te stellen
 *     door client) maar uit `reservation_settings.deposit_amount` per tenant
 *     of uit de reservation zelf — body-amount wordt genegeerd.
 *   - IP-rate-limit voorkomt mass-checkout-spam (Stripe-rommel + dashboard).
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) return NextResponse.json({ error: 'Stripe niet geconfigureerd' }, { status: 503 })

    const body = await request.json()
    const { reservationId, tenantSlug } = body || {}

    if (!tenantSlug || typeof tenantSlug !== 'string') {
      return NextResponse.json({ error: 'tenantSlug is verplicht' }, { status: 400 })
    }
    if (!reservationId || typeof reservationId !== 'string') {
      return NextResponse.json({ error: 'reservationId is verplicht' }, { status: 400 })
    }

    // ── Rate-limit per IP — voorkomt mass-checkout creatie ────────────────────
    const ip = getClientIP(request)
    const rl = await checkRateLimit(apiRateLimiter, `res-deposit:${ip}`)
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Te veel verzoeken. Probeer over enkele seconden opnieuw.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }

    const supabase = getServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Server niet geconfigureerd' }, { status: 503 })
    }

    // ── Reservation bestaat + behoort tot tenant + nog niet betaald ───────────
    const { data: reservation, error: resErr } = await supabase
      .from('reservations')
      .select('id, tenant_slug, guest_name, guest_email, reservation_date, reservation_time, payment_status, deposit_amount, stripe_session_id')
      .eq('id', reservationId)
      .eq('tenant_slug', tenantSlug)
      .maybeSingle()

    if (resErr || !reservation) {
      logger.warn('reservation-deposit: reservation not found', { requestId, reservationId, tenantSlug })
      return NextResponse.json({ error: 'Reservering niet gevonden' }, { status: 404 })
    }
    if (reservation.payment_status === 'paid') {
      return NextResponse.json({ error: 'Reservering is al betaald' }, { status: 409 })
    }

    // ── Bedrag uit DB (delivery_settings of reservation), nooit blind uit body ─
    const { data: tenantRow } = await supabase
      .from('tenants')
      .select('name')
      .eq('slug', tenantSlug)
      .maybeSingle()
    const { data: settings } = await supabase
      .from('reservation_settings')
      .select('deposit_amount, deposit_required')
      .eq('tenant_slug', tenantSlug)
      .maybeSingle()

    const settingsAmount = Number(
      (settings as { deposit_amount?: number } | null)?.deposit_amount
    )
    const reservationAmount = Number(reservation.deposit_amount)
    const depositAmount =
      Number.isFinite(reservationAmount) && reservationAmount > 0
        ? reservationAmount
        : Number.isFinite(settingsAmount) && settingsAmount > 0
        ? settingsAmount
        : 0

    if (!Number.isFinite(depositAmount) || depositAmount <= 0 || depositAmount > 1000) {
      logger.warn('reservation-deposit: invalid amount', { requestId, depositAmount, tenantSlug })
      return NextResponse.json({ error: 'Borg-bedrag onjuist' }, { status: 400 })
    }

    const businessName = tenantRow?.name || tenantSlug
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${tenantSlug}.vysion-kassa.com`

    const stripe = new Stripe(stripeKey)
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: reservation.guest_email || undefined,
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Reservatie borg - ${businessName}`,
            description: `${reservation.reservation_date} om ${reservation.reservation_time} - ${reservation.guest_name}`,
          },
          unit_amount: Math.round(depositAmount * 100),
        },
        quantity: 1,
      }],
      metadata: { reservationId, tenantSlug },
      success_url: `${baseUrl}/shop/${tenantSlug}/reserveren/bevestiging?session_id={CHECKOUT_SESSION_ID}&reservation_id=${reservationId}`,
      cancel_url: `${baseUrl}/shop/${tenantSlug}/reserveren?cancelled=1`,
    })

    await supabase.from('reservations').update({
      stripe_session_id: session.id,
      payment_status: 'pending',
      deposit_amount: depositAmount,
    }).eq('id', reservationId).eq('tenant_slug', tenantSlug)

    return NextResponse.json({ url: session.url })
  } catch (error) {
    logger.error('reservation-deposit error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Betaling aanmaken mislukt' }, { status: 500 })
  }
}
