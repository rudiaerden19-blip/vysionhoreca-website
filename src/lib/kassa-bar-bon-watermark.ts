import type { KassaCartItem } from '@/lib/kassa-cart-types'

/** Zelfde logica als mandregel-id in de kassa (zonder fragiele cartKey uit JSON/sync). */
export function kassaCartLineStableKey(line: KassaCartItem): string {
  const pid = String(line.product.id ?? '')
  const ch = line.choices ?? []
  if (ch.length === 0) return pid
  return `${pid}-${ch.map((c) => c.choiceId).sort().join('-')}`
}

/** Per tafelsleutel (zone|tafel): laatst naar de toog gestuurde hoeveelheden per stabiele regel. */
export type BarBonWatermarkStore = Record<string, Record<string, number>>

/** v2: sleutels op product+keuzes — v1 gebruikte cartKey die na server-sync kon afwijken. */
export function barBonWatermarkStorageKey(tenantSlug: string): string {
  return `vysion_kassa_bar_bon_watermark_v2_${tenantSlug}`
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

function quantitiesByStableKey(items: KassaCartItem[]): Record<string, number> {
  const m: Record<string, number> = {}
  for (const i of items) {
    const k = kassaCartLineStableKey(i)
    m[k] = (m[k] ?? 0) + i.quantity
  }
  return m
}

/** Handtekening van de volledige voorlopige mand (gele bon) — zelfde stabiele regels als toog-watermerk. */
export function kassaDraftBonGuardSig(items: KassaCartItem[], total: number): string {
  const qty = quantitiesByStableKey(items)
  const keys = Object.keys(qty).sort()
  return keys.map((k) => `${k}:${qty[k]}`).join('|') + `@${total.toFixed(4)}`
}

/** Eerste mandregel per stabiele sleutel (voor productnaam/opies op de bon). */
function firstLineByStableKey(items: KassaCartItem[]): Map<string, KassaCartItem> {
  const map = new Map<string, KassaCartItem>()
  for (const i of items) {
    const k = kassaCartLineStableKey(i)
    if (!map.has(k)) map.set(k, i)
  }
  return map
}

function reconcileBarBonWatermark(
  lastSent: Record<string, number>,
  currentQty: Record<string, number>,
): Record<string, number> {
  const out = { ...lastSent }
  for (const k of Object.keys(out)) {
    if (currentQty[k] == null) delete out[k]
    else out[k] = Math.min(out[k]!, currentQty[k]!)
  }
  return out
}

/** Alleen extra stuks t.o.v. laatste toogbon; `nextWatermark` = volledige stand na deze bon. */
export function computeBarBonDelta(
  currentCart: KassaCartItem[],
  lastSent: Record<string, number>,
): { deltaLines: KassaCartItem[]; nextWatermark: Record<string, number> } {
  const currentQty = quantitiesByStableKey(currentCart)
  const reps = firstLineByStableKey(currentCart)
  const reconciled = reconcileBarBonWatermark(lastSent, currentQty)
  const deltaLines: KassaCartItem[] = []

  for (const [k, qty] of Object.entries(currentQty)) {
    const prev = reconciled[k] ?? 0
    const dq = qty - prev
    if (dq > 0) {
      const base = reps.get(k)!
      deltaLines.push({ ...base, quantity: dq })
    }
  }

  return { deltaLines, nextWatermark: { ...currentQty } }
}
