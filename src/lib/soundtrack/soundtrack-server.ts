import { soundtrackAlbumArtUrl } from '@/lib/soundtrack/soundtrack-album-art'

import { getServerSupabaseClient } from '@/lib/supabase-server'

const API_URL = 'https://api.soundtrackyourbrand.com/v2'

export class SoundtrackConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SoundtrackConfigError'
  }
}

export class SoundtrackApiError extends Error {
  status: number
  constructor(message: string, status = 502) {
    super(message)
    this.name = 'SoundtrackApiError'
    this.status = status
  }
}

function soundtrackToken(): string {
  const t = (process.env.SOUNDTRACK_API_BASIC || '').trim()
  if (!t) throw new SoundtrackConfigError('Soundtrack API not configured')
  return t
}

const zoneIdByNameCache = new Map<string, string>()
const zoneIdByTenantCache = new Map<string, string>()

async function resolveSoundZoneIdByDisplayName(zoneName: string): Promise<string> {
  const needle = zoneName.trim()
  if (!needle) throw new SoundtrackConfigError('Empty Soundtrack zone name')
  const cacheKey = needle.toLowerCase()
  const cached = zoneIdByNameCache.get(cacheKey)
  if (cached) return cached

  const data = await soundtrackGraphql<{
    me: {
      accounts: {
        edges: {
          node: {
            locations: {
              edges: {
                node: {
                  soundZones: { edges: { node: { id: string; name: string } }[] }
                }
              }[]
            }
          }
        }[]
      }
    }
  }>(`query {
    me {
      ... on PublicAPIClient {
        accounts(first: 25) {
          edges {
            node {
              locations(first: 50) {
                edges {
                  node {
                    soundZones(first: 50) {
                      edges { node { id name } }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }`)

  const accounts = data.me?.accounts?.edges ?? []
  for (const ae of accounts) {
    for (const le of ae.node.locations?.edges ?? []) {
      for (const se of le.node.soundZones?.edges ?? []) {
        const z = se.node
        if (z.name.trim() === needle) {
          zoneIdByNameCache.set(cacheKey, z.id)
          return z.id
        }
      }
    }
  }
  throw new SoundtrackConfigError(`Soundtrack zone not found: ${needle}`)
}

export async function resolveSoundZoneIdForTenant(tenantSlug: string): Promise<string> {
  const cached = zoneIdByTenantCache.get(tenantSlug)
  if (cached) return cached

  const fromEnvId = (process.env.SOUNDTRACK_DEFAULT_SOUND_ZONE_ID || '').trim()
  const fromEnvName = (process.env.SOUNDTRACK_DEFAULT_ZONE_NAME || '').trim()

  let resolved = ''
  const supabase = getServerSupabaseClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('tenant_settings')
      .select('soundtrack_sound_zone_id, soundtrack_zone_name')
      .eq('tenant_slug', tenantSlug)
      .maybeSingle()
    if (!error && data) {
      const fromTenantId = (data.soundtrack_sound_zone_id as string | null | undefined)?.trim()
      if (fromTenantId) resolved = fromTenantId
      else {
        const fromTenantName = (data.soundtrack_zone_name as string | null | undefined)?.trim()
        if (fromTenantName) resolved = await resolveSoundZoneIdByDisplayName(fromTenantName)
      }
    }
  }

  if (!resolved && fromEnvId) resolved = fromEnvId
  if (!resolved && fromEnvName) resolved = await resolveSoundZoneIdByDisplayName(fromEnvName)

  if (!resolved) {
    throw new SoundtrackConfigError(
      'No Soundtrack sound zone configured for this tenant (set tenant_settings or SOUNDTRACK_DEFAULT_SOUND_ZONE_ID / SOUNDTRACK_DEFAULT_ZONE_NAME on Vercel)',
    )
  }

  zoneIdByTenantCache.set(tenantSlug, resolved)
  return resolved
}

export async function soundtrackGraphql<T = Record<string, unknown>>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${soundtrackToken()}`,
      'User-Agent': 'VysionMusicBFF/1.0',
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  })
  const json = (await res.json()) as {
    data?: T
    errors?: { message?: string }[]
  }
  if (!res.ok) {
    throw new SoundtrackApiError(json.errors?.[0]?.message || `HTTP ${res.status}`, res.status)
  }
  if (json.errors?.length) {
    throw new SoundtrackApiError(json.errors.map((e) => e.message).join('; ') || 'GraphQL error')
  }
  if (json.data == null) {
    throw new SoundtrackApiError('Empty GraphQL response')
  }
  return json.data
}

export type SoundtrackTrackRow = {
  id: string
  name: string
  artist: string
  durationMs: number
  imageUrl: string | null
  imageWidth: number | null
  imageHeight: number | null
}

export type SoundtrackPlayerSnapshot = {
  zoneId: string
  zoneName: string
  online: boolean
  isPaired: boolean
  deviceName: string | null
  playbackState: string
  volume: number
  nowPlaying: {
    track: SoundtrackTrackRow | null
    startedAt: string | null
    progressMs: number
  }
  playlist: SoundtrackTrackRow[]
}

function mapTrack(
  track:
    | {
        id?: string
        name?: string
        artists?: { name?: string }[]
        duration?: number
        album?: {
          image?: { url?: string; width?: number; height?: number } | null
        } | null
      }
    | null
    | undefined,
): SoundtrackTrackRow | null {
  const id = track?.id?.trim()
  if (!track?.name || !id) return null
  const img = track.album?.image
  const imageWidth = typeof img?.width === 'number' && img.width > 0 ? img.width : null
  const imageHeight = typeof img?.height === 'number' && img.height > 0 ? img.height : null
  const imageUrl = soundtrackAlbumArtUrl(img?.url ?? null)
  return {
    id,
    name: track.name,
    artist: track.artists?.[0]?.name || '—',
    durationMs: typeof track.duration === 'number' ? track.duration : 0,
    imageUrl,
    imageWidth,
    imageHeight,
  }
}

export async function fetchSoundtrackPlayerSnapshot(
  zoneId: string,
  opts?: { historyFirst?: number; padPlaylist?: boolean },
): Promise<SoundtrackPlayerSnapshot> {
  const historyFirst = opts?.historyFirst ?? 10
  const padPlaylist = opts?.padPlaylist ?? true
  const historyBlock =
    historyFirst > 0
      ? `playbackHistory(first: ${historyFirst}) {
          edges { node { track { id name duration artists { name } album { image { url width height } } } } }
        }`
      : ''
  const data = await soundtrackGraphql<{
    soundZone: {
      id: string
      name: string
      online: boolean
      isPaired: boolean
      device: { name: string } | null
      playback: { state: string; volume: number }
      nowPlaying: {
        startedAt: string
        track: {
          id: string
          name: string
          duration: number
          artists: { name: string }[]
          album: { image: { url: string } | null } | null
        } | null
      } | null
      playbackHistory: {
        edges: { node: { track: { id: string; name: string; duration: number; artists: { name: string }[] } } }[]
      }
    }
  }>(
    `query($id: ID!) {
      soundZone(id: $id) {
        id name online isPaired
        device { name }
        playback { state volume }
        nowPlaying {
          startedAt
          track {
            id name duration
            artists { name }
            album { image { url width height } }
          }
        }
        ${historyBlock}
      }
    }`,
    { id: zoneId },
  )

  const sz = data.soundZone
  const nowTrack = mapTrack(sz.nowPlaying?.track ?? null)
  const startedAt = sz.nowPlaying?.startedAt ?? null
  let progressMs = 0
  if (startedAt && nowTrack?.durationMs) {
    progressMs = Math.min(
      nowTrack.durationMs,
      Math.max(0, Date.now() - new Date(startedAt).getTime()),
    )
  }

  const historyRows: SoundtrackTrackRow[] = []
  const seen = new Set<string>()
  for (const edge of sz.playbackHistory?.edges ?? []) {
    const row = mapTrack(edge.node.track)
    if (!row) continue
    const key = `${row.name}|${row.artist}`
    if (seen.has(key)) continue
    seen.add(key)
    historyRows.push(row)
  }

  const playlist: SoundtrackTrackRow[] = []
  if (nowTrack) playlist.push(nowTrack)
  for (const row of historyRows) {
    if (nowTrack && row.id === nowTrack.id && row.name === nowTrack.name) continue
    playlist.push(row)
    if (playlist.length >= 10) break
  }
  if (padPlaylist) {
    while (playlist.length < 10) {
      playlist.push({
        id: `placeholder-${playlist.length}`,
        name: '—',
        artist: '—',
        durationMs: 0,
        imageUrl: null,
        imageWidth: null,
        imageHeight: null,
      })
    }
  }

  return {
    zoneId: sz.id,
    zoneName: sz.name,
    online: sz.online,
    isPaired: sz.isPaired,
    deviceName: sz.device?.name ?? null,
    playbackState: sz.playback?.state ?? 'stopped',
    volume: typeof sz.playback?.volume === 'number' ? sz.playback.volume : 0,
    nowPlaying: {
      track: nowTrack,
      startedAt,
      progressMs,
    },
    playlist,
  }
}

function dedupeSearchTrackRows(rows: SoundtrackTrackRow[]): SoundtrackTrackRow[] {
  const seenId = new Set<string>()
  const seenTitle = new Set<string>()
  const out: SoundtrackTrackRow[] = []
  for (const row of rows) {
    if (seenId.has(row.id)) continue
    seenId.add(row.id)
    const titleKey = `${row.name.trim().toLowerCase()}|${row.artist.trim().toLowerCase()}`
    if (seenTitle.has(titleKey)) continue
    seenTitle.add(titleKey)
    out.push(row)
  }
  return out
}

/** Soundtrack search met paginatie — geen hard cap op 12; catalog ≠ volledige discografie. */
export async function soundtrackSearchTracks(
  query: string,
  opts?: { maxResults?: number; pageSize?: number },
): Promise<SoundtrackTrackRow[]> {
  const q = query.trim()
  if (!q) return []
  const maxResults = Math.min(Math.max(opts?.maxResults ?? 80, 1), 120)
  const pageSize = Math.min(Math.max(opts?.pageSize ?? 50, 1), 50)

  type SearchPage = {
    search: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
      edges: {
        node: {
          __typename: string
          id?: string
          name?: string
          duration?: number
          artists?: { name: string }[]
          album?: { image: { url: string; width?: number; height?: number } | null } | null
        }
      }[]
    }
  }

  let collected: SoundtrackTrackRow[] = []
  let after: string | null = null

  for (let page = 0; page < 8 && collected.length < maxResults; page++) {
    const data: SearchPage = await soundtrackGraphql<SearchPage>(
      `query($q: String!, $first: Int!, $after: String) {
        search(query: $q, type: track, first: $first, after: $after) {
          pageInfo { hasNextPage endCursor }
          edges {
            node {
              __typename
              ... on Track {
                id name duration
                artists { name }
                album { image { url width height } }
              }
            }
          }
        }
      }`,
      { q, first: pageSize, after },
    )

    for (const edge of data.search?.edges ?? []) {
      if (edge.node.__typename !== 'Track') continue
      const row = mapTrack(edge.node)
      if (row) collected.push(row)
    }

    collected = dedupeSearchTrackRows(collected)

    if (collected.length >= maxResults) break
    const pi: SearchPage['search']['pageInfo'] | undefined = data.search?.pageInfo
    if (!pi?.hasNextPage || !pi.endCursor) break
    after = pi.endCursor
  }

  return collected.slice(0, maxResults)
}

export async function soundtrackControl(
  zoneId: string,
  op: 'play' | 'pause' | 'skipNext' | 'stop' | 'setVolume' | 'playTrack',
  opts?: { volume?: number; trackId?: string },
): Promise<void> {
  switch (op) {
    case 'play':
      await soundtrackGraphql(
        `mutation($input: PlayInput!) { play(input: $input) { status } }`,
        { input: { soundZone: zoneId } },
      )
      return
    case 'pause':
    case 'stop':
      await soundtrackGraphql(
        `mutation($input: PauseInput!) { pause(input: $input) { status } }`,
        { input: { soundZone: zoneId } },
      )
      return
    case 'skipNext':
      await soundtrackGraphql(
        `mutation($input: SkipTrackInput!) { skipTrack(input: $input) { status } }`,
        { input: { soundZone: zoneId } },
      )
      return
    case 'setVolume': {
      const volume = typeof opts?.volume === 'number' ? opts.volume : 0
      await soundtrackGraphql(
        `mutation($input: SetVolumeInput!) { setVolume(input: $input) { status volume } }`,
        { input: { soundZone: zoneId, volume } },
      )
      return
    }
    case 'playTrack': {
      const trackId = opts?.trackId?.trim()
      if (!trackId) throw new SoundtrackApiError('trackId required')
      if (trackId.startsWith('placeholder-')) {
        throw new SoundtrackApiError('Track not available')
      }
      // setPlayFrom.source = Playlist/Schedule/Soundtrack — géén Track-id → Validation failed
      await soundtrackGraphql(
        `mutation($input: SoundZoneQueueTracksInput!) {
          soundZoneQueueTracks(input: $input) { __typename }
        }`,
        {
          input: {
            soundZone: zoneId,
            tracks: [trackId],
            immediate: true,
            clearQueuedTracks: true,
          },
        },
      )
      await soundtrackGraphql(
        `mutation($input: PlayInput!) { play(input: $input) { status } }`,
        { input: { soundZone: zoneId } },
      )
      return
    }
    default:
      throw new SoundtrackApiError('Unknown control op')
  }
}
