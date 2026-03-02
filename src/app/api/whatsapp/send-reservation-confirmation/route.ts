import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const WHATSAPP_API_VERSION = 'v24.0'
const WHATSAPP_API_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`

export async function POST(request: NextRequest) {
  try {
    const { reservationId, tenantSlug } = await request.json()

    if (!reservationId || !tenantSlug) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Haal reservatie op
    const { data: res, error: resError } = await supabaseAdmin
      .from('reservations')
      .select('*')
      .eq('id', reservationId)
      .single()

    if (resError || !res) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    if (!res.customer_phone) {
      return NextResponse.json({ error: 'No phone number' }, { status: 400 })
    }

    // Haal WhatsApp instellingen op voor deze tenant
    const { data: wa } = await supabaseAdmin
      .from('whatsapp_settings')
      .select('*')
      .eq('tenant_slug', tenantSlug)
      .eq('is_active', true)
      .single()

    if (!wa) {
      return NextResponse.json({ error: 'WhatsApp not configured for this tenant' }, { status: 404 })
    }

    // Haal restaurantnaam op
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

    // Bevestigingslink
    const confirmUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://vysionhoreca.be'}/shop/${tenantSlug}/bevestig/${res.confirmation_token}`

    // WhatsApp bericht
    const message = `🍽️ *Reservatie ${businessName}*

Beste ${res.customer_name},

Uw tafel is aangemaakt:
📅 ${formattedDate} • ${res.time_from || res.reservation_time}${res.time_to ? ` - ${res.time_to}` : ''}
👥 ${res.party_size} ${res.party_size === 1 ? 'persoon' : 'personen'}

Bevestig uw reservatie via deze link:
👉 ${confirmUrl}

${res.notes ? `📝 Notitie: ${res.notes}\n` : ''}Met vriendelijke groet,
${businessName}`

    // Formateer telefoonnummer (Belgisch → internationaal)
    const phone = res.customer_phone
      .replace(/\s+/g, '')
      .replace(/^0/, '32')
      .replace(/^\+/, '')

    // Verstuur via WhatsApp Cloud API
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

    if (!waResponse.ok) {
      const err = await waResponse.text()
      console.error('WhatsApp error:', err)
      return NextResponse.json({ error: 'WhatsApp send failed', detail: err }, { status: 500 })
    }

    // Sla op dat WhatsApp verstuurd is
    await supabaseAdmin
      .from('reservations')
      .update({ whatsapp_sent: true, whatsapp_sent_at: new Date().toISOString() })
      .eq('id', reservationId)

    console.log(`✅ Reservation WhatsApp sent to ${phone}`)
    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
