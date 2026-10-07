import { NextRequest, NextResponse } from 'next/server'
import { parseKlantschermSlideshowUploads } from '@/lib/klantscherm-slideshow-server'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { verifyTenantAccess } from '@/lib/verify-tenant-access'

export const dynamic = 'force-dynamic'

type RouteContext = { params: { tenant: string } }

const SELECT =
  'klantscherm_enabled, klantscherm_slideshow_enabled, klantscherm_slideshow_uploads, klantscherm_bank_iban, klantscherm_bank_account_name'

export async function GET(request: NextRequest, context: RouteContext) {
  const tenantSlug = context.params.tenant?.trim()
  if (!tenantSlug) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const access = await verifyTenantAccess(request, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ ok: false, error: access.error ?? 'unauthorized' }, { status: 403 })
  }

  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'server_config' }, { status: 503 })
  }

  const { data, error } = await supabase
    .from('tenant_settings')
    .select(SELECT)
    .eq('tenant_slug', tenantSlug)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    settings: data ?? null,
    uploads: parseKlantschermSlideshowUploads(data?.klantscherm_slideshow_uploads),
  })
}

export async function POST(request: NextRequest, context: RouteContext) {
  const tenantSlug = context.params.tenant?.trim()
  if (!tenantSlug) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const access = await verifyTenantAccess(request, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ ok: false, error: access.error ?? 'unauthorized' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'server_config' }, { status: 503 })
  }

  const patch: Record<string, unknown> = {}
  if (typeof body.klantscherm_enabled === 'boolean') patch.klantscherm_enabled = body.klantscherm_enabled
  if (typeof body.klantscherm_slideshow_enabled === 'boolean') {
    patch.klantscherm_slideshow_enabled = body.klantscherm_slideshow_enabled
  }
  if (Array.isArray(body.klantscherm_slideshow_uploads)) {
    patch.klantscherm_slideshow_uploads = body.klantscherm_slideshow_uploads
  }
  if (body.klantscherm_bank_iban !== undefined) {
    patch.klantscherm_bank_iban =
      typeof body.klantscherm_bank_iban === 'string'
        ? body.klantscherm_bank_iban.replace(/\s/g, '').toUpperCase() || null
        : null
  }
  if (body.klantscherm_bank_account_name !== undefined) {
    patch.klantscherm_bank_account_name =
      typeof body.klantscherm_bank_account_name === 'string'
        ? body.klantscherm_bank_account_name.trim() || null
        : null
  }

  const { data, error } = await supabase
    .from('tenant_settings')
    .update(patch)
    .eq('tenant_slug', tenantSlug)
    .select('klantscherm_slideshow_uploads')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: 'tenant_settings_not_updated' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
