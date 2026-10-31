import type { SupabaseClient } from '@supabase/supabase-js'
import { billitCreateOrder } from '@/lib/billit-api-client'
import {
  BILLIT_LAGOON_DAILY_CUSTOMER_PARTY_ID,
  BILLIT_LAGOON_SUPPLIER_PARTY_ID,
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

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

function money(v: number): string {
  return v.toFixed(2)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Z-kolommen: tax_low = 6%, tax_mid = 12% (BE; 9% zit in dezelfde kolom), tax_high = 21%. */
const BILLIT_VAT_BUCKETS = [
  { rate: 6, field: 'tax_low' },
  { rate: 12, field: 'tax_mid' },
  { rate: 21, field: 'tax_high' },
] as const

export type BillitVatLine = { rate: number; totalIncl: number }

/**
 * Eén regel per btw-tarief dat op het Z-rapport staat.
 * Billit rekent een regel zonder VATPercentage als 0%. InclLeading + TotalIncl
 * laat Billit de prijs exclusief uit het bedrag inclusief en het tarief halen.
 */
export function billitVatLines(report: ZReportRowForBillit): BillitVatLine[] {
  const dayTotal = round2(num(report.total))
  const buckets = BILLIT_VAT_BUCKETS
    .map((b) => ({ rate: b.rate, vat: round2(num(report[b.field])) }))
    .filter((b) => b.vat > 0)
  if (dayTotal <= 0 || buckets.length === 0) return []
  if (buckets.length === 1) return [{ rate: buckets[0].rate, totalIncl: dayTotal }]

  const raw = buckets.map((b) => ({
    rate: b.rate,
    totalIncl: round2((b.vat * (100 + b.rate)) / b.rate),
  }))
  const sum = round2(raw.reduce((s, b) => s + b.totalIncl, 0))
  const diff = round2(dayTotal - sum)
  const biggest = raw.reduce((a, b) => (b.totalIncl > a.totalIncl ? b : a))
  biggest.totalIncl = round2(biggest.totalIncl + diff)
  return raw.filter((b) => b.totalIncl > 0)
}

/**
 * Factuurregels = dagomzet incl. BTW, gesplitst per tarief.
 * Contant/kaart/online en losse bonnen zijn dezelfde omzet en mogen geen extra regels zijn.
 */
export function buildBillitOrderPayload(
  tenantSlug: string,
  report: ZReportRowForBillit,
): Record<string, unknown> {
  const reportDate = String(report.report_date)
  const extId = billitExternalProviderId(tenantSlug, reportDate)
  const dayTotal = num(report.total)
  const taxTotal = num(report.tax_low) + num(report.tax_mid) + num(report.tax_high)
  const excl = num(report.subtotal)
  const closedAt = report.closed_at || `${reportDate}T23:59:59`
  const vatLines = billitVatLines(report)

  const orderDate = closedAt
  const expiryDate = new Date(closedAt)
  expiryDate.setDate(expiryDate.getDate() + 30)

  return {
    OrderNumber: `VYSION-${reportDate}`,
    OrderType: 'Invoice',
    OrderDirection: 'Income',
    SupplierID: BILLIT_LAGOON_SUPPLIER_PARTY_ID,
    CustomerID: BILLIT_LAGOON_DAILY_CUSTOMER_PARTY_ID,
    OrderDate: orderDate,
    DeliveryDate: orderDate,
    ExpiryDate: expiryDate.toISOString(),
    OrderTitle: `Vysion kassa dagomzet ${reportDate}`,
    Reference: extId,
    ExternalProvider: 'Vysion',
    ExternalProviderID: extId,
    Currency: 'EUR',
    TotalIncl: dayTotal,
    TotalExcl: excl,
    TotalVAT: taxTotal,
    Comments: [
      `Tenant ${tenantSlug}; ${report.order_count} bonnen; gesloten ${closedAt}.`,
      `Dagomzet incl. BTW ${money(dayTotal)}.`,
      `BTW ${money(taxTotal)} zit in dat bedrag.`,
      `Contant ${money(num(report.cash_payments))}; kaart ${money(num(report.card_payments))}; online ${money(num(report.online_payments))}.`,
    ].join(' '),
    OrderLines: vatLines.map((line) => ({
      Description:
        vatLines.length === 1
          ? `Dagomzet ${reportDate} (${line.rate}% btw, ${report.order_count} bonnen)`
          : `Dagomzet ${reportDate} (${line.rate}% btw)`,
      Quantity: 1,
      VATPercentage: line.rate,
      InclLeading: true,
      TotalIncl: line.totalIncl,
      UnitPriceIncl: line.totalIncl,
    })),
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

  if (existingLog?.status === 'ok') {
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

  const payload = buildBillitOrderPayload(tenantSlug, report as ZReportRowForBillit)

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
