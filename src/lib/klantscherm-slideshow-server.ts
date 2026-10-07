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

/**
 * Klantscherm = alleen `klantscherm_custom_promos` in de database.
 * Geen Storage-scan, geen menufoto's, geen legacy-mix (legacy alleen als kolom nog niet gemigreerd is).
 */
export async function loadKlantschermSlideshowSlides(
  tenantSlug: string,
): Promise<KlantschermPromoSlide[]> {
  const slug = tenantSlug.trim()
  if (!slug) return []

  const supabase = getServerSupabaseClient()
  if (!supabase) return []

  const { data: settings, error } = await supabase
    .from('tenant_settings')
    .select('klantscherm_custom_promos, klantscherm_slideshow_uploads')
    .eq('tenant_slug', slug)
    .maybeSingle()

  let slides: KlantschermPromoSlide[] = []

  if (error && isKlantschermCustomPromosColumnError(error.message)) {
    const { data: legacyOnly } = await supabase
      .from('tenant_settings')
      .select('klantscherm_slideshow_uploads')
      .eq('tenant_slug', slug)
      .maybeSingle()
    slides = klantschermCustomPromosToSlides(
      klantschermCustomPromosFromLegacy(legacyOnly?.klantscherm_slideshow_uploads),
    )
  } else {
    slides = klantschermCustomPromosToSlides(
      parseKlantschermCustomPromos(settings?.klantscherm_custom_promos),
    )
  }

  return mapKlantschermSlidesPlaybackUrls(slug, slides) as KlantschermPromoSlide[]
}

export async function loadKlantschermSlideshowImageUrls(tenantSlug: string): Promise<string[]> {
  const slides = await loadKlantschermSlideshowSlides(tenantSlug)
  return slides.map((s) => s.url)
}
