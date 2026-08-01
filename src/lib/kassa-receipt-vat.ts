import {
  dedupeCatalogById,
  getMenuCategories,
  getMenuProducts,
  type MenuCategory,
  type MenuProduct,
} from '@/lib/admin-api'
import { adminDb } from '@/lib/admin-db-client'
import type { KassaCartItem, KassaLastOrderReceipt, KassaRegisterOrderType } from '@/lib/kassa-cart-types'
import {
  computeInclusiveVatSplitFromCart,
  normalizeCategoryVatPercent,
  normalizeOrderTypeForVat,
  resolveTenantCountryForVat,
  resolveVatPercentForCategoryAndOrderType,
  type CategoryVatPercent,
  type VatSplitLine,
} from '@/lib/order-vat'

export type KassaReceiptVatComputed = {
  subtotalExcl: number
  totalTax: number
  byRate: VatSplitLine[]
}

/** Server-side catalog (service role) — betrouwbaarder dan anon-cache voor BTW op bon. */
export async function fetchKassaMenuVatCatalog(tenantSlug: string): Promise<{
  categories: MenuCategory[]
  products: MenuProduct[]
}> {
  const slug = tenantSlug.trim()
  const [catRes, prodRes] = await Promise.all([
    adminDb.select<MenuCategory[]>('menu_categories', {
      tenantSlug: slug,
      select: 'id, tenant_slug, name, default_btw_percentage, is_active, sort_order, description, image_url',
      match: { tenant_slug: slug },
      limit: 500,
    }),
    adminDb.select<MenuProduct[]>('menu_products', {
      tenantSlug: slug,
      select:
        'id, tenant_slug, category_id, name, price, is_active, sort_order, description, image_url, is_popular, allergens',
      match: { tenant_slug: slug },
      limit: 2000,
    }),
  ])
  if (catRes.ok && prodRes.ok && Array.isArray(catRes.data) && Array.isArray(prodRes.data)) {
    return {
      categories: dedupeCatalogById(catRes.data),
      products: dedupeCatalogById(prodRes.data),
    }
  }
  const [categories, products] = await Promise.all([getMenuCategories(slug), getMenuProducts(slug)])
  return { categories: dedupeCatalogById(categories), products: dedupeCatalogById(products) }
}

function buildCategoryVatOverrideMap(
  categories: ReadonlyArray<MenuCategory>,
  tenantDefaultBtw: number,
): Map<string, number | null> {
  const m = new Map<string, number | null>()
  for (const c of categories) {
    if (!c.id) continue
    const raw = c.default_btw_percentage
    m.set(
      String(c.id),
      raw === null || raw === undefined
        ? null
        : (normalizeCategoryVatPercent(raw, tenantDefaultBtw) as number),
    )
  }
  return m
}

function normalizeNameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

function resolveProductCategoryId(
  line: KassaCartItem,
  products: ReadonlyArray<MenuProduct>,
): string | null {
  const hydrated = hydrateKassaCartItemsFromCatalog([line], products)[0] ?? line
  const pid = hydrated.product.id ? String(hydrated.product.id) : ''
  if (pid && !pid.startsWith('custom-')) {
    const fromCatalog = products.find((p) => p.id && String(p.id) === pid)
    if (fromCatalog?.category_id) return String(fromCatalog.category_id)
  }
  if (hydrated.product.category_id) return String(hydrated.product.category_id)
  const displayName = hydrated.product.name?.trim()
  if (displayName) {
    const key = normalizeNameKey(displayName)
    const byName = products.find(
      (p) => p.name && normalizeNameKey(String(p.name)) === key && p.category_id,
    )
    if (byName?.category_id) return String(byName.category_id)
  }
  return null
}

/**
 * BTW per kassaregel: product → categorie.default_btw_percentage → anders zaak/ordertype.
 * Geen order-regel snapshot; expliciet voor bon + afrekenen.
 */
export function resolveKassaCartLineVatRate(
  line: KassaCartItem,
  categories: MenuCategory[],
  products: ReadonlyArray<MenuProduct>,
  tenantDefaultBtw: number,
  orderType: KassaRegisterOrderType,
  tenantCountry: string | null,
  tenantBtwNumber?: string | null,
): CategoryVatPercent {
  const country = resolveTenantCountryForVat(tenantCountry, tenantBtwNumber ?? null)
  const orderTypeForVat = normalizeOrderTypeForVat(orderType)
  const catVat = buildCategoryVatOverrideMap(categories, tenantDefaultBtw)
  const categoryId = resolveProductCategoryId(line, products)
  if (categoryId && catVat.has(categoryId)) {
    return resolveVatPercentForCategoryAndOrderType(
      catVat.get(categoryId),
      tenantDefaultBtw,
      orderTypeForVat,
      country,
    )
  }
  return resolveVatPercentForCategoryAndOrderType(undefined, tenantDefaultBtw, orderTypeForVat, country)
}

export function computeKassaReceiptVatFromCartLines(
  lines: KassaCartItem[],
  categories: MenuCategory[],
  products: MenuProduct[],
  tenantDefaultBtw: number,
  orderType: KassaRegisterOrderType,
  tenantCountry: string | null,
  tenantBtwNumber?: string | null,
): KassaReceiptVatComputed {
  const split = computeInclusiveVatSplitFromCart(lines, (line) =>
    resolveKassaCartLineVatRate(
      line,
      categories,
      products,
      tenantDefaultBtw,
      orderType,
      tenantCountry,
      tenantBtwNumber,
    ),
  )
  return {
    subtotalExcl: Math.round(split.subtotalExcl * 100) / 100,
    totalTax: Math.round(split.totalTax * 100) / 100,
    byRate: split.byRate,
  }
}

/**
 * Open tafelmanden uit Supabase missen vaak `category_id` op het product-snapshot.
 * Catalogus wint altijd (live menu).
 */
export function hydrateKassaCartItemsFromCatalog(
  lines: KassaCartItem[],
  products: ReadonlyArray<MenuProduct>,
): KassaCartItem[] {
  const byId = new Map<string, MenuProduct>()
  for (const p of products) {
    if (p.id) byId.set(String(p.id), p)
  }
  return lines.map((line) => {
    const pid = line.product?.id
    if (!pid || String(pid).startsWith('custom-')) return line
    const fromCatalog = byId.get(String(pid))
    if (!fromCatalog) return line
    const catalogCat =
      fromCatalog.category_id != null && String(fromCatalog.category_id).trim() !== ''
        ? fromCatalog.category_id
        : null
    const category_id = catalogCat ?? line.product.category_id
    if (
      category_id === line.product.category_id &&
      fromCatalog.name === line.product.name &&
      fromCatalog.price === line.product.price
    ) {
      return line
    }
    return {
      ...line,
      product: {
        ...line.product,
        category_id,
        name: line.product.name || fromCatalog.name,
        price: line.product.price ?? fromCatalog.price,
      },
    }
  })
}

export function kassaOrderHasPersistedVatSplit(order: KassaLastOrderReceipt): boolean {
  return (
    Array.isArray(order.vatSplit) &&
    order.vatSplit.length > 0 &&
    typeof order.subtotalExclVat === 'number' &&
    typeof order.totalTax === 'number'
  )
}

/** Fallback als live menu niet beschikbaar is. */
export function kassaReceiptVatFromPersistedOrder(order: KassaLastOrderReceipt): KassaReceiptVatComputed | null {
  if (!kassaOrderHasPersistedVatSplit(order)) return null
  const byRate: VatSplitLine[] = order.vatSplit!.map((l) => ({
    rate: normalizeCategoryVatPercent(l.rate, 21) as CategoryVatPercent,
    baseExcl: l.baseExcl,
    tax: l.tax,
  }))
  return {
    subtotalExcl: Math.round(order.subtotalExclVat! * 100) / 100,
    totalTax: Math.round(order.totalTax! * 100) / 100,
    byRate,
  }
}

/** Order JSON (kassa/bestellingen) → cartregels voor BTW-berekening. */
export function orderJsonItemsToKassaCartLines(
  items: ReadonlyArray<{
    product_id?: string | null
    name?: string | null
    product_name?: string | null
    quantity?: number | null
    price?: number | null
    unit_price?: number | null
  }>,
  tenantSlug: string,
): KassaCartItem[] {
  return items.map((it, idx) => {
    const price = Number(it.price ?? it.unit_price ?? 0)
    return {
      cartKey: `ord-${idx}-${it.product_id ?? it.name ?? idx}`,
      quantity: Number(it.quantity) || 1,
      product: {
        id: it.product_id ? String(it.product_id) : `legacy-${idx}`,
        tenant_slug: tenantSlug,
        category_id: null,
        name: String(it.name || it.product_name || 'Item'),
        description: '',
        price,
        image_url: '',
        is_active: true,
        is_popular: false,
        sort_order: 0,
        allergens: [],
      },
    }
  })
}
