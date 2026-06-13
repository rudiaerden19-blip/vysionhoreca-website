/** Plattegrond-tafels JSON (floor_plan_tables.data) — gedeeld door KassaFloorPlan en kassa-sync. */

export type FloorPlanTableShape = 'ROUND' |  'SQUARE' |  'RECTANGLE'

export type FloorPlanTableStatus = 'FREE' |  'OCCUPIED' |  'UNPAID'

export interface FloorPlanTable {
  id: string
  number: string
  seats: number
  shape: FloorPlanTableShape
  x: number
  y: number
  rotation: number
  status: FloorPlanTableStatus
}

/** Posities zijn % van het canvas (ongeveer 1–99). Corrupte waarden buiten 0–100 worden geneutraliseerd. */
export function clampFloorPlanPct(v: unknown, fallback = 50): number {
  const n = typeof v === 'number'? v : parseFloat(String(v))
  if (!Number.isFinite(n)) return fallback
  if (n >= 0 && n <= 100) return Math.max(1, Math.min(99, n))
  return fallback
}

export function sanitizeFloorPlanTables(list: FloorPlanTable[]): FloorPlanTable[] {
  return list.map((t) => ({ ...t, x: clampFloorPlanPct(t.x), y: clampFloorPlanPct(t.y) }))
}

/**
 * Parse `floor_plan_tables.data`(JSONB-array of per ongeluk dubbel geëncodeerde JSON-string).
 * `null`= niet herkenbaar als lijst (overschrijf lokale state niet).
 */
export function parseFloorPlanTablesJson(raw: unknown): FloorPlanTable[] | null {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw as FloorPlanTable[]
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw)
      return Array.isArray(p) ? (p as FloorPlanTable[]) : null
    } catch {
      return null
    }
  }
  return null
}
