/** Vindt de inhoud van een foto zonder zwarte/letterbox-randen. */

export type ImageContentBounds = {
  left: number
  top: number
  width: number
  height: number
}

const BLACK_MAX = 28

function isLetterboxPixel(r: number, g: number, b: number, a: number): boolean {
  if (a < 12) return true
  return r <= BLACK_MAX && g <= BLACK_MAX && b <= BLACK_MAX
}

export function contentBoundsFromRgba(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): ImageContentBounds {
  if (width < 1 || height < 1) {
    return { left: 0, top: 0, width: Math.max(width, 1), height: Math.max(height, 1) }
  }

  const minHits = Math.max(1, Math.floor(width * 0.012))
  let top = 0
  let bottom = height - 1
  let left = 0
  let right = width - 1

  outerTop: for (let y = 0; y < height; y++) {
    let hits = 0
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      if (!isLetterboxPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) {
        hits++
        if (hits >= minHits) {
          top = y
          break outerTop
        }
      }
    }
  }

  outerBottom: for (let y = height - 1; y >= 0; y--) {
    let hits = 0
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      if (!isLetterboxPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) {
        hits++
        if (hits >= minHits) {
          bottom = y
          break outerBottom
        }
      }
    }
  }

  const colHits = Math.max(1, Math.floor(height * 0.012))
  outerLeft: for (let x = 0; x < width; x++) {
    let hits = 0
    for (let y = top; y <= bottom; y++) {
      const i = (y * width + x) * 4
      if (!isLetterboxPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) {
        hits++
        if (hits >= colHits) {
          left = x
          break outerLeft
        }
      }
    }
  }

  outerRight: for (let x = width - 1; x >= 0; x--) {
    let hits = 0
    for (let y = top; y <= bottom; y++) {
      const i = (y * width + x) * 4
      if (!isLetterboxPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) {
        hits++
        if (hits >= colHits) {
          right = x
          break outerRight
        }
      }
    }
  }

  const w = Math.max(1, right - left + 1)
  const h = Math.max(1, bottom - top + 1)
  const almostFull = w >= width * 0.96 && h >= height * 0.96
  if (almostFull) {
    return { left: 0, top: 0, width, height }
  }
  return { left, top, width: w, height: h }
}
