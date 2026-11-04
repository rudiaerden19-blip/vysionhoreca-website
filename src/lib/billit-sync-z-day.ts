import type { SupabaseClient } from '@supabase/supabase-js'
import { billitCreateOrder, billitOrderExists } from '@/lib/billit-api-client'
import {
  BILLIT_LAGOON_DAILY_CUSTOMER_PARTY_ID,
  BILLIT_LAGOON_SUPPLIER_PARTY_ID,
  billitExternalProviderId,
  getBillitLagoonEnvConfig,
  isBillitLagoonPilotTenant,
} from '@/lib/billit-lagoon-pilot'
import { listOrderVatGrossSlices, type OrderVatGrossSlice } from '@/lib/order-vat'
import { fetchZReportVatContextFromSupabase } from '@/lib/z-report-vat-context'

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
  btw_percentage?: number | null
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

export type BillitVatLine = { rate: number; totalIncl: number }

/** Zelfde afronding als Billit bij InclLeading: excl uit incl, btw = incl − excl. */
export function billitVatFromInclusive(totalIncl: number, rate: number): { excl: number; vat: number } {
  const incl = round2(totalIncl)
  const excl = round2(incl / (1 + rate / 100))
  return { excl, vat: round2(incl - excl) }
}

/**
 * Billit rekent de btw één keer per tarief op het dagbedrag, niet als som van de bonnen.
 * Per tarief kiezen we het inclusief bedrag waarvan die formule de btw van de bonnen geeft.
 * Het verschil met de echte dagomzet gaat op een 0%-regel, zodat totaal incl. en btw
 * gelijk blijven aan het Z-rapport.
 */
export function billitVatLinesFromSlices(slices: readonly OrderVatGrossSlice[]): BillitVatLine[] {
  const byRate = new Map<number, { gross: number; vat: number }>()
  for (const slice of slices) {
    const gross = round2(slice.gross)
    const rate = slice.rate
    if (gross <= 0 || !Number.isFinite(rate) || rate <= 0) continue
    const vat = billitVatFromInclusive(gross, rate).vat
    const prev = byRate.get(rate)
    if (prev) {
      prev.gross = round2(prev.gross + gross)
      prev.vat = round2(prev.vat + vat)
    } else {
      byRate.set(rate, { gross, vat })
    }
  }

  const out: BillitVatLine[] = []
  let placedIncl = 0
  let dayIncl = 0
  for (const bucket of byRate.values()) dayIncl = round2(dayIncl + bucket.gross)

  for (const rate of [...byRate.keys()].sort((a, b) => a - b)) {
    const bucket = byRate.get(rate)!
    const incl = inclusiveMatchingVat(bucket.gross, rate, bucket.vat)
    out.push({ rate, totalIncl: incl })
    placedIncl = round2(placedIncl + incl)
  }

  const plug = round2(dayIncl - placedIncl)
  if (plug !== 0) out.push({ rate: 0, totalIncl: plug })
  return out
}

function inclusiveMatchingVat(gross: number, rate: number, targetVat: number): number {
  if (billitVatFromInclusive(gross, rate).vat === round2(targetVat)) return round2(gross)
  const start = Math.round(round2(gross) * 100)
  const want = round2(targetVat)
  for (let delta = 1; delta <= 5000; delta++) {
    for (const sign of [-1, 1]) {
      const cents = start + sign * delta
      if (cents <= 0) continue
      const incl = cents / 100
      if (billitVatFromInclusive(incl, rate).vat === want) return incl
    }
  }
  return round2(gross)
}

export function billitLinesVatTotal(lines: readonly BillitVatLine[]): number {
  return round2(lines.reduce((sum, line) => sum + billitVatFromInclusive(line.totalIncl, line.rate).vat, 0))
}

/**
 * Factuurregels = dagomzet incl. BTW. Billit leidt de btw af uit bedrag + tarief,
 * dus de regels zijn zo gegroepeerd dat die btw gelijk is aan de som van de bonnen.
 * Contant/kaart/online zijn dezelfde omzet en mogen geen extra regels zijn.
 */
export function buildBillitOrderPayload(
  tenantSlug: string,
  report: ZReportRowForBillit,
  slices: readonly OrderVatGrossSlice[],
): Record<string, unknown> {
  const reportDate = String(report.report_date)
  const extId = billitExternalProviderId(tenantSlug, reportDate)
  const closedAt = report.closed_at || `${reportDate}T23:59:59`
  const vatLines = billitVatLinesFromSlices(slices)
  const dayTotal = round2(vatLines.reduce((sum, line) => sum + line.totalIncl, 0))
  const taxTotal = billitLinesVatTotal(vatLines)
  const excl = round2(dayTotal - taxTotal)
  const taxableCount = vatLines.filter((line) => line.rate > 0).length

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
    OrderLines: vatLines.map((line) => {
      return {
        Description:
          line.rate === 0
            ? `Afronding btw kassabonnen ${reportDate}`
            : taxableCount === 1
              ? `Dagomzet ${reportDate} (${line.rate}% btw, ${report.order_count} bonnen)`
              : `Dagomzet ${reportDate} (${line.rate}% btw)`,
        Quantity: 1,
        VATPercentage: line.rate,
        InclLeading: true,
        TotalIncl: line.totalIncl,
        UnitPriceIncl: line.totalIncl,
      }
    }),
  }
}

async function loadClosedDayVatSlices(
  client: SupabaseClient,
  tenantSlug: string,
  report: ZReportRowForBillit,
): Promise<{ ok: true; slices: OrderVatGrossSlice[] } | { ok: false; error: string }> {
  const ids = (report.order_ids ?? []).map((id) => String(id)).filter(Boolean)
  if (ids.length === 0) return { ok: false, error: 'Z-rapport heeft geen bonnen' }

  const orders: { id: string; total: unknown; items: unknown; order_type: unknown }[] = []
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100)
    const { data, error } = await client
      .from('orders')
      .select('id, total, items, order_type')
      .eq('tenant_slug', tenantSlug)
      .in('id', chunk)
    if (error) return { ok: false, error: error.message }
    orders.push(...((data ?? []) as typeof orders))
  }

  const byId = new Map(orders.map((order) => [String(order.id), order]))
  const missing = ids.filter((id) => !byId.has(id))
  if (missing.length > 0) return { ok: false, error: 'Niet alle bonnen van het Z-rapport zijn gevonden' }

  const ctx = await fetchZReportVatContextFromSupabase(client, tenantSlug)
  const defaultPct = num(report.btw_percentage) || 21
  const slices: OrderVatGrossSlice[] = []
  for (const id of ids) {
    const order = byId.get(id)
    if (!order) continue
    slices.push(...listOrderVatGrossSlices(order, defaultPct, ctx))
  }
  if (slices.length === 0) return { ok: false, error: 'Geen btw-regels voor deze dag' }
  return { ok: true, slices }
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
    const previousId = String(existingLog.billit_order_id || '').trim()
    if (previousId) {
      const stillThere = await billitOrderExists(config, previousId)
      if (stillThere === true) {
        return { ok: true, skipped: true, reason: 'already_synced' }
      }
      if (stillThere === null) {
        return { ok: false, error: 'Billit niet bereikbaar' }
      }
    } else {
      return { ok: true, skipped: true, reason: 'already_synced' }
    }
  }

  const { data: report, error: reportErr } = await client
    .from('z_reports')
    .select(
      'report_date, order_count, subtotal, tax_low, tax_mid, tax_high, total, cash_payments, card_payments, online_payments, order_ids, is_closed, closed_at, btw_percentage',
    )
    .eq('tenant_slug', tenantSlug)
    .eq('report_date', reportDate)
    .maybeSingle()

  if (reportErr) return { ok: false, error: reportErr.message }
  if (!report) return { ok: false, error: 'Z-rapport niet gevonden' }
  if (report.is_closed !== true) {
    return { ok: false, error: 'Dag is nog niet afgesloten' }
  }

  const row = report as ZReportRowForBillit
  const slices = await loadClosedDayVatSlices(client, tenantSlug, row)
  if (!slices.ok) return slices
  const payload = buildBillitOrderPayload(tenantSlug, row, slices.slices)
  const payloadVat = num((payload as { TotalVAT?: unknown }).TotalVAT)
  const reportVat = round2(num(row.tax_low) + num(row.tax_mid) + num(row.tax_high))
  const payloadIncl = num((payload as { TotalIncl?: unknown }).TotalIncl)
  if (Math.abs(payloadIncl - round2(num(row.total))) > 0.02 || Math.abs(payloadVat - reportVat) > 0.02) {
    return { ok: false, error: 'Billit-btw wijkt af van het Z-rapport' }
  }

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
