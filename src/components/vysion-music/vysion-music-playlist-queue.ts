/** Max tracks per soundZoneQueueTracks voor playlist-doorloop (vanaf geklikte rij). */
export const VYSION_MUSIC_PLAYLIST_QUEUE_MAX = 80

export function buildPlaylistQueueTrackIds(
  playlistTracks: readonly { id: string }[],
  trackIndex: number,
  clickedTrackId: string,
): string[] {
  const fromHere = playlistTracks
    .slice(Math.max(0, trackIndex))
    .map((t) => t.id.trim())
    .filter(Boolean)
  if (fromHere.length === 0) return [clickedTrackId.trim()].filter(Boolean)
  return fromHere.slice(0, VYSION_MUSIC_PLAYLIST_QUEUE_MAX)
}
