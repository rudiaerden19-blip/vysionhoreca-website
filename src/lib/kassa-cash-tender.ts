/** Wisselgeld in het betaalvenster — alleen Doner Kebap Laakdal. */

function compactTenantToken(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

export function isDonerKebabLaakdalCashTenderTenant(slug: string | null | undefined): boolean {
  return compactTenantToken(slug) === 'donerkebablaakdal'
}

export function parseCashTenderInput(raw: string): number | null {
  const cleaned = String(raw ?? '').trim().replace(',', '.')
  if (!cleaned) return null
  const n = Number(cleaned)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100) / 100
}

/** Cijfertoets voor het cashbedrag. Eén komma, maximaal twee centen. */
export function applyCashTenderKey(current: string, key: string): string {
  if (key === 'C') return ''
  if (key === '⌫') return current.slice(0, -1)
  if (key === ',' || key === '.') {
    if (current.includes(',') || current.includes('.')) return current
    return `${current || '0'},`
  }
  if (!/^\d$/.test(key)) return current
  const next = current + key
  const [whole, cents] = next.split(/[.,]/)
  if ((whole?.replace(/^0+(?=\d)/, '') ?? '').length > 6) return current
  if (cents != null && cents.length > 2) return current
  return next
}

/** Terug te geven cash. Leeg of te weinig ontvangen = 0. */
export function cashChangeDueEuro(total: number, tendered: number | null): number {
  if (tendered == null) return 0
  const dueCents = Math.round(tendered * 100) - Math.round(Number(total) * 100)
  return dueCents > 0 ? dueCents / 100 : 0
}
