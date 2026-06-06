/**
 * GKS-kassa personeel — INSZ verplicht voor fiscale acties (onafhankelijk van kassa_staff_clock_enabled).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'

export const dynamic = 'force-dynamic'

function normalizeInsz(raw: string | null | undefined): string | null {
  if (!raw) return null
  const d = raw.replace(/\D/g, '')
  return d.length === 11 ? d : null
}

export async function GET(req: NextRequest) {
  const tenant_slug = req.nextUrl.searchParams.get('tenant_slug')?.trim()
  if (!tenant_slug) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }
  const access = await verifyTenantOrSuperAdmin(req, tenant_slug)
  if (!access.authorized) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 403 })
  }
  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'server_config' }, { status: 500 })
  }
  const { data, error } = await supabase
    .from('staff')
    .select('id, name, pin, insz')
    .eq('tenant_slug', tenant_slug)
    .eq('is_active', true)
    .order('name', { ascending: true })
  if (error) {
    console.error('gks-kassa staff GET', error)
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }
  const staff = (data || []).map((s) => ({
    id: s.id as string,
    name: s.name as string,
    hasInsz: Boolean(normalizeInsz(s.insz as string | null)),
  }))
  return NextResponse.json({ ok: true, staff })
}

type PostBody = { tenant_slug?: string; staff_id?: string; pin?: string }

export async function POST(req: NextRequest) {
  let body: PostBody
  try {
    body = (await req.json()) as PostBody
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 })
  }
  const tenant_slug = body.tenant_slug?.trim()
  const staff_id = body.staff_id?.trim()
  const pin = body.pin?.trim()
  if (!tenant_slug || !staff_id || !pin) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }
  const access = await verifyTenantOrSuperAdmin(req, tenant_slug)
  if (!access.authorized) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 403 })
  }
  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'server_config' }, { status: 500 })
  }
  const { data: row, error } = await supabase
    .from('staff')
    .select('id, name, pin, insz, is_active')
    .eq('tenant_slug', tenant_slug)
    .eq('id', staff_id)
    .maybeSingle()
  if (error || !row || !row.is_active) {
    return NextResponse.json({ ok: false, error: 'staff_not_found' }, { status: 404 })
  }
  if (String(row.pin).trim() !== pin) {
    return NextResponse.json({ ok: false, error: 'bad_pin' }, { status: 401 })
  }
  const insz = normalizeInsz(row.insz as string | null)
  if (!insz) {
    return NextResponse.json({ ok: false, error: 'insz_required' }, { status: 403 })
  }
  return NextResponse.json({
    ok: true,
    staff: { id: row.id, name: row.name, insz },
  })
}
