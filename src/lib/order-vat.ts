import type { MenuCategory } from '@/lib/admin-api-menu-catalog'
import type { MenuProduct } from '@/lib/admin-api-menu-product-helpers'
import type { KassaCartItem } from '@/lib/kassa-cart-types'
import { orderItemLineTotalEur } from '@/lib/order-items-display'

/** Officiële keuzes in de UI (BE/NL gangbaar). */
export const CATEGORY_VAT_PERCENT_OPTIONS = [6, 9, 12, 21] as const
export type CategoryVatPercent = (typeof CATEGORY_VAT_PERCENT_OPTIONS)[number]

/** Valideert DB/API-waarde; onbekend → fallback. */
export function normalizeCategoryVatPercent(
  raw: unknown,
  fallback: number,
): CategoryVatPercent {
  const n = typeof raw === 'number'? raw : typeof raw === 'string'? parseInt(raw, 10) : NaN
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

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Minimale order-schil voor Z-aggregatie uit `orders`JSON. */
export interface ZReportVatOrderSlice {
  total?: unknown
  items?: unknown
}

function emptyVatBuckets(): Record<CategoryVatPercent, number> {
  return { 6: 0, 9: 0, 12: 0, 21: 0 }
}

function itemHasExplicitBtw(raw: Record<string, unknown>): boolean {
  const v = raw.btw_percentage
  if (v === null || v === undefined) return false
  if (typeof v === 'number' && Number.isFinite(v)) return true
  if (typeof v === 'string' && v.trim() !== '') {
    const n = parseInt(v, 10)
    return Number.isFinite(n)
  }
  return false
}

function lineVatRate(line: Record<string, unknown>, fallbackRate: CategoryVatPercent): CategoryVatPercent {
  const v = line.btw_percentage
  if (typeof v === 'number' && Number.isFinite(v)) {
    return normalizeCategoryVatPercent(v, fallbackRate)
  }
  if (typeof v === 'string' && v.trim() !== '') {
    const n = parseInt(v, 10)
    if (Number.isFinite(n)) return normalizeCategoryVatPercent(n, fallbackRate)
  }
  return fallbackRate
}

function parseItems(raw: unknown): unknown[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw) as unknown
      return Array.isArray(p) ? p : []
    } catch {
      return []
    }
  }
  return []
}

/**
 * Brutobedrag en btw per officiële tarief voor één order.
 * Tarief op regel: `btw_percentage`indien aanwezig, anders zaak‑default.
 * Verschil `order.total`− som(regels): toegewezen aan defaulttarief (kostenbezorging enz.).
 */
export function allocateVatBucketsForSingleOrder(
  order: ZReportVatOrderSlice,
  tenantDefaultPct: number,
): { subtotalExcl: number; buckets: Record<CategoryVatPercent, number> } {
  const fb = normalizeCategoryVatPercent(tenantDefaultPct, 21)
  const orderTotal = round2(Number(order.total) || 0)
  const buckets = emptyVatBuckets()
  const items = parseItems(order.items)
  const lines: { gross: number; rate: CategoryVatPercent }[] = []

  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue
    const line = raw as Record<string, unknown>
    const gross = round2(orderItemLineTotalEur(raw))
    if (gross <= 0) continue
    const rate = itemHasExplicitBtw(line) ? lineVatRate(line, fb) : fb
    lines.push({ gross, rate })
  }

  const sumLineGross = round2(lines.reduce((s, x) => s + x.gross, 0))
  const delta = round2(orderTotal - sumLineGross)
  if (delta > 0.001) {
    lines.push({ gross: delta, rate: fb })
  }

  let subtotalExcl = 0

  if (lines.length === 0) {
    if (orderTotal <= 0) {
      return { subtotalExcl: 0, buckets }
    }
    const r = fb / 100
    const baseExcl = round2(orderTotal / (1 + r))
    const tax = round2(orderTotal - baseExcl)
    buckets[fb] = tax
    return { subtotalExcl: baseExcl, buckets }
  }

  for (const { gross, rate } of lines) {
    const r = rate / 100
    const baseExcl = round2(gross / (1 + r))
    const tax = round2(gross - baseExcl)
    subtotalExcl = round2(subtotalExcl + baseExcl)
    buckets[rate] = round2(buckets[rate] + tax)
  }

  return { subtotalExcl, buckets }
}

/** Z-rapport: `tax_mid`= 9% + 12% in één kolom. */
export function foldVatBucketsToZColumns(buckets: Record<CategoryVatPercent, number>): {
  tax_low: number
  tax_mid: number
  tax_high: number
  totalTax: number
} {
  const tax_low = round2(buckets[6] || 0)
  const tax_mid = round2((buckets[9] || 0) + (buckets[12] || 0))
  const tax_high = round2(buckets[21] || 0)
  const totalTax = round2(tax_low + tax_mid + tax_high)
  return { tax_low, tax_mid, tax_high, totalTax }
}

export interface ZReportVatAggregate {
  subtotalExcl: number
  tax_low: number
  tax_mid: number
  tax_high: number
  totalTax: number
}

export function aggregateZReportVatFromOrderRows(
  orders: ZReportVatOrderSlice[],
  tenantDefaultPct: number,
): ZReportVatAggregate {
  let subtotalExcl = 0
  const sumBuckets = emptyVatBuckets()

  for (const order of orders) {
    const { subtotalExcl: se, buckets } = allocateVatBucketsForSingleOrder(order, tenantDefaultPct)
    subtotalExcl = round2(subtotalExcl + se)
    for (const rate of CATEGORY_VAT_PERCENT_OPTIONS) {
      sumBuckets[rate] = round2(sumBuckets[rate] + (buckets[rate] || 0))
    }
  }

  const { tax_low, tax_mid, tax_high, totalTax } = foldVatBucketsToZColumns(sumBuckets)
  return { subtotalExcl, tax_low, tax_mid, tax_high, totalTax }
}
