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
  const ctx = await resolveZoneLibraryContext(zoneId)
  return ctx.ownerId
}

async function resolveZoneLibraryContext(
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

export function isBenignSoundtrackLibraryDuplicateError(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('already') ||
    m.includes('duplicate') ||
    m.includes('exists') ||
    m.includes('present')
  )
}

function soundtrackSyncPause(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

const LIBRARY_MEMBERSHIP_QUERY = `query($owner: ID!, $musicLibraryId: ID!) {
  library(owner: $owner) { ids version }
  musicLibrary(id: $musicLibraryId) { ids revision }
}`

const OWNER_LIBRARY_VERSION_QUERY = `query($owner: ID!) {
  library(owner: $owner) { version }
}`

/**
 * Soundtrack Player: `libraryUpdate` (owner) — `addToLibrary` moet vóór `addToMusicLibrary` zodat
 * de player niet alleen via stille musicLibrary-sync de playlist ziet zonder push-event.
 */
async function addPlaylistToOwnerLibrary(ownerId: string, playlistId: string): Promise<void> {
  const owner = ownerId.trim()
  const id = playlistId.trim()
  if (!owner || !id) return

  const maxAttempts = 3
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let version: string | undefined
    try {
      const data = await soundtrackGraphql<{
        library: { version: string | null } | null
      }>(OWNER_LIBRARY_VERSION_QUERY, { owner })
      const v = data.library?.version?.trim()
      if (v) version = v
    } catch {
      /* version is optional on addToLibrary */
    }

    try {
      await soundtrackGraphql(
        `mutation($owner: ID!, $input: AddToLibraryInput!) {
          addToLibrary(owner: $owner, input: $input) { version }
        }`,
        {
          owner,
          input: {
            ...(version ? { version } : {}),
            items: [{ id, itemKind: 'PLAYLIST' }],
          },
        },
      )
      return
    } catch (e) {
      if (e instanceof SoundtrackApiError && isBenignSoundtrackLibraryDuplicateError(e.message)) {
        return
      }
      const versionConflict =
        e instanceof SoundtrackApiError &&
        /version|conflict|stale|overwrite/i.test(e.message)
      if (versionConflict && attempt < maxAttempts - 1) {
        await soundtrackSyncPause(120)
        continue
      }
      throw e
    }
  }
}

async function addPlaylistToMusicLibrary(ownerId: string, playlistId: string): Promise<void> {
  try {
    await soundtrackGraphql(
      `mutation($input: AddToMusicLibraryInput!) {
        addToMusicLibrary(input: $input) {
          musicLibrary { revision ids }
        }
      }`,
      { input: { parent: ownerId.trim(), source: playlistId.trim() } },
    )
  } catch (e) {
    if (e instanceof SoundtrackApiError && isBenignSoundtrackLibraryDuplicateError(e.message)) {
      return
    }
    throw e
  }
}

async function assertPlaylistVisibleInSoundtrackLibraries(
  ownerId: string,
  musicLibraryId: string,
  playlistId: string,
): Promise<void> {
  const pid = playlistId.trim()
  for (let i = 0; i < 10; i++) {
    const data = await soundtrackGraphql<{
      library: { ids?: string[] | null } | null
      musicLibrary: { ids?: string[] | null } | null
    }>(LIBRARY_MEMBERSHIP_QUERY, {
      owner: ownerId.trim(),
      musicLibraryId: musicLibraryId.trim(),
    })

    const inOwnerLibrary = soundtrackLibraryIdsInclude(data.library?.ids, pid)
    const inMusicLibrary = soundtrackLibraryIdsInclude(data.musicLibrary?.ids, pid)
    if (inOwnerLibrary && inMusicLibrary) return

    if (i < 9) await soundtrackSyncPause(150)
  }

  throw new SoundtrackApiError(
    'Soundtrack playlist not visible in account library after create',
    502,
  )
}

/** Soundtrack `createManualPlaylist` + account library sync (Player + Vysion musicLibrary). */
export async function createManualPlaylistInMusicLibrary(
  zoneId: string,
  playlistName: string,
): Promise<{ id: string; name: string; imageUrl: string | null }> {
  const zid = zoneId.trim()
  const name = playlistName.trim()
  if (!zid) throw new SoundtrackApiError('sound zone id required', 400)
  if (!name) throw new SoundtrackApiError('playlist name required', 400)

  const { ownerId, musicLibraryId } = await resolveZoneLibraryContext(zid)

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

  await addPlaylistToOwnerLibrary(ownerId, id)
  await addPlaylistToMusicLibrary(ownerId, id)
  await assertPlaylistVisibleInSoundtrackLibraries(ownerId, musicLibraryId, id)

  const displayName = created.createManualPlaylist?.name?.trim() || name
  let imageUrl: string | null = null
  try {
    imageUrl = await resolvePlaylistListImageUrl(id)
  } catch {
    imageUrl = null
  }

  return {
    id,
    name: displayName,
    imageUrl,
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
