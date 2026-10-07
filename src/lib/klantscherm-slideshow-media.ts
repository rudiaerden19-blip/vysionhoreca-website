/** Klantscherm promo-foto's (geen video). */

export type KlantschermSlideshowMediaType = 'image'

const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])
const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export const KLANTSCHERM_PROMO_MAX_IMAGE_BYTES = 12 * 1024 * 1024
export const KLANTSCHERM_PROMO_MAX_IMAGE_MB = 12

export const KLANTSCHERM_PROMO_FILE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'

export function validateKlantschermPromoImageFile(file: File):
  | { ok: true }
  | { ok: false; reason: 'type' | 'size' } {
  const mime = file.type.trim().toLowerCase()
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const okType = (mime && IMAGE_MIME.has(mime)) || IMAGE_EXT.has(ext)
  if (!okType) return { ok: false, reason: 'type' }
  if (file.size > KLANTSCHERM_PROMO_MAX_IMAGE_BYTES) return { ok: false, reason: 'size' }
  return { ok: true }
}
