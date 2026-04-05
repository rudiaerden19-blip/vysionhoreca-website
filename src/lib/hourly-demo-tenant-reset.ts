import type { SupabaseClient } from '@supabase/supabase-js'
import { DEMO_TENANT_SLUG } from '@/lib/demo-links'
import { applyFrituurNolimDemoBranding, type DemoBrandingResetStatus } from '@/lib/demo-frituurnolim-baseline'

/**
 * Periodieke reset voor de publieke demo (DEMO_TENANT_SLUG = frituurnolim), elk uur via Vercel cron (UTC).
 * Verwijdert operationele data én zet naam, kleuren, adres, uren en teksten
 * terug naar `demo-frituurnolim-baseline.ts` (Stripe/SMTP worden niet gewist — alleen niet mee in de update).
 *
 * Nog niet automatisch teruggezet: menustructuur (categorieën/producten), personeelstabellen, abonnement.
 * Uitbreiding: verwijder + her-seed menu indien je canonieke demo-SQL hebt.
 *
 * Volgorde houdt rekening met gangbare FK’s (orders vóór shop_customers, enz.).
 */
const TABLES_DELETE_IN_ORDER = [
  'loyalty_redemptions',
  'order_groups',
  'orders',
  'customers',
  'shop_customers',
  'loyalty_rewards',
  'reservations',
  'guest_profiles',
  'team_members',
  'reviews',
  'promotions',
  'daily_sales',
  'timesheet_entries',
  'monthly_timesheets',
  'leave_requests',
  'z_reports',
  'exceptional_closings',
] as const

function normalizeTablesJson(data: unknown): unknown {
  if (!Array.isArray(data)) return data
  return data.map((t) => {
    if (t && typeof t === 'object' && 'status' in t) {
      return { ...(t as Record<string, unknown>), status: 'FREE' }
    }
    return t
  })
}

function normalizeDecorJson(data: unknown): unknown {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>
    if ('items' in o || 'stool_statuses' in o) {
      return { ...o, stool_statuses: {} }
    }
  }
  return data
}

export type HourlyDemoResetResult = {
  tenant_slug: typeof DEMO_TENANT_SLUG
  deleted: { table: string; error: string | null }[]
  branding: DemoBrandingResetStatus
  floor_plan_tables: 'updated' | 'skipped' | 'error'
  floor_plan_decor: 'updated' | 'skipped' | 'error'
  shop_online: 'updated' | 'skipped' | 'error'
}

export async function runHourlyDemoTenantReset(
  supabase: SupabaseClient
): Promise<HourlyDemoResetResult> {
  const slug = DEMO_TENANT_SLUG
  const deleted: { table: string; error: string | null }[] = []

  for (const table of TABLES_DELETE_IN_ORDER) {
    const { error } = await supabase.from(table).delete().eq('tenant_slug', slug)
    deleted.push({ table, error: error?.message ?? null })
  }

  const branding = await applyFrituurNolimDemoBranding(supabase)

  let floor_plan_tables: HourlyDemoResetResult['floor_plan_tables'] = 'skipped'
  {
    const { data, error } = await supabase
      .from('floor_plan_tables')
      .select('data')
      .eq('tenant_slug', slug)
      .maybeSingle()
    if (error) {
      floor_plan_tables = 'error'
    } else if (data?.data != null) {
      const next = normalizeTablesJson(data.data)
      const { error: upErr } = await supabase
        .from('floor_plan_tables')
        .update({ data: next })
        .eq('tenant_slug', slug)
      floor_plan_tables = upErr ? 'error' : 'updated'
    }
  }

  let floor_plan_decor: HourlyDemoResetResult['floor_plan_decor'] = 'skipped'
  {
    const { data, error } = await supabase
      .from('floor_plan_decor')
      .select('data')
      .eq('tenant_slug', slug)
      .maybeSingle()
    if (error) {
      floor_plan_decor = 'error'
    } else if (data?.data != null) {
      const next = normalizeDecorJson(data.data)
      const { error: upErr } = await supabase
        .from('floor_plan_decor')
        .update({ data: next })
        .eq('tenant_slug', slug)
      floor_plan_decor = upErr ? 'error' : 'updated'
    }
  }

  let shop_online: HourlyDemoResetResult['shop_online'] = 'skipped'
  {
    const { error } = await supabase
      .from('shop_offline_status')
      .update({
        is_offline: false,
        offline_reason: null,
        offline_message: null,
      })
      .eq('tenant_slug', slug)
    if (error) {
      shop_online = 'error'
    } else {
      shop_online = 'updated'
    }
  }

  return {
    tenant_slug: slug,
    deleted,
    branding,
    floor_plan_tables,
    floor_plan_decor,
    shop_online,
  }
}
