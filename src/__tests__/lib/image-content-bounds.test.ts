import { contentBoundsFromRgba } from '@/lib/image-content-bounds'

function fillRect(
  data: Uint8ClampedArray,
  width: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number,
  g: number,
  b: number,
) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * width + x) * 4
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = 255
    }
  }
}

describe('image-content-bounds', () => {
  it('knipt zwarte letterbox boven en onder weg', () => {
    const width = 40
    const height = 80
    const data = new Uint8ClampedArray(width * height * 4)
    fillRect(data, width, 0, 30, 40, 50, 200, 180, 90)
    const box = contentBoundsFromRgba(data, width, height)
    expect(box.top).toBeGreaterThanOrEqual(28)
    expect(box.top + box.height).toBeLessThanOrEqual(52)
    expect(box.height).toBeLessThan(30)
    expect(box.width).toBeGreaterThan(30)
  })

  it('laat een volle foto zonder randen met rust', () => {
    const width = 20
    const height = 20
    const data = new Uint8ClampedArray(width * height * 4)
    fillRect(data, width, 0, 0, 20, 20, 120, 80, 40)
    expect(contentBoundsFromRgba(data, width, height)).toEqual({
      left: 0,
      top: 0,
      width: 20,
      height: 20,
    })
  })
})
