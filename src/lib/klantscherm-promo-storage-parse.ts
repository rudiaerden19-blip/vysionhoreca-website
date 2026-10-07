import { KLANTSCHERM_MEDIA_BUCKET_ID } from '@/lib/klantscherm-media-bucket-server'
import { KLANTSCHERM_PROMO_VIDEO_BUCKET_ID } from '@/lib/klantscherm-media-bucket-server'

const PROMO_BUCKETS = new Set([KLANTSCHERM_PROMO_VIDEO_BUCKET_ID, KLANTSCHERM_MEDIA_BUCKET_ID])

export type KlantschermPromoStorageRef = { bucket: string; path: string }

/** Publieke Supabase Storage-URL → bucket + objectpad (klantscherm-promo of media/…/klantscherm/). */
export function parseKlantschermPromoPublicStorageUrl(url: string): KlantschermPromoStorageRef | null {
  const trimmed = url.trim()
  if (!trimmed) return null
  try {
    const u = new URL(trimmed)
    const match = u.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/)
    if (!match?.[1] || !match[2]) return null
    const bucket = decodeURIComponent(match[1])
    const path = decodeURIComponent(match[2].split('?')[0] ?? '')
    if (!PROMO_BUCKETS.has(bucket)) return null
    if (!path.includes('/klantscherm/')) return null
    return { bucket, path }
  } catch {
    return null
  }
}

export function klantschermPromoPathBelongsToTenant(path: string, tenantSlug: string): boolean {
  const slug = tenantSlug.trim()
  if (!slug) return false
  return path === `${slug}/klantscherm` || path.startsWith(`${slug}/klantscherm/`)
}
