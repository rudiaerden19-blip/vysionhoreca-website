import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'Token ontbreekt' }, { status: 400 })
    }

    // Haal reservatie op via token
    const { data: res } = await supabaseAdmin
      .from('reservations')
      .select('id, confirmed_by_customer, status, customer_name')
      .eq('confirmation_token', token)
      .single()

    if (!res) {
      return NextResponse.json({ error: 'Reservatie niet gevonden' }, { status: 404 })
    }

    if (res.status === 'cancelled') {
      return NextResponse.json({ error: 'Reservatie is geannuleerd' }, { status: 410 })
    }

    // Update via service role (omzeilt RLS)
    await supabaseAdmin
      .from('reservations')
      .update({
        confirmed_by_customer: true,
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', res.id)

    console.log(`✅ Reservation confirmed by customer: ${res.customer_name}`)
    return NextResponse.json({ success: true, alreadyConfirmed: res.confirmed_by_customer })

  } catch (error: any) {
    console.error('Confirm reservation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
