import { getServerSupabaseClient } from '@/lib/supabase-server'
import {
  isKlantschermCustomPromosColumnError,
  klantschermCustomPromosFromLegacy,
  klantschermCustomPromosToSlides,
  parseKlantschermCustomPromos,
  type KlantschermPromoSlide,
} from '@/lib/klantscherm-custom-promos'
import {
  inferKlantschermMediaTypeFromUrl,
  type KlantschermSlideshowMediaType,
} from '@/lib/klantscherm-slideshow-media'
import { mapKlantschermSlidesPlaybackUrls } from '@/lib/klantscherm-slideshow-playback-url'
import { klantschermPromoSlidesFromStorage } from '@/lib/klantscherm-slideshow-storage-fallback'

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

/** Alleen admin-promo's (custom JSON); legacy uploads alleen als custom nog leeg is. Geen menufoto's. */
function promoSlidesFromTenantSettings(
  customRaw: unknown,
  legacyUploadsRaw: unknown,
): KlantschermPromoSlide[] {
  const fromCustom = parseKlantschermCustomPromos(customRaw)
  if (fromCustom.length > 0) {
    return klantschermCustomPromosToSlides(fromCustom)
  }
  return klantschermCustomPromosToSlides(klantschermCustomPromosFromLegacy(legacyUploadsRaw))
}

/** Eigen promos op klantscherm — exact wat in admin staat (max 10). */
export async function loadKlantschermSlideshowSlides(
  tenantSlug: string,
): Promise<KlantschermPromoSlide[]> {
  const slug = tenantSlug.trim()
  if (!slug) return []

  const supabase = getServerSupabaseClient()
  if (!supabase) return []

  let customRaw: unknown
  let legacyUploadsRaw: unknown

  const { data: settings, error } = await supabase
    .from('tenant_settings')
    .select('klantscherm_custom_promos, klantscherm_slideshow_uploads')
    .eq('tenant_slug', slug)
    .maybeSingle()

  if (error && isKlantschermCustomPromosColumnError(error.message)) {
    const { data: legacyOnly } = await supabase
      .from('tenant_settings')
      .select('klantscherm_slideshow_uploads')
      .eq('tenant_slug', slug)
      .maybeSingle()
    legacyUploadsRaw = legacyOnly?.klantscherm_slideshow_uploads
  } else if (settings) {
    customRaw = settings.klantscherm_custom_promos
    legacyUploadsRaw = settings.klantscherm_slideshow_uploads
  }

  let slides = promoSlidesFromTenantSettings(customRaw, legacyUploadsRaw)

  if (slides.length === 0) {
    slides = await klantschermPromoSlidesFromStorage(supabase, slug)
  }

  return mapKlantschermSlidesPlaybackUrls(slug, slides) as KlantschermPromoSlide[]
}

export async function loadKlantschermSlideshowImageUrls(tenantSlug: string): Promise<string[]> {
  const slides = await loadKlantschermSlideshowSlides(tenantSlug)
  return slides.map((s) => s.url)
}
