import {
  KASSA_LAB_FIXED_BOX_CM,
  kassaLabPhysicalBoxCm,
  labIframeScaleForPhysicalBox,
} from '@/lib/kassa-layout-lab-physical'
import { KASSA_LAYOUT_LAB_FRAMES } from '@/lib/kassa-layout-preview'

describe('kassa-layout-lab-physical', () => {
  it('vaste hardware cm 15 / 17 / 21', () => {
    expect(KASSA_LAB_FIXED_BOX_CM['15']).toEqual({ widthCm: 34.5, heightCm: 19.4 })
    expect(KASSA_LAB_FIXED_BOX_CM['17']).toEqual({ widthCm: 33.6, heightCm: 26.9 })
    expect(KASSA_LAB_FIXED_BOX_CM['21']).toEqual({ widthCm: 47.5, heightCm: 26.7 })
    expect(KASSA_LAB_FIXED_BOX_CM['ipad-pro-13']).toEqual({
      widthCm: 26.06,
      heightCm: 19.49,
    })
  })

  it('frames gebruiken vaste box', () => {
    for (const id of ['15', '17', '21', 'ipad-pro-13'] as const) {
      const frame = KASSA_LAYOUT_LAB_FRAMES.find((f) => f.id === id)!
      expect(kassaLabPhysicalBoxCm(frame)).toEqual(KASSA_LAB_FIXED_BOX_CM[id])
    }
  })

  it('iframe schaal vult kader uniform', () => {
    const s = labIframeScaleForPhysicalBox(1000, 800, 1920, 1080)
    expect(s).toBeCloseTo(1000 / 1920, 5)
    expect(1920 * s).toBeCloseTo(1000, 2)
    expect(1080 * s).toBeLessThanOrEqual(800 + 0.01)
  })
})
