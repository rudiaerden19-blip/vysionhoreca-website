/** Gekozen besteltype (ter plaatse / afhalen / levering) blijft voor deze kassa-sessie. */

export type KassaOrderTypeChoice = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'

const STORAGE_PREFIX = 'vysion-kassa-order-type:'

export function readKassaOrderTypeChoice(tenantSlug: string): KassaOrderTypeChoice | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + tenantSlug)
    if (raw === 'DINE_IN' || raw === 'TAKEAWAY' || raw === 'DELIVERY') return raw
  } catch {
    /* privémodus */
  }
  return null
}

export function writeKassaOrderTypeChoice(tenantSlug: string, choice: KassaOrderTypeChoice): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(STORAGE_PREFIX + tenantSlug, choice)
  } catch {
    /* privémodus */
  }
}
