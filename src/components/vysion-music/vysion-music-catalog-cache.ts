export type VysionMusicCatalogTrack = {
  id: string
  name: string
  artist: string
  durationMs: number
  imageUrl: string | null
}

export type VysionMusicLibraryItem = {
  id: string
  name: string
  sourceTypename: string
  snapshot: string | null
  sourceKind: 'playlist' | 'soundtrack' | 'schedule' | 'unknown'
  imageUrl: string | null
}

const playlistsByTenant = new Map<string, VysionMusicLibraryItem[]>()
const tracksByKey = new Map<string, VysionMusicCatalogTrack[]>()

function tracksCacheKey(tenant: string, sourceId: string): string {
  return `${tenant}:${sourceId.trim()}`
}

export function getCachedPlaylists(tenant: string): VysionMusicLibraryItem[] | null {
  return playlistsByTenant.get(tenant) ?? null
}

export function setCachedPlaylists(tenant: string, items: VysionMusicLibraryItem[]): void {
  playlistsByTenant.set(tenant, items)
}

export function getCachedPlaylistTracks(
  tenant: string,
  sourceId: string,
): VysionMusicCatalogTrack[] | null {
  return tracksByKey.get(tracksCacheKey(tenant, sourceId)) ?? null
}

export function setCachedPlaylistTracks(
  tenant: string,
  sourceId: string,
  tracks: VysionMusicCatalogTrack[],
): void {
  tracksByKey.set(tracksCacheKey(tenant, sourceId), tracks)
}

export function clearCachedPlaylistTracks(tenant: string, sourceId: string): void {
  const key = tracksCacheKey(tenant, sourceId)
  tracksByKey.delete(key)
  prefetchedTrackSources.delete(key)
}

const prefetchedTrackSources = new Set<string>()

export function markTracksPrefetched(tenant: string, sourceId: string): boolean {
  const key = tracksCacheKey(tenant, sourceId)
  if (prefetchedTrackSources.has(key)) return false
  prefetchedTrackSources.add(key)
  return true
}
