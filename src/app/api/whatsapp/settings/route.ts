import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET — volledige credentials alleen voor zaak-eigenaar/superadmin; publiek: alleen nummer + actief
export async function GET(request: NextRequest) {
  const tenantSlug = request.nextUrl.searchParams.get('tenant')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Missing tenant'}, { status: 400 })
  }

  const access = await verifyTenantOrSuperAdmin(request, tenantSlug)
  const selectCols = access.authorized
    ? '*'
    : 'tenant_slug, whatsapp_number, is_active'

  const { data, error } = await supabaseAdmin
    .from('whatsapp_settings')
    .select(selectCols)
    .eq('tenant_slug', tenantSlug)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

// POST — alleen eigenaar of superadmin
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenant_slug, ...settings } = body

    if (!tenant_slug) {
      return NextResponse.json({ error: 'Missing tenant_slug'}, { status: 400 })
    }

    const access = await verifyTenantOrSuperAdmin(request, tenant_slug)
    if (!access.authorized) {
      const st = access.error?.includes('ingelogd') ? 401 : 403
      return NextResponse.json({ error: access.error || 'Forbidden'}, { status: st })
    }

    const { data: existing } = await supabaseAdmin
      .from('whatsapp_settings')
      .select('id')
      .eq('tenant_slug', tenant_slug)
      .maybeSingle()

    let result
    if (existing?.id) {
      const { data, error } = await supabaseAdmin
        .from('whatsapp_settings')
        .update(settings)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      const { data, error } = await supabaseAdmin
        .from('whatsapp_settings')
        .insert({ tenant_slug, ...settings })
        .select()
        .single()

      if (error) throw error
      result = data
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('WhatsApp settings save error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
