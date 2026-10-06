import { soundtrackAlbumArtUrl } from '@/lib/soundtrack/soundtrack-album-art'
import { trackArtistMatchesQuery } from '@/lib/soundtrack/soundtrack-search-artist-filter'

export type SoundtrackTrackRow = {
  id: string
  name: string
  artist: string
  durationMs: number
  imageUrl: string | null
  imageWidth: number | null
  imageHeight: number | null
}

/** GraphQL Track-velden volgens Soundtrack API v2 (niet `name` / `duration` / `album.image.url`). */
export const SOUNDTRACK_TRACK_GRAPHQL_FIELDS = `
  id
  title
  durationMs
  artists { name }
  album {
    display {
      image {
        sizes { thumbnail teaser hero }
      }
    }
  }
`

export type SoundtrackTrackGraphNode = {
  id?: string
  title?: string
  /** Oud/incorrect — alleen fallback bij tests. */
  name?: string
  durationMs?: number
  duration?: number
  artists?: { name?: string }[]
  album?: {
    display?: {
      image?: {
        sizes?: {
          thumbnail?: string | null
          teaser?: string | null
          hero?: string | null
        } | null
      } | null
    } | null
    image?: { url?: string; width?: number; height?: number } | null
  } | null
}

export function soundtrackTrackArtUrlFromAlbum(
  album: SoundtrackTrackGraphNode['album'],
): string | null {
  const sizes = album?.display?.image?.sizes
  if (sizes) {
    for (const key of ['teaser', 'hero', 'thumbnail'] as const) {
      const raw = sizes[key]?.trim()
      if (raw) return soundtrackAlbumArtUrl(raw)
    }
  }
  const legacyUrl = album?.image?.url?.trim()
  if (legacyUrl) return soundtrackAlbumArtUrl(legacyUrl)
  return null
}

export function mapSoundtrackTrackRow(
  track: SoundtrackTrackGraphNode | null | undefined,
  artistQuery?: string,
): SoundtrackTrackRow | null {
  const id = track?.id?.trim()
  const title = (track?.title ?? track?.name ?? '').trim()
  if (!track || !id || !title) return null

  const legacyImg = track.album?.image
  const imageWidth =
    typeof legacyImg?.width === 'number' && legacyImg.width > 0 ? legacyImg.width : null
  const imageHeight =
    typeof legacyImg?.height === 'number' && legacyImg.height > 0 ? legacyImg.height : null
  const imageUrl = soundtrackTrackArtUrlFromAlbum(track.album)

  const artistNames =
    track.artists?.map((a) => a.name?.trim()).filter((n): n is string => Boolean(n)) ?? []
  let artist = artistNames[0] || '—'
  if (artistQuery) {
    const matched = artistNames.find((n) => trackArtistMatchesQuery(n, artistQuery))
    if (matched) artist = matched
  }

  let durationMs = 0
  if (typeof track.durationMs === 'number' && track.durationMs > 0) {
    durationMs = track.durationMs
  } else if (typeof track.duration === 'number' && track.duration > 0) {
    durationMs = track.duration
  }

  return {
    id,
    name: title,
    artist,
    durationMs,
    imageUrl,
    imageWidth,
    imageHeight,
  }
}
