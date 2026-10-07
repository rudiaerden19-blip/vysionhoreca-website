import { getServerSupabaseClient } from '@/lib/supabase-server'
import {
  inferKlantschermMediaTypeFromUrl,
  type KlantschermSlideshowMediaType,
} from '@/lib/klantscherm-slideshow-media'
import { mapKlantschermSlidesPlaybackUrls } from '@/lib/klantscherm-slideshow-playback-url'
import {
  looksLikeBelgiumDrinkCategory,
  looksLikeBelgiumDrinkName,
} from '@/lib/order-vat'

export function sortKlantschermSlidesForPlayback(
  slides: KlantschermSlideshowSlide[],
): KlantschermSlideshowSlide[] {
  return slides
    .map((slide, index) => ({ slide, index }))
    .sort((a, b) => {
      if (a.slide.type === 'video' && b.slide.type !== 'video') return -1
      if (b.slide.type === 'video' && a.slide.type !== 'video') return 1
      return a.index - b.index
    })
    .map(({ slide }) => slide)
}

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

export type KlantschermSlideshowSlide = {
  url: string
  type: KlantschermSlideshowMediaType
}

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

/** Promo-uploads eerst; menu-foto's optioneel (slideshow-toggle). */
export function mergeKlantschermSlideshowSlides(
  uploads: KlantschermSlideshowSlide[],
  menuUrls: string[],
  includeMenuPhotos: boolean,
): KlantschermSlideshowSlide[] {
  const menuSlides = includeMenuPhotos
    ? menuUrls.map((url) => ({ url, type: 'image' as const }))
    : []
  const seen = new Set<string>()
  const merged: KlantschermSlideshowSlide[] = []
  for (const slide of [...uploads, ...menuSlides]) {
    if (seen.has(slide.url)) continue
    seen.add(slide.url)
    merged.push(slide)
  }
  return merged
}

/** Tenant-uploads (promo/video) altijd; menu-foto's alleen als slideshow aan staat. */
export async function loadKlantschermSlideshowSlides(tenantSlug: string): Promise<KlantschermSlideshowSlide[]> {
  const slug = tenantSlug.trim()
  if (!slug) return []

  const supabase = getServerSupabaseClient()
  if (!supabase) return []

  const { data: settings } = await supabase
    .from('tenant_settings')
    .select('klantscherm_slideshow_enabled, klantscherm_slideshow_uploads')
    .eq('tenant_slug', slug)
    .maybeSingle()

  const includeMenuPhotos = settings?.klantscherm_slideshow_enabled === true

  const uploads: KlantschermSlideshowSlide[] = parseKlantschermSlideshowUploads(
    settings?.klantscherm_slideshow_uploads,
  ).map((u) => ({
    url: u.url,
    type: u.mediaType ?? inferKlantschermMediaTypeFromUrl(u.url),
  }))

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

  const menuUrls: string[] = []
  for (const p of products ?? []) {
    const url = String(p.image_url ?? '').trim()
    if (!url) continue
    const catId = String(p.category_id ?? '').trim()
    const catName = catId ? categoryNameById.get(catId) ?? '' : ''
    if (looksLikeBelgiumDrinkCategory(catName)) continue
    if (looksLikeBelgiumDrinkName(String(p.name ?? ''))) continue
    menuUrls.push(url)
  }

  const merged = sortKlantschermSlidesForPlayback(
    mergeKlantschermSlideshowSlides(uploads, menuUrls, includeMenuPhotos),
  )
  return mapKlantschermSlidesPlaybackUrls(slug, merged)
}

/** @deprecated gebruik loadKlantschermSlideshowSlides */
export async function loadKlantschermSlideshowImageUrls(tenantSlug: string): Promise<string[]> {
  const slides = await loadKlantschermSlideshowSlides(tenantSlug)
  return slides.map((s) => s.url)
}
