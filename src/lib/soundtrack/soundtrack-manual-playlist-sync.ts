import { SoundtrackApiError, soundtrackGraphql } from '@/lib/soundtrack/soundtrack-server'

export type SoundtrackAccountContext = {
  accountId: string
  musicLibraryId: string
}

const accountContextByZoneCache = new Map<string, SoundtrackAccountContext>()

function filterTrackIds(trackIds: string[]): string[] {
  return trackIds.map((id) => id.trim()).filter((id) => id && !id.startsWith('placeholder-'))
}

/** Account + music library van de zone (niet “eerste account” van de API-token). */
export async function resolveSoundtrackAccountContextForZone(
  zoneId: string,
): Promise<SoundtrackAccountContext> {
  const key = zoneId.trim()
  const cached = accountContextByZoneCache.get(key)
  if (cached) return cached

  const data = await soundtrackGraphql<{
    soundZone: {
      account: { id: string; musicLibrary: { id: string } | null } | null
    } | null
  }>(
    `query($id: ID!) {
      soundZone(id: $id) {
        account {
          id
          musicLibrary { id }
        }
      }
    }`,
    { id: key },
  )

  const accountId = data.soundZone?.account?.id?.trim()
  const musicLibraryId = data.soundZone?.account?.musicLibrary?.id?.trim()
  if (!accountId || !musicLibraryId) {
    throw new SoundtrackApiError(
      'Soundtrack account or music library not found for this sound zone',
    )
  }

  const ctx = { accountId, musicLibraryId }
  accountContextByZoneCache.set(key, ctx)
  return ctx
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

async function createManualPlaylistInLibrary(
  ctx: SoundtrackAccountContext,
  name: string,
  trackIds: string[],
): Promise<string> {
  const created = await soundtrackGraphql<{ createManualPlaylist: { id: string } }>(
    `mutation($input: CreateManualPlaylistInput!) {
      createManualPlaylist(input: $input) { id }
    }`,
    {
      input: {
        ownerId: ctx.accountId,
        name,
        trackIds,
        playbackMode: 'linear',
      },
    },
  )
  const playlistId = created.createManualPlaylist?.id?.trim() || ''
  if (!playlistId) throw new SoundtrackApiError('Soundtrack playlist create failed')
  await ensurePlaylistInMusicLibrary(ctx.musicLibraryId, playlistId)
  return playlistId
}

async function updateManualPlaylistTracks(
  playlistId: string,
  name: string,
  trackIds: string[],
): Promise<void> {
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
        trackIds,
      },
    },
  )
}

/** Manual playlist in de music library van de zone (zichtbaar in Soundtrack-app). */
export async function syncManualPlaylistToSoundtrackLibrary(input: {
  zoneId: string
  name: string
  trackIds: string[]
  soundtrackPlaylistId?: string | null
}): Promise<string> {
  const filtered = filterTrackIds(input.trackIds)
  if (filtered.length === 0) throw new SoundtrackApiError('trackIds required')

  const ctx = await resolveSoundtrackAccountContextForZone(input.zoneId)
  const name = (input.name.trim() || 'Vysion afspeellijst').slice(0, 120)

  let playlistId = input.soundtrackPlaylistId?.trim() || ''

  if (!playlistId) {
    return createManualPlaylistInLibrary(ctx, name, filtered)
  }

  try {
    await updateManualPlaylistTracks(playlistId, name, filtered)
    await ensurePlaylistInMusicLibrary(ctx.musicLibraryId, playlistId)
    return playlistId
  } catch (updateErr) {
    console.warn('[soundtrack] playlist update failed, recreating manual playlist', updateErr)
    return createManualPlaylistInLibrary(ctx, name, filtered)
  }
}

export function orderTrackIdsFromStart(trackIds: string[], startTrackId?: string | null): string[] {
  const ids = filterTrackIds(trackIds)
  const start = startTrackId?.trim()
  if (!start) return ids
  const idx = ids.indexOf(start)
  if (idx <= 0) return ids
  return [...ids.slice(idx), ...ids.slice(0, idx)]
}

/** Sync manual playlist + setPlayFrom + play (zelfde pad als Soundtrack-speler). */
export async function playManualPlaylistOnSoundZone(input: {
  zoneId: string
  name: string
  trackIds: string[]
  soundtrackPlaylistId?: string | null
  startTrackId?: string | null
}): Promise<string> {
  const ordered = orderTrackIdsFromStart(input.trackIds, input.startTrackId)
  const playlistId = await syncManualPlaylistToSoundtrackLibrary({
    zoneId: input.zoneId,
    name: input.name,
    trackIds: ordered,
    soundtrackPlaylistId: input.soundtrackPlaylistId ?? null,
  })
  await playSoundtrackPlaylistOnZone(input.zoneId, playlistId)
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
