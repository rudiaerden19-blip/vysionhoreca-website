import {
  computeFitReservationFloorViewport,
  computeReservationFloorTableVisualScale,
} from '@/lib/reservation-floor-viewport'

describe('computeReservationFloorTableVisualScale', () => {
  it('scales down on short viewports', () => {
    expect(computeReservationFloorTableVisualScale(1024, 720)).toBe(1)
    expect(computeReservationFloorTableVisualScale(1024, 400)).toBeLessThan(0.65)
  })
})

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

  it('never zooms in above 1 when fitting a tight cluster', () => {
    const v = computeFitReservationFloorViewport([{ x: 50, y: 50 }], 800, 600)
    expect(v.zoom).toBeLessThanOrEqual(1)
  })
})
