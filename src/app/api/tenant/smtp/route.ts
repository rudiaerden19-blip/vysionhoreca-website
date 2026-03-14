import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'

// GET: haal SMTP instellingen op (zonder wachtwoord)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'tenant vereist' }, { status: 400 })
  }

  const businessId = request.headers.get('x-business-id')
  const superadminId = request.headers.get('x-superadmin-id')
  if (!businessId && !superadminId) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Server fout' }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('tenant_settings')
    .select('smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_name')
    .eq('tenant_slug', tenantSlug)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    smtp_host: data?.smtp_host || '',
    smtp_port: data?.smtp_port || 465,
    smtp_user: data?.smtp_user || '',
    smtp_from_name: data?.smtp_from_name || '',
    smtp_password_set: !!data?.smtp_password,
  })
}

// POST: sla SMTP instellingen op (inclusief wachtwoord)
export async function POST(request: NextRequest) {
  const businessId = request.headers.get('x-business-id')
  const superadminId = request.headers.get('x-superadmin-id')
  if (!businessId && !superadminId) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  const { tenantSlug, smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_name } = await request.json()

  if (!tenantSlug) {
    return NextResponse.json({ error: 'tenant vereist' }, { status: 400 })
  }

  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Server fout' }, { status: 500 })
  }

  const updateData: Record<string, unknown> = {
    smtp_host,
    smtp_port: smtp_port || 465,
    smtp_user,
    smtp_from_name,
  }

  // Wachtwoord alleen updaten als er een nieuw wachtwoord meegegeven wordt
  if (smtp_password && smtp_password.trim() !== '') {
    updateData.smtp_password = smtp_password
  }

  const { error } = await supabase
    .from('tenant_settings')
    .update(updateData)
    .eq('tenant_slug', tenantSlug)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
