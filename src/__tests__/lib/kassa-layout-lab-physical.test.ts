import {
  KASSA_LAB_FIXED_BOX_CM,
  KASSA_LAB_FIXED_DIAGONAL_CM,
  kassaLabPhysicalBoxCm,
  labIframeScaleForPhysicalBox,
} from '@/lib/kassa-layout-lab-physical'
import { KASSA_LAYOUT_LAB_FRAMES } from '@/lib/kassa-layout-preview'

describe('kassa-layout-lab-physical', () => {
  const frame15 = KASSA_LAYOUT_LAB_FRAMES.find((f) => f.id === '15')!
  const frame17 = KASSA_LAYOUT_LAB_FRAMES.find((f) => f.id === '17')!
  const frame21 = KASSA_LAYOUT_LAB_FRAMES.find((f) => f.id === '21')!

  it('vaste diagonalen 21/15/17', () => {
    expect(KASSA_LAB_FIXED_DIAGONAL_CM).toEqual({ '21': 54.6, '15': 39, '17': 43 })
  })

  it('vaste box 15″ ≈ 34 cm breed', () => {
    expect(KASSA_LAB_FIXED_BOX_CM['15'].widthCm).toBeCloseTo(34, 0)
    expect(kassaLabPhysicalBoxCm(frame15)).toEqual(KASSA_LAB_FIXED_BOX_CM['15'])
  })

  it('vaste box 17″ vierkant', () => {
    expect(KASSA_LAB_FIXED_BOX_CM['17'].widthCm).toBeCloseTo(33.6, 1)
    expect(kassaLabPhysicalBoxCm(frame17)).toEqual(KASSA_LAB_FIXED_BOX_CM['17'])
  })

  it('vaste box 21″', () => {
    expect(KASSA_LAB_FIXED_BOX_CM['21'].widthCm).toBeCloseTo(47.5, 0)
    expect(kassaLabPhysicalBoxCm(frame21)).toEqual(KASSA_LAB_FIXED_BOX_CM['21'])
  })

  it('schaal = doosbreedte / cssW', () => {
    expect(labIframeScaleForPhysicalBox(345, 1366)).toBeCloseTo(345 / 1366, 5)
  })
})
