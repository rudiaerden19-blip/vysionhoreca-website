/** Index in playlist-catalogus voor soundZoneAssignSource.sourceTrackIndex (0-based). */
export function sourceTrackIndexInCatalog(
  tracks: readonly { id: string }[],
  trackId: string,
): number | undefined {
  const id = trackId.trim()
  if (!id || !tracks.length) return undefined
  const idx = tracks.findIndex((t) => t.id.trim() === id)
  return idx >= 0 ? idx : undefined
}
