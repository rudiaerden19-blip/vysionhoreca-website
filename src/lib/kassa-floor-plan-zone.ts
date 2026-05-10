/** Zaalebied voor plattegrond + open kassa-mand — alle tenants. */

export const FLOOR_PLAN_ZONE_INSIDE = 'inside' as const
export const FLOOR_PLAN_ZONE_TERRACE = 'terrace' as const

export type FloorPlanZone = typeof FLOOR_PLAN_ZONE_INSIDE | typeof FLOOR_PLAN_ZONE_TERRACE

export function isFloorPlanZone(s: string): s is FloorPlanZone {
  return s === FLOOR_PLAN_ZONE_INSIDE || s === FLOOR_PLAN_ZONE_TERRACE
}

/** Normalise DB/null naar zone (legacy rijen = inside). */
export function normalizeFloorPlanZone(raw: string | null | undefined): FloorPlanZone {
  return raw === FLOOR_PLAN_ZONE_TERRACE ? FLOOR_PLAN_ZONE_TERRACE : FLOOR_PLAN_ZONE_INSIDE
}

/**
 * Supabase Realtime stuurt bij UPDATE vaak alleen gewijzigde kolommen in `new`.
 * `plan_zone` hoort bij de PK — gebruik `old.plan_zone` als die in `new` ontbreekt.
 * Anders zou terras-data per ongeluk onder `inside` gemerged worden.
 */
export function floorPlanZoneFromRealtimePayload(payload: {
  eventType?: string
  new?: { plan_zone?: string | null }
  old?: { plan_zone?: string | null }
}): FloorPlanZone | null {
  if (payload.eventType === 'DELETE') {
    const raw = payload.old?.plan_zone
    if (raw == null || String(raw).trim() === '') return null
    return normalizeFloorPlanZone(raw)
  }
  const raw =
    payload.new?.plan_zone ??
    (payload.eventType === 'UPDATE' ? payload.old?.plan_zone : undefined)
  if (raw == null || String(raw).trim() === '') return null
  return normalizeFloorPlanZone(raw)
}

/** Unieke sleutel voor open mand + tableOrders state (zelfde nummer binnen ≠ terras). */
export function tableOrderMapKey(zone: FloorPlanZone, displayNumber: string): string {
  return `${zone}:${displayNumber}`
}

export function parseTableOrderMapKey(key: string): { zone: FloorPlanZone; tableNumber: string } | null {
  const i = key.indexOf(':')
  if (i <= 0) return null
  const zone = key.slice(0, i)
  const tableNumber = key.slice(i + 1)
  if (!isFloorPlanZone(zone) || !tableNumber) return null
  return { zone, tableNumber }
}

/** Migratie oude localStorage zonder zone-prefix → alles = inside. */
export function migrateLegacyTableOrdersKeys<T>(
  raw: Record<string, T> | null | undefined
): Record<string, T> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, T> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (k.includes(':') && parseTableOrderMapKey(k)) {
      out[k] = v
    } else {
      out[tableOrderMapKey(FLOOR_PLAN_ZONE_INSIDE, k)] = v
    }
  }
  return out
}

/** Tafel- of kruknummer in een zone met niet-lege mand (keys = `zone:nummer`). */
export function displayNumbersWithOpenOrdersInZone(
  tableOrders: Record<string, unknown[] | null | undefined>,
  zone: FloorPlanZone,
): Set<string> {
  const prefix = `${zone}:`
  const out = new Set<string>()
  for (const [k, v] of Object.entries(tableOrders)) {
    const arr = v
    if (!Array.isArray(arr) || arr.length === 0) continue
    if (!k.startsWith(prefix)) continue
    const num = k.slice(prefix.length)
    if (num) out.add(num)
  }
  return out
}
