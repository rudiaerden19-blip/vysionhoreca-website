import {
  klantschermCustomPromosToSlides,
  mergeKlantschermCustomPromoSources,
  type KlantschermPromoSlide,
} from '@/lib/klantscherm-custom-promos'
import {
  fetchKlantschermPromoSettingsRow,
  loadKlantschermSlideshowSlidesForTenant,
  type KlantschermPromoSettingsRecord,
} from '@/lib/klantscherm-promo-settings-server'
import {
  inferKlantschermMediaTypeFromUrl,
  type KlantschermSlideshowMediaType,
} from '@/lib/klantscherm-slideshow-media'
export function klantschermSlideshowRefreshChannel(tenantSlug: string): string {
  return `vysion-klantscherm-slideshow-${tenantSlug.trim()}`
}

export function notifyKlantschermSlideshowRefresh(tenantSlug: string): void {
  if (typeof BroadcastChannel === 'undefined') return
  try {
    const bc = new BroadcastChannel(klantschermSlideshowRefreshChannel(tenantSlug))
    bc.postMessage({ v: 1, type: 'reload-slideshow' })
    bc.close()
  } catch {
    /* ignore */
  }
}

export type KlantschermSlideshowUpload = {
  url: string
  sort: number
  mediaType?: KlantschermSlideshowMediaType
}

export type KlantschermSlideshowSlide = KlantschermPromoSlide

export function parseKlantschermSlideshowUploads(raw: unknown): KlantschermSlideshowUpload[] {
  if (!Array.isArray(raw)) return []
  const out: KlantschermSlideshowUpload[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const url = String((row as { url?: unknown }).url ?? '').trim()
    if (!url) continue
    const sort = Number((row as { sort?: unknown }).sort)
    const rawType = (row as { mediaType?: unknown }).mediaType
    const mediaType =
      rawType === 'video' || rawType === 'image'
        ? rawType
        : inferKlantschermMediaTypeFromUrl(url)
    out.push({
      url,
      sort: Number.isFinite(sort) ? sort : 0,
      mediaType,
    })
  }
  out.sort((a, b) => a.sort - b.sort || a.url.localeCompare(b.url))
  return out
}

export type KlantschermPromoSettingsRow = KlantschermPromoSettingsRecord

export { fetchKlantschermPromoSettingsRow }

/** Exact wat in tenant_settings staat — geen menu, geen Storage. */
export function klantschermSlidesFromSettingsRow(
  row: KlantschermPromoSettingsRecord | null | undefined,
): KlantschermPromoSlide[] {
  const promos = mergeKlantschermCustomPromoSources(
    row?.klantscherm_custom_promos,
    row?.klantscherm_slideshow_uploads,
  )
  return klantschermCustomPromosToSlides(promos)
}

export async function loadKlantschermSlideshowSlides(
  tenantSlug: string,
): Promise<KlantschermPromoSlide[]> {
  return loadKlantschermSlideshowSlidesForTenant(tenantSlug)
}

export async function loadKlantschermSlideshowImageUrls(tenantSlug: string): Promise<string[]> {
  const slides = await loadKlantschermSlideshowSlides(tenantSlug)
  return slides.map((s) => s.url)
}
