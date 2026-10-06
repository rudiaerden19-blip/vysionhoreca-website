import { soundtrackAlbumArtUrl } from '@/lib/soundtrack/soundtrack-album-art'
import {
  mapSoundtrackTrackRow,
  SOUNDTRACK_TRACK_GRAPHQL_FIELDS,
  type SoundtrackTrackGraphNode,
} from '@/lib/soundtrack/soundtrack-track-map'
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

const LIBRARY_ARTWORK_FIELDS = `
  artwork { url sizes { thumbnail teaser hero } }
  display { image { sizes { thumbnail teaser hero } } }
`

const LIBRARY_CHILDREN_QUERY = `query($id: ID!) {
  musicLibrary(id: $id) {
    id
    children(first: 200) {
      edges {
        node {
          __typename
          ... on Playlist { id name ${LIBRARY_ARTWORK_FIELDS} }
          ... on Soundtrack { id name ${LIBRARY_ARTWORK_FIELDS} }
          ... on Schedule { id name ${LIBRARY_ARTWORK_FIELDS} }
        }
      }
    }
  }
}`

const LIBRARY_CHILDREN_MINIMAL_QUERY = `query($id: ID!) {
  musicLibrary(id: $id) {
    id
    children(first: 200) {
      edges {
        node {
          __typename
          ... on Playlist { id name artwork { url } }
          ... on Soundtrack { id name artwork { url } }
          ... on Schedule { id name }
        }
      }
    }
  }
}`

const LIBRARY_SPLIT_QUERY = `query($id: ID!) {
  musicLibrary(id: $id) {
    id
    playlists(first: 200) {
      edges { node { id name ${LIBRARY_ARTWORK_FIELDS} } }
    }
    soundtracks(first: 200) {
      edges { node { id name ${LIBRARY_ARTWORK_FIELDS} } }
    }
  }
}`

const LIBRARY_PLAYLISTS_ONLY_QUERY = `query($id: ID!) {
  musicLibrary(id: $id) {
    id
    playlists(first: 200) {
      edges { node { id name ${LIBRARY_ARTWORK_FIELDS} } }
    }
  }
}`

function kindFromTypename(typename: string | undefined): SoundtrackLibrarySourceKind {
  switch (typename) {
    case 'Playlist':
      return 'playlist'
    case 'Soundtrack':
      return 'soundtrack'
    case 'Schedule':
      return 'schedule'
    default:
      return 'unknown'
  }
}

type LibraryArtworkNode = {
  __typename?: string
  id?: string
  name?: string | null
  artwork?: {
    url?: string | null
    sizes?: { thumbnail?: string | null; teaser?: string | null; hero?: string | null } | null
  } | null
  display?: {
    image?: {
      sizes?: { thumbnail?: string | null; teaser?: string | null; hero?: string | null } | null
    } | null
  } | null
}

function libraryItemImageUrl(node: LibraryArtworkNode): string | null {
  const sizeSources = [node.artwork?.sizes, node.display?.image?.sizes]
  for (const sizes of sizeSources) {
    if (!sizes) continue
    for (const key of ['teaser', 'hero', 'thumbnail'] as const) {
      const raw = sizes[key]?.trim()
      if (raw) return soundtrackAlbumArtUrl(raw)
    }
  }
  const direct = node.artwork?.url?.trim()
  if (direct) return soundtrackAlbumArtUrl(direct)
  return null
}

function mapLibraryNodes(
  edges: { node: LibraryArtworkNode }[] | null | undefined,
  defaultKind: SoundtrackLibrarySourceKind = 'unknown',
): SoundtrackLibraryPlaylist[] {
  const rows: SoundtrackLibraryPlaylist[] = []
  for (const edge of edges ?? []) {
    const id = edge.node?.id?.trim()
    const name = edge.node?.name?.trim()
    if (!id || !name) continue
    const imageUrl = libraryItemImageUrl(edge.node)
    rows.push({
      id,
      name,
      imageUrl,
      sourceKind:
        defaultKind === 'unknown'
          ? kindFromTypename(edge.node?.__typename)
          : defaultKind,
    })
  }
  return rows
}

function dedupeLibraryRows(rows: SoundtrackLibraryPlaylist[]): SoundtrackLibraryPlaylist[] {
  const seen = new Set<string>()
  const out: SoundtrackLibraryPlaylist[] = []
  for (const row of rows) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    out.push(row)
  }
  out.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  return out
}

function isUnknownFieldError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e)
  return /Cannot query field|Unknown field|Unknown type/i.test(msg)
}

async function playlistCoverFromFirstTrack(
  playlistId: string,
  gql: SoundtrackGql,
): Promise<string | null> {
  const data = await gql<{
    playlist: {
      tracks: { edges: { node: SoundtrackTrackGraphNode }[] }
    } | null
  }>(
    `query($id: ID!) {
      playlist(id: $id) {
        tracks(first: 1) {
          edges { node { ${SOUNDTRACK_TRACK_GRAPHQL_FIELDS} } }
        }
      }
    }`,
    { id: playlistId },
  )
  const track = data.playlist?.tracks?.edges?.[0]?.node
  return track ? mapSoundtrackTrackRow(track)?.imageUrl ?? null : null
}

async function enrichLibraryCovers(
  rows: SoundtrackLibraryPlaylist[],
  gql: SoundtrackGql,
): Promise<SoundtrackLibraryPlaylist[]> {
  const missing = rows.filter((r) => !r.imageUrl)
  if (missing.length === 0) return rows

  const coverById = new Map<string, string>()
  await Promise.all(
    missing.map(async (row) => {
      try {
        if (row.sourceKind === 'soundtrack') {
          const data = await gql<{
            soundtrack: LibraryArtworkNode | null
          }>(
            `query($id: ID!) { soundtrack(id: $id) { ${LIBRARY_ARTWORK_FIELDS} } }`,
            { id: row.id },
          )
          const url = data.soundtrack ? libraryItemImageUrl(data.soundtrack) : null
          if (url) coverById.set(row.id, url)
          return
        }
        const fromTrack = await playlistCoverFromFirstTrack(row.id, gql)
        if (fromTrack) coverById.set(row.id, fromTrack)
      } catch {
        /* skip */
      }
    }),
  )

  if (coverById.size === 0) return rows
  return rows.map((r) => (coverById.has(r.id) ? { ...r, imageUrl: coverById.get(r.id)! } : r))
}

async function fetchMusicLibraryRows(
  libraryId: string,
  gql: SoundtrackGql,
): Promise<SoundtrackLibraryPlaylist[]> {
  const id = libraryId.trim()

  const runChildren = async (query: string) => {
    const data = await gql<{
      musicLibrary: { children: { edges: { node: LibraryArtworkNode }[] } } | null
    }>(query, { id })
    return mapLibraryNodes(data.musicLibrary?.children?.edges)
  }

  try {
    const rows = await runChildren(LIBRARY_CHILDREN_QUERY)
    if (rows.length > 0) return enrichLibraryCovers(dedupeLibraryRows(rows), gql)
  } catch (e) {
    if (!isUnknownFieldError(e)) throw e
    try {
      const rows = await runChildren(LIBRARY_CHILDREN_MINIMAL_QUERY)
      if (rows.length > 0) return enrichLibraryCovers(dedupeLibraryRows(rows), gql)
    } catch (e2) {
      if (!isUnknownFieldError(e2)) throw e2
    }
  }

  try {
    const data = await gql<{
      musicLibrary: {
        playlists: { edges: { node: LibraryArtworkNode }[] }
        soundtracks: { edges: { node: LibraryArtworkNode }[] }
      } | null
    }>(LIBRARY_SPLIT_QUERY, { id })
    const lib = data.musicLibrary
    const rows = [
      ...mapLibraryNodes(lib?.playlists?.edges, 'playlist'),
      ...mapLibraryNodes(lib?.soundtracks?.edges, 'soundtrack'),
    ]
    if (rows.length > 0) return enrichLibraryCovers(dedupeLibraryRows(rows), gql)
  } catch (e) {
    if (!isUnknownFieldError(e)) throw e
  }

  const data = await gql<{
    musicLibrary: { playlists: { edges: { node: LibraryArtworkNode }[] } } | null
  }>(LIBRARY_PLAYLISTS_ONLY_QUERY, { id })
  return enrichLibraryCovers(
    dedupeLibraryRows(mapLibraryNodes(data.musicLibrary?.playlists?.edges, 'playlist')),
    gql,
  )
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
