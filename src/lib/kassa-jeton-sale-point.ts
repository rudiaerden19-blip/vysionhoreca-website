export type KassaJetonSalePoint = 'bar' | 'ijs'

const STORAGE_PREFIX = 'kassa_jeton_sale_point_v1'

export function kassaJetonSalePointStorageKey(tenantSlug: string): string {
  return `${STORAGE_PREFIX}:${tenantSlug.trim()}`
}

export function readKassaJetonSalePoint(
  tenantSlug: string,
): KassaJetonSalePoint {
  if (typeof window === 'undefined') return 'bar'
  try {
    const raw = window.localStorage.getItem(
      kassaJetonSalePointStorageKey(tenantSlug),
    )
    return raw === 'ijs' ? 'ijs' : 'bar'
  } catch {
    return 'bar'
  }
}

export function writeKassaJetonSalePoint(
  tenantSlug: string,
  point: KassaJetonSalePoint,
): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      kassaJetonSalePointStorageKey(tenantSlug),
      point,
    )
  } catch {
    /* ignore */
  }
}
