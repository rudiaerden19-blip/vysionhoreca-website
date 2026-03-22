import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  const { tenant, pin, email, currentPin } = await request.json()
  if (!tenant || !pin) return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 })
  if (String(pin).length !== 4 || !/^\d{4}$/.test(String(pin))) {
    return NextResponse.json({ error: 'PIN moet 4 cijfers zijn' }, { status: 400 })
  }

  const supabase = getServerSupabaseClient()
  if (!supabase) return NextResponse.json({ error: 'DB niet beschikbaar' }, { status: 500 })

  const { data: settings } = await supabase
    .from('tenant_settings')
    .select('owner_pin_hash')
    .eq('tenant_slug', tenant)
    .maybeSingle()

  const hasExistingPin = !!settings?.owner_pin_hash

  if (hasExistingPin) {
    if (email) {
      // Vergeten PIN flow: email bevestigen
      const { data: profile } = await supabase
        .from('business_profiles')
        .select('email')
        .eq('tenant_slug', tenant)
        .maybeSingle()
      if (!profile || profile.email.toLowerCase() !== email.toLowerCase()) {
        return NextResponse.json({ error: 'E-mailadres komt niet overeen' }, { status: 403 })
      }
    } else if (currentPin) {
      // PIN wijzigen: huidig PIN controleren
      const valid = await bcrypt.compare(String(currentPin), settings.owner_pin_hash)
      if (!valid) return NextResponse.json({ error: 'Huidig PIN is onjuist' }, { status: 403 })
    } else {
      return NextResponse.json({ error: 'Verificatie vereist' }, { status: 403 })
    }
  }

  const hash = await bcrypt.hash(String(pin), 10)
  const { error } = await supabase
    .from('tenant_settings')
    .upsert({ tenant_slug: tenant, owner_pin_hash: hash }, { onConflict: 'tenant_slug' })

  if (error) return NextResponse.json({ error: 'Opslaan mislukt' }, { status: 500 })
  return NextResponse.json({ success: true })
}
