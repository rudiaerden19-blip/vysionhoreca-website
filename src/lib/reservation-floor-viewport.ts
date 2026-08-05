/** Pan/zoom viewport for reservation floor plan (camera only — not stored in DB). */

export type ReservationFloorViewport = {
  panX: number
  panY: number
  zoom: number
}

/** Ruimte rond tafel-midden in % van het vlak (SVG + stoelen). */
const TABLE_HALO_PCT = 14

const MIN_ZOOM = 0.2
const MAX_ZOOM = 2
const VIEWPORT_PAD_PX = 28

export function computeFitReservationFloorViewport(
  tables: { x: number; y: number }[],
  viewportW: number,
  viewportH: number,
): ReservationFloorViewport {
  if (tables.length === 0 || viewportW <= 0 || viewportH <= 0) {
    return { panX: 0, panY: 0, zoom: 1 }
  }

  let minX = Math.min(...tables.map((t) => t.x)) - TABLE_HALO_PCT
  let maxX = Math.max(...tables.map((t) => t.x)) + TABLE_HALO_PCT
  let minY = Math.min(...tables.map((t) => t.y)) - TABLE_HALO_PCT
  let maxY = Math.max(...tables.map((t) => t.y)) + TABLE_HALO_PCT

  minX = Math.max(0, minX)
  maxX = Math.min(100, maxX)
  minY = Math.max(0, minY)
  maxY = Math.min(100, maxY)

  const boxW = ((maxX - minX) / 100) * viewportW
  const boxH = ((maxY - minY) / 100) * viewportH
  if (boxW <= 0 || boxH <= 0) {
    return { panX: 0, panY: 0, zoom: 1 }
  }

  const zoom = Math.min(
    (viewportW - VIEWPORT_PAD_PX * 2) / boxW,
    (viewportH - VIEWPORT_PAD_PX * 2) / boxH,
    MAX_ZOOM,
  )
  const clampedZoom = Math.max(MIN_ZOOM, zoom)

  const centerX = ((minX + maxX) / 2 / 100) * viewportW
  const centerY = ((minY + maxY) / 2 / 100) * viewportH

  return {
    panX: viewportW / 2 - centerX * clampedZoom,
    panY: viewportH / 2 - centerY * clampedZoom,
    zoom: clampedZoom,
  }
}
