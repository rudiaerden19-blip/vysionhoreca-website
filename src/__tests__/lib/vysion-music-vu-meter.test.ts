import {
  computeVuMeterChannels,
  vuBeatEnvelope,
  VU_SEGMENT_COUNT,
  vuLitOpacity,
} from '@/lib/vysion-music-vu-meter'

describe('vysion-music-vu-meter', () => {
  it('beat envelope peaks early in the beat', () => {
    expect(vuBeatEnvelope(0.04)).toBeGreaterThan(vuBeatEnvelope(0.45))
  })

  it('returns idle levels when not playing', () => {
    const { left, right } = computeVuMeterChannels(1000, 80, 'track-a', false)
    expect(left).toBeLessThan(0.1)
    expect(right).toBeLessThan(0.1)
  })

  it('scales with volume when playing', () => {
    const loud = computeVuMeterChannels(500, 100, 'track-b', true)
    const quiet = computeVuMeterChannels(500, 20, 'track-b', true)
    expect(loud.left).toBeGreaterThan(quiet.left)
  })

  it('segment opacity spans 0–1 across level', () => {
    expect(vuLitOpacity(0, 0)).toBeLessThan(0.2)
    expect(vuLitOpacity(1, VU_SEGMENT_COUNT - 1)).toBe(1)
  })
})
