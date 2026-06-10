export function buildRetailLoyaltyPassPath(tenantSlug: string, cardCode: string): string {
  const q = new URLSearchParams({ c: cardCode.replace(/\D/g, '') })
  return `/shop/${encodeURIComponent(tenantSlug)}/winkelpas?${q.toString()}`
}

export function buildRetailLoyaltyPassAbsoluteUrl(
  origin: string,
  tenantSlug: string,
  cardCode: string,
): string {
  const base = origin.replace(/\/$/, '')
  return `${base}${buildRetailLoyaltyPassPath(tenantSlug, cardCode)}`
}
