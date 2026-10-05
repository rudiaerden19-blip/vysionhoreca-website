import { kassaHelpVideoFillScale } from '@/lib/kassa-help-video-fill-scale'

describe('kassaHelpVideoFillScale', () => {
  it('returns 1 when video already fills container height at full width', () => {
    const scale = kassaHelpVideoFillScale(400, 300, 400, 300)
    expect(scale).toBe(1)
  })

  it('scales up when letterboxed wide video is shorter than container', () => {
    // 1920×720 in 400px wide → 150px tall; container 500px tall → ~3.33, capped at 2.75
    const scale = kassaHelpVideoFillScale(400, 500, 1920, 720)
    expect(scale).toBe(2.75)
  })

  it('never scales below 1', () => {
    const scale = kassaHelpVideoFillScale(400, 100, 1920, 720)
    expect(scale).toBe(1)
  })
})
