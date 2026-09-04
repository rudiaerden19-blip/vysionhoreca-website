import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import { kassaUiLayoutIsDark, parseKassaUiLayout } from '@/lib/kassa-ui-layout'

export const dynamic = 'force-dynamic'

const SELECT_WITH_LAYOUT =
  'tenant_slug, active_staff_id, active_staff_name, kassa_ui_dark, kassa_ui_layout, bar_bon_watermarks, updated_at'
const SELECT_WITHOUT_LAYOUT =
  'tenant_slug, active_staff_id, active_staff_name, kassa_ui_dark, bar_bon_watermarks, updated_at'

type PosStateRow = {
  tenant_slug: string
  active_staff_id: string | null
  active_staff_name: string | null
  kassa_ui_dark: boolean | null
  kassa_ui_layout?: string | null
  bar_bon_watermarks: Record<string, unknown> | null
  updated_at: string
}

function rowToJson(row: PosStateRow | null) {
  if (!row) {
    return {
      active_staff_id: null as string | null,
      active_staff_name: null as string | null,
      kassa_ui_dark: null as boolean | null,
      kassa_ui_layout: null as string | null,
      bar_bon_watermarks: {} as Record<string, unknown>,
    }
  }
  const layout = parseKassaUiLayout(row.kassa_ui_layout, row.kassa_ui_dark)
  return {
    active_staff_id: row.active_staff_id,
    active_staff_name: row.active_staff_name,
    kassa_ui_dark: row.kassa_ui_dark,
    kassa_ui_layout: row.kassa_ui_layout ?? layout,
    bar_bon_watermarks:
      row.bar_bon_watermarks && typeof row.bar_bon_watermarks === 'object'
        ? row.bar_bon_watermarks
        : {},
  }
}

function missingLayoutColumn(error: { message?: string } | null): boolean {
  const msg = error?.message ?? ''
  return msg.includes('kassa_ui_layout')
}

export async function GET(request: NextRequest) {
  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'server_config' }, { status: 500 })
  }

  const tenant_slug = request.nextUrl.searchParams.get('tenant_slug')?.trim()
  if (!tenant_slug) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const access = await verifyTenantOrSuperAdmin(request, tenant_slug)
  if (!access.authorized) {
    return NextResponse.json({ ok: false, error: access.error || 'unauthorized' }, { status: 403 })
  }

  let data: PosStateRow | null
  let error: { message?: string } | null
  {
    const first = await supabase
      .from('kassa_pos_state')
      .select(SELECT_WITH_LAYOUT)
      .eq('tenant_slug', tenant_slug)
      .maybeSingle()
    data = first.data as PosStateRow | null
    error = first.error
  }

  if (error && missingLayoutColumn(error)) {
    const retry = await supabase
      .from('kassa_pos_state')
      .select(SELECT_WITHOUT_LAYOUT)
      .eq('tenant_slug', tenant_slug)
      .maybeSingle()
    data = retry.data as PosStateRow | null
    error = retry.error
  }

  if (error) {
    console.error('[kassa/pos-state] GET', error)
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, state: rowToJson(data as PosStateRow | null) })
}

export async function PATCH(request: NextRequest) {
  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'server_config' }, { status: 500 })
  }

  let body: {
    tenant_slug?: string
    active_staff_id?: string | null
    active_staff_name?: string | null
    kassa_ui_dark?: boolean | null
    kassa_ui_layout?: string | null
    bar_bon_watermarks?: Record<string, unknown>
  }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const tenant_slug = body.tenant_slug?.trim()
  if (!tenant_slug) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const access = await verifyTenantOrSuperAdmin(request, tenant_slug)
  if (!access.authorized) {
    return NextResponse.json({ ok: false, error: access.error || 'unauthorized' }, { status: 403 })
  }

  const patch: Record<string, unknown> = { tenant_slug, updated_at: new Date().toISOString() }
  if ('active_staff_id' in body) patch.active_staff_id = body.active_staff_id ?? null
  if ('active_staff_name' in body) patch.active_staff_name = body.active_staff_name?.trim() || null
  if ('kassa_ui_layout' in body && body.kassa_ui_layout != null) {
    const layout = parseKassaUiLayout(body.kassa_ui_layout, body.kassa_ui_dark)
    patch.kassa_ui_layout = layout
    patch.kassa_ui_dark = kassaUiLayoutIsDark(layout)
  } else if ('kassa_ui_dark' in body) {
    patch.kassa_ui_dark = body.kassa_ui_dark ?? null
    if (typeof body.kassa_ui_dark === 'boolean') {
      patch.kassa_ui_layout = body.kassa_ui_dark ? 'luxe' : 'light'
    }
  }
  if ('bar_bon_watermarks' in body && body.bar_bon_watermarks && typeof body.bar_bon_watermarks === 'object') {
    patch.bar_bon_watermarks = body.bar_bon_watermarks
  }

  let data: PosStateRow | null
  let error: { message?: string } | null
  {
    const first = await supabase
      .from('kassa_pos_state')
      .upsert(patch, { onConflict: 'tenant_slug' })
      .select(SELECT_WITH_LAYOUT)
      .single()
    data = first.data as PosStateRow | null
    error = first.error
  }

  if (error && missingLayoutColumn(error)) {
    const fallback = { ...patch }
    delete fallback.kassa_ui_layout
    const retry = await supabase
      .from('kassa_pos_state')
      .upsert(fallback, { onConflict: 'tenant_slug' })
      .select(SELECT_WITHOUT_LAYOUT)
      .single()
    data = retry.data as PosStateRow | null
    error = retry.error
  }

  if (error) {
    console.error('[kassa/pos-state] PATCH', error)
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, state: rowToJson(data as PosStateRow | null) })
}
