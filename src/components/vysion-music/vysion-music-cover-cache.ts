type CoverTrackRef = {
  id: string
  name: string
  artist: string
  imageUrl: string | null
}

function metaKey(name: string, artist: string): string {
  return `${name.trim().toLowerCase()}|${artist.trim().toLowerCase()}`
}

export function rememberVysionMusicCoverArt(
  cache: Map<string, string>,
  track: CoverTrackRef | null | undefined,
): void {
  const url = track?.imageUrl?.trim()
  if (!track?.id || !url) return
  cache.set(track.id, url)
  cache.set(metaKey(track.name, track.artist), url)
}

export function lookupVysionMusicCoverArt(
  cache: Map<string, string>,
  track: CoverTrackRef | null | undefined,
): string | null {
  if (!track) return null
  const direct = track.imageUrl?.trim()
  if (direct) return direct
  const byId = cache.get(track.id)
  if (byId) return byId
  return cache.get(metaKey(track.name, track.artist)) ?? null
}
