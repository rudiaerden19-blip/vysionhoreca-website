import { NextRequest, NextResponse } from 'next/server'
import { getBelgiumDateString, getDateBoundsForBelgium } from '@/lib/belgium-date-bounds'
import {
  buildStaffSalesDayLines,
  isStaffSalesDateVisible,
  staffSalesDayTotal,
  staffSalesVisibleRange,
} from '@/lib/kassa-staff-sales-day'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'

export const dynamic = 'force-dynamic'

const PAGE = 1000

type OrderRow = { kassa_staff_id: string | null; total: number | null }

async function fetchPaidStaffOrders(
  supabase: NonNullable<ReturnType<typeof getServerSupabaseClient>>,
  tenantSlug: string,
  startUTC: string,
  endUTC: string,
): Promise<{ rows: OrderRow[] } | { error: string }> {
  const rows: OrderRow[] = []
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from('orders')
      .select('kassa_staff_id, total')
      .eq('tenant_slug', tenantSlug)
      .eq('payment_status', 'paid')
      .not('kassa_staff_id', 'is', null)
      .gte('created_at', startUTC)
      .lte('created_at', endUTC)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) return { error: error.message }
    const batch = (data || []) as OrderRow[]
    rows.push(...batch)
    if (batch.length < PAGE) break
    from += PAGE
  }
  return { rows }
}

/** Verkoop per medewerker voor één kalenderdag, max. 30 dagen terug. Elke tenant. */
export async function GET(request: NextRequest) {
  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'server_config' }, { status: 500 })
  }

  const tenantSlug = request.nextUrl.searchParams.get('tenant_slug')?.trim()
  const date = request.nextUrl.searchParams.get('date')?.trim() || ''
  if (!tenantSlug) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const access = await verifyTenantOrSuperAdmin(request, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ ok: false, error: access.error || 'unauthorized' }, { status: 403 })
  }

  const today = getBelgiumDateString()
  if (!isStaffSalesDateVisible(date, today)) {
    return NextResponse.json({ ok: false, error: 'date_out_of_range' }, { status: 400 })
  }

  const { data: settings, error: settingsErr } = await supabase
    .from('tenant_settings')
    .select('kassa_staff_clock_enabled')
    .eq('tenant_slug', tenantSlug)
    .maybeSingle()
  if (settingsErr) {
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }
  if (!settings?.kassa_staff_clock_enabled) {
    return NextResponse.json({ ok: false, error: 'disabled' }, { status: 403 })
  }

  const { data: activeRows, error: staffErr } = await supabase
    .from('staff')
    .select('id, name')
    .eq('tenant_slug', tenantSlug)
    .eq('is_active', true)
  if (staffErr) {
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }

  const { startUTC, endUTC } = getDateBoundsForBelgium(date)
  const ordersResult = await fetchPaidStaffOrders(supabase, tenantSlug, startUTC, endUTC)
  if ('error' in ordersResult) {
    console.error('staff-sales orders', ordersResult.error)
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }

  const activeStaff = (activeRows || []).map((row) => ({
    id: String(row.id),
    name: String(row.name ?? ''),
  }))
  const activeIds = new Set(activeStaff.map((row) => row.id))
  const extraIds = [
    ...new Set(
      ordersResult.rows
        .map((row) => String(row.kassa_staff_id ?? '').trim())
        .filter((id) => id && !activeIds.has(id)),
    ),
  ]

  let extraStaff: { id: string; name: string }[] = []
  if (extraIds.length > 0) {
    const { data: extraRows, error: extraErr } = await supabase
      .from('staff')
      .select('id, name')
      .eq('tenant_slug', tenantSlug)
      .in('id', extraIds)
    if (extraErr) {
      return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
    }
    extraStaff = (extraRows || []).map((row) => ({
      id: String(row.id),
      name: String(row.name ?? ''),
    }))
  }

  const lines = buildStaffSalesDayLines(
    activeStaff,
    extraStaff,
    ordersResult.rows.map((row) => ({
      staffId: row.kassa_staff_id,
      total: row.total,
    })),
  )
  const range = staffSalesVisibleRange(today)

  return NextResponse.json({
    ok: true,
    date,
    minDate: range.minYmd,
    maxDate: range.maxYmd,
    lines,
    dayTotal: staffSalesDayTotal(lines),
  })
}
