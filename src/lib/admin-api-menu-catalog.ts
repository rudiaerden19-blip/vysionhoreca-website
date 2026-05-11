import { supabase } from './supabase'
import { cache, CACHE_TTL, cacheKey } from './cache'
import { throwIfSupabaseFetchAborted } from './admin-api-internal'
import { adminDb } from './admin-db-client'
import {
  clampKassaProductImageZoom,
  type MenuProduct,
} from './admin-api-menu-product-helpers'

/** Admin-proxy/update kan één rij als object óf als `[rij]` teruggeven (Supabase/PostgREST). */
export function normalizeDbSingleRow<T>(data: unknown): T | null {
  if (data == null) return null
  if (Array.isArray(data)) {
    const first = data[0]
    return first != null ? (first as T) : null
  }
  if (typeof data === 'object') return data as T
  return null
}

/** Voorkom dubbele catalogus-items (oude bug / corrupte IndexedDB-cache). */
export function dedupeCatalogById<T extends { id?: string | null }>(items: T[]): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const item of items) {
    const id = item.id != null ? String(item.id) : null
    if (id == null) {
      out.push(item)
      continue
    }
    if (seen.has(id)) continue
    seen.add(id)
    out.push(item)
  }
  return out
}

// =====================================================
// MENU CATEGORIES & PRODUCTS (catalogus)
// =====================================================
export interface MenuCategory {
  id?: string
  tenant_slug: string
  name: string
  description: string
  icon?: string
  sort_order: number
  is_active: boolean
}

export async function getMenuCategories(tenantSlug: string): Promise<MenuCategory[]> {
  return cache.getOrFetch(
    cacheKey('menu_categories', tenantSlug),
    async () => {
      const { data, error } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('tenant_slug', tenantSlug)
        .order('sort_order')

      if (error) {
        console.error('Error fetching menu categories:', error)
        return []
      }
      return dedupeCatalogById(data || [])
    },
    CACHE_TTL.MENU_CATEGORIES,
  )
}

export function invalidateMenuCategoriesCache(tenantSlug: string): void {
  cache.invalidate(cacheKey('menu_categories', tenantSlug))
}

export async function saveMenuCategory(
  category: MenuCategory,
  opts?: { skipInvalidate?: boolean },
): Promise<MenuCategory | null> {
  /**
   * `menu_categories` heeft forbiddenColumns `id`/`created_at` — blind upsert zonder id match triggert
   * steeds INSERT en verdubbelt categorieën. Bij update: `update` met `{ id, tenant_slug }`; bij nieuw: `insert`.
   */
  const tenantSlug = category.tenant_slug
  const row = {
    name: category.name,
    description: category.description ?? '',
    ...(category.icon !== undefined && { icon: category.icon }),
    sort_order: category.sort_order,
    is_active: category.is_active,
  } satisfies Record<string, unknown>

  const r = category.id
    ? await adminDb.update<MenuCategory[]>(
        'menu_categories',
        row,
        { id: category.id, tenant_slug: tenantSlug },
        { tenantSlug, select: '*' },
      )
    : await adminDb.insert<MenuCategory[]>(
        'menu_categories',
        { ...row, tenant_slug: tenantSlug },
        { tenantSlug, select: '*' },
      )

  if (!r.ok) {
    console.error('Error saving menu category:', r.error)
    return null
  }
  if (!opts?.skipInvalidate) {
    invalidateMenuCategoriesCache(tenantSlug)
  }
  return normalizeDbSingleRow<MenuCategory>(r.data)
}

export async function deleteMenuCategory(id: string, tenantSlug?: string): Promise<boolean> {
  if (!tenantSlug) {
    console.error('deleteMenuCategory: tenantSlug verplicht in Phase 1')
    return false
  }
  const r = await adminDb.delete('menu_categories', { id, tenant_slug: tenantSlug }, { tenantSlug })
  if (!r.ok) {
    console.error('Error deleting menu category:', r.error)
    return false
  }
  invalidateMenuCategoriesCache(tenantSlug)
  return true
}

export async function getMenuProducts(tenantSlug: string, signal?: AbortSignal): Promise<MenuProduct[]> {
  return cache.getOrFetch(
    cacheKey('menu_products', tenantSlug),
    async () => {
      const base = supabase
        .from('menu_products')
        .select('*')
        .eq('tenant_slug', tenantSlug)
        .order('sort_order')
      const { data, error } = signal ? await base.abortSignal(signal) : await base

      if (error) {
        throwIfSupabaseFetchAborted(error)
        console.error('Error fetching menu products:', error)
        return []
      }
      return normalizeMenuProductsFromDb(data)
    },
    CACHE_TTL.MENU_PRODUCTS,
  )
}

function normalizeMenuProductsFromDb(rows: MenuProduct[] | null): MenuProduct[] {
  const list = dedupeCatalogById(rows || [])
  return list.map((row) => ({
    ...row,
    kassa_image_zoom: clampKassaProductImageZoom((row as { kassa_image_zoom?: unknown }).kassa_image_zoom),
  }))
}

export async function saveMenuProduct(product: MenuProduct): Promise<{ data: MenuProduct | null; error?: string }> {
  const { is_promo, promo_price, image_display_mode, print_label, kassa_image_zoom, ...baseProduct } = product

  const zoomForDb = kassa_image_zoom === undefined ? undefined : clampKassaProductImageZoom(kassa_image_zoom)

  const wrapOk = (data: unknown): { data: MenuProduct | null; error?: string } => {
    const d = normalizeDbSingleRow<MenuProduct>(data)
    if (!d) return { data: null, error: 'leeg resultaat' }
    cache.invalidate(cacheKey('menu_products', product.tenant_slug))
    return {
      data: {
        ...d,
        kassa_image_zoom: clampKassaProductImageZoom((d as { kassa_image_zoom?: unknown }).kassa_image_zoom),
      },
    }
  }

  const persist = async (includeZoom: boolean) => {
    const fullProduct = {
      ...baseProduct,
      ...(is_promo !== undefined && { is_promo }),
      ...(promo_price !== undefined && { promo_price }),
      ...(image_display_mode !== undefined && { image_display_mode }),
      ...(print_label !== undefined && { print_label }),
      ...(includeZoom && zoomForDb !== undefined && { kassa_image_zoom: zoomForDb }),
    }
    const tenant = product.tenant_slug
    const payload = fullProduct as unknown as Record<string, unknown>
    return product.id
      ? adminDb.update<MenuProduct[]>(
          'menu_products',
          payload,
          { id: product.id, tenant_slug: tenant },
          { tenantSlug: tenant, select: '*' },
        )
      : adminDb.insert<MenuProduct[]>('menu_products', payload, { tenantSlug: tenant, select: '*' })
  }

  /** Zelfde als categorieën: geen blind upsert — id wordt door de proxy gestript → zou dubbele rijen geven. */
  let r = await persist(true)

  if (r.ok) {
    return wrapOk(r.data)
  }

  // Fallback: kolom kassa_image_zoom mist nog in DB? probeer zonder.
  if (/kassa_image_zoom/i.test(r.error || '')) {
    const r2 = await persist(false)
    if (r2.ok) return wrapOk(r2.data)
    return { data: null, error: r2.error }
  }

  console.error('Error saving menu product:', r.error)
  return { data: null, error: r.error }
}

export async function deleteMenuProduct(id: string, tenantSlug?: string): Promise<boolean> {
  if (!tenantSlug) {
    console.error('deleteMenuProduct: tenantSlug verplicht in Phase 1')
    return false
  }
  const r = await adminDb.delete('menu_products', { id, tenant_slug: tenantSlug }, { tenantSlug })
  if (!r.ok) {
    console.error('Error deleting menu product:', r.error)
    return false
  }
  cache.invalidate(cacheKey('menu_products', tenantSlug))
  return true
}
