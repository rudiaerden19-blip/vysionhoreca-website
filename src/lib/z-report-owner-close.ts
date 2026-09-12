import type { CategoryVatPercent } from '@/lib/order-vat'
import type { ZReportAmounts } from '@/lib/z-report-document'

/** Per-tenant module. Standaard uit — andere zaken blijven op kassabonnen. */
export function zReportOwnerEveningCloseEnabled(raw: unknown): boolean {
  if (raw === true || raw === 1 || raw === '1') return true
  if (typeof raw === 'string' && raw.trim().toLowerCase() === 'true') return true
  return false
}

export const OWNER_CLOSE_TAKEAWAY_VAT = 6 as const
export const OWNER_CLOSE_DINE_IN_FOOD_VAT = 12 as const
export const OWNER_CLOSE_DINE_IN_DRINKS_VAT = 21 as const

export type ZReportOwnerCloseInput = {
  cash: number
  card: number
  takeawayIncl: number
  dineInIncl: number
  dineInDrinksIncl: number
}

export type ZReportOwnerCloseRow = {
  owner_cash?: number | null
  owner_card?: number | null
  owner_takeaway_incl?: number | null
  owner_dinein_incl?: number | null
  owner_dinein_drinks_incl?: number | null
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function splitInclVat(incl: number, rate: CategoryVatPercent): { baseExcl: number; tax: number } {
  const safe = Number.isFinite(incl) && incl > 0 ? incl : 0
  if (safe <= 0 || rate <= 0) return { baseExcl: 0, tax: 0 }
  const baseExcl = round2(safe / (1 + rate / 100))
  const tax = round2(safe - baseExcl)
  return { baseExcl, tax }
}

export function parseOwnerCloseMoney(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.max(0, round2(raw))
  if (typeof raw === 'string') {
    const n = parseFloat(raw.replace(',', '.').trim())
    return Number.isFinite(n) ? Math.max(0, round2(n)) : 0
  }
  return 0
}

export function emptyOwnerCloseInput(): ZReportOwnerCloseInput {
  return { cash: 0, card: 0, takeawayIncl: 0, dineInIncl: 0, dineInDrinksIncl: 0 }
}

export function ownerCloseFromSaved(row: ZReportOwnerCloseRow | null | undefined): ZReportOwnerCloseInput | null {
  if (!row) return null
  const input: ZReportOwnerCloseInput = {
    cash: parseOwnerCloseMoney(row.owner_cash),
    card: parseOwnerCloseMoney(row.owner_card),
    takeawayIncl: parseOwnerCloseMoney(row.owner_takeaway_incl),
    dineInIncl: parseOwnerCloseMoney(row.owner_dinein_incl),
    dineInDrinksIncl: parseOwnerCloseMoney(row.owner_dinein_drinks_incl),
  }
  if (!hasOwnerCloseValues(input)) return null
  return input
}

export function hasOwnerCloseValues(input: ZReportOwnerCloseInput | null | undefined): boolean {
  if (!input) return false
  return (
    input.cash + input.card + input.takeawayIncl + input.dineInIncl + input.dineInDrinksIncl > 0
  )
}

export function ownerClosePaymentTotal(input: ZReportOwnerCloseInput): number {
  return round2(input.cash + input.card)
}

export function ownerCloseVatInclTotal(input: ZReportOwnerCloseInput): number {
  return round2(input.takeawayIncl + input.dineInIncl + input.dineInDrinksIncl)
}

export function ownerCloseToAmounts(input: ZReportOwnerCloseInput, orderCount = 0): ZReportAmounts {
  const take = splitInclVat(input.takeawayIncl, OWNER_CLOSE_TAKEAWAY_VAT)
  const dineFood = splitInclVat(input.dineInIncl, OWNER_CLOSE_DINE_IN_FOOD_VAT)
  const dineDrinks = splitInclVat(input.dineInDrinksIncl, OWNER_CLOSE_DINE_IN_DRINKS_VAT)
  const pay = ownerClosePaymentTotal(input)
  const vatIncl = ownerCloseVatInclTotal(input)
  const totalIncl = pay > 0 ? pay : vatIncl
  return {
    orderCount,
    subtotalExcl: round2(take.baseExcl + dineFood.baseExcl + dineDrinks.baseExcl),
    totalIncl,
    taxByRate: { 6: take.tax, 9: 0, 12: dineFood.tax, 21: dineDrinks.tax },
    baseByRate: { 6: take.baseExcl, 9: 0, 12: dineFood.baseExcl, 21: dineDrinks.baseExcl },
    cashPayments: round2(input.cash),
    cardPayments: round2(input.card),
    onlinePayments: 0,
  }
}

/** Totaal incl. van een opgeslagen avondtelling (analyse / rapportages). */
export function ownerCloseDayTotal(row: ZReportOwnerCloseRow | null | undefined): number {
  const input = ownerCloseFromSaved(row)
  if (!input) return 0
  return ownerCloseToAmounts(input).totalIncl
}

/** Alleen deze module: cron/kassa mogen een ingevulde avondtelling niet wissen. */
export function shouldKeepOwnerEveningCloseTotals(
  setting: unknown,
  row: ZReportOwnerCloseRow | null | undefined,
): boolean {
  return zReportOwnerEveningCloseEnabled(setting) && ownerCloseFromSaved(row) != null
}

export function ownerClosePaymentRow(input: ZReportOwnerCloseInput): {
  receipts: number
  cash: number
  card: number
  total: number
} {
  return {
    receipts: 1,
    cash: input.cash,
    card: input.card,
    total: ownerCloseToAmounts(input).totalIncl,
  }
}

export function ownerCloseOrderTypeTotals(input: ZReportOwnerCloseInput): {
  DINE_IN: number
  TAKEAWAY: number
  DELIVERY: number
} {
  return {
    DINE_IN: round2(input.dineInIncl + input.dineInDrinksIncl),
    TAKEAWAY: input.takeawayIncl,
    DELIVERY: 0,
  }
}

export function applyOwnerCloseToDayTotals<
  T extends {
    orderCount?: number
    subtotal?: number
    taxByRate?: ReturnType<typeof ownerCloseToAmounts>['taxByRate']
    baseByRate?: ReturnType<typeof ownerCloseToAmounts>['baseByRate']
    taxLow?: number
    taxMid?: number
    taxHigh?: number
    total?: number
    cashPayments?: number
    cardPayments?: number
    onlinePayments?: number
  },
>(prev: T, input: ZReportOwnerCloseInput): T {
  const overlay = ownerCloseToAmounts(input, prev.orderCount || 0)
  return {
    ...prev,
    orderCount: Math.max(prev.orderCount || 0, hasOwnerCloseValues(input) ? 1 : 0),
    subtotal: overlay.subtotalExcl,
    taxByRate: overlay.taxByRate,
    baseByRate: overlay.baseByRate,
    taxLow: overlay.taxByRate[6],
    taxMid: overlay.taxByRate[12],
    taxHigh: overlay.taxByRate[21],
    total: overlay.totalIncl,
    cashPayments: overlay.cashPayments,
    cardPayments: overlay.cardPayments,
    onlinePayments: 0,
  }
}
