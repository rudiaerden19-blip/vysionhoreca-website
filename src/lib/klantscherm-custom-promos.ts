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

export function parseKlantschermCustomPromos(raw: unknown): KlantschermCustomPromo[] {
  if (!Array.isArray(raw)) return []
  const out: KlantschermCustomPromo[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const url = String((row as { url?: unknown }).url ?? '').trim()
    if (!url) continue
    const sort = Number((row as { sort?: unknown }).sort)
    out.push({
      url,
      sort: Number.isFinite(sort) ? sort : out.length,
      title: trimField((row as { title?: unknown }).title, 120),
      description: trimField((row as { description?: unknown }).description, 500),
      displayPrice: trimField((row as { displayPrice?: unknown }).displayPrice, 32),
      promoText: trimField((row as { promoText?: unknown }).promoText, 160),
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
