import type { MenuCategory } from '@/lib/admin-api-menu-catalog'
import type { MenuProduct } from '@/lib/admin-api-menu-product-helpers'
import type { KassaCartItem } from '@/lib/kassa-cart-types'

/** Officiële keuzes in de UI (BE/NL gangbaar). */
export const CATEGORY_VAT_PERCENT_OPTIONS = [6, 9, 12, 21] as const
export type CategoryVatPercent = (typeof CATEGORY_VAT_PERCENT_OPTIONS)[number]

/** Valideert DB/API-waarde; onbekend → fallback. */
export function normalizeCategoryVatPercent(
  raw: unknown,
  fallback: number,
): CategoryVatPercent {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseInt(raw, 10) : NaN
  if (n === 6 || n === 9 || n === 12 || n === 21) return n
  const f =
    fallback === 6 || fallback === 9 || fallback === 12 || fallback === 21 ? fallback : 21
  return f as CategoryVatPercent
}

export function buildCategoryVatLookup(
  categories: MenuCategory[],
): Map<string, number | null | undefined> {
  const m = new Map<string, number | null | undefined>()
  for (const c of categories) {
    if (!c.id) continue
    m.set(String(c.id), c.default_btw_percentage ?? null)
  }
  return m
}

/** Per productregel: categorie‑override óf tenant‑default (bruto = incl. btw). */
export function resolveVatPercentForProduct(
  product: Pick<MenuProduct, 'category_id'>,
  categoryById: Map<string, number | null | undefined>,
  tenantDefaultPct: number,
): CategoryVatPercent {
  const base = normalizeCategoryVatPercent(tenantDefaultPct, 21)
  const cid = product.category_id
  if (!cid) return base
  const override = categoryById.get(String(cid))
  if (override === null || override === undefined) return base
  return normalizeCategoryVatPercent(override, base)
}

export interface VatSplitLine {
  rate: CategoryVatPercent
  baseExcl: number
  tax: number
}

/**
 * Brutoprijzen per regel → excl. + btw per tarief.
 * Afronding: per regel op 2 decimalen, daarna totalen.
 */
export function computeInclusiveVatSplitFromCart(
  cart: KassaCartItem[],
  resolveRate: (item: KassaCartItem) => CategoryVatPercent,
): {
  grossTotal: number
  subtotalExcl: number
  totalTax: number
  byRate: VatSplitLine[]
} {
  const acc = new Map<CategoryVatPercent, { base: number; tax: number }>()
  let grossTotal = 0

  for (const line of cart) {
    const choicesTotal = (line.choices || []).reduce((s, c) => s + c.price, 0)
    const lineGross = Math.round((line.product.price + choicesTotal) * line.quantity * 100) / 100
    grossTotal += lineGross
    const rate = resolveRate(line)
    const r = rate / 100
    const baseRaw = lineGross / (1 + r)
    const baseExcl = Math.round(baseRaw * 100) / 100
    const tax = Math.round((lineGross - baseExcl) * 100) / 100
    const prev = acc.get(rate) || { base: 0, tax: 0 }
    acc.set(rate, {
      base: Math.round((prev.base + baseExcl) * 100) / 100,
      tax: Math.round((prev.tax + tax) * 100) / 100,
    })
  }

  grossTotal = Math.round(grossTotal * 100) / 100
  const rates = Array.from(acc.keys()).sort((a, b) => a - b)
  const byRate: VatSplitLine[] = rates.map((rate) => {
    const v = acc.get(rate)!
    return { rate, baseExcl: v.base, tax: v.tax }
  })
  const subtotalExcl = Math.round(byRate.reduce((s, x) => s + x.baseExcl, 0) * 100) / 100
  const totalTax = Math.round(byRate.reduce((s, x) => s + x.tax, 0) * 100) / 100

  return { grossTotal, subtotalExcl, totalTax, byRate }
}
