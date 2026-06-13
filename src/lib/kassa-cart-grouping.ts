import type { MenuCategory } from '@/lib/admin-api-menu-catalog'
import { compareMenuProductsBySortOrder } from '@/lib/admin-api-menu-product-helpers'

const UNCATEGORIZED_SORT = 1_000_000

type LineWithProduct = {
  product: {
    category_id?: string | null
    sort_order?: unknown
    id?: string
    name?: string
  }
}

/**
 * Bon + kassa-mand: regels in menu-categorievolgorde (Friet, Snacks, Drank, …),
 * niet in tikvolgorde. Geen samenvoegen — elke mandregel blijft apart.
 */
export function sortKassaCartLinesByMenuCategory<T extends LineWithProduct>(
  lines: T[],
  categories: MenuCategory[],
): T[] {
  const categoryOrder = new Map<string, number>()
  for (const c of categories) {
    if (c.id == null) continue
    categoryOrder.set(String(c.id), c.sort_order ?? 0)
  }

  return [...lines].sort((a, b) => {
    const aCat = a.product.category_id != null ? String(a.product.category_id) : ''
    const bCat = b.product.category_id != null ? String(b.product.category_id) : ''
    const aRank = aCat ? (categoryOrder.get(aCat) ?? UNCATEGORIZED_SORT - 1) : UNCATEGORIZED_SORT
    const bRank = bCat ? (categoryOrder.get(bCat) ?? UNCATEGORIZED_SORT - 1) : UNCATEGORIZED_SORT
    if (aRank !== bRank) return aRank - bRank
    const byProduct = compareMenuProductsBySortOrder(a.product, b.product)
    if (byProduct !== 0) return byProduct
    return (a.product.name || '').localeCompare(b.product.name || '', 'nl', { sensitivity: 'base'})
  })
}
