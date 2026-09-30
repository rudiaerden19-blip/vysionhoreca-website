/** Album-URL ongewijzigd — soundcdn WxH→vierkant levert vaak center-crop (gezicht weg). */
export function soundtrackAlbumArtUrl(raw: string | null | undefined): string | null {
  const url = raw?.trim()
  return url || null
}
