import { getServerSupabaseClient } from '@/lib/supabase-server'
import {
  inferKlantschermMediaTypeFromUrl,
  type KlantschermSlideshowMediaType,
} from '@/lib/klantscherm-slideshow-media'
import {
  looksLikeBelgiumDrinkCategory,
  looksLikeBelgiumDrinkName,
} from '@/lib/order-vat'

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

/** Menu-foto's + tenant-uploads; unieke URLs, uploads eerst. */
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

  if (settings?.klantscherm_slideshow_enabled === false) return []

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

  const seen = new Set<string>()
  const merged: KlantschermSlideshowSlide[] = []
  for (const slide of [
    ...uploads,
    ...menuUrls.map((url) => ({ url, type: 'image' as const })),
  ]) {
    if (seen.has(slide.url)) continue
    seen.add(slide.url)
    merged.push(slide)
  }
  return merged
}

/** @deprecated gebruik loadKlantschermSlideshowSlides */
export async function loadKlantschermSlideshowImageUrls(tenantSlug: string): Promise<string[]> {
  const slides = await loadKlantschermSlideshowSlides(tenantSlug)
  return slides.map((s) => s.url)
}
