import {
  distributeOrderPaymentForZRaport,
  isKassaPosOrder,
  orderCountsTowardRevenueAndZReport,
  type Order,
} from '@/lib/admin-api-order-helpers'
import type { ZReportVatAggregate } from '@/lib/order-vat'
import { businessDayForOrder, type TenantHourRow } from '@/lib/tenant-business-day'

/** Kasboek rekent in centen. Bestellingen blijven in euro, zoals de kassa ze opslaat. */
export function eurosToCents(amount: unknown): number {
  const n = typeof amount === 'number' ? amount : Number(amount)
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100)
}

export function centsToEuros(cents: number): number {
  return (Number.isFinite(cents) ? cents : 0) / 100
}

export const CASHBOOK_MOVEMENT_TYPES = [
  'cash_in',
  'cash_out',
  'float_in',
  'take_out',
  'bank_deposit',
  'petty_expense',
  'correction_in',
  'correction_out',
  'other_in',
  'other_out',
] as const

export type CashbookMovementType = (typeof CASHBOOK_MOVEMENT_TYPES)[number]

export function isCashbookMovementType(value: string): value is CashbookMovementType {
  return (CASHBOOK_MOVEMENT_TYPES as readonly string[]).includes(value)
}

/** Plus = geld in de lade. Min = geld uit de lade. */
export function movementEffectCents(type: CashbookMovementType, amountCents: number): number {
  const amount = Math.abs(Math.round(amountCents))
  switch (type) {
    case 'cash_in':
    case 'float_in':
    case 'correction_in':
    case 'other_in':
      return amount
    case 'cash_out':
    case 'petty_expense':
    case 'take_out':
    case 'bank_deposit':
    case 'correction_out':
    case 'other_out':
      return -amount
    default:
      return 0
  }
}

export function expectedCashCents(input: {
  openingCents: number
  cashSalesCents: number
  movements: Array<{ type: CashbookMovementType; amountCents: number }>
}): number {
  let expected = Math.round(input.openingCents) + Math.round(input.cashSalesCents)
  for (const movement of input.movements) {
    expected += movementEffectCents(movement.type, movement.amountCents)
  }
  return expected
}

export function cashDifferenceCents(countedCents: number, expectedCents: number): number {
  return Math.round(countedCents) - Math.round(expectedCents)
}

export type CashbookPaymentTotals = {
  cashCents: number
  cardCents: number
  onlineCents: number
  grossCents: number
  count: number
  discountCents: number
  refundCents: number
}

export type CashbookOrderSlice = Partial<Order> &
  Pick<Order, 'order_type' | 'status' | 'payment_status'> & { created_at?: string | null }

/** Zelfde werkdag als de kassa: van openingsuur tot sluitingsuur, ook na middernacht. */
export function orderBelongsToCashbookDay(
  createdAt: string | null | undefined,
  bookDate: string,
  hours: TenantHourRow[],
): boolean {
  if (!createdAt) return false
  return businessDayForOrder(createdAt, hours) === bookDate
}

export function summarizeCashbookOrders(
  orders: CashbookOrderSlice[],
  hours: TenantHourRow[],
  bookDate: string,
): {
  payments: CashbookPaymentTotals
  cancelledCount: number
  cancelledCents: number
} {
  const payments: CashbookPaymentTotals = {
    cashCents: 0,
    cardCents: 0,
    onlineCents: 0,
    grossCents: 0,
    count: 0,
    discountCents: 0,
    refundCents: 0,
  }
  let cancelledCount = 0
  let cancelledCents = 0
  for (const order of orders) {
    if (!orderBelongsToCashbookDay(order.created_at, bookDate, hours)) continue
    const status = String(order.status || '').toLowerCase()
    if (status === 'cancelled' || status === 'rejected') {
      cancelledCount += 1
      cancelledCents += eurosToCents(order.total)
      continue
    }
    if (!orderCountsTowardRevenueAndZReport(order)) continue
    const parts = cashbookPaymentParts(order)
    const cash = eurosToCents(parts.cash)
    const card = eurosToCents(parts.card)
    const online = eurosToCents(parts.online)
    const methodSum = cash + card + online
    payments.cashCents += cash
    payments.cardCents += card
    payments.onlineCents += online
    payments.grossCents += eurosToCents(order.total)
    payments.count += 1
    payments.discountCents += eurosToCents(order.discount_amount)
    if (methodSum < 0) payments.refundCents += methodSum
  }
  return { payments, cancelledCount, cancelledCents }
}

export type CashbookVatLine = {
  rate: number
  baseCents: number
  taxCents: number
  inclCents: number
}

const VAT_RATES = [0, 6, 9, 12, 21] as const

/** Elk tarief apart. 9% blijft 9%, niet opgeteld bij 12%. */
export function vatLinesFromAggregate(agg: Pick<ZReportVatAggregate, 'taxByRate' | 'baseByRate'> | null): CashbookVatLine[] {
  const taxMap = (agg?.taxByRate || {}) as Record<number, number>
  const baseMap = (agg?.baseByRate || {}) as Record<number, number>
  const lines: CashbookVatLine[] = []
  for (const rate of VAT_RATES) {
    const taxCents = eurosToCents(taxMap[rate] || 0)
    const baseCents = eurosToCents(baseMap[rate] || 0)
    if (rate !== 6 && rate !== 12 && rate !== 21 && taxCents === 0 && baseCents === 0) continue
    lines.push({
      rate,
      baseCents,
      taxCents,
      inclCents: baseCents + taxCents,
    })
  }
  return lines
}

export type CashbookCheck = {
  ok: boolean
  leftCents: number
  rightCents: number
  differenceCents: number
}

const KASBOEK_CARD_METHODS = new Set([
  'card',
  'pin',
  'kaart',
  'bancontact',
  'visa',
  'mastercard',
  'maestro',
  'creditcard',
  'credit_card',
])

/**
 * Online = bestelling uit de webshop, ook als die met Bancontact of iDEAL betaald is.
 * Kaart = de klant betaalt in de zaak met bankkaart of Bancontact.
 */
export function cashbookPaymentParts(order: {
  total?: unknown
  order_type?: unknown
  payment_method?: unknown
  payment_split_cash?: unknown
  payment_split_card?: unknown
}): { cash: number; card: number; online: number } {
  const total = Number(order.total) || 0
  if (!isKassaPosOrder({ order_type: String(order.order_type || '') })) {
    return { cash: 0, card: 0, online: total }
  }
  const parts = distributeOrderPaymentForZRaport(order)
  const method = String(order.payment_method || '').toLowerCase()
  if (method === 'split' || !KASBOEK_CARD_METHODS.has(method)) return parts
  if (parts.card !== 0 || parts.online === 0) return parts
  return { cash: parts.cash, card: parts.online, online: 0 }
}

/** Cash + kaart + online moet gelijk zijn aan de dagontvangsten. */
export function paymentReconciliation(payments: CashbookPaymentTotals): CashbookCheck {
  const methods = payments.cashCents + payments.cardCents + payments.onlineCents
  return {
    ok: methods === payments.grossCents,
    leftCents: payments.grossCents,
    rightCents: methods,
    differenceCents: methods - payments.grossCents,
  }
}

/** Som per btw-tarief en excl.+btw moeten gelijk zijn aan de dagontvangsten. */
export function vatReconciliation(
  lines: CashbookVatLine[],
  grossCents: number,
  exclCents: number,
  taxCents: number,
): { ok: boolean; rates: CashbookCheck; parts: CashbookCheck } {
  const ratesSum = lines.reduce((sum, line) => sum + line.inclCents, 0)
  const partsSum = exclCents + taxCents
  const rates: CashbookCheck = {
    ok: ratesSum === grossCents,
    leftCents: grossCents,
    rightCents: ratesSum,
    differenceCents: ratesSum - grossCents,
  }
  const parts: CashbookCheck = {
    ok: partsSum === grossCents,
    leftCents: grossCents,
    rightCents: partsSum,
    differenceCents: partsSum - grossCents,
  }
  return { ok: rates.ok && parts.ok, rates, parts }
}

export type CashbookBadge = 'open' | 'closed' | 'correction' | 'difference' | 'attention' | 'none'

export function isListedClosureDate(
  ymd: string,
  closings: Array<{ date: string; date_end?: string | null }>,
): boolean {
  return closings.some((closing) => {
    const end = closing.date_end && closing.date_end >= closing.date ? closing.date_end : closing.date
    return ymd >= closing.date && ymd <= end
  })
}

export function cashbookDayNeedsClose(input: {
  status: string
  differenceCents: number | null
  adjustmentCount: number
  grossCents: number
  isPast: boolean
  closureDay?: boolean
}): boolean {
  if (input.closureDay && input.grossCents === 0 && input.status !== 'open') return false
  return cashbookBadge(input) === 'attention'
}

export function cashbookBadge(input: {
  status: string
  differenceCents: number | null
  adjustmentCount: number
  grossCents: number
  isPast: boolean
}): CashbookBadge {
  if (input.adjustmentCount > 0) return 'correction'
  if (input.status === 'closed' && (input.differenceCents || 0) !== 0) return 'difference'
  if (input.status === 'closed') return 'closed'
  const unfinished = input.status === 'open' || input.grossCents !== 0
  if (unfinished && input.isPast) return 'attention'
  if (input.status === 'open') return 'open'
  return 'none'
}

/** Afgesloten dagen blokkeren directe wijzigingen. Correctie is een aparte rij. */
export function cashbookWriteBlock(
  status: 'none' | 'open' | 'closed',
  action: 'opening' | 'movement' | 'close' | 'adjustment',
): string | null {
  if (action === 'adjustment') {
    return status === 'closed' ? null : 'Een correctie is alleen mogelijk na afsluiting.'
  }
  if (status === 'closed') {
    if (action === 'opening') return 'Deze dag is afgesloten.'
    if (action === 'movement') return 'Een afgesloten dag krijgt geen nieuwe beweging. Gebruik een correctie.'
    return 'Deze dag is al afgesloten.'
  }
  if ((action === 'movement' || action === 'close') && status === 'none') {
    return 'Bevestig eerst het beginsaldo.'
  }
  return null
}
