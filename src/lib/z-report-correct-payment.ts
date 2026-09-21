/**
 * Correctie kassa-bon: alleen CARD ↔ CASH.
 * Raakt niet de POS-flow, split, online/Stripe, avondtelling of dag-afsluiten.
 */

import {
  isKassaPosOrder,
  orderCountsTowardRevenueAndZReport,
  orderPaymentMethodBucket,
} from '@/lib/admin-api-order-helpers'

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export type KassaCashCardMethod = 'CASH' | 'CARD'

export function canonicalKassaCashCardMethod(
  method: string | null | undefined,
): KassaCashCardMethod | null {
  const bucket = orderPaymentMethodBucket({ payment_method: method ?? '' })
  if (bucket === 'cash') return 'CASH'
  if (bucket === 'card') return 'CARD'
  return null
}

export function orderAllowsKassaCashCardCorrection(order: {
  order_type?: string | null
  payment_status?: string | null
  status?: string | null
  payment_method?: string | null
}): boolean {
  if (!isKassaPosOrder({ order_type: order.order_type ?? '' })) return false
  if (
    !orderCountsTowardRevenueAndZReport({
      order_type: order.order_type ?? '',
      status: order.status ?? '',
      payment_status: order.payment_status ?? '',
    })
  ) {
    return false
  }
  return canonicalKassaCashCardMethod(order.payment_method) != null
}

export function zReportCashCardShift(
  total: number,
  from: KassaCashCardMethod,
  to: KassaCashCardMethod,
): { cashDelta: number; cardDelta: number } | null {
  if (from === to) return null
  const amount = round2(Number(total) || 0)
  if (!(amount > 0)) return null
  if (from === 'CARD' && to === 'CASH') {
    return { cashDelta: amount, cardDelta: round2(-amount) }
  }
  if (from === 'CASH' && to === 'CARD') {
    return { cashDelta: round2(-amount), cardDelta: amount }
  }
  return null
}

export function applyZReportCashCardShift(
  cashPayments: number,
  cardPayments: number,
  shift: { cashDelta: number; cardDelta: number },
): { cash_payments: number; card_payments: number } {
  return {
    cash_payments: round2((Number(cashPayments) || 0) + shift.cashDelta),
    card_payments: round2((Number(cardPayments) || 0) + shift.cardDelta),
  }
}
