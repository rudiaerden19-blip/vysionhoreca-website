import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const tenant = request.nextUrl.searchParams.get('tenant')
  if (!tenant) return NextResponse.json({ error: 'Tenant vereist' }, { status: 400 })

  const supabase = getServerSupabaseClient()
  if (!supabase) return NextResponse.json({ error: 'DB niet beschikbaar' }, { status: 500 })

  const { data } = await supabase
    .from('tenant_settings')
    .select('owner_pin_hash')
    .eq('tenant_slug', tenant)
    .maybeSingle()

  return NextResponse.json({ hasPin: !!data?.owner_pin_hash })
}
