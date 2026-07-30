/**
 * Server-side Z-rapport maanddata — herberekent uit DB (niet client-payload).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Order } from '@/lib/admin-api-order-helpers'
import { fetchAllOrdersInCreatedAtRange } from '@/lib/admin-api-order-operations'
import { getBelgiumDateString } from '@/lib/belgium-date-bounds'
import { fetchZReportVatContextFromSupabase } from '@/lib/z-report-vat-context'
import {
  buildZReportMonthDayRows,
  getLastDayOfMonthYmd,
  monthBoundsUtc,
  sumZReportMonthAmounts,
  type ZReportMonthDayRow,
} from '@/lib/z-report-month'
import type { ZReportAmounts } from '@/lib/z-report-document'

export type ZReportManualByDate = Record<
  string,
  { cash?: number; card?: number; online?: number; total?: number }
>

export async function fetchZReportManualByDateForMonth(
  client: SupabaseClient,
  tenantSlug: string,
  yearMonth: string,
): Promise<ZReportManualByDate> {
  const { data } = await client
    .from('z_reports')
    .select('report_date, manual_cash, manual_card, manual_online, manual_total')
    .eq('tenant_slug', tenantSlug)
    .like('report_date', `${yearMonth}%`)

  const out: ZReportManualByDate = {}
  for (const row of data ?? []) {
    const total = Number(row.manual_total) || 0
    if (total <= 0) continue
    const date = String(row.report_date)
    out[date] = {
      cash: row.manual_cash != null ? Number(row.manual_cash) : undefined,
      card: row.manual_card != null ? Number(row.manual_card) : undefined,
      online: row.manual_online != null ? Number(row.manual_online) : undefined,
      total,
    }
  }
  return out
}

/** Herberekent maandrijen + totalen uit orders (fiscale dagen) — bron voor maandmail. */
export async function buildZReportMonthFromSupabase(
  client: SupabaseClient,
  tenantSlug: string,
  yearMonth: string,
  capYmd?: string,
): Promise<{ days: ZReportMonthDayRow[]; amounts: ZReportAmounts | null; btwPercentage: number }> {
  const monthEnd = getLastDayOfMonthYmd(yearMonth)
  const today = getBelgiumDateString()
  const cap = capYmd ?? (today < monthEnd ? today : monthEnd)

  const { data: settings } = await client
    .from('tenant_settings')
    .select('btw_percentage')
    .eq('tenant_slug', tenantSlug)
    .maybeSingle()

  const btwPercentage = Number(settings?.btw_percentage) || 6

  const { startUTC, endUTC } = monthBoundsUtc(yearMonth, cap)

  const ordersRaw = await fetchAllOrdersInCreatedAtRange(
    client,
    tenantSlug,
    startUTC,
    endUTC,
    'id, total, payment_method, payment_split_cash, payment_split_card, order_type, status, payment_status, items, created_at',
  )

  const vatContext = await fetchZReportVatContextFromSupabase(client, tenantSlug)
  const manualByDate = await fetchZReportManualByDateForMonth(client, tenantSlug, yearMonth)

  const days = buildZReportMonthDayRows(
    ordersRaw as unknown as Order[],
    yearMonth,
    cap,
    btwPercentage,
    vatContext,
    manualByDate,
  )

  return {
    days,
    amounts: days.length ? sumZReportMonthAmounts(days) : null,
    btwPercentage,
  }
}
