import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

import { logger } from '@/lib/logger'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import {
  apiRateLimiter,
  reservationEmailIpRateLimiter,
  reservationEmailTenantRateLimiter,
  checkRateLimit,
  getClientIP,
} from '@/lib/rate-limit'

const ALLOWED_STATUSES = ['confirmed', 'pending', 'cancelled', 'reminder', 'review'] as const

/**
 * Reservation email — dual-mode:
 *   - Admin (KassaReservationsView, admin-pages): authFetch met tenant-headers
 *     → soepelere rate-limit (60/min/tenant).
 *   - Public gast (/shop/[tenant]/reserveren, /shop/[tenant]): geen auth, MAAR
 *     tenantSlug verplicht + bestaan-check + strakke rate-limit (5/min/IP,
 *     60/uur/tenant) tegen SMTP-spam.
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    const body = await request.json()
    const {
      tenantSlug,
      customerEmail,
      customerName,
      reservationDate,
      reservationTime,
      partySize,
      tableName,
      notes,
      specialRequests,
      occasion,
      status,
      businessName,
      businessPhone,
      businessEmail,
      cancellationReason,
      reviewLink,
    } = body

    if (!customerEmail || !customerName) {
      return NextResponse.json({ error: 'Email en naam zijn verplicht' }, { status: 400 })
    }
    if (!tenantSlug || typeof tenantSlug !== 'string') {
      return NextResponse.json({ error: 'tenantSlug is verplicht' }, { status: 400 })
    }
    if (!ALLOWED_STATUSES.includes(status)) {
      logger.warn('send-reservation-email: invalid status', { requestId, status, tenantSlug })
      return NextResponse.json({ error: 'Ongeldige status — email niet verstuurd' }, { status: 400 })
    }

    // ── Tenant moet bestaan — voorkomt willekeurige slugs gebruiken voor spam ─
    const supabase = getServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Server niet geconfigureerd' }, { status: 503 })
    }
    const { data: tenantRow } = await supabase
      .from('tenants')
      .select('slug')
      .eq('slug', tenantSlug)
      .maybeSingle()
    if (!tenantRow) {
      logger.warn('send-reservation-email: unknown tenant', { requestId, tenantSlug })
      return NextResponse.json({ error: 'Onbekende zaak' }, { status: 404 })
    }

    // ── Mode-selectie: admin (auth-header) → soepel; gast (publiek) → streng ──
    const access = await verifyTenantOrSuperAdmin(request, tenantSlug)
    const ip = getClientIP(request)

    if (access.authorized) {
      // Admin-flow: 60/min/tenant via generieke api-limiter
      const rl = await checkRateLimit(apiRateLimiter, `res-email-admin:${tenantSlug}`)
      if (!rl.success) {
        return NextResponse.json(
          { error: 'Te veel verzoeken. Probeer over enkele seconden opnieuw.' },
          { status: 429, headers: { 'Retry-After': '60' } }
        )
      }
    } else {
      // Public gast-flow: 5/min/IP + 60/uur/tenant
      const ipRl = await checkRateLimit(reservationEmailIpRateLimiter, `res-email-ip:${ip}`)
      if (!ipRl.success) {
        return NextResponse.json(
          { error: 'Te veel verzoeken vanaf dit adres. Probeer over een minuut opnieuw.' },
          { status: 429, headers: { 'Retry-After': '60' } }
        )
      }
      const tenantRl = await checkRateLimit(
        reservationEmailTenantRateLimiter,
        `res-email-tenant:${tenantSlug}`
      )
      if (!tenantRl.success) {
        return NextResponse.json(
          { error: 'Te veel reserveringsmails voor deze zaak. Probeer over een uur opnieuw.' },
          { status: 429, headers: { 'Retry-After': '3600' } }
        )
      }
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.zoho.eu',
      port: 465,
      secure: true,
      auth: {
        user: process.env.ZOHO_EMAIL,
        pass: process.env.ZOHO_PASSWORD,
      },
    })

    const formattedDate = new Date(reservationDate).toLocaleDateString('nl-BE', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })

    let subject = ''
    let headerColor = '#3C4D6B'
    let headerEmoji = '📅'
    let headerText = ''
    let bodyText = ''

    if (status === 'confirmed') {
      subject = `✅ Reservatie bevestigd - ${businessName}`
      headerColor = '#22c55e'
      headerEmoji = '✅'
      headerText = 'Reservatie Bevestigd!'
      bodyText = `Uw reservatie is bevestigd. We kijken ernaar uit u te verwelkomen!`
    } else if (status === 'cancelled') {
      subject = `❌ Reservatie geannuleerd - ${businessName}`
      headerColor = '#ef4444'
      headerEmoji = '❌'
      headerText = 'Reservatie Geannuleerd'
      bodyText = cancellationReason || 'Uw reservatie werd geannuleerd.'
    } else if (status === 'reminder') {
      subject = `⏰ Herinnering: Uw reservatie morgen - ${businessName}`
      headerColor = '#f59e0b'
      headerEmoji = '⏰'
      headerText = 'Herinnering Reservatie'
      bodyText = 'Dit is een herinnering voor uw reservatie morgen.'
    } else if (status === 'review') {
      subject = `⭐ Hoe was uw bezoek? - ${businessName}`
      headerColor = '#f59e0b'
      headerEmoji = '⭐'
      headerText = 'Bedankt voor uw bezoek!'
      bodyText = `We hopen dat u heeft genoten van uw bezoek bij ${businessName}. We stellen uw mening zeer op prijs!`
    } else {
      subject = `📅 Reservatie ontvangen - ${businessName}`
      headerColor = '#3C4D6B'
      headerEmoji = '📅'
      headerText = 'Reservatie Ontvangen'
      bodyText = 'We hebben uw reservatie ontvangen en nemen zo snel mogelijk contact op.'
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 30px; background: ${headerColor}; border-radius: 16px 16px 0 0;">
          <span style="font-size: 64px;">${headerEmoji}</span>
          <h1 style="color: white; margin: 20px 0 10px; font-size: 28px;">${headerText}</h1>
          <p style="color: rgba(255,255,255,0.9); font-size: 16px; margin: 0;">${businessName}</p>
        </div>

        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none;">
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Beste ${customerName},</p>
          <p style="font-size: 15px; color: #555; margin-bottom: 25px;">${bodyText}</p>

          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px; color: #166534; font-size: 16px;">📋 Reservatiedetails</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #555; width: 40%;"><strong>📅 Datum</strong></td>
                <td style="padding: 8px 0; color: #333;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #555;"><strong>🕐 Tijd</strong></td>
                <td style="padding: 8px 0; color: #333;">${reservationTime}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #555;"><strong>👥 Personen</strong></td>
                <td style="padding: 8px 0; color: #333;">${partySize} ${partySize === 1 ? 'persoon' : 'personen'}</td>
              </tr>
              ${tableName ? `<tr><td style="padding: 8px 0; color: #555;"><strong>🪑 Tafel</strong></td><td style="padding: 8px 0; color: #333;">Tafel ${tableName}</td></tr>` : ''}
              ${occasion ? `<tr><td style="padding: 8px 0; color: #555;"><strong>🎉 Gelegenheid</strong></td><td style="padding: 8px 0; color: #333;">${occasion}</td></tr>` : ''}
              ${notes ? `<tr><td style="padding: 8px 0; color: #555;"><strong>📝 Opmerking</strong></td><td style="padding: 8px 0; color: #333;">${notes}</td></tr>` : ''}
              ${specialRequests ? `<tr><td style="padding: 8px 0; color: #555;"><strong>⚠️ Wensen</strong></td><td style="padding: 8px 0; color: #333;">${specialRequests}</td></tr>` : ''}
            </table>
          </div>

          <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px; color: #333; font-size: 14px;">🏪 ${businessName}</h3>
            ${businessPhone ? `<p style="margin: 5px 0; color: #666;">📞 ${businessPhone}</p>` : ''}
            ${businessEmail ? `<p style="margin: 5px 0; color: #666;">✉️ ${businessEmail}</p>` : ''}
          </div>

          ${status === 'review' && reviewLink ? `
          <div style="text-align: center; margin: 25px 0;">
            <a href="${reviewLink}" style="display: inline-block; padding: 14px 32px; background: #f59e0b; color: white; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px;">
              ⭐ Schrijf een recensie
            </a>
            <p style="color: #999; font-size: 13px; margin-top: 12px;">Uw mening helpt ons en andere gasten.</p>
          </div>
          ` : ''}

          ${status !== 'cancelled' ? `
          <p style="color: #666; font-size: 14px; margin-top: 20px;">
            Wilt u uw reservatie wijzigen of annuleren? Neem dan contact op via 
            ${businessPhone ? `<strong>${businessPhone}</strong>` : businessEmail ? `<strong>${businessEmail}</strong>` : 'de zaak'}.
          </p>
          ` : ''}
        </div>

        <div style="background: #f9f9f9; padding: 20px; border-radius: 0 0 16px 16px; border: 1px solid #e5e5e5; border-top: none; text-align: center;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            Dit is een automatische bevestiging van uw reservatie.
          </p>
          <p style="color: #999; font-size: 11px; margin: 10px 0 0;">
            Powered by <a href="https://www.vysionhoreca.com" style="color: #f97316; text-decoration: none;">Vysion Horeca</a>
          </p>
        </div>
      </div>
    `

    await transporter.sendMail({
      from: `"${businessName}" <${process.env.ZOHO_EMAIL}>`,
      to: customerEmail,
      replyTo: businessEmail || process.env.ZOHO_EMAIL,
      subject,
      html,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('send-reservation-email error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Email versturen mislukt' }, { status: 500 })
  }
}
