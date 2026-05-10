import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

import { logger } from '@/lib/logger'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import { apiRateLimiter, checkRateLimit, getClientIP } from '@/lib/rate-limit'

/**
 * No-show fee charging — alleen bereikbaar voor de ingelogde zaak-eigenaar
 * (of superadmin). De caller stuurt enkel `tenantSlug` + `reservationId`;
 * de server haalt zelf het opgeslagen payment_method_id uit de reservering
 * en het bedrag uit `reservation_settings.no_show_fee`. Op die manier kan
 * een (eventueel kwaadwillende) admin van een andere tenant geen kaart
 * van een andere zaak belasten.
 *
 * Stripe-idempotency_key (`noshow:<reservationId>`) voorkomt dubbele
 * charges als de knop tweemaal wordt aangeklikt.
 *
 * De vroegere POST (SetupIntent voor "kaart bewaren") is verwijderd: die
 * werd nergens meer aangeroepen vanuit de codebase en stond open op het
 * publieke internet — dode code = attack surface.
 */
export async function PUT(request: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) {
      return NextResponse.json({ error: 'Stripe niet geconfigureerd' }, { status: 503 })
    }

    const body = await request.json()
    const { tenantSlug, reservationId } = body || {}

    if (!tenantSlug || typeof tenantSlug !== 'string') {
      return NextResponse.json({ error: 'tenantSlug is verplicht' }, { status: 400 })
    }
    if (!reservationId || typeof reservationId !== 'string') {
      return NextResponse.json({ error: 'reservationId is verplicht' }, { status: 400 })
    }

    // ── Auth ──────────────────────────────────────────────────────────────────
    const access = await verifyTenantOrSuperAdmin(request, tenantSlug)
    if (!access.authorized) {
      const st = access.error?.includes('ingelogd') ? 401 : 403
      logger.warn('reservation-card-auth PUT: unauthorized', { requestId, tenantSlug })
      return NextResponse.json({ error: access.error || 'Geen toegang' }, { status: st })
    }

    // ── Rate-limit per tenant ─────────────────────────────────────────────────
    const ip = getClientIP(request)
    const rl = await checkRateLimit(apiRateLimiter, `noshow-charge:${tenantSlug}:${ip}`)
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

    // ── Reservation moet bij deze tenant horen + payment-method gekoppeld ─────
    const { data: reservation } = await supabase
      .from('reservations')
      .select('id, tenant_slug, guest_name, stripe_payment_method_id')
      .eq('id', reservationId)
      .eq('tenant_slug', tenantSlug)
      .maybeSingle()

    if (!reservation) {
      return NextResponse.json({ error: 'Reservering niet gevonden' }, { status: 404 })
    }
    const paymentMethodId = (reservation as { stripe_payment_method_id?: string })
      .stripe_payment_method_id
    if (!paymentMethodId) {
      return NextResponse.json({ error: 'Geen kaart geregistreerd voor deze reservering' }, { status: 400 })
    }

    // ── Bedrag uit reservation_settings (server-bepaald, niet client) ─────────
    const { data: settings } = await supabase
      .from('reservation_settings')
      .select('no_show_fee')
      .eq('tenant_slug', tenantSlug)
      .maybeSingle()
    const fee = Number((settings as { no_show_fee?: number } | null)?.no_show_fee)
    if (!Number.isFinite(fee) || fee <= 0 || fee > 500) {
      return NextResponse.json({ error: 'No-show bedrag onjuist of niet geconfigureerd' }, { status: 400 })
    }

    const { data: tenantRow } = await supabase
      .from('tenants')
      .select('name')
      .eq('slug', tenantSlug)
      .maybeSingle()
    const businessName = tenantRow?.name || tenantSlug

    const stripe = new Stripe(stripeKey)
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: Math.round(fee * 100),
        currency: 'eur',
        payment_method: paymentMethodId,
        confirm: true,
        off_session: true,
        description: `No-show kost - ${reservation.guest_name} bij ${businessName}`,
        metadata: { reservationId, tenantSlug },
      },
      // Idempotency: dubbele klik op "no-show" knop kan kaart niet 2x belasten
      { idempotencyKey: `noshow:${reservationId}` }
    )

    return NextResponse.json({ success: true, paymentIntentId: paymentIntent.id })
  } catch (error) {
    logger.error('reservation-card-auth PUT error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Betaling mislukt' }, { status: 500 })
  }
}
