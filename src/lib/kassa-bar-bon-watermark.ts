import type { KassaCartItem } from '@/lib/kassa-cart-types'
import { patchKassaPosState } from '@/lib/kassa-pos-state-client'

/** Zelfde logica als mandregel-id in de kassa (zonder fragiele cartKey uit JSON/sync). */
export function kassaCartLineStableKey(line: KassaCartItem): string {
  try {
    const pid = String(line.product?.id ?? '')
    const ch = line.choices ?? []
    if (ch.length === 0) return pid
    return `${pid}-${ch.map((c) => c.choiceId).sort().join('-')}`
  } catch {
    return String(line.product?.id ?? 'invalid')
  }
}

/** Per tafelsleutel (zone|tafel): laatst naar de toog gestuurde hoeveelheden per stabiele regel. */
export type BarBonWatermarkStore = Record<string, Record<string, number>>

const watermarkByTenant: Record<string, BarBonWatermarkStore> = {}

export function hydrateBarBonWatermarksFromStore(tenantSlug: string, store: BarBonWatermarkStore): void {
  watermarkByTenant[tenantSlug] = store && typeof store === 'object' ? store : {}
}

export function loadBarBonWatermarks(tenantSlug: string): BarBonWatermarkStore {
  return watermarkByTenant[tenantSlug] ?? {}
}

export function saveBarBonWatermarks(tenantSlug: string, store: BarBonWatermarkStore): void {
  watermarkByTenant[tenantSlug] = store
  void patchKassaPosState(tenantSlug, { bar_bon_watermarks: store })
}

export function removeBarBonWatermarkSlot(tenantSlug: string, slotKey: string): void {
  try {
    const store = loadBarBonWatermarks(tenantSlug)
    if (!slotKey || !store[slotKey]) return
    delete store[slotKey]
    saveBarBonWatermarks(tenantSlug, store)
  } catch {
    /* mand mag niet blokkeren */
  }
}

/** @deprecated Alleen legacy purge — geen reads meer. */
export function barBonWatermarkStorageKey(_tenantSlug: string): string {
  return ''
}

/** Ruwe watermark uit storage — alleen niet-negatieve gehele hoeveelheden. */
export function sanitizeBarBonWatermark(row: Record<string, unknown> | null | undefined): Record<string, number> {
  const out: Record<string, number> = {}
  if (!row || typeof row !== 'object') return out
  for (const [k, v] of Object.entries(row)) {
    if (!k || typeof k !== 'string') continue
    const n = typeof v === 'number' ? v : Number(v)
    if (!Number.isFinite(n) || n < 0) continue
    out[k] = Math.min(Math.floor(n), 99999)
  }
  return out
}

/** Mandregels geschikt voor delta — ontbrekend product of ongeldige hoeveelheid wordt overgeslagen. */
export function filterCartLinesForBarBonWatermark(items: KassaCartItem[]): KassaCartItem[] {
  if (!Array.isArray(items)) return []
  const out: KassaCartItem[] = []
  for (const line of items) {
    try {
      if (!line?.product || String(line.product.id ?? '').trim() === '') continue
      const q = typeof line.quantity === 'number' ? line.quantity : Number(line.quantity)
      if (!Number.isFinite(q) || q <= 0) continue
      out.push(line)
    } catch {
      continue
    }
  }
  return out
}

function quantitiesByStableKey(items: KassaCartItem[]): Record<string, number> {
  const m: Record<string, number> = {}
  if (!Array.isArray(items)) return m
  for (const i of items) {
    try {
      if (!i?.product || String(i.product.id ?? '').trim() === '') continue
      const q = typeof i.quantity === 'number' ? i.quantity : Number(i.quantity)
      if (!Number.isFinite(q) || q <= 0) continue
      const k = kassaCartLineStableKey(i)
      const add = Math.min(Math.floor(q), 99999)
      m[k] = (m[k] ?? 0) + add
    } catch {
      continue
    }
  }
  return m
}

/** Handtekening van de volledige voorlopige mand (gele bon) — zelfde stabiele regels als toog-watermerk. */
export function kassaDraftBonGuardSig(items: KassaCartItem[], total: number): string {
  const qty = quantitiesByStableKey(items)
  const keys = Object.keys(qty).sort()
  const tt = typeof total === 'number' && Number.isFinite(total) ? total : 0
  return keys.map((k) => `${k}:${qty[k]}`).join(' | ') + `@${tt.toFixed(4)}`
}

/** Eerste mandregel per stabiele sleutel (voor productnaam/opies op de bon). */
function firstLineByStableKey(items: KassaCartItem[]): Map<string, KassaCartItem> {
  const map = new Map<string, KassaCartItem>()
  for (const i of items) {
    try {
      const k = kassaCartLineStableKey(i)
      if (!map.has(k)) map.set(k, i)
    } catch {
      continue
    }
  }
  return map
}

function reconcileBarBonWatermark(
  lastSent: Record<string, number>,
  currentQty: Record<string, number>,
): Record<string, number> {
  const out = { ...lastSent }
  for (const k of Object.keys(out)) {
    const cur = currentQty[k]
    if (cur == null || !Number.isFinite(cur)) delete out[k]
    else out[k] = Math.min(out[k]!, cur)
  }
  return out
}

/** Volledige mand als delta (herstelpad als normale berekening faalt). */
function barBonDeltaFallbackFullCart(safeCart: KassaCartItem[]): {
  deltaLines: KassaCartItem[]
  nextWatermark: Record<string, number>
} {
  const qty = quantitiesByStableKey(safeCart)
  const reps = firstLineByStableKey(safeCart)
  const deltaLines: KassaCartItem[] = []
  for (const [k, q] of Object.entries(qty)) {
    const base = reps.get(k)
    if (!base?.product) continue
    deltaLines.push({ ...base, quantity: q })
  }
  return { deltaLines, nextWatermark: { ...qty } }
}

/**
 * Alleen extra stuks t.o.v. laatste toogbon; `nextWatermark`= volledige stand na deze bon.
 * Robuust tegen corrupte storage/regels: geen throw naar de UI.
 */
export function computeBarBonDelta(
  currentCart: KassaCartItem[],
  lastSent: Record<string, number>,
): { deltaLines: KassaCartItem[]; nextWatermark: Record<string, number> } {
  const safeCart = filterCartLinesForBarBonWatermark(Array.isArray(currentCart) ? currentCart : [])
  try {
    const prevClean = sanitizeBarBonWatermark(lastSent as Record<string, unknown>)
    const currentQty = quantitiesByStableKey(safeCart)
    const reps = firstLineByStableKey(safeCart)
    const reconciled = reconcileBarBonWatermark(prevClean, currentQty)
    const deltaLines: KassaCartItem[] = []

    for (const [k, qty] of Object.entries(currentQty)) {
      const prev = reconciled[k] ?? 0
      const dq = qty - prev
      if (dq <= 0) continue
      const base = reps.get(k)
      if (!base?.product) continue
      deltaLines.push({ ...base, quantity: dq })
    }

    return { deltaLines, nextWatermark: { ...currentQty } }
  } catch {
    return barBonDeltaFallbackFullCart(safeCart)
  }
}
