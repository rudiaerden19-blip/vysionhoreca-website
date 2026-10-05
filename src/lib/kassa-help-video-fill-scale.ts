/** Schaal breed schermvideo-opname zodat de hoogte van het paneel gevuld wordt (zijden mogen croppen). */
export function kassaHelpVideoFillScale(
  containerWidth: number,
  containerHeight: number,
  videoWidth: number,
  videoHeight: number,
  maxScale = 2.75,
): number {
  if (containerWidth <= 0 || containerHeight <= 0 || videoWidth <= 0 || videoHeight <= 0) {
    return 1
  }
  const baseHeight = containerWidth * (videoHeight / videoWidth)
  if (baseHeight <= 0) return 1
  const scale = containerHeight / baseHeight
  return Math.min(Math.max(scale, 1), maxScale)
}
