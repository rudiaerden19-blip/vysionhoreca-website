/** Maximale px-grootte voor object-contain in het help-paneel (hele video zichtbaar, geen crop). */
export function kassaHelpVideoContainSize(
  containerWidth: number,
  containerHeight: number,
  videoWidth: number,
  videoHeight: number,
): { width: number; height: number } {
  if (containerWidth <= 0 || containerHeight <= 0 || videoWidth <= 0 || videoHeight <= 0) {
    return { width: 0, height: 0 }
  }
  const ar = videoWidth / videoHeight
  let width = containerWidth
  let height = width / ar
  if (height > containerHeight) {
    height = containerHeight
    width = height * ar
  }
  return { width, height }
}
