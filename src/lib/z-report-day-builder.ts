/**
 * Eén bron van waarheid voor Z-rapport dagtotalen (bonnen/orders).
 * Dag-scherm, maandrapport, z_reports sync, cron — zelfde filter, totalen en BTW.
 */

import {
  distributeOrderPaymentForZRaport,
  orderCountsTowardRevenueAndZReport,
  type Order,
} from '@/lib/admin-api-order-helpers'
import {
  aggregateZReportVatFromOrderRows,
  type CategoryVatPercent,
  type ZReportVatOrderSlice,
} from '@/lib/order-vat'
import type { ZReportVatContext } from '@/lib/z-report-vat-context'

export type ZReportManualExtras = {
  cash?: number
  card?: number
  online?: number
  total?: number
}

export type ZReportDayAmounts = {
  /** Meetellende orders (zelfde als bonnen in Vysion). */
  orderCount: number
  /** Som order.total — gelijk aan dag-Z scherm. */
  orderTotalIncl: number
  subtotalExcl: number
  tax_low: number
  tax_mid: number
  tax_high: number
  taxByRate: Record<CategoryVatPercent, number>
  baseByRate: Record<CategoryVatPercent, number>
  cashPayments: number
  cardPayments: number
  onlinePayments: number
  orderIds: string[]
  /** Handmatige kassa-invoer (witte kassa buiten bonnen) — apart van bonnen. */
  manualTotalIncl: number
  /** orderTotalIncl + manualTotalIncl (alleen voor archief/boekhouder). */
  grandTotalIncl: number
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function emptyVatRecord(): Record<CategoryVatPercent, number> {
  return { 6: 0, 9: 0, 12: 0, 21: 0 }
}

function filterCountedOrders(orders: Order[]): Order[] {
  return orders.filter((o) =>
    orderCountsTowardRevenueAndZReport(
      o as Pick<Order, 'order_type' | 'status' | 'payment_status'>,
    ),
  )
}

function toVatSlices(orders: Order[]): ZReportVatOrderSlice[] {
  return orders.map((o) => ({
    total: o.total,
    items: (o as { items?: unknown }).items,
    order_type: o.order_type,
  }))
}

/**
 * Bouw dagtotalen uit orders (+ optioneel handmatige invoer apart).
 * `orderTotalIncl` en BTW komen alleen uit orders — exact zoals op kassa-bonnen in Vysion.
 */
export function buildZReportDayAmountsFromOrders(
  orders: Order[],
  tenantDefaultBtw: number,
  vatContext: ZReportVatContext,
  manual?: ZReportManualExtras | null,
): ZReportDayAmounts {
  const counted = filterCountedOrders(orders)

  let cashPayments = 0
  let cardPayments = 0
  let onlinePayments = 0
  let orderTotalIncl = 0
  const orderIds: string[] = []

  for (const order of counted) {
    if (order.id) orderIds.push(String(order.id))
    orderTotalIncl = round2(orderTotalIncl + (Number(order.total) || 0))
    const d = distributeOrderPaymentForZRaport(order)
    cashPayments = round2(cashPayments + d.cash)
    cardPayments = round2(cardPayments + d.card)
    onlinePayments = round2(onlinePayments + d.online)
  }

  const manualTotalIncl = round2(Number(manual?.total) || 0)

  const vatAgg = aggregateZReportVatFromOrderRows(
    toVatSlices(counted),
    tenantDefaultBtw,
    vatContext,
  )

  return {
    orderCount: counted.length,
    orderTotalIncl,
    subtotalExcl: vatAgg.subtotalExcl,
    tax_low: vatAgg.tax_low,
    tax_mid: vatAgg.tax_mid,
    tax_high: vatAgg.tax_high,
    taxByRate: { ...vatAgg.taxByRate },
    baseByRate: { ...vatAgg.baseByRate },
    cashPayments,
    cardPayments,
    onlinePayments,
    orderIds,
    manualTotalIncl,
    grandTotalIncl: round2(orderTotalIncl + manualTotalIncl),
  }
}

/** Hash-input voor z_reports integriteit. */
export function zReportDayHashPayload(
  tenantSlug: string,
  date: string,
  amounts: Pick<ZReportDayAmounts, 'orderCount' | 'orderTotalIncl' | 'orderIds'>,
): string {
  return JSON.stringify({
    tenant: tenantSlug,
    date,
    orderCount: amounts.orderCount,
    total: Math.round(amounts.orderTotalIncl * 100),
    orderIds: [...amounts.orderIds].sort(),
    version: 'v2',
  })
}
