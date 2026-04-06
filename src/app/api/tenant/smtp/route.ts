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
    .maybeSingle()

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

  // Upsert: bij nieuwe tenants bestaat er nog geen tenant_settings-rij; pure .update()
  // wijzigde 0 rijen zonder fout — dan leek opslaan te werken maar bleef alles leeg.
  const row: Record<string, unknown> = {
    tenant_slug: tenantSlug,
    smtp_host: smtp_host ?? null,
    smtp_port: smtp_port || 465,
    smtp_user: smtp_user ?? null,
    smtp_from_name: smtp_from_name ?? null,
  }
  if (smtp_password && String(smtp_password).trim() !== '') {
    row.smtp_password = smtp_password
  }

  const { error, data } = await supabase
    .from('tenant_settings')
    .upsert(row, { onConflict: 'tenant_slug' })
    .select('tenant_slug')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data?.length) {
    return NextResponse.json(
      { error: 'Kon SMTP-instellingen niet opslaan (geen rij terug)' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
