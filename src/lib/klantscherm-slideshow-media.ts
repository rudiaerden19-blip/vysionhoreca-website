/** Klantscherm promo-slideshow: foto's + video (mp4). */

export const KLANTSCHERM_PROMO_VIDEO_BUCKET_ID = 'klantscherm-promo'

export type KlantschermSlideshowMediaType = 'image' | 'video'

const VIDEO_EXT = new Set(['mp4', 'webm', 'mov', 'm4v'])
const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])

const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const VIDEO_MIME = new Set(['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'])

export const KLANTSCHERM_PROMO_MAX_IMAGE_BYTES = 12 * 1024 * 1024
/** Promo-video’s (4K mp4); moet ≤ Supabase bucket `media`.file_size_limit. */
export const KLANTSCHERM_PROMO_MAX_VIDEO_BYTES = 500 * 1024 * 1024
export const KLANTSCHERM_PROMO_MAX_VIDEO_MB = 500
export const KLANTSCHERM_PROMO_MAX_IMAGE_MB = 12

export const KLANTSCHERM_PROMO_FILE_ACCEPT =
  'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.mp4,.mov,.webm'

export function inferKlantschermMediaTypeFromUrl(url: string): KlantschermSlideshowMediaType {
  const path = url.split('?')[0]?.split('#')[0] ?? ''
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  if (VIDEO_EXT.has(ext)) return 'video'
  return 'image'
}

export function detectKlantschermUploadMediaType(file: File): KlantschermSlideshowMediaType | null {
  const mime = file.type.trim().toLowerCase()
  if (mime && VIDEO_MIME.has(mime)) return 'video'
  if (mime && IMAGE_MIME.has(mime)) return 'image'
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (VIDEO_EXT.has(ext)) return 'video'
  if (IMAGE_EXT.has(ext)) return 'image'
  return null
}

export function validateKlantschermPromoFile(file: File):
  | { ok: true; mediaType: KlantschermSlideshowMediaType }
  | { ok: false; reason: 'type' | 'size' } {
  const mediaType = detectKlantschermUploadMediaType(file)
  if (!mediaType) return { ok: false, reason: 'type' }
  const max =
    mediaType === 'video' ? KLANTSCHERM_PROMO_MAX_VIDEO_BYTES : KLANTSCHERM_PROMO_MAX_IMAGE_BYTES
  if (file.size > max) return { ok: false, reason: 'size' }
  return { ok: true, mediaType }
}
