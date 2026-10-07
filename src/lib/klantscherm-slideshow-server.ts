import { getServerSupabaseClient } from '@/lib/supabase-server'
import {
  isKlantschermCustomPromosColumnError,
  klantschermCustomPromosFromLegacy,
  klantschermCustomPromosToSlides,
  parseKlantschermCustomPromos,
  type KlantschermPromoSlide,
} from '@/lib/klantscherm-custom-promos'
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

/** @deprecated alleen legacy admin-parse */
export type KlantschermSlideshowUpload = {
  url: string
  sort: number
  mediaType?: 'image' | 'video'
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
    out.push({
      url,
      sort: Number.isFinite(sort) ? sort : 0,
      mediaType: 'image',
    })
  }
  out.sort((a, b) => a.sort - b.sort || a.url.localeCompare(b.url))
  return out
}

function resolveCustomPromos(rawCustom: unknown, rawLegacy: unknown): KlantschermPromoSlide[] {
  const parsed = parseKlantschermCustomPromos(rawCustom)
  if (parsed.length > 0) {
    return klantschermCustomPromosToSlides(parsed)
  }
  return klantschermCustomPromosToSlides(klantschermCustomPromosFromLegacy(rawLegacy))
}

/** Eigen promos (max 10) — geen menufoto's uit kassa. */
export async function loadKlantschermSlideshowSlides(tenantSlug: string): Promise<KlantschermPromoSlide[]> {
  const slug = tenantSlug.trim()
  if (!slug) return []

  const supabase = getServerSupabaseClient()
  if (!supabase) return []

  let customRaw: unknown
  let legacyRaw: unknown

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
    legacyRaw = legacyOnly?.klantscherm_slideshow_uploads
  } else if (settings) {
    customRaw = settings.klantscherm_custom_promos
    legacyRaw = settings.klantscherm_slideshow_uploads
  }

  const slides = resolveCustomPromos(customRaw, legacyRaw)

  return mapKlantschermSlidesPlaybackUrls(slug, slides) as KlantschermPromoSlide[]
}

export async function loadKlantschermSlideshowImageUrls(tenantSlug: string): Promise<string[]> {
  const slides = await loadKlantschermSlideshowSlides(tenantSlug)
  return slides.map((s) => s.url)
}
