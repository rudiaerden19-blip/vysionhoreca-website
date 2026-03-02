import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const WHATSAPP_API_VERSION = 'v24.0'
const WHATSAPP_API_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`

function getBaseUrl(request: NextRequest): string {
  // 1. Handmatig ingesteld in Vercel env vars (meest betrouwbaar)
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  // 2. Vercel productie-URL (stabiel, geen preview hash) 
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  // 3. Origin van het binnenkomende request (werkt altijd als de API vanuit de juiste URL wordt aangeroepen)
  const origin = request.headers.get('origin') || request.headers.get('referer')
  if (origin) {
    try { return new URL(origin).origin } catch {}
  }
  // 4. Vaste fallback productie-URL
  return 'https://vysionhoreca.be'
}

export async function POST(request: NextRequest) {
  try {
    const { reservationId, tenantSlug } = await request.json()

    if (!reservationId || !tenantSlug) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Haal reservatie op
    const { data: res } = await supabaseAdmin
      .from('reservations')
      .select('*')
      .eq('id', reservationId)
      .eq('tenant_slug', tenantSlug)
      .single()

    if (!res) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    // Haal restaurantgegevens op
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('name')
      .eq('slug', tenantSlug)
      .single()

    const businessName = tenant?.name || tenantSlug

    // Formateer datum
    const dateObj = new Date(res.reservation_date + 'T12:00')
    const formattedDate = dateObj.toLocaleDateString('nl-BE', {
      weekday: 'long', day: 'numeric', month: 'long'
    })

    const baseUrl = getBaseUrl(request)
    const confirmUrl = `${baseUrl}/shop/${tenantSlug}/bevestig/${res.confirmation_token}`

    const timeStr = `${res.time_from || res.reservation_time}${res.time_to ? ` - ${res.time_to}` : ''}`

    // === STAP 1: Probeer WhatsApp (als tenant het heeft geconfigureerd) ===
    let whatsappSent = false

    if (res.customer_phone) {
      const { data: wa } = await supabaseAdmin
        .from('whatsapp_settings')
        .select('*')
        .eq('tenant_slug', tenantSlug)
        .eq('is_active', true)
        .single()

      if (wa) {
        const phone = res.customer_phone
          .replace(/\s+/g, '')
          .replace(/^0/, '32')
          .replace(/^\+/, '')

        const message = `🍽️ *Reservatie ${businessName}*

Beste ${res.customer_name},

Uw tafel is aangemaakt:
📅 ${formattedDate}
🕐 ${timeStr}
👥 ${res.party_size} ${res.party_size === 1 ? 'persoon' : 'personen'}
${res.notes ? `📝 ${res.notes}\n` : ''}
Bevestig uw reservatie via:
👉 ${confirmUrl}

Met vriendelijke groet,
${businessName}`

        const waResponse = await fetch(`${WHATSAPP_API_URL}/${wa.phone_number_id}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${wa.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: phone,
            type: 'text',
            text: { body: message, preview_url: false },
          }),
        })

        if (waResponse.ok) {
          whatsappSent = true
        } else {
          const err = await waResponse.text()
          console.warn('WhatsApp send failed, falling back to email:', err)
        }
      }
    }

    // === STAP 2: Stuur altijd ook email als klant een emailadres heeft ===
    let emailSent = false

    if (res.customer_email) {
      try {
        const { data: settings } = await supabaseAdmin
          .from('tenant_settings')
          .select('business_name, phone')
          .eq('tenant_slug', tenantSlug)
          .single()

        const transporter = nodemailer.createTransport({
          host: 'smtp.zoho.eu',
          port: 465,
          secure: true,
          auth: {
            user: process.env.ZOHO_EMAIL,
            pass: process.env.ZOHO_PASSWORD,
          },
        })

        await transporter.sendMail({
          from: `"${businessName}" <${process.env.ZOHO_EMAIL}>`,
          to: res.customer_email,
          subject: `Bevestig uw reservatie — ${businessName}`,
          html: `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
<div style="max-width:480px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
  <div style="background:#16a34a;padding:30px;text-align:center;">
    <div style="font-size:48px;margin-bottom:10px;">🍽️</div>
    <h1 style="color:white;margin:0;font-size:22px;">Reservatie aangemaakt</h1>
    <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;">${businessName}</p>
  </div>
  <div style="padding:30px;">
    <p style="color:#333;font-size:16px;">Beste ${res.customer_name},</p>
    <p style="color:#555;">Uw tafel is aangemaakt. Bevestig hieronder:</p>
    <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin:20px 0;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#888;width:110px;">Datum:</td><td style="padding:6px 0;color:#333;font-weight:600;">${formattedDate}</td></tr>
        <tr><td style="padding:6px 0;color:#888;">Uur:</td><td style="padding:6px 0;color:#333;font-weight:600;">${timeStr}</td></tr>
        <tr><td style="padding:6px 0;color:#888;">Personen:</td><td style="padding:6px 0;color:#333;font-weight:600;">${res.party_size}</td></tr>
        ${res.notes ? `<tr><td style="padding:6px 0;color:#888;">Notitie:</td><td style="padding:6px 0;color:#555;font-style:italic;">${res.notes}</td></tr>` : ''}
      </table>
    </div>
    <div style="text-align:center;margin:30px 0;">
      <a href="${confirmUrl}" style="display:inline-block;background:#16a34a;color:white;text-decoration:none;padding:16px 40px;border-radius:12px;font-size:18px;font-weight:bold;">✅ Bevestig mijn reservatie</a>
    </div>
    <p style="color:#888;font-size:13px;text-align:center;">Kan u niet komen? Bel ons dan zo snel mogelijk.${settings?.phone ? `<br><strong>${settings.phone}</strong>` : ''}</p>
  </div>
  <div style="background:#f8f9fa;padding:16px;text-align:center;border-top:1px solid #eee;">
    <p style="color:#aaa;font-size:12px;margin:0;">Automatisch verzonden via Vysion Horeca</p>
  </div>
</div>
</body>
</html>`,
        })
        emailSent = true
      } catch (emailErr) {
        console.warn('Email fallback failed:', emailErr)
      }
    }

    // === STAP 3: Update reservatie — markeer als verstuurd ===
    await supabaseAdmin
      .from('reservations')
      .update({
        whatsapp_sent: whatsappSent,
        whatsapp_sent_at: whatsappSent ? new Date().toISOString() : null,
      })
      .eq('id', reservationId)

    console.log(`✅ Reservation notification: WhatsApp=${whatsappSent}, Email=${emailSent}`)
    return NextResponse.json({ success: true, whatsappSent, emailSent })

  } catch (error: any) {
    console.error('Error sending reservation confirmation:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
