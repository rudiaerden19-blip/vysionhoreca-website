import {
  kassaLabPhysicalBoxCm,
  labIframeScaleForPhysicalBox,
} from '@/lib/kassa-layout-lab-physical'
import { KASSA_LAYOUT_LAB_FRAMES } from '@/lib/kassa-layout-preview'

describe('kassa-layout-lab-physical', () => {
  const frame15 = KASSA_LAYOUT_LAB_FRAMES.find((f) => f.id === '15')!

  it('15″ default 34,5 cm breed', () => {
    const box = kassaLabPhysicalBoxCm(frame15)
    expect(box.widthCm).toBe(34.5)
    expect(box.heightCm).toBeCloseTo(34.5 * (768 / 1366), 2)
  })

  it('schaal = doosbreedte / cssW', () => {
    const px = 345
    const s = labIframeScaleForPhysicalBox(px, 1366)
    expect(s).toBeCloseTo(px / 1366, 5)
  })

  it('override cm per frame', () => {
    const box = kassaLabPhysicalBoxCm(frame15, { '15': 33 })
    expect(box.widthCm).toBe(33)
  })
})
