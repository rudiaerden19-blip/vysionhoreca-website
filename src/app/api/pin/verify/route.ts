import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  const { tenant, pin } = await request.json()
  if (!tenant || !pin) return NextResponse.json({ valid: false }, { status: 400 })

  const supabase = getServerSupabaseClient()
  if (!supabase) return NextResponse.json({ valid: false }, { status: 500 })

  const { data } = await supabase
    .from('tenant_settings')
    .select('owner_pin_hash')
    .eq('tenant_slug', tenant)
    .maybeSingle()

  if (!data?.owner_pin_hash) return NextResponse.json({ valid: false })

  const valid = await bcrypt.compare(String(pin), data.owner_pin_hash)
  return NextResponse.json({ valid })
}
