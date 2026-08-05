import { computeFitReservationFloorViewport } from '@/lib/reservation-floor-viewport'

describe('computeFitReservationFloorViewport', () => {
  it('returns default when no tables', () => {
    expect(computeFitReservationFloorViewport([], 800, 600)).toEqual({
      panX: 0,
      panY: 0,
      zoom: 1,
    })
  })

  it('zooms out when tables span wide area', () => {
    const v = computeFitReservationFloorViewport(
      [
        { x: 10, y: 50 },
        { x: 90, y: 50 },
      ],
      400,
      400,
    )
    expect(v.zoom).toBeLessThan(1)
    expect(v.zoom).toBeGreaterThanOrEqual(0.2)
  })

  it('centers a single table', () => {
    const v = computeFitReservationFloorViewport([{ x: 80, y: 20 }], 500, 500)
    const centerScreenX = v.panX + (80 / 100) * 500 * v.zoom
    expect(centerScreenX).toBeCloseTo(250, 0)
  })
})
