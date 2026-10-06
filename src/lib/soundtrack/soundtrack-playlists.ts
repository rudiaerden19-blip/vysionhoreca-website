import { soundtrackAlbumArtUrl } from '@/lib/soundtrack/soundtrack-album-art'
import {
  SoundtrackApiError,
  soundtrackGraphql,
} from '@/lib/soundtrack/soundtrack-server'

export type SoundtrackLibrarySourceKind = 'playlist' | 'soundtrack' | 'schedule' | 'unknown'

export type SoundtrackLibraryPlaylist = {
  id: string
  name: string
  sourceKind: SoundtrackLibrarySourceKind
  imageUrl: string | null
}

type SoundtrackGql = typeof soundtrackGraphql

const ZONE_ACCOUNT_QUERY = `query($id: ID!) {
  soundZone(id: $id) {
    account {
      id
      musicLibrary { id }
    }
  }
}`

const LIBRARY_DISPLAY_IMAGE = `
  display {
    image {
      sizes { thumbnail teaser hero }
      size
    }
  }
`

/** Officieel schema: musicLibrary.playlists + schedules + ids (volgorde). */
const MUSIC_LIBRARY_QUERY = `query($id: ID!) {
  musicLibrary(id: $id) {
    revision
    ids
    playlists(first: 200) {
      edges {
        node {
          id
          name
          composerType
          ${LIBRARY_DISPLAY_IMAGE}
        }
      }
    }
    schedules(first: 200) {
      edges {
        node {
          id
          name
          ${LIBRARY_DISPLAY_IMAGE}
        }
      }
    }
  }
}`

type LibraryArtworkNode = {
  id?: string
  name?: string | null
  composerType?: string | null
  display?: {
    image?: {
      size?: string | null
      sizes?: { thumbnail?: string | null; teaser?: string | null; hero?: string | null } | null
    } | null
  } | null
}

/** Soundtrack bibliotheek-lijst: thumbnail uit `display.image` (desktop-player). */
export function soundtrackLibraryListImageUrl(node: LibraryArtworkNode): string | null {
  const sizes = node.display?.image?.sizes
  if (sizes) {
    for (const key of ['thumbnail', 'teaser', 'hero'] as const) {
      const raw = sizes[key]?.trim()
      if (raw) return soundtrackAlbumArtUrl(raw)
    }
  }
  const single = node.display?.image?.size?.trim()
  if (single) return soundtrackAlbumArtUrl(single)
  return null
}

function playlistSourceKind(node: LibraryArtworkNode): SoundtrackLibrarySourceKind {
  const ct = (node.composerType ?? '').trim().toLowerCase()
  if (!ct || ct === 'manual') return 'playlist'
  return 'soundtrack'
}

function mapPlaylistNode(node: LibraryArtworkNode): SoundtrackLibraryPlaylist | null {
  const id = node.id?.trim()
  const name = node.name?.trim()
  if (!id || !name) return null
  return {
    id,
    name,
    imageUrl: soundtrackLibraryListImageUrl(node),
    sourceKind: playlistSourceKind(node),
  }
}

function mapScheduleNode(node: LibraryArtworkNode): SoundtrackLibraryPlaylist | null {
  const id = node.id?.trim()
  const name = node.name?.trim()
  if (!id || !name) return null
  return {
    id,
    name,
    imageUrl: soundtrackLibraryListImageUrl(node),
    sourceKind: 'schedule',
  }
}

/** Soundtrack desktop-volgorde via `musicLibrary.ids`. */
export function orderLibraryRowsByIds(
  ids: string[] | null | undefined,
  byId: Map<string, SoundtrackLibraryPlaylist>,
): SoundtrackLibraryPlaylist[] {
  const out: SoundtrackLibraryPlaylist[] = []
  const seen = new Set<string>()
  for (const raw of ids ?? []) {
    const id = raw?.trim()
    if (!id || seen.has(id)) continue
    const row = byId.get(id)
    if (!row) continue
    seen.add(id)
    out.push(row)
  }
  for (const row of byId.values()) {
    if (!seen.has(row.id)) out.push(row)
  }
  return out
}

/** Soundtrack desktop-volgorde behouden (geen alfabetische sort). */
export function dedupeLibraryRowsPreserveOrder(
  rows: SoundtrackLibraryPlaylist[],
): SoundtrackLibraryPlaylist[] {
  const seen = new Set<string>()
  const out: SoundtrackLibraryPlaylist[] = []
  for (const row of rows) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    out.push(row)
  }
  return out
}

async function fetchMusicLibraryRows(
  libraryId: string,
  gql: SoundtrackGql,
): Promise<SoundtrackLibraryPlaylist[]> {
  const data = await gql<{
    musicLibrary: {
      ids?: string[] | null
      playlists?: { edges: { node: LibraryArtworkNode }[] } | null
      schedules?: { edges: { node: LibraryArtworkNode }[] } | null
    } | null
  }>(MUSIC_LIBRARY_QUERY, { id: libraryId.trim() })

  const lib = data.musicLibrary
  if (!lib) throw new SoundtrackApiError('musicLibrary not found')

  const byId = new Map<string, SoundtrackLibraryPlaylist>()
  for (const edge of lib.playlists?.edges ?? []) {
    const row = mapPlaylistNode(edge.node)
    if (row) byId.set(row.id, row)
  }
  for (const edge of lib.schedules?.edges ?? []) {
    const row = mapScheduleNode(edge.node)
    if (row) byId.set(row.id, row)
  }

  return dedupeLibraryRowsPreserveOrder(orderLibraryRowsByIds(lib.ids, byId))
}

async function fetchAccountLibrary(
  zoneId: string,
  gql: SoundtrackGql,
): Promise<{ playlists: SoundtrackLibraryPlaylist[] }> {
  const data = await gql<{
    soundZone: {
      account: {
        id: string
        musicLibrary: { id: string } | null
      } | null
    } | null
  }>(ZONE_ACCOUNT_QUERY, { id: zoneId })

  const library = data.soundZone?.account?.musicLibrary
  if (!library?.id) {
    throw new SoundtrackApiError('Soundtrack zone has no music library')
  }

  const playlists = await fetchMusicLibraryRows(library.id, gql)
  return { playlists }
}

export async function listSoundtrackLibraryPlaylists(
  zoneId: string,
): Promise<SoundtrackLibraryPlaylist[]> {
  const id = zoneId.trim()
  if (!id) throw new SoundtrackApiError('sound zone id required', 400)
  const library = await fetchAccountLibrary(id, soundtrackGraphql)
  return library.playlists
}
