import type { CategoryVatPercent } from '@/lib/order-vat'

export type RetailDiscount =
  | { kind: 'percent'; value: number }
  | { kind: 'amount'; value: number }

export type RetailPriceInputLine = {
  key: string
  payableAfterPromo: number
  vatRate: CategoryVatPercent
  lineDiscount?: RetailDiscount | null
}

export type RetailSalePriceLine = {
  key: string
  payable: number
  vatRate: CategoryVatPercent
  baseExcl: number
  tax: number
}

export type RetailSalePrice = {
  lines: RetailSalePriceLine[]
  total: number
  subtotalExcl: number
  totalTax: number
  discountEuro: number
  vatSplit: { rate: CategoryVatPercent; baseExcl: number; tax: number }[]
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0
  return Math.min(100, value)
}

function applyPercentCents(cents: number, percent: number): number {
  const p = clampPercent(percent)
  if (p <= 0) return cents
  return Math.max(0, Math.round((cents * (100 - p)) / 100))
}

function subtractCents<T extends { cents: number }>(rows: T[], cut: number): T[] {
  const sum = rows.reduce((s, row) => s + row.cents, 0)
  if (cut <= 0 || sum <= 0) return rows
  const take = Math.min(Math.round(cut), sum)
  const shares = rows.map(() => 0)
  let allocated = 0
  for (let i = 0; i < rows.length - 1; i++) {
    const share = Math.min(rows[i].cents, Math.floor((rows[i].cents * take) / sum))
    shares[i] = share
    allocated += share
  }
  let rem = take - allocated
  for (let i = rows.length - 1; i >= 0 && rem > 0; i--) {
    const room = rows[i].cents - shares[i]
    const share = Math.min(room, rem)
    shares[i] += share
    rem -= share
  }
  return rows.map((row, i) => ({ ...row, cents: row.cents - shares[i] }))
}

/** Promo eerst, dan artikelkorting, klantprocent, bonkorting, punten en tegoed. Btw op wat betaald wordt. */
export function priceRetailSale(
  lines: RetailPriceInputLine[],
  adjustments?: {
    customerPercent?: number
    ticketDiscount?: RetailDiscount | null
    loyaltyEuro?: number
    creditEuro?: number
  },
): RetailSalePrice {
  let rows = lines.map((line) => {
    let cents = Math.max(0, Math.round((Number(line.payableAfterPromo) || 0) * 100))
    const discount = line.lineDiscount
    if (discount && discount.value > 0) {
      if (discount.kind === 'percent') cents = applyPercentCents(cents, discount.value)
      else cents = Math.max(0, cents - Math.round(discount.value * 100))
    }
    return { key: line.key, cents, vatRate: line.vatRate }
  })

  const afterPromoCents = lines.reduce(
    (s, line) => s + Math.max(0, Math.round((Number(line.payableAfterPromo) || 0) * 100)),
    0,
  )

  rows = rows.map((row) => ({
    ...row,
    cents: applyPercentCents(row.cents, adjustments?.customerPercent ?? 0),
  }))

  const ticket = adjustments?.ticketDiscount
  if (ticket && ticket.value > 0) {
    if (ticket.kind === 'percent') {
      rows = rows.map((row) => ({ ...row, cents: applyPercentCents(row.cents, ticket.value) }))
    } else {
      rows = subtractCents(rows, Math.round(ticket.value * 100))
    }
  }

  rows = subtractCents(rows, Math.round((adjustments?.loyaltyEuro ?? 0) * 100))
  rows = subtractCents(rows, Math.round((adjustments?.creditEuro ?? 0) * 100))

  const priced: RetailSalePriceLine[] = rows.map((row) => {
    const payable = row.cents / 100
    const rate = row.vatRate / 100
    const baseExcl = Math.round((payable / (1 + rate)) * 100) / 100
    const tax = Math.round((payable - baseExcl) * 100) / 100
    return { key: row.key, payable, vatRate: row.vatRate, baseExcl, tax }
  })

  const byRate = new Map<CategoryVatPercent, { baseExcl: number; tax: number }>()
  for (const line of priced) {
    const prev = byRate.get(line.vatRate) || { baseExcl: 0, tax: 0 }
    byRate.set(line.vatRate, {
      baseExcl: Math.round((prev.baseExcl + line.baseExcl) * 100) / 100,
      tax: Math.round((prev.tax + line.tax) * 100) / 100,
    })
  }
  const vatSplit = [...byRate.entries()]
    .sort((a, b) => a[0] - b[0])
    .filter(([, v]) => v.baseExcl !== 0 || v.tax !== 0)
    .map(([rate, v]) => ({ rate, baseExcl: v.baseExcl, tax: v.tax }))

  const total = Math.round(priced.reduce((s, line) => s + line.payable, 0) * 100) / 100
  const totalTax = Math.round(vatSplit.reduce((s, row) => s + row.tax, 0) * 100) / 100
  const subtotalExcl = Math.round(vatSplit.reduce((s, row) => s + row.baseExcl, 0) * 100) / 100
  const discountEuro = Math.round((afterPromoCents / 100 - total) * 100) / 100

  return {
    lines: priced,
    total,
    subtotalExcl,
    totalTax,
    discountEuro: Math.max(0, discountEuro),
    vatSplit,
  }
}
