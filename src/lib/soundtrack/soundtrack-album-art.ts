/** Album art uit Soundtrack — vaak breed banner; kies vierkante variant indien URL dat toelaat. */
export function soundtrackAlbumArtUrl(
  raw: string | null | undefined,
  dims?: { width?: number | null; height?: number | null },
): string | null {
  const url = raw?.trim()
  if (!url) return null

  const w = dims?.width ?? 0
  const h = dims?.height ?? 0
  const veryWide = w > 0 && h > 0 && w / h > 1.35

  if (!veryWide) return url

  // soundcdn: .../WxH.ext → vierkant op korte zijde (typisch album thumbnail)
  const sizeSwap = url.replace(/\/(\d{2,4})x(\d{2,4})(?=\/|[.?]|$)/i, (_, a: string, b: string) => {
    const side = Math.min(Number(a), Number(b))
    return `/${side}x${side}`
  })
  if (sizeSwap !== url) return sizeSwap

  return url
}
