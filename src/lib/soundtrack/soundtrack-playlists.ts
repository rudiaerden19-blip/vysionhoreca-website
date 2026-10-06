import {
  SoundtrackApiError,
  resolveSoundZoneIdForTenant,
  soundtrackGraphql,
} from '@/lib/soundtrack/soundtrack-server'

export { resolveSoundZoneIdForTenant } from '@/lib/soundtrack/soundtrack-server'

export type SoundtrackLibrarySourceKind = 'playlist' | 'soundtrack' | 'schedule' | 'unknown'

export type SoundtrackLibraryPlaylist = {
  id: string
  name: string
  trackCount: number
  sourceKind: SoundtrackLibrarySourceKind
}

export type SoundtrackGql = <T = Record<string, unknown>>(
  query: string,
  variables?: Record<string, unknown>,
) => Promise<T>

type AccountLibrary = {
  accountId: string
  libraryId: string
  playlists: SoundtrackLibraryPlaylist[]
}

const ZONE_ACCOUNT_QUERY = `query($id: ID!) {
  soundZone(id: $id) {
    account {
      id
      musicLibrary { id }
    }
  }
}`

/** Zelfde lijst als Soundtrack-app «Playlists & Stations» — union `children`. */
const LIBRARY_CHILDREN_QUERY = `query($id: ID!) {
  musicLibrary(id: $id) {
    id
    children(first: 200) {
      edges {
        node {
          __typename
          ... on Playlist { id name }
          ... on Soundtrack { id name }
          ... on Schedule { id name }
        }
      }
    }
  }
}`

/** Fallback: manual playlists + Soundtrack-curated stations. */
const LIBRARY_SPLIT_QUERY = `query($id: ID!) {
  musicLibrary(id: $id) {
    id
    playlists(first: 200) {
      edges { node { id name } }
    }
    soundtracks(first: 200) {
      edges { node { id name } }
    }
  }
}`

const LIBRARY_PLAYLISTS_ONLY_QUERY = `query($id: ID!) {
  musicLibrary(id: $id) {
    id
    playlists(first: 200) {
      edges { node { id name } }
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

function mapLibraryNodes(
  edges:
    | {
        node: {
          __typename?: string
          id?: string
          name?: string | null
        }
      }[]
    | null
    | undefined,
  defaultKind: SoundtrackLibrarySourceKind = 'unknown',
): SoundtrackLibraryPlaylist[] {
  const rows: SoundtrackLibraryPlaylist[] = []
  for (const edge of edges ?? []) {
    const id = edge.node?.id?.trim()
    const name = edge.node?.name?.trim()
    if (!id || !name) continue
    rows.push({
      id,
      name,
      trackCount: 0,
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

async function fetchMusicLibraryRows(
  libraryId: string,
  gql: SoundtrackGql,
): Promise<SoundtrackLibraryPlaylist[]> {
  const id = libraryId.trim()

  try {
    const data = await gql<{
      musicLibrary: {
        children: {
          edges: {
            node: { __typename?: string; id?: string; name?: string | null }
          }[]
        }
      } | null
    }>(LIBRARY_CHILDREN_QUERY, { id })
    const rows = mapLibraryNodes(data.musicLibrary?.children?.edges)
    if (rows.length > 0) return dedupeLibraryRows(rows)
  } catch (e) {
    if (!isUnknownFieldError(e)) throw e
  }

  try {
    const data = await gql<{
      musicLibrary: {
        playlists: { edges: { node: { id?: string; name?: string | null } }[] }
        soundtracks: { edges: { node: { id?: string; name?: string | null } }[] }
      } | null
    }>(LIBRARY_SPLIT_QUERY, { id })
    const lib = data.musicLibrary
    const rows = [
      ...mapLibraryNodes(lib?.playlists?.edges, 'playlist'),
      ...mapLibraryNodes(lib?.soundtracks?.edges, 'soundtrack'),
    ]
    if (rows.length > 0) return dedupeLibraryRows(rows)
  } catch (e) {
    if (!isUnknownFieldError(e)) throw e
  }

  const data = await gql<{
    musicLibrary: {
      playlists: { edges: { node: { id?: string; name?: string | null } }[] }
    } | null
  }>(LIBRARY_PLAYLISTS_ONLY_QUERY, { id })
  return dedupeLibraryRows(mapLibraryNodes(data.musicLibrary?.playlists?.edges, 'playlist'))
}

async function fetchAccountLibrary(zoneId: string, gql: SoundtrackGql): Promise<AccountLibrary> {
  const data = await gql<{
    soundZone: {
      account: {
        id: string
        musicLibrary: { id: string } | null
      } | null
    } | null
  }>(ZONE_ACCOUNT_QUERY, { id: zoneId })

  const account = data.soundZone?.account
  const library = account?.musicLibrary
  if (!account?.id || !library?.id) {
    throw new SoundtrackApiError('Soundtrack zone has no music library')
  }

  const playlists = await fetchMusicLibraryRows(library.id, gql)
  return {
    accountId: account.id,
    libraryId: library.id,
    playlists,
  }
}

export async function listSoundtrackLibraryPlaylists(
  zoneId: string,
  gql: SoundtrackGql = soundtrackGraphql,
): Promise<SoundtrackLibraryPlaylist[]> {
  const id = zoneId.trim()
  if (!id) throw new SoundtrackApiError('sound zone id required', 400)
  const library = await fetchAccountLibrary(id, gql)
  return library.playlists
}

/** Soundtrack: `createManualPlaylist` en daarna `addToMusicLibrary`. */
export async function createSoundtrackLibraryPlaylist(
  zoneId: string,
  name: string,
  gql: SoundtrackGql = soundtrackGraphql,
): Promise<SoundtrackLibraryPlaylist> {
  const title = name.trim()
  if (!title) throw new SoundtrackApiError('playlist name required', 400)
  const library = await fetchAccountLibrary(zoneId, gql)

  const created = await gql<{
    createManualPlaylist: { id: string; name: string } | null
  }>(
    `mutation($input: CreateManualPlaylistInput!) {
      createManualPlaylist(input: $input) { id name }
    }`,
    {
      input: {
        ownerId: library.accountId,
        name: title,
        playbackMode: 'linear',
      },
    },
  )
  const playlist = created.createManualPlaylist
  const playlistId = playlist?.id?.trim()
  if (!playlistId) throw new SoundtrackApiError('Soundtrack did not return a playlist id')

  await gql(
    `mutation($input: AddToMusicLibraryInput!) {
      addToMusicLibrary(input: $input) { musicLibrary { id } }
    }`,
    { input: { parent: library.libraryId, source: playlistId } },
  )

  return {
    id: playlistId,
    name: playlist?.name?.trim() || title,
    trackCount: 0,
    sourceKind: 'playlist',
  }
}
