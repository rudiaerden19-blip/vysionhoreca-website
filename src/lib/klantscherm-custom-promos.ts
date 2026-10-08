import { parseKlantschermPromoPublicStorageUrl } from '@/lib/klantscherm-promo-storage-parse'

export const KLANTSCHERM_CUSTOM_PROMO_MAX = 10

export type KlantschermCustomPromo = {
  url: string
  sort: number
  title: string
  description: string
  /** Alleen klantscherm — geen koppeling met kassa-prijzen. */
  displayPrice: string
  promoText: string
}

export type KlantschermPromoSlide = KlantschermCustomPromo & {
  type: 'image'
}

function trimField(raw: unknown, maxLen: number): string {
  const s = String(raw ?? '').trim()
  if (!s) return ''
  return s.length > maxLen ? s.slice(0, maxLen) : s
}

function rowField(row: Record<string, unknown>, camel: string, snake: string): unknown {
  if (row[camel] !== undefined && row[camel] !== null) return row[camel]
  return row[snake]
}

/** PostgREST/JSONB kan soms een string teruggeven i.p.v. een array. */
export function normalizeKlantschermPromosJsonRaw(raw: unknown): unknown {
  if (typeof raw === 'string') {
    const t = raw.trim()
    if (!t) return []
    try {
      return JSON.parse(t) as unknown
    } catch {
      return raw
    }
  }
  return raw
}

function klantschermPromoUrlMergeKey(url: string): string {
  const ref = parseKlantschermPromoPublicStorageUrl(url)
  if (ref?.path) return ref.path
  return url.trim()
}

/** custom_promos + legacy uploads samenvoegen (zelfde foto niet dubbel). */
export function mergeKlantschermCustomPromoSources(
  customRaw: unknown,
  legacyUploadsRaw: unknown,
): KlantschermCustomPromo[] {
  const custom = parseKlantschermCustomPromos(normalizeKlantschermPromosJsonRaw(customRaw))
  const legacy = klantschermCustomPromosFromLegacy(
    normalizeKlantschermPromosJsonRaw(legacyUploadsRaw),
  )
  if (custom.length === 0) return legacy
  if (legacy.length === 0) return custom

  const byKey = new Map<string, KlantschermCustomPromo>()
  for (const p of legacy) {
    byKey.set(klantschermPromoUrlMergeKey(p.url), p)
  }
  for (const p of custom) {
    const key = klantschermPromoUrlMergeKey(p.url)
    const prev = byKey.get(key)
    byKey.set(key, prev ? { ...prev, ...p, url: p.url || prev.url } : p)
  }
  const merged = [...byKey.values()].sort(
    (a, b) => a.sort - b.sort || a.url.localeCompare(b.url),
  )
  return parseKlantschermCustomPromos(merged)
}

export function parseKlantschermCustomPromos(raw: unknown): KlantschermCustomPromo[] {
  const normalized = normalizeKlantschermPromosJsonRaw(raw)
  if (!Array.isArray(normalized)) return []
  const out: KlantschermCustomPromo[] = []
  for (const row of normalized) {
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    const url = String(o.url ?? '').trim()
    if (!url) continue
    const sort = Number(o.sort)
    out.push({
      url,
      sort: Number.isFinite(sort) ? sort : out.length,
      title: trimField(rowField(o, 'title', 'title'), 120),
      description: trimField(rowField(o, 'description', 'description'), 500),
      displayPrice: trimField(rowField(o, 'displayPrice', 'display_price'), 32),
      promoText: trimField(rowField(o, 'promoText', 'promo_text'), 160),
    })
  }
  out.sort((a, b) => a.sort - b.sort || a.url.localeCompare(b.url))
  return out.slice(0, KLANTSCHERM_CUSTOM_PROMO_MAX)
}

/** Legacy klantscherm_slideshow_uploads → promos (alleen foto-urls). */
export function klantschermCustomPromosFromLegacy(rawUploads: unknown): KlantschermCustomPromo[] {
  if (!Array.isArray(rawUploads)) return []
  const out: KlantschermCustomPromo[] = []
  for (const row of rawUploads) {
    if (!row || typeof row !== 'object') continue
    const url = String((row as { url?: unknown }).url ?? '').trim()
    if (!url) continue
    const mediaType = String((row as { mediaType?: unknown }).mediaType ?? '')
    if (mediaType === 'video' || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)) continue
    const sort = Number((row as { sort?: unknown }).sort)
    out.push({
      url,
      sort: Number.isFinite(sort) ? sort : out.length,
      title: '',
      description: '',
      displayPrice: '',
      promoText: '',
    })
  }
  return parseKlantschermCustomPromos(out)
}

export function mergeKlantschermCustomPromosForSave(
  promos: KlantschermCustomPromo[],
): KlantschermCustomPromo[] {
  return parseKlantschermCustomPromos(promos)
}

export function klantschermCustomPromosToSlides(promos: KlantschermCustomPromo[]): KlantschermPromoSlide[] {
  return parseKlantschermCustomPromos(promos).map((p) => ({ ...p, type: 'image' as const }))
}

/** Spiegel voor legacy kolom `klantscherm_slideshow_uploads` (slideshow blijft werken zonder migratie). */
export function klantschermCustomPromosToLegacyUploads(
  promos: KlantschermCustomPromo[],
): { url: string; sort: number; mediaType: 'image' }[] {
  return mergeKlantschermCustomPromosForSave(promos).map((p) => ({
    url: p.url,
    sort: p.sort,
    mediaType: 'image' as const,
  }))
}

export function isKlantschermCustomPromosColumnError(message: string | undefined): boolean {
  if (!message) return false
  return /42703|PGRST204|klantscherm_custom_promos|schema cache/i.test(message)
}
