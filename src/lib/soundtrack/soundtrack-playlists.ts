import { soundtrackAlbumArtUrl } from '@/lib/soundtrack/soundtrack-album-art'
import {
  soundtrackTrackArtUrlFromAlbum,
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

const PLAYLIST_LIST_THUMB_QUERY = `query($id: ID!) {
  playlist(id: $id) {
    display {
      image { sizes { thumbnail teaser hero } }
    }
    tracks(first: 1) {
      edges {
        node {
          album {
            display {
              image { sizes { thumbnail teaser hero } }
            }
          }
        }
      }
    }
  }
}`

async function resolvePlaylistListImageUrl(playlistId: string): Promise<string | null> {
  const data = await soundtrackGraphql<{
    playlist: (LibraryArtworkNode & {
      tracks?: { edges: { node: { album?: SoundtrackTrackGraphNode['album'] } }[] }
    }) | null
  }>(PLAYLIST_LIST_THUMB_QUERY, { id: playlistId.trim() })

  const pl = data.playlist
  if (!pl) return null

  const fromDisplay = soundtrackLibraryListImageUrl(pl)
  if (fromDisplay) return fromDisplay

  for (const edge of pl.tracks?.edges ?? []) {
    const fromTrack = soundtrackTrackArtUrlFromAlbum(edge.node?.album)
    if (fromTrack) return fromTrack
  }
  return null
}

async function enrichMissingPlaylistImages(
  playlists: SoundtrackLibraryPlaylist[],
): Promise<SoundtrackLibraryPlaylist[]> {
  const missing = playlists.filter((p) => !p.imageUrl && p.sourceKind !== 'schedule')
  if (!missing.length) return playlists

  const imageById = new Map<string, string>()
  await Promise.all(
    missing.map(async (p) => {
      try {
        const url = await resolvePlaylistListImageUrl(p.id)
        if (url) imageById.set(p.id, url)
      } catch {
        /* best-effort thumbnail */
      }
    }),
  )

  if (!imageById.size) return playlists
  return playlists.map((p) => {
    const url = imageById.get(p.id)
    return url ? { ...p, imageUrl: url } : p
  })
}

export async function listSoundtrackLibraryPlaylists(
  zoneId: string,
): Promise<SoundtrackLibraryPlaylist[]> {
  const id = zoneId.trim()
  if (!id) throw new SoundtrackApiError('sound zone id required', 400)
  const library = await fetchAccountLibrary(id, soundtrackGraphql)
  return enrichMissingPlaylistImages(library.playlists)
}

async function resolveZoneAccountId(zoneId: string): Promise<string> {
  const ctx = await resolveSoundtrackZoneLibraryContext(zoneId)
  return ctx.ownerId
}

export async function resolveSoundtrackZoneLibraryContext(
  zoneId: string,
): Promise<{ ownerId: string; musicLibraryId: string }> {
  const data = await soundtrackGraphql<{
    soundZone: {
      account: {
        id: string
        musicLibrary: { id: string } | null
      } | null
    } | null
  }>(ZONE_ACCOUNT_QUERY, { id: zoneId.trim() })

  const account = data.soundZone?.account
  const ownerId = account?.id?.trim()
  const musicLibraryId = account?.musicLibrary?.id?.trim()
  if (!ownerId || !musicLibraryId) {
    throw new SoundtrackApiError('Soundtrack zone has no music library', 502)
  }
  return { ownerId, musicLibraryId }
}

function soundtrackLibraryIdsInclude(ids: string[] | null | undefined, playlistId: string): boolean {
  const pid = playlistId.trim()
  if (!pid) return false
  return (ids ?? []).some((raw) => raw?.trim() === pid)
}

function soundtrackSyncPause(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

const MUSIC_LIBRARY_PLAYLIST_BY_NAME_QUERY = `query($id: ID!) {
  musicLibrary(id: $id) {
    ids
    playlists(first: 500) {
      edges {
        node {
          id
          name
        }
      }
    }
  }
}`

/** Acceptatietest / POST: playlist in Soundtrack musicLibrary op naam (officiële API-read). */
export async function findSoundtrackMusicLibraryPlaylistByName(
  musicLibraryId: string,
  name: string,
): Promise<{ id: string; name: string } | null> {
  const libId = musicLibraryId.trim()
  const want = name.trim()
  if (!libId || !want) return null

  const data = await soundtrackGraphql<{
    musicLibrary: {
      playlists?: { edges: { node: { id: string; name: string | null } }[] } | null
    } | null
  }>(MUSIC_LIBRARY_PLAYLIST_BY_NAME_QUERY, { id: libId })

  for (const edge of data.musicLibrary?.playlists?.edges ?? []) {
    const id = edge.node.id?.trim()
    const nodeName = (edge.node.name ?? '').trim()
    if (id && nodeName === want) return { id, name: nodeName }
  }
  return null
}

/** Bevestig Soundtrack playlist-node + musicLibrary.playlists (id + naam). */
async function assertPlaylistInSoundtrackMusicLibrary(
  musicLibraryId: string,
  playlistId: string,
  playlistName: string,
): Promise<void> {
  const pid = playlistId.trim()
  const expectedName = playlistName.trim()

  const plData = await soundtrackGraphql<{
    playlist: { id: string; name: string | null } | null
  }>(
    `query($id: ID!) {
      playlist(id: $id) { id name }
    }`,
    { id: pid },
  )
  const node = plData.playlist
  if (!node?.id?.trim()) {
    throw new SoundtrackApiError('Soundtrack playlist not found after create', 502)
  }
  if ((node.name ?? '').trim() !== expectedName) {
    throw new SoundtrackApiError('Soundtrack playlist name mismatch after create', 502)
  }

  for (let i = 0; i < 10; i++) {
    const inLibrary = await findSoundtrackMusicLibraryPlaylistByName(musicLibraryId, expectedName)
    if (inLibrary?.id === pid) return
    if (i < 9) await soundtrackSyncPause(200)
  }

  throw new SoundtrackApiError('Playlist not in Soundtrack music library after create', 502)
}

/** Officieel v2: `createManualPlaylist` + `addToMusicLibrary` (Account parent). */
export async function createManualPlaylistInMusicLibrary(
  zoneId: string,
  playlistName: string,
): Promise<{ id: string; name: string }> {
  const zid = zoneId.trim()
  const name = playlistName.trim()
  if (!zid) throw new SoundtrackApiError('sound zone id required', 400)
  if (!name) throw new SoundtrackApiError('playlist name required', 400)

  const { ownerId, musicLibraryId } = await resolveSoundtrackZoneLibraryContext(zid)

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

  const added = await soundtrackGraphql<{
    addToMusicLibrary: { musicLibrary: { ids?: string[] | null } | null } | null
  }>(
    `mutation($input: AddToMusicLibraryInput!) {
      addToMusicLibrary(input: $input) {
        musicLibrary { revision ids }
      }
    }`,
    { input: { parent: ownerId, source: id } },
  )

  if (!soundtrackLibraryIdsInclude(added.addToMusicLibrary?.musicLibrary?.ids, id)) {
    throw new SoundtrackApiError(
      'addToMusicLibrary did not register playlist in Soundtrack music library',
      502,
    )
  }

  await assertPlaylistInSoundtrackMusicLibrary(musicLibraryId, id, name)

  return {
    id,
    name: created.createManualPlaylist?.name?.trim() || name,
  }
}

const PLAYLIST_SPLICE_META_QUERY = `query($id: ID!) {
  playlist(id: $id) {
    snapshot
    tracks(first: 1) { total }
  }
}`

/** Voeg één track toe aan een manual Soundtrack-playlist (`spliceManualPlaylist`). */
/** Hernoem manual playlist (`updateManualPlaylist`). */
export async function renameManualPlaylist(playlistId: string, name: string): Promise<void> {
  const id = playlistId.trim()
  const nextName = name.trim()
  if (!id) throw new SoundtrackApiError('playlist id required', 400)
  if (!nextName) throw new SoundtrackApiError('playlist name required', 400)

  await soundtrackGraphql(
    `mutation($input: UpdateManualPlaylistInfoInput!) {
      updateManualPlaylist(input: $input) { id name }
    }`,
    { input: { id, name: nextName } },
  )
}

/** Verwijder playlist uit account-bibliotheek (`removeFromMusicLibrary`). */
export async function removePlaylistFromMusicLibrary(
  zoneId: string,
  playlistId: string,
): Promise<void> {
  const pid = playlistId.trim()
  if (!pid) throw new SoundtrackApiError('playlist id required', 400)
  const ownerId = await resolveZoneAccountId(zoneId.trim())

  await soundtrackGraphql(
    `mutation($input: RemoveFromMusicLibraryInput!) {
      removeFromMusicLibrary(input: $input) { __typename }
    }`,
    { input: { parent: ownerId, source: pid } },
  )
}

export async function addTrackToManualPlaylist(
  playlistId: string,
  trackId: string,
): Promise<void> {
  const pid = playlistId.trim()
  const tid = trackId.trim()
  if (!pid) throw new SoundtrackApiError('playlist id required', 400)
  if (!tid) throw new SoundtrackApiError('track id required', 400)

  const meta = await soundtrackGraphql<{
    playlist: { snapshot: string | null; tracks: { total: number } } | null
  }>(PLAYLIST_SPLICE_META_QUERY, { id: pid })

  if (!meta.playlist) {
    throw new SoundtrackApiError('Playlist not found', 404)
  }

  const start = Math.max(0, meta.playlist.tracks?.total ?? 0)
  const snapshot = meta.playlist.snapshot?.trim()

  await soundtrackGraphql(
    `mutation($input: SplicePlaylistInput!) {
      spliceManualPlaylist(input: $input) { id }
    }`,
    {
      input: {
        id: pid,
        start,
        length: 0,
        trackIds: [tid],
        ...(snapshot ? { snapshot } : {}),
      },
    },
  )
}
