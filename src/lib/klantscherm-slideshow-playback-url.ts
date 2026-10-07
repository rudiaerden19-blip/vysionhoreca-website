import {
  klantschermPromoPathBelongsToTenant,
  parseKlantschermPromoPublicStorageUrl,
} from '@/lib/klantscherm-promo-storage-parse'

/** Same-origin stream (service role) — werkt ook als Storage RLS publieke reads blokkeert. */
export function klantschermSlideshowPlaybackUrl(tenantSlug: string, rawUrl: string): string {
  const ref = parseKlantschermPromoPublicStorageUrl(rawUrl)
  if (!ref || !klantschermPromoPathBelongsToTenant(ref.path, tenantSlug)) {
    return rawUrl
  }
  const q = new URLSearchParams({
    bucket: ref.bucket,
    path: ref.path,
  })
  return `/api/shop/${encodeURIComponent(tenantSlug.trim())}/klantscherm/promo/stream?${q.toString()}`
}

export function mapKlantschermSlidesPlaybackUrls<T extends { url: string }>(
  tenantSlug: string,
  slides: T[],
): T[] {
  return slides.map((slide) => ({
    ...slide,
    url: klantschermSlideshowPlaybackUrl(tenantSlug, slide.url),
  }))
}
