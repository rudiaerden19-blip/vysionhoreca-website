import { parseSpotifyPlaylistId } from '@/lib/spotify-playlist-url'
import { fetchSpotifyPlaylistTracks, SpotifyApiError, SpotifyConfigError } from '@/lib/spotify-web-api'
import { matchSpotifyTrackToSoundtrack } from '@/lib/soundtrack-match-spotify-track'
import type { SoundtrackTrackRow } from '@/lib/soundtrack/soundtrack-server'

export type SpotifyImportTrackResult = {
  spotifyTrackId: string
  spotifyName: string
  spotifyArtists: string[]
  matched: SoundtrackTrackRow | null
}

export type SpotifyImportResult = {
  playlistName: string
  spotifyPlaylistId: string
  total: number
  matchedCount: number
  tracks: SpotifyImportTrackResult[]
  soundtrackTracks: SoundtrackTrackRow[]
}

export class VysionMusicSpotifyImportError extends Error {
  status: number
  code?: string
  constructor(message: string, status = 400, code?: string) {
    super(message)
    this.name = 'VysionMusicSpotifyImportError'
    this.status = status
    this.code = code
  }
}

const IMPORT_CONCURRENCY = 4

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i], i)
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  await Promise.all(workers)
  return out
}

export async function importSpotifyPlaylistForSoundtrack(
  playlistUrlOrId: string,
  opts?: { maxSpotifyTracks?: number },
): Promise<SpotifyImportResult> {
  const playlistId = parseSpotifyPlaylistId(playlistUrlOrId)
  if (!playlistId) {
    throw new VysionMusicSpotifyImportError('Invalid Spotify playlist URL', 400, 'invalid_spotify_url')
  }

  let spotifyData: Awaited<ReturnType<typeof fetchSpotifyPlaylistTracks>>
  try {
    spotifyData = await fetchSpotifyPlaylistTracks(
      playlistId,
      opts?.maxSpotifyTracks ?? 200,
    )
  } catch (e) {
    if (e instanceof SpotifyConfigError) {
      throw new VysionMusicSpotifyImportError(e.message, 503, 'spotify_not_configured')
    }
    if (e instanceof SpotifyApiError) {
      throw new VysionMusicSpotifyImportError(e.message, e.status, 'spotify_api_error')
    }
    throw e
  }

  if (spotifyData.tracks.length === 0) {
    throw new VysionMusicSpotifyImportError('Spotify playlist has no tracks', 400, 'empty_playlist')
  }

  const trackResults = await mapPool(
    spotifyData.tracks,
    IMPORT_CONCURRENCY,
    async (row) => {
      const matched = await matchSpotifyTrackToSoundtrack(row.name, row.artists)
      return {
        spotifyTrackId: row.spotifyTrackId,
        spotifyName: row.name,
        spotifyArtists: row.artists,
        matched,
      } satisfies SpotifyImportTrackResult
    },
  )

  const soundtrackTracks: SoundtrackTrackRow[] = []
  const seen = new Set<string>()
  for (const r of trackResults) {
    if (!r.matched || seen.has(r.matched.id)) continue
    seen.add(r.matched.id)
    soundtrackTracks.push(r.matched)
  }

  return {
    playlistName: spotifyData.playlistName,
    spotifyPlaylistId: playlistId,
    total: trackResults.length,
    matchedCount: soundtrackTracks.length,
    tracks: trackResults,
    soundtrackTracks,
  }
}
