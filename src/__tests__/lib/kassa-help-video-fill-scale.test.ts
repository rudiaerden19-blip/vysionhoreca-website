import { kassaHelpVideoContainSize } from '@/lib/kassa-help-video-fill-scale'

describe('kassaHelpVideoContainSize', () => {
  it('fills width for wide video in a tall panel', () => {
    const { width, height } = kassaHelpVideoContainSize(400, 600, 1920, 720)
    expect(width).toBe(400)
    expect(height).toBe(150)
  })

  it('caps by height when panel is short', () => {
    const { width, height } = kassaHelpVideoContainSize(400, 120, 1920, 720)
    expect(height).toBe(120)
    expect(width).toBe(320)
  })

  it('returns zero when inputs invalid', () => {
    expect(kassaHelpVideoContainSize(0, 100, 1920, 720)).toEqual({ width: 0, height: 0 })
  })
})
