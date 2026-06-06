import {
  computeBarBonDelta,
  filterCartLinesForBarBonWatermark,
  kassaCartLineStableKey,
  sanitizeBarBonWatermark,
  type BarBonWatermarkStore,
} from '@/lib/kassa-bar-bon-watermark'
import { gksBarBonWatermarkStorageKey } from '@/lib/gks-kassa/storage-keys'

export {
  computeBarBonDelta,
  filterCartLinesForBarBonWatermark,
  kassaCartLineStableKey,
  sanitizeBarBonWatermark,
  type BarBonWatermarkStore,
}

export function loadBarBonWatermarks(tenantSlug: string): BarBonWatermarkStore {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(gksBarBonWatermarkStorageKey(tenantSlug))
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
    localStorage.setItem(gksBarBonWatermarkStorageKey(tenantSlug), JSON.stringify(store))
  } catch {
    /* quota */
  }
}

export function removeBarBonWatermarkSlot(tenantSlug: string, slotKey: string): void {
  try {
    const store = loadBarBonWatermarks(tenantSlug)
    if (!slotKey || !store[slotKey]) return
    delete store[slotKey]
    saveBarBonWatermarks(tenantSlug, store)
  } catch {
    /* storage */
  }
}
