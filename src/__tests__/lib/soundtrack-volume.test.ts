import {
  soundtrackApiVolumeToUiPercent,
  soundtrackUiPercentToApiVolume,
} from '@/lib/soundtrack/soundtrack-server'

describe('soundtrack volume mapping', () => {
  it('maps API 0–16 to UI 0–100', () => {
    expect(soundtrackApiVolumeToUiPercent(0)).toBe(0)
    expect(soundtrackApiVolumeToUiPercent(16)).toBe(100)
    expect(soundtrackApiVolumeToUiPercent(8)).toBe(50)
  })

  it('maps UI 0–100 to API 0–16', () => {
    expect(soundtrackUiPercentToApiVolume(0)).toBe(0)
    expect(soundtrackUiPercentToApiVolume(100)).toBe(16)
    expect(soundtrackUiPercentToApiVolume(50)).toBe(8)
  })

  it('clamps out of range', () => {
    expect(soundtrackUiPercentToApiVolume(150)).toBe(16)
    expect(soundtrackApiVolumeToUiPercent(99)).toBe(100)
  })
})
