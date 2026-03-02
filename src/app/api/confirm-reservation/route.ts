import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET — bevestigingspagina laadt reservatiedetails via server (omzeilt RLS)
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')
    const tenantSlug = request.nextUrl.searchParams.get('tenant')

    if (!token) return NextResponse.json({ error: 'Token ontbreekt' }, { status: 400 })

    const { data: res } = await supabaseAdmin
      .from('reservations')
      .select('id, customer_name, party_size, reservation_date, reservation_time, time_from, time_to, notes, confirmed_by_customer, status')
      .eq('confirmation_token', token)
      .single()

    if (!res) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })

    // Haal restaurantnaam op
    let businessName = tenantSlug || ''
    if (tenantSlug) {
      const { data: t } = await supabaseAdmin.from('tenants').select('name').eq('slug', tenantSlug).single()
      if (t?.name) businessName = t.name
    }

    return NextResponse.json({ reservation: res, businessName })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST — klant bevestigt reservatie
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) return NextResponse.json({ error: 'Token ontbreekt' }, { status: 400 })

    const { data: res } = await supabaseAdmin
      .from('reservations')
      .select('id, confirmed_by_customer, status, customer_name')
      .eq('confirmation_token', token)
      .single()

    if (!res) return NextResponse.json({ error: 'Reservatie niet gevonden' }, { status: 404 })
    if (res.status === 'cancelled') return NextResponse.json({ error: 'Geannuleerd' }, { status: 410 })

    await supabaseAdmin
      .from('reservations')
      .update({ confirmed_by_customer: true, confirmed_at: new Date().toISOString() })
      .eq('id', res.id)

    console.log(`✅ Bevestigd door klant: ${res.customer_name}`)
    return NextResponse.json({ success: true, alreadyConfirmed: res.confirmed_by_customer })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
