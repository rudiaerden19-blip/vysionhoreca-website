/**
 * Track A — preview smoke: DB + pilot-config (read-only). Geen productie-kassa.
 */

import { NextRequest, NextResponse } from 'next/server'
import { gksPilotTenantSlugs } from '@/lib/gks-kassa/pilot-config'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'

export const dynamic = 'force-dynamic'

type TableProbe = 'ok' | 'missing' | 'error'

async function probeTable(
  supabase: NonNullable<ReturnType<typeof getServerSupabaseClient>>,
  table: string,
  tenantSlug: string,
): Promise<TableProbe> {
  const { error } = await supabase
    .from(table)
    .select('tenant_slug', { count: 'exact', head: true })
    .eq('tenant_slug', tenantSlug)
    .limit(0)
  if (!error) return 'ok'
  const msg = (error.message || '').toLowerCase()
  if (msg.includes('does not exist') || error.code === '42P01') return 'missing'
  return 'error'
}

export async function GET(req: NextRequest) {
  const tenantSlug = req.nextUrl.searchParams.get('tenant_slug')?.trim()
  if (!tenantSlug) {
    return NextResponse.json({ ok: false, error: 'tenant_slug_required' }, { status: 400 })
  }

  const access = await verifyTenantOrSuperAdmin(req, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 403 })
  }

  const pilotSlugs = gksPilotTenantSlugs()
  const pilotActive = pilotSlugs.includes(tenantSlug)

  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'server_config' }, { status: 500 })
  }

  const { data: tenantRow, error: tenantErr } = await supabase
    .from('tenant_settings')
    .select('tenant_slug, business_name')
    .eq('tenant_slug', tenantSlug)
    .maybeSingle()

  const { count: staffInszCount, error: staffErr } = await supabase
    .from('staff')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_slug', tenantSlug)
    .eq('is_active', true)
    .not('insz', 'is', null)

  const tables = {
    gks_commercial_orders: await probeTable(supabase, 'gks_commercial_orders', tenantSlug),
    fiscal_journal: await probeTable(supabase, 'fiscal_journal', tenantSlug),
  }

  const hints: string[] = []
  if (!pilotActive) {
    hints.push(
      `Zet NEXT_PUBLIC_GKS_PILOT_TENANTS op preview (bv. ${tenantSlug}) en redeploy Vercel preview.`,
    )
  }
  if (!tenantRow) {
    hints.push('tenant_settings ontbreekt — maak zaak aan in superadmin of SQL bootstrap.')
  }
  if (tables.gks_commercial_orders === 'missing' || tables.fiscal_journal === 'missing') {
    hints.push('Draai GKS-migraties in Supabase (zie supabase/migrations/*gks* en fiscal_journal).')
  }
  if (staffErr || (staffInszCount ?? 0) === 0) {
    hints.push('Minstens één actieve medewerker met geldig INSZ (11 cijfers) voor fiscale verkoop.')
  }

  const ready =
    pilotActive &&
    !!tenantRow &&
    tables.gks_commercial_orders === 'ok' &&
    tables.fiscal_journal === 'ok' &&
    (staffInszCount ?? 0) > 0

  return NextResponse.json({
    ok: true,
    track: 'A-preview',
    tenantSlug,
    pilotActive,
    pilotSlugsConfigured: pilotSlugs,
    tenantExists: !!tenantRow && !tenantErr,
    businessName: tenantRow?.business_name ?? null,
    tables,
    staffWithInsz: staffInszCount ?? 0,
    gksUrl: `/shop/${tenantSlug}/gks`,
    ready,
    hints,
  })
}
