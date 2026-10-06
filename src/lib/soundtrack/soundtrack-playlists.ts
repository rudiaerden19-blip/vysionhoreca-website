import { soundtrackAlbumArtUrl } from '@/lib/soundtrack/soundtrack-album-art'
import {
  SoundtrackApiError,
  soundtrackGraphql,
} from '@/lib/soundtrack/soundtrack-server'

export type SoundtrackLibrarySourceKind = 'playlist' | 'soundtrack' | 'schedule' | 'unknown'

export type SoundtrackLibraryPlaylist = {
  id: string
  name: string
  /** GraphQL __typename uit musicLibrary-lijst (Playlist | Schedule). */
  sourceTypename: string
  /** Soundtrack `Playlist.snapshot` — voor assign sourceSnapshot indien van toepassing. */
  snapshot: string | null
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
          __typename
          id
          name
          snapshot
          composerType
          ${LIBRARY_DISPLAY_IMAGE}
        }
      }
    }
    schedules(first: 200) {
      edges {
        node {
          __typename
          id
          name
          snapshot
          ${LIBRARY_DISPLAY_IMAGE}
        }
      }
    }
  }
}`

type LibraryArtworkNode = {
  __typename?: string
  id?: string
  name?: string | null
  snapshot?: string | null
  composerType?: string | null
  display?: {
    image?: {
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
    sourceTypename: node.__typename?.trim() || 'Playlist',
    snapshot: node.snapshot?.trim() || null,
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
    sourceTypename: node.__typename?.trim() || 'Schedule',
    snapshot: node.snapshot?.trim() || null,
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

async function resolveZoneAccountId(zoneId: string): Promise<string> {
  const data = await soundtrackGraphql<{
    soundZone: { account: { id: string } | null } | null
  }>(ZONE_ACCOUNT_QUERY, { id: zoneId.trim() })
  const accountId = data.soundZone?.account?.id?.trim()
  if (!accountId) {
    throw new SoundtrackApiError('Soundtrack zone has no account', 502)
  }
  return accountId
}

/** Soundtrack `createManualPlaylist` + `addToMusicLibrary` (zelfde account-bibliotheek als lijst-UI). */
export async function createManualPlaylistInMusicLibrary(
  zoneId: string,
  playlistName: string,
): Promise<{ id: string; name: string }> {
  const zid = zoneId.trim()
  const name = playlistName.trim()
  if (!zid) throw new SoundtrackApiError('sound zone id required', 400)
  if (!name) throw new SoundtrackApiError('playlist name required', 400)

  const ownerId = await resolveZoneAccountId(zid)

  const created = await soundtrackGraphql<{
    createManualPlaylist: { id: string; name: string } | null
  }>(
    `mutation($input: CreateManualPlaylistInput!) {
      createManualPlaylist(input: $input) { id name }
    }`,
    { input: { ownerId, name } },
  )

  const id = created.createManualPlaylist?.id?.trim()
  if (!id) {
    throw new SoundtrackApiError('Soundtrack created no playlist', 502)
  }

  await soundtrackGraphql(
    `mutation($input: AddToMusicLibraryInput!) {
      addToMusicLibrary(input: $input) { __typename }
    }`,
    { input: { parent: ownerId, source: id } },
  )

  return {
    id,
    name: created.createManualPlaylist?.name?.trim() || name,
  }
}
