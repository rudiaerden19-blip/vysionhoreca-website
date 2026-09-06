import type { MenuCategory } from '@/lib/admin-api-menu-catalog'
import type { MenuProduct } from '@/lib/admin-api-menu-product-helpers'
import type { KassaCartItem, KassaRegisterOrderType } from '@/lib/kassa-cart-types'
import { orderItemLineTotalEur } from '@/lib/order-items-display'
import type { ZReportVatContext } from '@/lib/z-report-vat-context'

/** Officiële keuzes in de UI (BE/NL gangbaar). */
export const CATEGORY_VAT_PERCENT_OPTIONS = [6, 9, 12, 21] as const
export type CategoryVatPercent = (typeof CATEGORY_VAT_PERCENT_OPTIONS)[number]

export type OrderTypeForVat = KassaRegisterOrderType

/** Normaliseer order_type uit DB (kassa, webshop pickup/delivery, …). */
export function normalizeOrderTypeForVat(raw: unknown): OrderTypeForVat {
  const u = String(raw ?? '').trim().toUpperCase()
  if (u === 'DINE_IN') return 'DINE_IN'
  if (u === 'DELIVERY') return 'DELIVERY'
  return 'TAKEAWAY'
}

/** België: 6% afhaal/levering, 12% ter plaatse. NL: geen verschil binnen/afhaal vs meenemen. */
export function isNetherlandsVatJurisdiction(country?: string | null): boolean {
  const c = String(country ?? '')
    .trim()
    .toUpperCase()
    .replace(/\./g, '')
  return c === 'NL' || c === 'NEDERLAND' || c === 'NETHERLANDS' || c.startsWith('NL')
}

/** Land voor BTW-logica: expliciet `country`, anders afleiden uit BTW-nummer (NL… / BE…). */
export function resolveTenantCountryForVat(
  country?: string | null,
  btwNumber?: string | null,
): string | null {
  if (String(country ?? '').trim()) return String(country).trim()
  const vat = String(btwNumber ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s.]/g, '')
  if (vat.startsWith('NL')) return 'NL'
  if (vat.startsWith('BE')) return 'BE'
  return null
}

/** NL of zaak met 9% default: zelfde tarief voor ter plaatse en afhalen/meenemen. */
export function shouldUnifyDineInAndOffPremiseVat(
  tenantDefaultPct: number,
  country?: string | null,
): boolean {
  if (isNetherlandsVatJurisdiction(country)) return true
  return normalizeCategoryVatPercent(tenantDefaultPct, 21) === 9
}

export function dineInAndOffPremiseVatRates(
  tenantDefaultPct: number,
  country?: string | null,
): {
  dineIn: CategoryVatPercent
  offPremise: CategoryVatPercent
} {
  const base = normalizeCategoryVatPercent(tenantDefaultPct, 21)
  if (shouldUnifyDineInAndOffPremiseVat(tenantDefaultPct, country)) {
    const unified = isNetherlandsVatJurisdiction(country)
      ? normalizeCategoryVatPercent(tenantDefaultPct, 9)
      : base
    return { dineIn: unified, offPremise: unified }
  }
  return { dineIn: 12, offPremise: 6 }
}

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

export function buildProductCategoryLookup(
  products: ReadonlyArray<{ id?: string | null; category_id?: string | null }>,
): Map<string, string | null> {
  return new Map(
    products
      .filter((p) => p.id)
      .map((p) => [String(p.id), p.category_id ? String(p.category_id) : null]),
  )
}

export function resolveCategoryIdForVatProduct(
  product: Pick<MenuProduct, 'id' | 'category_id'>,
  productCategoryById?: Map<string, string | null>,
): string | null {
  const pid = product.id
  if (pid && productCategoryById) {
    const fromCatalog = productCategoryById.get(String(pid))
    if (fromCatalog) return fromCatalog
  }
  if (product.category_id) return String(product.category_id)
  return null
}

/** Per productregel: categorie‑override óf tenant‑default (bruto = incl. btw). Zonder orderType: afhaal-tarief. */
export function resolveVatPercentForProduct(
  product: Pick<MenuProduct, 'category_id'>,
  categoryById: Map<string, number | null | undefined>,
  tenantDefaultPct: number,
): CategoryVatPercent {
  return resolveVatPercentForProductAndOrderType(
    product,
    categoryById,
    tenantDefaultPct,
    'TAKEAWAY',
  )
}

/**
 * BTW per product + besteltype (ter plaatse / afhalen / leveren).
 * Categorie met vast 21% (drank) wijzigt niet; eten volgt 6% afhaal vs 12% ter plaatse (BE).
 */
export function resolveVatPercentForProductAndOrderType(
  product: Pick<MenuProduct, 'id' | 'category_id'>,
  categoryById: Map<string, number | null | undefined>,
  tenantDefaultPct: number,
  orderType: OrderTypeForVat,
  productCategoryById?: Map<string, string | null>,
  country?: string | null,
): CategoryVatPercent {
  const categoryId = resolveCategoryIdForVatProduct(product, productCategoryById)
  const override = categoryId != null ? categoryById.get(categoryId) : undefined
  return resolveVatPercentForCategoryAndOrderType(override, tenantDefaultPct, orderType, country)
}

export function resolveVatPercentForCategoryAndOrderType(
  categoryOverride: number | null | undefined,
  tenantDefaultPct: number,
  orderType: OrderTypeForVat,
  country?: string | null,
): CategoryVatPercent {
  const base = normalizeCategoryVatPercent(tenantDefaultPct, 21)

  if (categoryOverride !== null && categoryOverride !== undefined) {
    return normalizeCategoryVatPercent(categoryOverride, base)
  }

  const { dineIn, offPremise } = dineInAndOffPremiseVatRates(tenantDefaultPct, country)
  return orderType === 'DINE_IN' ? dineIn : offPremise
}

export type VatServiceMode = 'DINE_IN' | 'TAKEAWAY'

function normalizeVatChoiceLabel(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const TAKEAWAY_VAT_CHOICE_LABELS = new Set([
  'meenemen',
  'mee nemen',
  'mee te nemen',
  'takeaway',
  'take away',
  'to go',
  'afhalen',
  'afhaal',
])

const DINE_IN_VAT_CHOICE_LABELS = new Set([
  'ter plaatse',
  'terplaatse',
  'dine in',
  'dinein',
  'opeten',
  'op eten',
  'hier eten',
])

/** Optiekeuze Meenemen / Ter plaatse → BTW-modus. Geen match → null (tenant zonder deze optie). */
export function vatServiceModeFromLabels(labels: Iterable<string>): VatServiceMode | null {
  let found: VatServiceMode | null = null
  for (const raw of labels) {
    const n = normalizeVatChoiceLabel(String(raw || ''))
    if (!n) continue
    if (TAKEAWAY_VAT_CHOICE_LABELS.has(n)) found = 'TAKEAWAY'
    else if (DINE_IN_VAT_CHOICE_LABELS.has(n)) found = 'DINE_IN'
  }
  return found
}

export function vatServiceModeFromCartChoices(
  choices?: ReadonlyArray<{ choiceName?: string; optionName?: string; name?: string } | null> | null,
): VatServiceMode | null {
  if (!choices?.length) return null
  const labels: string[] = []
  for (const c of choices) {
    if (!c) continue
    if (c.choiceName) labels.push(c.choiceName)
    if (c.name) labels.push(c.name)
    if (c.optionName) labels.push(c.optionName)
  }
  return vatServiceModeFromLabels(labels)
}

export function vatServiceModeFromOrderItemOptions(options: unknown): VatServiceMode | null {
  if (!Array.isArray(options)) return null
  const labels: string[] = []
  for (const o of options) {
    if (typeof o === 'string') {
      labels.push(o)
      continue
    }
    if (o && typeof o === 'object') {
      const r = o as Record<string, unknown>
      if (r.name != null) labels.push(String(r.name))
      if (r.choiceName != null) labels.push(String(r.choiceName))
    }
  }
  return vatServiceModeFromLabels(labels)
}

/**
 * Optie Meenemen/Ter plaatse wint voor eten (BE 6/12). Drank 21% en vast 9% blijven.
 * Geen zo'n keuze → bestaande categorie/besteltype-logica.
 */
export function resolveVatPercentWithOptionalServiceMode(
  categoryOverride: number | null | undefined,
  tenantDefaultPct: number,
  orderType: OrderTypeForVat,
  country: string | null | undefined,
  serviceMode: VatServiceMode | null,
): CategoryVatPercent {
  if (categoryOverride !== null && categoryOverride !== undefined) {
    const locked = normalizeCategoryVatPercent(categoryOverride, tenantDefaultPct)
    if (locked === 21 || locked === 9) return locked
  }
  if (serviceMode) {
    const { dineIn, offPremise } = dineInAndOffPremiseVatRates(tenantDefaultPct, country)
    return serviceMode === 'DINE_IN' ? dineIn : offPremise
  }
  return resolveVatPercentForCategoryAndOrderType(categoryOverride, tenantDefaultPct, orderType, country)
}

/** Kassa-regel: popup Meenemen/Ter plaatse wijzigt BTW; anders besteltype. */
export function resolveVatPercentForCartLine(
  product: Pick<MenuProduct, 'id' | 'category_id'>,
  categoryById: Map<string, number | null | undefined>,
  tenantDefaultPct: number,
  orderType: OrderTypeForVat,
  productCategoryById?: Map<string, string | null>,
  country?: string | null,
  choices?: ReadonlyArray<{ choiceName?: string; optionName?: string; name?: string } | null> | null,
): CategoryVatPercent {
  const categoryId = resolveCategoryIdForVatProduct(product, productCategoryById)
  const override = categoryId != null ? categoryById.get(categoryId) : undefined
  return resolveVatPercentWithOptionalServiceMode(
    override,
    tenantDefaultPct,
    orderType,
    country,
    vatServiceModeFromCartChoices(choices),
  )
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
  order_type?: unknown
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

function normalizeProductNameForVat(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

function lineDisplayNameForVat(line: Record<string, unknown>): string {
  const direct = line.name ?? line.product_name
  if (direct != null && String(direct).trim() !== '') return String(direct)
  const nested = line.product
  if (nested && typeof nested === 'object') {
    const pn = (nested as Record<string, unknown>).name
    if (pn != null && String(pn).trim() !== '') return String(pn)
  }
  return ''
}

/**
 * BTW-tarief per orderregel — categorie/product + besteltype vóór opgeslagen btw op de regel.
 */
function resolveLineVatRate(
  line: Record<string, unknown>,
  tenantDefaultPct: number,
  orderType: OrderTypeForVat,
  ctx?: ZReportVatContext | null,
): CategoryVatPercent {
  const fb = normalizeCategoryVatPercent(tenantDefaultPct, 21)

  const country = ctx?.tenantCountry
  const serviceMode = vatServiceModeFromOrderItemOptions(line.options)
  const resolveFromCategoryId = (categoryId: unknown): CategoryVatPercent | null => {
    if (!categoryId || !ctx?.categoryById) return null
    const override = ctx.categoryById.get(String(categoryId))
    return resolveVatPercentWithOptionalServiceMode(
      override,
      tenantDefaultPct,
      orderType,
      country,
      serviceMode,
    )
  }

  const productId = line.product_id ?? line.productId
  if (productId && ctx?.productCategoryById) {
    const cid = ctx.productCategoryById.get(String(productId))
    if (cid) {
      const fromProduct = resolveFromCategoryId(cid)
      if (fromProduct != null) return fromProduct
    }
  }

  const lineCategoryId = line.category_id ?? line.categoryId
  if (lineCategoryId) {
    const fromLineCategory = resolveFromCategoryId(lineCategoryId)
    if (fromLineCategory != null) return fromLineCategory
  }

  if (ctx?.productCategoryByNormalizedName) {
    const displayName = lineDisplayNameForVat(line)
    if (displayName) {
      const cid = ctx.productCategoryByNormalizedName.get(normalizeProductNameForVat(displayName))
      if (cid) {
        const fromName = resolveFromCategoryId(cid)
        if (fromName != null) return fromName
      }
    }
  }

  if (itemHasExplicitBtw(line)) return lineVatRate(line, fb)

  return resolveVatPercentWithOptionalServiceMode(
    undefined,
    tenantDefaultPct,
    orderType,
    country,
    serviceMode,
  )
}

/** BTW-tarief voor één orderregel (Z-rapport artikelenlijst, scherm/mail/print). */
export function resolveVatRateForOrderItem(
  item: unknown,
  tenantDefaultPct: number,
  orderType: OrderTypeForVat,
  ctx?: ZReportVatContext | null,
): CategoryVatPercent {
  const country = ctx?.tenantCountry
  if (!item || typeof item !== 'object') {
    return resolveVatPercentForCategoryAndOrderType(undefined, tenantDefaultPct, orderType, country)
  }
  return resolveLineVatRate(item as Record<string, unknown>, tenantDefaultPct, orderType, ctx)
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
  ctx?: ZReportVatContext | null,
): { subtotalExcl: number; buckets: Record<CategoryVatPercent, number>; baseBuckets: Record<CategoryVatPercent, number> } {
  const orderType = normalizeOrderTypeForVat(order.order_type)
  const country = ctx?.tenantCountry
  const defaultOrderRate = resolveVatPercentForCategoryAndOrderType(
    undefined,
    tenantDefaultPct,
    orderType,
    country,
  )
  const orderTotal = round2(Number(order.total) || 0)
  const buckets = emptyVatBuckets()
  const baseBuckets = emptyVatBuckets()
  const items = parseItems(order.items)
  const lines: { gross: number; rate: CategoryVatPercent }[] = []

  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue
    const line = raw as Record<string, unknown>
    const gross = round2(orderItemLineTotalEur(raw))
    if (gross <= 0) continue
    const rate = resolveLineVatRate(line, tenantDefaultPct, orderType, ctx)
    lines.push({ gross, rate })
  }

  const sumLineGross = round2(lines.reduce((s, x) => s + x.gross, 0))
  const delta = round2(orderTotal - sumLineGross)
  if (delta > 0.001) {
    lines.push({ gross: delta, rate: defaultOrderRate })
  }

  let subtotalExcl = 0

  if (lines.length === 0) {
    if (orderTotal <= 0) {
      return { subtotalExcl: 0, buckets, baseBuckets }
    }
    const r = defaultOrderRate / 100
    const baseExcl = round2(orderTotal / (1 + r))
    const tax = round2(orderTotal - baseExcl)
    buckets[defaultOrderRate] = tax
    baseBuckets[defaultOrderRate] = baseExcl
    return { subtotalExcl: baseExcl, buckets, baseBuckets }
  }

  for (const { gross, rate } of lines) {
    const r = rate / 100
    const baseExcl = round2(gross / (1 + r))
    const tax = round2(gross - baseExcl)
    subtotalExcl = round2(subtotalExcl + baseExcl)
    buckets[rate] = round2(buckets[rate] + tax)
    baseBuckets[rate] = round2((baseBuckets[rate] || 0) + baseExcl)
  }

  return { subtotalExcl, buckets, baseBuckets }
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
  taxByRate: Record<CategoryVatPercent, number>
  baseByRate: Record<CategoryVatPercent, number>
  /** DB-compat: 6% */
  tax_low: number
  /** DB-compat: 9% + 12% */
  tax_mid: number
  /** DB-compat: 21% */
  tax_high: number
  totalTax: number
}

export function aggregateZReportVatFromOrderRows(
  orders: ZReportVatOrderSlice[],
  tenantDefaultPct: number,
  ctx?: ZReportVatContext | null,
): ZReportVatAggregate {
  let subtotalExcl = 0
  const sumBuckets = emptyVatBuckets()
  const sumBaseBuckets = emptyVatBuckets()

  for (const order of orders) {
    const { subtotalExcl: se, buckets, baseBuckets } = allocateVatBucketsForSingleOrder(
      order,
      tenantDefaultPct,
      ctx,
    )
    subtotalExcl = round2(subtotalExcl + se)
    for (const rate of CATEGORY_VAT_PERCENT_OPTIONS) {
      sumBuckets[rate] = round2(sumBuckets[rate] + (buckets[rate] || 0))
      sumBaseBuckets[rate] = round2(sumBaseBuckets[rate] + (baseBuckets[rate] || 0))
    }
  }

  const { tax_low, tax_mid, tax_high, totalTax } = foldVatBucketsToZColumns(sumBuckets)
  return {
    subtotalExcl,
    taxByRate: sumBuckets,
    baseByRate: sumBaseBuckets,
    tax_low,
    tax_mid,
    tax_high,
    totalTax,
  }
}
