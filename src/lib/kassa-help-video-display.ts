/** Max CSS-grootte zodat de browser de video niet zachter upscaled dan de bron (retina). */
export function kassaHelpVideoMaxCssSize(
  videoWidth: number,
  videoHeight: number,
  devicePixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
): { maxWidthPx: number; maxHeightPx: number } {
  const dpr = Math.max(1, devicePixelRatio)
  return {
    maxWidthPx: Math.max(1, Math.floor(videoWidth / dpr)),
    maxHeightPx: Math.max(1, Math.floor(videoHeight / dpr)),
  }
}
