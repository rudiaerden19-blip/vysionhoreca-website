import {
  KASSA_LAB_PANEL_DIAGONAL_CM,
  kassaLabDefaultPanelWidthCmForFrame,
  kassaLabPhysicalBoxCm,
  kassaLabViewableWidthCmFromDiagonal,
  labIframeScaleForPhysicalBox,
} from '@/lib/kassa-layout-lab-physical'
import { KASSA_LAYOUT_LAB_FRAMES } from '@/lib/kassa-layout-preview'

describe('kassa-layout-lab-physical', () => {
  const frame15 = KASSA_LAYOUT_LAB_FRAMES.find((f) => f.id === '15')!
  const frame17 = KASSA_LAYOUT_LAB_FRAMES.find((f) => f.id === '17')!
  const frame21 = KASSA_LAYOUT_LAB_FRAMES.find((f) => f.id === '21')!

  it('diagonalen 39 / 43 / 54,6 cm (zaak)', () => {
    expect(KASSA_LAB_PANEL_DIAGONAL_CM['15']).toBe(39)
    expect(KASSA_LAB_PANEL_DIAGONAL_CM['17']).toBe(43)
    expect(KASSA_LAB_PANEL_DIAGONAL_CM['21']).toBe(54.6)
  })

  it('15″ breedte uit 39 cm diagonaal (1366×768)', () => {
    const w = kassaLabViewableWidthCmFromDiagonal(39, 1366, 768)
    expect(w).toBeCloseTo(34, 0)
    const box = kassaLabPhysicalBoxCm(frame15)
    expect(box.widthCm).toBeCloseTo(34, 0)
  })

  it('17″ vierkant breedte uit 43 cm diagonaal', () => {
    const box = kassaLabPhysicalBoxCm(frame17)
    expect(box.widthCm).toBeCloseTo(33.6, 1)
    expect(box.heightCm).toBeCloseTo(33.6 * (1024 / 1280), 1)
  })

  it('21″ breedte uit 54,6 cm diagonaal (1920×1080)', () => {
    const box = kassaLabPhysicalBoxCm(frame21)
    expect(box.widthCm).toBeCloseTo(47.5, 0)
    expect(kassaLabDefaultPanelWidthCmForFrame(frame21)).toBeCloseTo(47.5, 0)
  })

  it('schaal = doosbreedte / cssW', () => {
    const px = 345
    expect(labIframeScaleForPhysicalBox(px, 1366)).toBeCloseTo(px / 1366, 5)
  })

  it('override cm per frame', () => {
    const box = kassaLabPhysicalBoxCm(frame15, { '15': 34.5 })
    expect(box.widthCm).toBe(34.5)
  })
})
