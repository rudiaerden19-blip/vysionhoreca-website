import { NextRequest, NextResponse } from 'next/server'
import {
  isKlantschermCustomPromosColumnError,
  klantschermCustomPromosToLegacyUploads,
  mergeKlantschermCustomPromoSources,
  mergeKlantschermCustomPromosForSave,
} from '@/lib/klantscherm-custom-promos'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'

export const dynamic = 'force-dynamic'

type RouteContext = { params: { tenant: string } }

const SELECT =
  'klantscherm_enabled, klantscherm_slideshow_enabled, klantscherm_slideshow_uploads, klantscherm_custom_promos, klantscherm_bank_iban, klantscherm_bank_account_name'

export async function GET(request: NextRequest, context: RouteContext) {
  const tenantSlug = context.params.tenant?.trim()
  if (!tenantSlug) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const access = await verifyTenantOrSuperAdmin(request, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ ok: false, error: access.error ?? 'unauthorized' }, { status: 403 })
  }

  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'server_config' }, { status: 503 })
  }

  let data: Record<string, unknown> | null = null
  const { data: fullRow, error: fullError } = await supabase
    .from('tenant_settings')
    .select(SELECT)
    .eq('tenant_slug', tenantSlug)
    .maybeSingle()

  if (fullError && isKlantschermCustomPromosColumnError(fullError.message)) {
    const { data: legacyRow, error: legacyError } = await supabase
      .from('tenant_settings')
      .select(
        'klantscherm_enabled, klantscherm_slideshow_enabled, klantscherm_slideshow_uploads, klantscherm_bank_iban, klantscherm_bank_account_name',
      )
      .eq('tenant_slug', tenantSlug)
      .maybeSingle()
    if (legacyError) {
      return NextResponse.json({ ok: false, error: legacyError.message }, { status: 500 })
    }
    data = legacyRow as Record<string, unknown> | null
  } else if (fullError) {
    return NextResponse.json({ ok: false, error: fullError.message }, { status: 500 })
  } else {
    data = fullRow as Record<string, unknown> | null
  }

  const customPromos = mergeKlantschermCustomPromoSources(
    data?.klantscherm_custom_promos,
    data?.klantscherm_slideshow_uploads,
  )

  return NextResponse.json({
    ok: true,
    settings: data ?? null,
    customPromos,
  })
}

export async function POST(request: NextRequest, context: RouteContext) {
  const tenantSlug = context.params.tenant?.trim()
  if (!tenantSlug) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const access = await verifyTenantOrSuperAdmin(request, tenantSlug)
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
  if (Array.isArray(body.klantscherm_custom_promos)) {
    const rows = mergeKlantschermCustomPromosForSave(
      body.klantscherm_custom_promos as Parameters<typeof mergeKlantschermCustomPromosForSave>[0],
    )
    patch.klantscherm_custom_promos = rows
    patch.klantscherm_slideshow_uploads = klantschermCustomPromosToLegacyUploads(rows)
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

  const first = await supabase
    .from('tenant_settings')
    .update(patch)
    .eq('tenant_slug', tenantSlug)
    .select('klantscherm_custom_promos, klantscherm_slideshow_uploads')
    .maybeSingle()

  let error = first.error
  let data = first.data

  if (!error && !data && Object.keys(patch).length > 0) {
    const upsert = await supabase
      .from('tenant_settings')
      .upsert({ tenant_slug: tenantSlug, ...patch }, { onConflict: 'tenant_slug' })
      .select('klantscherm_custom_promos, klantscherm_slideshow_uploads')
      .maybeSingle()
    error = upsert.error
    data = upsert.data
  }

  if (error && isKlantschermCustomPromosColumnError(error.message) && patch.klantscherm_custom_promos) {
    const legacyPatch = { ...patch }
    delete legacyPatch.klantscherm_custom_promos
    const retry = await supabase
      .from('tenant_settings')
      .update(legacyPatch)
      .eq('tenant_slug', tenantSlug)
      .select('klantscherm_slideshow_uploads')
      .maybeSingle()
    error = retry.error
    data = retry.data ? { ...retry.data, klantscherm_custom_promos: null } : null
  }

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: 'tenant_settings_not_updated' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
