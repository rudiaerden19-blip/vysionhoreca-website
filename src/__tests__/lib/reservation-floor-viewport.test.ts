import {
  clampFloorViewportZoom,
  pinchZoomReservationFloor,
  zoomReservationFloorAtPoint,
} from '@/lib/reservation-floor-viewport'

describe('reservation-floor-viewport', () => {
  it('clamps zoom', () => {
    expect(clampFloorViewportZoom(0.01)).toBeGreaterThanOrEqual(0.08)
    expect(clampFloorViewportZoom(99)).toBeLessThanOrEqual(2.5)
  })

  it('zooms out at viewport center', () => {
    const vp = { panX: 0, panY: 0, zoom: 1 }
    const out = zoomReservationFloorAtPoint(vp, 0.5, 200, 150)
    expect(out.zoom).toBe(0.5)
  })

  it('pinch ratio scales zoom from start', () => {
    const start = {
      panX: 10,
      panY: 20,
      zoom: 1,
      anchorLocalX: 100,
      anchorLocalY: 100,
    }
    const z2 = pinchZoomReservationFloor(start, 100, 50)
    expect(z2.zoom).toBe(0.5)
  })
})
