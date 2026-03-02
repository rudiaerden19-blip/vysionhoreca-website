import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Gebruik service role key → bypasses RLS volledig
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant')
  const today = searchParams.get('today') || new Date().toISOString().split('T')[0]

  if (!tenantSlug) {
    return NextResponse.json({ error: 'tenant verplicht' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('reservations')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .eq('status', 'confirmed')
    .is('table_id', null)
    .gte('reservation_date', today)
    .order('reservation_date', { ascending: true })
    .order('time_from', { ascending: true })

  if (error) {
    console.error('[API unassigned] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: data || [] })
}
