/**
 * Gedeelde Z-rapport data & BTW-tabel — scherm, e-mail en print gebruiken dezelfde structuur.
 */

import {
  CATEGORY_VAT_PERCENT_OPTIONS,
  type CategoryVatPercent,
} from '@/lib/order-vat'

export type ZReportVatRow = {
  rate: CategoryVatPercent
  baseExcl: number
  tax: number
}

export type ZReportAmounts = {
  orderCount: number
  subtotalExcl: number
  totalIncl: number
  taxByRate: Record<CategoryVatPercent, number>
  baseByRate: Record<CategoryVatPercent, number>
  cashPayments: number
  cardPayments: number
  onlinePayments: number
}

export function formatZReportEuro(amount: number): string {
  return `€${amount.toFixed(2)}`
}

/** Alleen tarieven met omzet of BTW > 0 — volgorde 6 → 21. */
export function buildZReportVatRows(amounts: Pick<ZReportAmounts, 'taxByRate' | 'baseByRate'>): ZReportVatRow[] {
  const rows: ZReportVatRow[] = []
  for (const rate of CATEGORY_VAT_PERCENT_OPTIONS) {
    const tax = Math.round((amounts.taxByRate[rate] || 0) * 100) / 100
    const baseExcl = Math.round((amounts.baseByRate[rate] || 0) * 100) / 100
    if (tax <= 0 && baseExcl <= 0) continue
    rows.push({ rate, baseExcl, tax })
  }
  return rows
}

export function zReportVatRowsTotalTax(rows: ZReportVatRow[]): number {
  return Math.round(rows.reduce((s, r) => s + r.tax, 0) * 100) / 100
}

export function zReportAmountsFromLegacyFields(input: {
  orderCount: number
  subtotal: number
  total: number
  taxLow: number
  taxMid: number
  taxHigh: number
  tax6?: number
  tax9?: number
  tax12?: number
  tax21?: number
  base6?: number
  base9?: number
  base12?: number
  base21?: number
  cashPayments: number
  cardPayments: number
  onlinePayments: number
}): ZReportAmounts {
  const taxByRate: Record<CategoryVatPercent, number> = { 6: 0, 9: 0, 12: 0, 21: 0 }
  const baseByRate: Record<CategoryVatPercent, number> = { 6: 0, 9: 0, 12: 0, 21: 0 }

  if (input.tax6 != null || input.tax9 != null || input.tax12 != null || input.tax21 != null) {
    taxByRate[6] = input.tax6 ?? 0
    taxByRate[9] = input.tax9 ?? 0
    taxByRate[12] = input.tax12 ?? 0
    taxByRate[21] = input.tax21 ?? 0
    baseByRate[6] = input.base6 ?? 0
    baseByRate[9] = input.base9 ?? 0
    baseByRate[12] = input.base12 ?? 0
    baseByRate[21] = input.base21 ?? 0
  } else {
    taxByRate[6] = input.taxLow
    taxByRate[9] = input.taxMid
    taxByRate[12] = 0
    taxByRate[21] = input.taxHigh
    if (input.taxMid > 0) {
      taxByRate[9] = input.taxMid
      taxByRate[12] = 0
    }
  }

  return {
    orderCount: input.orderCount,
    subtotalExcl: input.subtotal,
    totalIncl: input.total,
    taxByRate,
    baseByRate,
    cashPayments: input.cashPayments,
    cardPayments: input.cardPayments,
    onlinePayments: input.onlinePayments,
  }
}

export function zReportAmountsToLegacyTaxFields(amounts: ZReportAmounts): {
  taxLow: number
  taxMid: number
  taxHigh: number
  tax6: number
  tax9: number
  tax12: number
  tax21: number
} {
  return {
    tax6: amounts.taxByRate[6] || 0,
    tax9: amounts.taxByRate[9] || 0,
    tax12: amounts.taxByRate[12] || 0,
    tax21: amounts.taxByRate[21] || 0,
    taxLow: amounts.taxByRate[6] || 0,
    taxMid: Math.round(((amounts.taxByRate[9] || 0) + (amounts.taxByRate[12] || 0)) * 100) / 100,
    taxHigh: amounts.taxByRate[21] || 0,
  }
}
