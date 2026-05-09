import { supabase } from './supabase'
import { cache, CACHE_TTL, cacheKey } from './cache'
import { throwIfSupabaseFetchAborted } from './admin-api-internal'
import { adminDb } from './admin-db-client'
import {
  clampKassaProductImageZoom,
  type MenuProduct,
} from './admin-api-menu-product-helpers'

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
      return data || []
    },
    CACHE_TTL.MENU_CATEGORIES,
  )
}

export async function saveMenuCategory(category: MenuCategory): Promise<MenuCategory | null> {
  /** PHASE 1: server-side via /api/admin/db.
   *  De proxy strip 'id'/'created_at' (forbiddenColumns) en valideert tenant_slug. */
  const r = await adminDb.upsert<MenuCategory[]>(
    'menu_categories',
    category as unknown as Record<string, unknown>,
    { tenantSlug: category.tenant_slug, select: '*' },
  )
  if (!r.ok) {
    console.error('Error saving menu category:', r.error)
    return null
  }
  cache.invalidate(cacheKey('menu_categories', category.tenant_slug))
  const list = (r.data as unknown as MenuCategory[]) || []
  return list[0] || null
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
  cache.invalidate(cacheKey('menu_categories', tenantSlug))
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
  const list = rows || []
  return list.map((row) => ({
    ...row,
    kassa_image_zoom: clampKassaProductImageZoom((row as { kassa_image_zoom?: unknown }).kassa_image_zoom),
  }))
}

export async function saveMenuProduct(product: MenuProduct): Promise<{ data: MenuProduct | null; error?: string }> {
  const { is_promo, promo_price, image_display_mode, print_label, kassa_image_zoom, ...baseProduct } = product

  const zoomForDb = kassa_image_zoom === undefined ? undefined : clampKassaProductImageZoom(kassa_image_zoom)

  const fullProduct = {
    ...baseProduct,
    ...(is_promo !== undefined && { is_promo }),
    ...(promo_price !== undefined && { promo_price }),
    ...(image_display_mode !== undefined && { image_display_mode }),
    ...(print_label !== undefined && { print_label }),
    ...(zoomForDb !== undefined && { kassa_image_zoom: zoomForDb }),
  }

  /** PHASE 1: server-side via /api/admin/db. */
  const r = await adminDb.upsert<MenuProduct[]>(
    'menu_products',
    fullProduct as unknown as Record<string, unknown>,
    { tenantSlug: product.tenant_slug, select: '*' },
  )

  if (r.ok) {
    cache.invalidate(cacheKey('menu_products', product.tenant_slug))
    const list = (r.data as unknown as MenuProduct[]) || []
    const d = list[0]
    if (!d) return { data: null, error: 'leeg resultaat' }
    return {
      data: {
        ...d,
        kassa_image_zoom: clampKassaProductImageZoom((d as { kassa_image_zoom?: unknown }).kassa_image_zoom),
      },
    }
  }

  // Fallback: kolom kassa_image_zoom mist nog in DB? probeer zonder.
  if (/kassa_image_zoom/i.test(r.error || '')) {
    const r2 = await adminDb.upsert<MenuProduct[]>(
      'menu_products',
      baseProduct as unknown as Record<string, unknown>,
      { tenantSlug: product.tenant_slug, select: '*' },
    )
    if (r2.ok) {
      cache.invalidate(cacheKey('menu_products', product.tenant_slug))
      const list = (r2.data as unknown as MenuProduct[]) || []
      const fb = list[0]
      if (!fb) return { data: null, error: 'leeg resultaat (fallback)' }
      return {
        data: {
          ...fb,
          kassa_image_zoom: clampKassaProductImageZoom((fb as { kassa_image_zoom?: unknown }).kassa_image_zoom),
        },
      }
    }
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
