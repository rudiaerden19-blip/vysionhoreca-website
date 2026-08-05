/** Pan/zoom viewport for reservation floor plan (camera only — not stored in DB). */

export type ReservationFloorViewport = {
  panX: number
  panY: number
  zoom: number
}

export const FLOOR_VIEWPORT_MIN_ZOOM = 0.08
export const FLOOR_VIEWPORT_MAX_ZOOM = 2.5

export function clampFloorViewportZoom(z: number): number {
  return Math.min(FLOOR_VIEWPORT_MAX_ZOOM, Math.max(FLOOR_VIEWPORT_MIN_ZOOM, z))
}

/** Zoom in/out rond een punt in canvas-local pixels (linksboven = 0,0). */
export function zoomReservationFloorAtPoint(
  vp: ReservationFloorViewport,
  factor: number,
  anchorLocalX: number,
  anchorLocalY: number,
): ReservationFloorViewport {
  const newZoom = clampFloorViewportZoom(vp.zoom * factor)
  const wx = (anchorLocalX - vp.panX) / vp.zoom
  const wy = (anchorLocalY - vp.panY) / vp.zoom
  return {
    zoom: newZoom,
    panX: anchorLocalX - wx * newZoom,
    panY: anchorLocalY - wy * newZoom,
  }
}

/** Standaard openingszoom: iPad ~80%; uitzoomen kan via − / pinch. */
export const FLOOR_DEFAULT_OPEN_ZOOM_TOUCH = 0.8
export const FLOOR_DEFAULT_OPEN_ZOOM_DESKTOP = 1

/** CSS cm → px (zelfde referentie als browser: 1in = 96px, 1in = 2.54cm). */
export function cssCmToPx(cm: number): number {
  return (cm * 96) / 2.54
}

/** Fine-tune plattegrond: cameraverschuiving (niet opgeslagen in DB). */
export const FLOOR_DEFAULT_PAN_OFFSET_X_CM = 2
export const FLOOR_DEFAULT_PAN_OFFSET_Y_CM = 2

export function floorDefaultPanOffsetPx(): { panX: number; panY: number } {
  return {
    panX: cssCmToPx(FLOOR_DEFAULT_PAN_OFFSET_X_CM),
    panY: cssCmToPx(FLOOR_DEFAULT_PAN_OFFSET_Y_CM),
  }
}

export function defaultFloorViewportForDevice(isTouch: boolean): ReservationFloorViewport {
  const { panX, panY } = floorDefaultPanOffsetPx()
  return {
    panX,
    panY,
    zoom: isTouch ? FLOOR_DEFAULT_OPEN_ZOOM_TOUCH : FLOOR_DEFAULT_OPEN_ZOOM_DESKTOP,
  }
}

/** Openingsstand: vaste zoom, geen auto-center — tafel-x/y % blijven visueel op dezelfde plek op elk scherm. */
export function openingFloorViewportForTables(
  _tables: { x: number; y: number }[],
  _viewportW: number,
  _viewportH: number,
  isTouch: boolean,
): ReservationFloorViewport {
  return defaultFloorViewportForDevice(isTouch)
}

export function pinchDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1)
}

/** Pinch: zoom t.o.v. start-snapshot (dist-ratio × startZoom) rond vaste anchor. */
export function pinchZoomReservationFloor(
  start: ReservationFloorViewport & { anchorLocalX: number; anchorLocalY: number },
  startPinchDistance: number,
  currentPinchDistance: number,
): ReservationFloorViewport {
  if (startPinchDistance <= 0) return start
  const ratio = currentPinchDistance / startPinchDistance
  return zoomReservationFloorAtPoint(start, ratio, start.anchorLocalX, start.anchorLocalY)
}
