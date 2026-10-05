import { SoundtrackApiError, soundtrackGraphql } from '@/lib/soundtrack/soundtrack-server'

let soundtrackAccountIdCache: string | null = null
let soundtrackMusicLibraryIdCache: string | null = null

function filterTrackIds(trackIds: string[]): string[] {
  return trackIds.map((id) => id.trim()).filter((id) => id && !id.startsWith('placeholder-'))
}

async function fetchSoundtrackAccountId(): Promise<string> {
  if (soundtrackAccountIdCache) return soundtrackAccountIdCache
  const data = await soundtrackGraphql<{
    me: { accounts: { edges: { node: { id: string } }[] } }
  }>(`query {
    me {
      ... on PublicAPIClient {
        accounts(first: 1) {
          edges { node { id } }
        }
      }
    }
  }`)
  const id = data.me?.accounts?.edges?.[0]?.node?.id?.trim()
  if (!id) throw new SoundtrackApiError('Soundtrack account not found')
  soundtrackAccountIdCache = id
  return id
}

async function fetchAccountMusicLibraryId(accountId: string): Promise<string> {
  if (soundtrackMusicLibraryIdCache) return soundtrackMusicLibraryIdCache
  const data = await soundtrackGraphql<{
    account: { musicLibrary: { id: string } | null } | null
  }>(
    `query($id: ID!) {
      account(id: $id) {
        musicLibrary { id }
      }
    }`,
    { id: accountId },
  )
  const libId = data.account?.musicLibrary?.id?.trim()
  if (!libId) throw new SoundtrackApiError('Soundtrack music library not found')
  soundtrackMusicLibraryIdCache = libId
  return libId
}

async function ensurePlaylistInMusicLibrary(
  musicLibraryId: string,
  playlistId: string,
): Promise<void> {
  try {
    await soundtrackGraphql(
      `mutation($input: AddToMusicLibraryInput!) {
        addToMusicLibrary(input: $input) { __typename }
      }`,
      { input: { parent: musicLibraryId, source: playlistId } },
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/already|duplicate|exists/i.test(msg)) return
    throw e
  }
}

async function fetchPlaylistSnapshotAndTrackCount(
  playlistId: string,
): Promise<{ snapshot: string | null; trackCount: number }> {
  const data = await soundtrackGraphql<{
    playlist: {
      snapshot: string | null
      tracks: { edges: { node: { id: string } }[] }
    } | null
  }>(
    `query($id: ID!) {
      playlist(id: $id) {
        snapshot
        tracks(first: 500) {
          edges { node { id } }
        }
      }
    }`,
    { id: playlistId },
  )
  const pl = data.playlist
  if (!pl) throw new SoundtrackApiError('Soundtrack playlist not found')
  return {
    snapshot: pl.snapshot ?? null,
    trackCount: pl.tracks?.edges?.length ?? 0,
  }
}

/** Maakt/werkt manual playlist bij en zet in account music library (zichtbaar in Soundtrack-app). */
export async function syncManualPlaylistToSoundtrackLibrary(input: {
  name: string
  trackIds: string[]
  soundtrackPlaylistId?: string | null
}): Promise<string> {
  const filtered = filterTrackIds(input.trackIds)
  if (filtered.length === 0) throw new SoundtrackApiError('trackIds required')

  const accountId = await fetchSoundtrackAccountId()
  const musicLibraryId = await fetchAccountMusicLibraryId(accountId)
  const name = (input.name.trim() || 'Vysion afspeellijst').slice(0, 120)

  let playlistId = input.soundtrackPlaylistId?.trim() || ''

  if (!playlistId) {
    const created = await soundtrackGraphql<{ createManualPlaylist: { id: string } }>(
      `mutation($input: CreateManualPlaylistInput!) {
        createManualPlaylist(input: $input) { id }
      }`,
      {
        input: {
          ownerId: accountId,
          name,
          trackIds: filtered,
          playbackMode: 'linear',
        },
      },
    )
    playlistId = created.createManualPlaylist?.id?.trim() || ''
    if (!playlistId) throw new SoundtrackApiError('Soundtrack playlist create failed')
    await ensurePlaylistInMusicLibrary(musicLibraryId, playlistId)
    return playlistId
  }

  await soundtrackGraphql(
    `mutation($input: UpdateManualPlaylistInfoInput!) {
      updateManualPlaylist(input: $input) { id }
    }`,
    { input: { id: playlistId, name } },
  )

  const { snapshot, trackCount } = await fetchPlaylistSnapshotAndTrackCount(playlistId)
  await soundtrackGraphql(
    `mutation($input: SplicePlaylistInput!) {
      spliceManualPlaylist(input: $input) { id }
    }`,
    {
      input: {
        id: playlistId,
        snapshot: snapshot ?? undefined,
        start: 0,
        length: trackCount,
        trackIds: filtered,
      },
    },
  )

  await ensurePlaylistInMusicLibrary(musicLibraryId, playlistId)
  return playlistId
}

export async function playSoundtrackPlaylistOnZone(
  zoneId: string,
  soundtrackPlaylistId: string,
): Promise<void> {
  const sourceId = soundtrackPlaylistId.trim()
  if (!sourceId) throw new SoundtrackApiError('soundtrackPlaylistId required')

  await soundtrackGraphql(
    `mutation($input: SetPlayFromInput!) { setPlayFrom(input: $input) { __typename } }`,
    { input: { soundZone: zoneId, source: sourceId } },
  )

  try {
    await soundtrackGraphql(
      `mutation($input: SoundZoneSetPlaybackOrderInput!) {
        soundZoneSetPlaybackOrder(input: $input) { __typename }
      }`,
      { input: { soundZone: zoneId, playbackOrder: 'LINEAR' } },
    )
  } catch {
    /* optional */
  }

  await soundtrackGraphql(
    `mutation($input: PlayInput!) { play(input: $input) { status } }`,
    { input: { soundZone: zoneId } },
  )
}
