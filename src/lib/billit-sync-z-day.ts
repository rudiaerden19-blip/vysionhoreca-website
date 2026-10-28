import type { SupabaseClient } from '@supabase/supabase-js'
import { billitCreateOrder } from '@/lib/billit-api-client'
import {
  billitExternalProviderId,
  getBillitLagoonEnvConfig,
  isBillitLagoonPilotTenant,
} from '@/lib/billit-lagoon-pilot'

export type ZReportRowForBillit = {
  report_date: string
  order_count: number
  subtotal: number | null
  tax_low: number | null
  tax_mid: number | null
  tax_high: number | null
  total: number | null
  cash_payments: number | null
  card_payments: number | null
  online_payments: number | null
  order_ids: string[] | null
  is_closed: boolean | null
  closed_at: string | null
}

type OrderRow = {
  id: string
  total: number | null
  payment_method: string | null
  created_at: string | null
}

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

export function buildBillitOrderPayload(
  tenantSlug: string,
  report: ZReportRowForBillit,
  orders: OrderRow[],
): Record<string, unknown> {
  const reportDate = String(report.report_date)
  const extId = billitExternalProviderId(tenantSlug, reportDate)
  const taxTotal = num(report.tax_low) + num(report.tax_mid) + num(report.tax_high)
  const closedAt = report.closed_at || `${reportDate}T23:59:59`

  const summaryLines: Record<string, unknown>[] = [
    {
      Description: `Dagomzet totaal (incl. BTW) — ${reportDate}`,
      Quantity: 1,
      TotalIncl: num(report.total),
      UnitPriceIncl: num(report.total),
    },
    {
      Description: `BTW totaal`,
      Quantity: 1,
      TotalIncl: taxTotal,
      UnitPriceIncl: taxTotal,
    },
    {
      Description: `Contant`,
      Quantity: 1,
      TotalIncl: num(report.cash_payments),
      UnitPriceIncl: num(report.cash_payments),
    },
    {
      Description: `Kaart`,
      Quantity: 1,
      TotalIncl: num(report.card_payments),
      UnitPriceIncl: num(report.card_payments),
    },
    {
      Description: `Online`,
      Quantity: 1,
      TotalIncl: num(report.online_payments),
      UnitPriceIncl: num(report.online_payments),
    },
  ]

  const bonLines: Record<string, unknown>[] = orders.map((o, idx) => {
    const totalIncl = num(o.total)
    const when = o.created_at ? String(o.created_at).slice(0, 19).replace('T', ' ') : ''
    return {
      Description: `Bon ${o.id.slice(0, 8)}… ${when} (${o.payment_method || '?'})`,
      Reference: o.id,
      Quantity: 1,
      TotalIncl: totalIncl,
      UnitPriceIncl: totalIncl,
    }
  })

  return {
    OrderNumber: `VYSION-${reportDate}`,
    OrderDate: closedAt,
    OrderTitle: `Vysion kassa dagomzet ${reportDate}`,
    Reference: extId,
    ExternalProvider: 'Vysion',
    ExternalProviderID: extId,
    Currency: 'EUR',
    TotalIncl: num(report.total),
    TotalExcl: num(report.subtotal),
    TotalVAT: taxTotal,
    Comments: `Tenant ${tenantSlug}; ${report.order_count} bonnen; gesloten ${closedAt}`,
    OrderLines: [...summaryLines, ...bonLines],
  }
}

export type BillitSyncResult =
  | { ok: true; billitOrderId: string | null; skipped?: false }
  | { ok: true; skipped: true; reason: string }
  | { ok: false; error: string }

export async function syncBillitLagoonZDay(
  client: SupabaseClient,
  tenantSlug: string,
  reportDate: string,
): Promise<BillitSyncResult> {
  if (!isBillitLagoonPilotTenant(tenantSlug)) {
    return { ok: true, skipped: true, reason: 'not_lagoon_pilot' }
  }

  const config = getBillitLagoonEnvConfig()
  if (!config) {
    return { ok: false, error: 'Billit credentials ontbreken (server env)' }
  }

  const { data: existingLog } = await client
    .from('billit_sync_log')
    .select('status, billit_order_id')
    .eq('tenant_slug', tenantSlug)
    .eq('report_date', reportDate)
    .maybeSingle()

  if (existingLog?.status === 'ok' && existingLog.billit_order_id) {
    return { ok: true, skipped: true, reason: 'already_synced' }
  }

  const { data: report, error: reportErr } = await client
    .from('z_reports')
    .select(
      'report_date, order_count, subtotal, tax_low, tax_mid, tax_high, total, cash_payments, card_payments, online_payments, order_ids, is_closed, closed_at',
    )
    .eq('tenant_slug', tenantSlug)
    .eq('report_date', reportDate)
    .maybeSingle()

  if (reportErr) return { ok: false, error: reportErr.message }
  if (!report) return { ok: false, error: 'Z-rapport niet gevonden' }
  if (report.is_closed !== true) {
    return { ok: false, error: 'Dag is nog niet afgesloten' }
  }

  const orderIds = Array.isArray(report.order_ids) ? (report.order_ids as string[]) : []
  let orders: OrderRow[] = []
  if (orderIds.length > 0) {
    const { data: orderRows, error: ordErr } = await client
      .from('orders')
      .select('id, total, payment_method, created_at')
      .eq('tenant_slug', tenantSlug)
      .in('id', orderIds.slice(0, 500))
    if (ordErr) return { ok: false, error: ordErr.message }
    orders = (orderRows ?? []) as OrderRow[]
  }

  const payload = buildBillitOrderPayload(tenantSlug, report as ZReportRowForBillit, orders)

  await client.from('billit_sync_log').upsert(
    {
      tenant_slug: tenantSlug,
      report_date: reportDate,
      status: 'pending',
      error: null,
      synced_at: null,
    },
    { onConflict: 'tenant_slug,report_date' },
  )

  try {
    const { orderId } = await billitCreateOrder(config, payload)
    await client
      .from('billit_sync_log')
      .update({
        status: 'ok',
        billit_order_id: orderId,
        error: null,
        synced_at: new Date().toISOString(),
      })
      .eq('tenant_slug', tenantSlug)
      .eq('report_date', reportDate)
    return { ok: true, billitOrderId: orderId }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await client
      .from('billit_sync_log')
      .update({
        status: 'error',
        error: msg.slice(0, 2000),
        synced_at: new Date().toISOString(),
      })
      .eq('tenant_slug', tenantSlug)
      .eq('report_date', reportDate)
    return { ok: false, error: msg }
  }
}
