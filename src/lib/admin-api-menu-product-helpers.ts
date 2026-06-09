/**
 * Menu product shape + kassa tile zoom / sort helpers (pure).
 * Re-exported from `@/lib/admin-api`.
 */

export interface MenuProduct {
  id?: string
  tenant_slug: string
  category_id: string | null
  name: string
  description: string
  price: number
  image_url: string
  is_active: boolean
  is_popular: boolean
  is_promo?: boolean
  promo_price?: number
  sort_order: number
  allergens: string[]
  image_display_mode?: 'cover' | 'contain' | null
  print_label?: boolean
  /** Zoom on kassa tile: 1 = default, <1 zoom out, >1 zoom in (clamped in app). */
  kassa_image_zoom?: number | null
  track_stock?: boolean
  stock_quantity?: number
  low_stock_threshold?: number
  article_number?: string | null
  barcode?: string | null
  size_label?: string | null
  color_label?: string | null
}

export const KASSA_PRODUCT_IMAGE_ZOOM_MIN = 0.65
export const KASSA_PRODUCT_IMAGE_ZOOM_MAX = 1.85

/** `<1` shows more of the photo; `>1` crops tighter (object-cover). Parse strings from PostgREST. */
export function clampKassaProductImageZoom(raw: unknown): number {
  if (raw === undefined || raw === null || raw === '') return 1
  const n =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string'
        ? parseFloat(raw.replace(',', '.'))
        : NaN
  if (!Number.isFinite(n)) return 1
  return Math.min(KASSA_PRODUCT_IMAGE_ZOOM_MAX, Math.max(KASSA_PRODUCT_IMAGE_ZOOM_MIN, n))
}

/** Read sort_order from DB (may be string from PostgREST). */
export function menuProductSortOrderValue(raw: unknown): number {
  if (raw === null || raw === undefined || raw === '') return 0
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

/** Compare products as on-screen order: sort_order, then id for stability. */
export function compareMenuProductsBySortOrder(
  a: { sort_order?: unknown; id?: string },
  b: { sort_order?: unknown; id?: string }
): number {
  const d = menuProductSortOrderValue(a.sort_order) - menuProductSortOrderValue(b.sort_order)
  if (d !== 0) return d
  return String(a.id ?? '').localeCompare(String(b.id ?? ''))
}
