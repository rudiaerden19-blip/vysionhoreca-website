import { supabase } from '@/lib/supabase'

/** Verkoopbare eenheid: variant-SKU of legacy product zonder varianten. */
export type RetailPosSku = {
  lineKey: string
  productId: string
  variantId: string | null
  name: string
  description: string
  price: number
  image_url: string
  article_number: string | null
  barcode: string | null
  size_label: string | null
  color_label: string | null
  track_stock: boolean
  stock_quantity: number
  low_stock_threshold: number
  category_id: string | null
}

export type RetailCartLine = {
  sku: RetailPosSku
  quantity: number
}

const PRODUCT_SELECT =
  'id, name, description, price, image_url, category_id, article_number, barcode, size_label, color_label, track_stock, stock_quantity, low_stock_threshold'

const VARIANT_SELECT =
  'id, product_id, article_number, barcode, size_label, color_label, price_override, track_stock, stock_quantity, low_stock_threshold, is_active, sort_order'

type ProductRow = {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  category_id: string | null
  article_number: string | null
  barcode: string | null
  size_label: string | null
  color_label: string | null
  track_stock: boolean | null
  stock_quantity: number | null
  low_stock_threshold: number | null
}

type VariantRow = {
  id: string
  product_id: string
  article_number: string | null
  barcode: string | null
  size_label: string | null
  color_label: string | null
  price_override: number | null
  track_stock: boolean
  stock_quantity: number
  low_stock_threshold: number
  is_active: boolean
  sort_order: number
}

function formatSkuName(base: string, size: string | null, color: string | null): string {
  const parts: string[] = []
  if (size?.trim()) parts.push(size.trim())
  if (color?.trim()) parts.push(color.trim())
  if (parts.length === 0) return base
  return `${base} — ${parts.join(' / ')}`
}

export function buildRetailSkusFromRows(products: ProductRow[], variants: VariantRow[]): RetailPosSku[] {
  const byProduct = new Map<string, VariantRow[]>()
  for (const v of variants) {
    if (!v.is_active) continue
    const list = byProduct.get(v.product_id) ?? []
    list.push(v)
    byProduct.set(v.product_id, list)
  }

  const skus: RetailPosSku[] = []
  for (const p of products) {
    const vars = (byProduct.get(p.id) ?? []).sort((a, b) => a.sort_order - b.sort_order)
    if (vars.length > 0) {
      for (const v of vars) {
        skus.push({
          lineKey: `v:${v.id}`,
          productId: p.id,
          variantId: v.id,
          name: formatSkuName(p.name, v.size_label, v.color_label),
          description: p.description || '',
          price: v.price_override != null ? Number(v.price_override) : Number(p.price) || 0,
          image_url: p.image_url || '',
          article_number: v.article_number?.trim() || null,
          barcode: v.barcode?.trim() || null,
          size_label: v.size_label?.trim() || null,
          color_label: v.color_label?.trim() || null,
          track_stock: !!v.track_stock,
          stock_quantity: Number(v.stock_quantity) || 0,
          low_stock_threshold: Number(v.low_stock_threshold) || 5,
          category_id: p.category_id,
        })
      }
    } else {
      skus.push({
        lineKey: `p:${p.id}`,
        productId: p.id,
        variantId: null,
        name: formatSkuName(p.name, p.size_label, p.color_label),
        description: p.description || '',
        price: Number(p.price) || 0,
        image_url: p.image_url || '',
        article_number: p.article_number?.trim() || null,
        barcode: p.barcode?.trim() || null,
        size_label: p.size_label?.trim() || null,
        color_label: p.color_label?.trim() || null,
        track_stock: !!p.track_stock,
        stock_quantity: Number(p.stock_quantity) || 0,
        low_stock_threshold: Number(p.low_stock_threshold) || 5,
        category_id: p.category_id,
      })
    }
  }
  return skus
}

export async function fetchRetailPosSkus(tenantSlug: string): Promise<RetailPosSku[]> {
  if (!supabase) return []
  const [prodRes, varRes] = await Promise.all([
    supabase
      .from('menu_products')
      .select(PRODUCT_SELECT)
      .eq('tenant_slug', tenantSlug)
      .eq('is_active', true)
      .order('name'),
    supabase.from('menu_product_variants').select(VARIANT_SELECT).eq('tenant_slug', tenantSlug),
  ])
  if (prodRes.error) {
    console.warn('[retail-pos] products:', prodRes.error.message)
    return []
  }
  if (varRes.error) {
    console.warn('[retail-pos] variants:', varRes.error.message)
  }
  return buildRetailSkusFromRows(
    (prodRes.data || []) as ProductRow[],
    (varRes.data || []) as VariantRow[],
  )
}

/** Varianten van gescande code (UPC-A 12 ↔ EAN-13 met voorloopnul, alleen cijfers). */
export function retailBarcodeLookupCandidates(raw: string): string[] {
  const trimmed = raw.trim()
  if (!trimmed) return []

  const out: string[] = []
  const seen = new Set<string>()
  const push = (s: string) => {
    const t = s.trim()
    if (!t) return
    const key = t.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    out.push(t)
  }

  push(trimmed)

  const digits = trimmed.replace(/\D/g, '')
  if (digits.length > 0) {
    push(digits)
    if (digits.length === 12) push(`0${digits}`)
    if (digits.length === 13 && digits.startsWith('0')) push(digits.slice(1))
  }

  return out
}

function skuMatchesCode(sku: RetailPosSku, lowerCode: string): boolean {
  return (
    (!!sku.barcode && sku.barcode.toLowerCase() === lowerCode) ||
    (!!sku.article_number && sku.article_number.toLowerCase() === lowerCode)
  )
}

export function findRetailSkuByCode(skus: RetailPosSku[], code: string): RetailPosSku | null {
  for (const candidate of retailBarcodeLookupCandidates(code)) {
    const lower = candidate.toLowerCase()
    const hit = skus.find((s) => skuMatchesCode(s, lower))
    if (hit) return hit
  }
  return null
}

/** Zoek op barcode/artikelnr., anders unieke naam-treffer (artikel zoeken). */
export function resolveRetailSkuLookup(skus: RetailPosSku[], raw: string): RetailPosSku | null {
  const direct = findRetailSkuByCode(skus, raw)
  if (direct) return direct
  const q = raw.trim().toLowerCase()
  if (q.length < 2) return null
  const hits = skus.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      (s.description && s.description.toLowerCase().includes(q)),
  )
  if (hits.length === 1) return hits[0]
  return null
}

export type RetailScanPayload = {
  lookupCode: string
  quantity: number
  size_label: string | null
  color_label: string | null
}

export function parseRetailScanPayload(raw: string): RetailScanPayload {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { lookupCode: '', quantity: 1, size_label: null, color_label: null }
  }

  if (/^VYSION;/i.test(trimmed)) {
    const parts = trimmed.split(';').slice(1)
    const map: Record<string, string> = {}
    for (const p of parts) {
      const eq = p.indexOf('=')
      if (eq < 0) continue
      map[p.slice(0, eq).trim().toLowerCase()] = p.slice(eq + 1).trim()
    }
    const lookupCode = map.bc || map.barcode || map.sku || map.ean || ''
    const qty = Math.max(1, Math.floor(Number(map.qty || map.quantity || '1') || 1))
    return {
      lookupCode: lookupCode || trimmed,
      quantity: qty,
      size_label: map.size || map.maat || map.size_label || null,
      color_label: map.color || map.kleur || map.color_label || null,
    }
  }

  if (trimmed.includes('|')) {
    const [code, qtyRaw, size, color] = trimmed.split('|').map((s) => s.trim())
    const qty = Math.max(1, Math.floor(Number(qtyRaw) || 1))
    return {
      lookupCode: code || trimmed,
      quantity: qty,
      size_label: size || null,
      color_label: color || null,
    }
  }

  const star = trimmed.match(/^(\d+)\*(.+)$/)
  if (star) {
    return {
      lookupCode: star[2].trim(),
      quantity: Math.max(1, Math.floor(Number(star[1]) || 1)),
      size_label: null,
      color_label: null,
    }
  }

  return { lookupCode: trimmed, quantity: 1, size_label: null, color_label: null }
}

function normLabel(s: string | null | undefined): string {
  return (s || '').trim().toLowerCase()
}

/** Goederenontvangst: barcode eerst, anders maat/kleur binnen zelfde product. */
export function resolveRetailSkuForGoodsReceipt(
  skus: RetailPosSku[],
  payload: RetailScanPayload,
): RetailPosSku | null {
  const byCode = findRetailSkuByCode(skus, payload.lookupCode)
  if (byCode) return byCode

  const sizeN = normLabel(payload.size_label)
  const colorN = normLabel(payload.color_label)
  if (!sizeN && !colorN) return resolveRetailSkuLookup(skus, payload.lookupCode)

  const productHits = skus.filter(
    (s) =>
      (s.barcode && s.barcode.toLowerCase() === payload.lookupCode.toLowerCase()) ||
      (s.article_number && s.article_number.toLowerCase() === payload.lookupCode.toLowerCase()),
  )
  const productIds = new Set(productHits.map((s) => s.productId))

  const variantCandidates = skus.filter((s) => {
    if (s.variantId == null) return false
    if (productIds.size > 0 && !productIds.has(s.productId)) return false
    const okSize = !sizeN || normLabel(s.size_label) === sizeN
    const okColor = !colorN || normLabel(s.color_label) === colorN
    return okSize && okColor
  })
  if (variantCandidates.length === 1) return variantCandidates[0]
  return null
}

export function retailSkuInStock(sku: RetailPosSku, addQty: number): boolean {
  if (!sku.track_stock) return true
  return sku.stock_quantity >= addQty
}

export function patchSkuInList(skus: RetailPosSku[], next: RetailPosSku): RetailPosSku[] {
  return skus.map((s) => (s.lineKey === next.lineKey ? next : s))
}
