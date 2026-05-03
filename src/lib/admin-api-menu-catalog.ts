import { supabase } from './supabase'
import { cache, CACHE_TTL, cacheKey } from './cache'
import { throwIfSupabaseFetchAborted } from './admin-api-internal'
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
  const { data, error } = await supabase.from('menu_categories').upsert(category).select().single()

  if (error) {
    console.error('Error saving menu category:', error)
    return null
  }

  cache.invalidate(cacheKey('menu_categories', category.tenant_slug))

  return data
}

export async function deleteMenuCategory(id: string, tenantSlug?: string): Promise<boolean> {
  const { error } = await supabase.from('menu_categories').delete().eq('id', id)

  if (error) {
    console.error('Error deleting menu category:', error)
    return false
  }

  if (tenantSlug) {
    cache.invalidate(cacheKey('menu_categories', tenantSlug))
  }

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

  const { data, error } = await supabase.from('menu_products').upsert(fullProduct).select().single()

  const errMsgRaw = error?.message ?? ''
  const zoomColumnProbablyMissing =
    /kassa_image_zoom/i.test(errMsgRaw) && /schema|column|PGRST\d+/i.test(errMsgRaw)

  if (!error) {
    cache.invalidate(cacheKey('menu_products', product.tenant_slug))
    const d = data as MenuProduct
    return {
      data: {
        ...d,
        kassa_image_zoom: clampKassaProductImageZoom((d as { kassa_image_zoom?: unknown }).kassa_image_zoom),
      },
    }
  }

  if (zoomColumnProbablyMissing) {
    cache.invalidate(cacheKey('menu_products', product.tenant_slug))
    return {
      data: null,
      error:
        'De databasekolom voor kassa-zoom ontbreekt. Voer de migratie uit (menu_products.kassa_image_zoom) en probeer opnieuw.',
    }
  }

  console.warn('Falling back, error was:', error.message)
  const { data: fallbackData, error: fallbackError } = await supabase
    .from('menu_products')
    .upsert(baseProduct)
    .select()
    .single()

  if (fallbackError) {
    console.error('Error saving menu product:', fallbackError)
    return { data: null, error: fallbackError.message }
  }
  cache.invalidate(cacheKey('menu_products', product.tenant_slug))
  const fb = fallbackData as MenuProduct
  return {
    data: {
      ...fb,
      kassa_image_zoom: clampKassaProductImageZoom((fb as { kassa_image_zoom?: unknown }).kassa_image_zoom),
    },
  }
}

export async function deleteMenuProduct(id: string): Promise<boolean> {
  const { error } = await supabase.from('menu_products').delete().eq('id', id)

  if (error) {
    console.error('Error deleting menu product:', error)
    return false
  }
  return true
}
