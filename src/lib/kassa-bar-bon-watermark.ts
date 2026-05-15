import type { KassaCartItem } from '@/lib/kassa-cart-types'

/** Per tafelsleutel (zone|tafel): laatst naar de toog afgedrukte hoeveelheden per mandregel (cartKey). */
export type BarBonWatermarkStore = Record<string, Record<string, number>>

export function barBonWatermarkStorageKey(tenantSlug: string): string {
  return `vysion_kassa_bar_bon_watermark_${tenantSlug}`
}

export function loadBarBonWatermarks(tenantSlug: string): BarBonWatermarkStore {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(barBonWatermarkStorageKey(tenantSlug))
    if (!raw) return {}
    const p = JSON.parse(raw) as BarBonWatermarkStore
    return p && typeof p === 'object' ? p : {}
  } catch {
    return {}
  }
}

export function saveBarBonWatermarks(tenantSlug: string, store: BarBonWatermarkStore): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(barBonWatermarkStorageKey(tenantSlug), JSON.stringify(store))
  } catch {
    /* quota */
  }
}

export function removeBarBonWatermarkSlot(tenantSlug: string, slotKey: string): void {
  const store = loadBarBonWatermarks(tenantSlug)
  if (!store[slotKey]) return
  delete store[slotKey]
  saveBarBonWatermarks(tenantSlug, store)
}

/** Als de mand krimpt: cap last-sent zodat we geen negatieve „delta” voorstellen (MVP). */
export function reconcileBarBonWatermarkForCart(
  lastSent: Record<string, number>,
  currentCart: KassaCartItem[],
): Record<string, number> {
  const out = { ...lastSent }
  const byKey = Object.fromEntries(currentCart.map((i) => [i.cartKey, i.quantity]))
  for (const k of Object.keys(out)) {
    if (byKey[k] == null) delete out[k]
    else out[k] = Math.min(out[k]!, byKey[k]!)
  }
  return out
}

/** Alleen extra stuks t.o.v. laatste toogbon; `nextWatermark` bij te werken ná geslaagde print. */
export function computeBarBonDelta(
  currentCart: KassaCartItem[],
  lastSent: Record<string, number>,
): { deltaLines: KassaCartItem[]; nextWatermark: Record<string, number> } {
  const reconciled = reconcileBarBonWatermarkForCart(lastSent, currentCart)
  const deltaLines: KassaCartItem[] = []
  const nextWatermark: Record<string, number> = {}

  for (const line of currentCart) {
    const prev = reconciled[line.cartKey] ?? 0
    const dq = line.quantity - prev
    if (dq > 0) {
      deltaLines.push({ ...line, quantity: dq })
    }
    nextWatermark[line.cartKey] = line.quantity
  }

  return { deltaLines, nextWatermark }
}
