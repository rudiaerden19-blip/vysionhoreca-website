import {
  distributeOrderPaymentForZRaport,
  isKassaPosOrder,
  orderCountsTowardRevenueAndZReport,
  type Order,
} from '@/lib/admin-api-order-helpers'
import type { TenantHourRow } from '@/lib/tenant-business-day'
import { businessDayForOrder } from '@/lib/tenant-business-day'

/** Eén betaalregel in het digitale kasboek. Gesplitst betalen wordt twee regels. */
export type KasboekPaymentLine = {
  id: string
  orderId: string
  at: string
  fiscalDay: string
  receipt: string
  channel: 'pos' | 'online'
  method: 'cash' | 'card' | 'online'
  amount: number
}

export type KasboekPaymentTotals = {
  cash: number
  card: number
  online: number
  total: number
  count: number
}

function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100
}

function receiptLabel(order: Pick<Order, 'order_number' | 'id'>): string {
  const n = Number(order.order_number)
  if (Number.isFinite(n) && n > 0) return String(n)
  const id = String(order.id || '')
  return id ? id.slice(0, 8) : '—'
}

/**
 * Betalingen die meetellen voor omzet, zelfde filter en verdeling als het Z-rapport.
 * Schrijft niets. Een order met contant én kaart levert twee regels.
 */
export function buildKasboekPaymentLines(
  orders: Array<Partial<Order> & Pick<Order, 'order_type' | 'status' | 'payment_status'>>,
  hours: TenantHourRow[] = [],
): KasboekPaymentLine[] {
  const lines: KasboekPaymentLine[] = []
  for (const order of orders) {
    if (!orderCountsTowardRevenueAndZReport(order)) continue
    const fiscalDay = businessDayForOrder(String(order.created_at || ''), hours)
    if (!fiscalDay) continue
    const parts = distributeOrderPaymentForZRaport(order)
    const channel: KasboekPaymentLine['channel'] = isKassaPosOrder({
      order_type: order.order_type,
    })
      ? 'pos'
      : 'online'
    const at = String(order.created_at || '')
    const orderId = String(order.id || '')
    const receipt = receiptLabel(order as Order)
    const push = (method: KasboekPaymentLine['method'], amount: number) => {
      const rounded = round2(amount)
      if (rounded === 0) return
      lines.push({
        id: `${orderId}:${method}`,
        orderId,
        at,
        fiscalDay,
        receipt,
        channel,
        method,
        amount: rounded,
      })
    }
    push('cash', parts.cash)
    push('card', parts.card)
    push('online', parts.online)
  }
  const methodOrder = { cash: 0, card: 1, online: 2 }
  lines.sort((a, b) => {
    if (a.at !== b.at) return a.at < b.at ? -1 : 1
    if (a.orderId !== b.orderId) return a.orderId < b.orderId ? -1 : 1
    return methodOrder[a.method] - methodOrder[b.method]
  })
  return lines
}

export function sumKasboekPaymentLines(lines: KasboekPaymentLine[]): KasboekPaymentTotals {
  const totals: KasboekPaymentTotals = { cash: 0, card: 0, online: 0, total: 0, count: lines.length }
  for (const line of lines) {
    totals[line.method] = round2(totals[line.method] + line.amount)
    totals.total = round2(totals.total + line.amount)
  }
  return totals
}
