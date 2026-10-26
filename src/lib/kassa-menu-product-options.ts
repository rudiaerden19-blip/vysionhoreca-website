import type { ProductOption } from '@/lib/admin-api'

/** Product-IDs met minstens één actieve optie (zelfde logica als webshop). */
export function productIdsWithActiveOptionsFromMap(
  map: Record<string, ProductOption[]>,
): string[] {
  return Object.keys(map).filter((id) => (map[id]?.length ?? 0) > 0)
}

/** Badge / klik: union van link-lijst en batch-map — geen tenant mist opties door batch-fout. */
export function mergeProductIdsWithOptions(fromLinks: string[], fromMap: string[]): string[] {
  return [...new Set([...fromLinks, ...fromMap])]
}

/**
 * `null` = product niet in batch-cache → netwerk-fallback nodig.
 * `[]` = batch zegt expliciet geen actieve opties (fallback alleen als link-lijst wél opties verwacht).
 */
export function readCachedProductOptions(
  productId: string,
  cache: Record<string, ProductOption[]>,
): ProductOption[] | null {
  if (!Object.prototype.hasOwnProperty.call(cache, productId)) return null
  return cache[productId] ?? []
}

export function shouldFetchProductOptionsFallback(
  cached: ProductOption[] | null,
  productId: string,
  knownHasOptionsIds: ReadonlySet<string>,
): boolean {
  if (cached === null) return true
  if (cached.length > 0) return false
  return knownHasOptionsIds.has(productId)
}
