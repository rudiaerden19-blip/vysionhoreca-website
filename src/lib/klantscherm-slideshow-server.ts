import { getServerSupabaseClient } from '@/lib/supabase-server'
import {
  isKlantschermCustomPromosColumnError,
  klantschermCustomPromosFromLegacy,
  klantschermCustomPromosToSlides,
  mergeKlantschermCustomPromoSources,
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

export type KlantschermPromoSettingsRow = {
  klantscherm_enabled?: boolean
  klantscherm_slideshow_enabled?: boolean
  klantscherm_custom_promos?: unknown
  klantscherm_slideshow_uploads?: unknown
}

/** PostgREST direct — voorkomt afgekapte JSONB in sommige Next/supabase-js servercontexts. */
export async function fetchKlantschermPromoSettingsRow(
  tenantSlug: string,
): Promise<KlantschermPromoSettingsRow | null> {
  const slug = tenantSlug.trim()
  if (!slug) return null

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!base || !key) return null

  const select = encodeURIComponent(
    'klantscherm_enabled,klantscherm_slideshow_enabled,klantscherm_custom_promos,klantscherm_slideshow_uploads',
  )

  try {
    const res = await fetch(
      `${base}/rest/v1/tenant_settings?tenant_slug=eq.${encodeURIComponent(slug)}&select=${select}`,
      {
        method: 'GET',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
      },
    )
    if (!res.ok) return null
    const rows = (await res.json()) as KlantschermPromoSettingsRow[]
    if (!Array.isArray(rows) || rows.length === 0) return null
    return rows[0] ?? null
  } catch {
    return null
  }
}

/** Exact wat in tenant_settings staat — geen menu, geen Storage. */
export function klantschermSlidesFromSettingsRow(
  row: KlantschermPromoSettingsRow | null | undefined,
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
  const slug = tenantSlug.trim()
  if (!slug) return []

  const fromRest = await fetchKlantschermPromoSettingsRow(slug)
  if (fromRest) {
    const slides = klantschermSlidesFromSettingsRow(fromRest)
    return mapKlantschermSlidesPlaybackUrls(slug, slides) as KlantschermPromoSlide[]
  }

  const supabase = getServerSupabaseClient()
  if (!supabase) return []

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
    const slides = klantschermSlidesFromSettingsRow({
      klantscherm_slideshow_uploads: legacyOnly?.klantscherm_slideshow_uploads,
    })
    return mapKlantschermSlidesPlaybackUrls(slug, slides) as KlantschermPromoSlide[]
  }

  if (error || !settings) return []

  const slides = klantschermSlidesFromSettingsRow(settings)
  return mapKlantschermSlidesPlaybackUrls(slug, slides) as KlantschermPromoSlide[]
}

export async function loadKlantschermSlideshowImageUrls(tenantSlug: string): Promise<string[]> {
  const slides = await loadKlantschermSlideshowSlides(tenantSlug)
  return slides.map((s) => s.url)
}
