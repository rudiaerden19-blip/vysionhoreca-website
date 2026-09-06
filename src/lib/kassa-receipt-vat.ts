import type { MenuCategory, MenuProduct } from '@/lib/admin-api'
import type { KassaCartItem, KassaLastOrderReceipt, KassaRegisterOrderType } from '@/lib/kassa-cart-types'
import {
  buildCategoryVatLookup,
  buildProductCategoryLookup,
  computeInclusiveVatSplitFromCart,
  normalizeCategoryVatPercent,
  normalizeOrderTypeForVat,
  resolveVatPercentForCartLine,
  type CategoryVatPercent,
  type VatSplitLine,
} from '@/lib/order-vat'

export type KassaReceiptVatComputed = {
  subtotalExcl: number
  totalTax: number
  byRate: VatSplitLine[]
}

/**
 * Open tafelmanden uit Supabase missen vaak `category_id` op het product-snapshot.
 * Vul aan uit het actuele menu zodat categorie-BTW (21% drank) wél geldt.
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
    const category_id =
      line.product.category_id != null && String(line.product.category_id).trim() !== ''
        ? line.product.category_id
        : fromCatalog.category_id
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

/** BTW zoals berekend bij afrekenen — bon mag niet opnieuw rekenen met verouderde categorie-cache. */
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

export function computeKassaReceiptVatFromCartLines(
  lines: KassaCartItem[],
  categories: MenuCategory[],
  products: MenuProduct[],
  tenantDefaultBtw: number,
  orderType: KassaRegisterOrderType,
  tenantCountry: string | null,
): KassaReceiptVatComputed {
  const categoryVatLookup = buildCategoryVatLookup(categories)
  const productCategoryById = buildProductCategoryLookup(products)
  const orderTypeForVat = normalizeOrderTypeForVat(orderType)
  const split = computeInclusiveVatSplitFromCart(lines, (line) =>
    resolveVatPercentForCartLine(
      line.product,
      categoryVatLookup,
      tenantDefaultBtw,
      orderTypeForVat,
      productCategoryById,
      tenantCountry,
      line.choices,
    ),
  )
  return {
    subtotalExcl: Math.round(split.subtotalExcl * 100) / 100,
    totalTax: Math.round(split.totalTax * 100) / 100,
    byRate: split.byRate,
  }
}
