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
import {
  looksLikeBelgiumDrinkCategory,
  looksLikeBelgiumDrinkName,
} from '@/lib/order-vat'

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

function promoSlidesFromTenantSettings(
  customRaw: unknown,
  legacyUploadsRaw: unknown,
): KlantschermPromoSlide[] {
  const fromCustom = parseKlantschermCustomPromos(customRaw)
  const promos =
    fromCustom.length > 0 ? fromCustom : klantschermCustomPromosFromLegacy(legacyUploadsRaw)
  const slides = klantschermCustomPromosToSlides(promos)
  const seen = new Set(slides.map((s) => s.url))

  for (const row of parseKlantschermSlideshowUploads(legacyUploadsRaw)) {
    if (row.mediaType === 'video' || seen.has(row.url)) continue
    seen.add(row.url)
    slides.push({
      url: row.url,
      sort: row.sort,
      title: '',
      description: '',
      displayPrice: '',
      promoText: '',
      type: 'image',
    })
  }

  slides.sort((a, b) => a.sort - b.sort || a.url.localeCompare(b.url))
  return slides
}

/** Promo-uploads + optioneel menufoto's (zelfde flow als vóór custom-promo refactor). */
export async function loadKlantschermSlideshowSlides(
  tenantSlug: string,
): Promise<KlantschermPromoSlide[]> {
  const slug = tenantSlug.trim()
  if (!slug) return []

  const supabase = getServerSupabaseClient()
  if (!supabase) return []

  let customRaw: unknown
  let legacyUploadsRaw: unknown
  let includeMenuPhotos = false

  const { data: settings, error } = await supabase
    .from('tenant_settings')
    .select(
      'klantscherm_slideshow_enabled, klantscherm_custom_promos, klantscherm_slideshow_uploads',
    )
    .eq('tenant_slug', slug)
    .maybeSingle()

  if (error && isKlantschermCustomPromosColumnError(error.message)) {
    const { data: legacyOnly } = await supabase
      .from('tenant_settings')
      .select('klantscherm_slideshow_enabled, klantscherm_slideshow_uploads')
      .eq('tenant_slug', slug)
      .maybeSingle()
    includeMenuPhotos = legacyOnly?.klantscherm_slideshow_enabled === true
    legacyUploadsRaw = legacyOnly?.klantscherm_slideshow_uploads
  } else if (settings) {
    includeMenuPhotos = settings.klantscherm_slideshow_enabled === true
    customRaw = settings.klantscherm_custom_promos
    legacyUploadsRaw = settings.klantscherm_slideshow_uploads
  }

  let slides = promoSlidesFromTenantSettings(customRaw, legacyUploadsRaw)

  if (includeMenuPhotos) {
    const [{ data: categories }, { data: products }] = await Promise.all([
      supabase
        .from('menu_categories')
        .select('id, name')
        .eq('tenant_slug', slug)
        .eq('is_active', true),
      supabase
        .from('menu_products')
        .select('image_url, name, category_id')
        .eq('tenant_slug', slug)
        .eq('is_active', true)
        .limit(400),
    ])

    const categoryNameById = new Map<string, string>()
    for (const c of categories ?? []) {
      const id = String(c.id ?? '').trim()
      if (!id) continue
      categoryNameById.set(id, String(c.name ?? ''))
    }

    const seen = new Set(slides.map((s) => s.url))
    for (const p of products ?? []) {
      const url = String(p.image_url ?? '').trim()
      if (!url || seen.has(url)) continue
      const catId = String(p.category_id ?? '').trim()
      const catName = catId ? categoryNameById.get(catId) ?? '' : ''
      if (looksLikeBelgiumDrinkCategory(catName)) continue
      if (looksLikeBelgiumDrinkName(String(p.name ?? ''))) continue
      seen.add(url)
      slides.push({
        url,
        sort: slides.length,
        title: '',
        description: '',
        displayPrice: '',
        promoText: '',
        type: 'image',
      })
    }
  }

  if (slides.length === 0) {
    slides = await klantschermPromoSlidesFromStorage(supabase, slug)
  }

  return mapKlantschermSlidesPlaybackUrls(slug, slides) as KlantschermPromoSlide[]
}

export async function loadKlantschermSlideshowImageUrls(tenantSlug: string): Promise<string[]> {
  const slides = await loadKlantschermSlideshowSlides(tenantSlug)
  return slides.map((s) => s.url)
}
