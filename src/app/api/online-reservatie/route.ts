import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      tenantSlug, customer_name, customer_phone, customer_email,
      party_size, reservation_date, reservation_time, time_from, time_to, notes, status
    } = body

    if (!tenantSlug || !customer_name || !customer_phone || !reservation_date || !reservation_time) {
      return NextResponse.json({ error: 'Ontbrekende verplichte velden' }, { status: 400 })
    }

    // Sla reservatie op (tenant_slug verplicht voor multi-tenant)
    const { data: res, error } = await supabaseAdmin
      .from('reservations')
      .insert({
        tenant_slug: tenantSlug,
        customer_name: customer_name.trim(),
        customer_phone: customer_phone.trim(),
        customer_email: customer_email?.trim() || null,
        party_size,
        reservation_date,
        reservation_time,
        time_from,
        time_to,
        notes: notes || null,
        status: status || 'confirmed',
        source: 'online', // Onderscheid met telefonisch gemaakte reservaties
      })
      .select('id, confirmation_token')
      .single()

    if (error || !res) {
      console.error('Insert error:', error)
      return NextResponse.json({ error: 'Reservatie kon niet worden opgeslagen' }, { status: 500 })
    }

    // Stuur bevestigingsmail als klant email heeft opgegeven
    if (customer_email?.trim()) {
      fetch(`${request.nextUrl.origin}/api/whatsapp/send-reservation-confirmation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId: res.id, tenantSlug }),
      }).catch(() => {})
    }

    return NextResponse.json({ id: res.id, success: true })

  } catch (error: any) {
    console.error('Online reservatie error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
