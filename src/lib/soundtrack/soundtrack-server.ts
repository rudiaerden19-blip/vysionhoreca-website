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
  const fromEnvId = (process.env.SOUNDTRACK_DEFAULT_SOUND_ZONE_ID || '').trim()
  const fromEnvName = (process.env.SOUNDTRACK_DEFAULT_ZONE_NAME || '').trim()

  const supabase = getServerSupabaseClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('tenant_settings')
      .select('soundtrack_sound_zone_id, soundtrack_zone_name')
      .eq('tenant_slug', tenantSlug)
      .maybeSingle()
    if (!error && data) {
      const fromTenantId = (data.soundtrack_sound_zone_id as string | null | undefined)?.trim()
      if (fromTenantId) return fromTenantId
      const fromTenantName = (data.soundtrack_zone_name as string | null | undefined)?.trim()
      if (fromTenantName) return resolveSoundZoneIdByDisplayName(fromTenantName)
    }
  }

  if (fromEnvId) return fromEnvId
  if (fromEnvName) return resolveSoundZoneIdByDisplayName(fromEnvName)

  throw new SoundtrackConfigError(
    'No Soundtrack sound zone configured for this tenant (set tenant_settings or SOUNDTRACK_DEFAULT_SOUND_ZONE_ID / SOUNDTRACK_DEFAULT_ZONE_NAME on Vercel)',
  )
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
        album?: { image?: { url?: string } | null } | null
      }
    | null
    | undefined,
  fallbackId = '',
): SoundtrackTrackRow | null {
  if (!track?.name) return null
  return {
    id: track.id || fallbackId,
    name: track.name,
    artist: track.artists?.[0]?.name || '—',
    durationMs: typeof track.duration === 'number' ? track.duration : 0,
    imageUrl: track.album?.image?.url ?? null,
  }
}

export async function fetchSoundtrackPlayerSnapshot(zoneId: string): Promise<SoundtrackPlayerSnapshot> {
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
        playbackHistory(first: 20) {
          edges { node { track { id name duration artists { name } } } }
        }
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
  while (playlist.length < 10) {
    playlist.push({
      id: `placeholder-${playlist.length}`,
      name: '—',
      artist: '—',
      durationMs: 0,
      imageUrl: null,
    })
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

export async function soundtrackSearchTracks(query: string, first = 10): Promise<SoundtrackTrackRow[]> {
  const q = query.trim()
  if (!q) return []
  const data = await soundtrackGraphql<{
    search: {
      edges: { node: { __typename: string; id?: string; name?: string; duration?: number; artists?: { name: string }[]; album?: { image: { url: string } | null } | null } }[]
    }
  }>(
    `query($q: String!, $first: Int!) {
      search(query: $q, type: track, first: $first) {
        edges {
          node {
            __typename
            ... on Track {
              id name duration
              artists { name }
              album { image { url } }
            }
          }
        }
      }
    }`,
    { q, first },
  )
  const out: SoundtrackTrackRow[] = []
  for (const edge of data.search?.edges ?? []) {
    if (edge.node.__typename !== 'Track') continue
    const row = mapTrack(edge.node)
    if (row) out.push(row)
  }
  return out
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
      await soundtrackGraphql(
        `mutation($input: SetPlayFromInput!) { setPlayFrom(input: $input) { playFrom { __typename } } }`,
        { input: { soundZone: zoneId, source: { track: trackId } } },
      )
      return
    }
    default:
      throw new SoundtrackApiError('Unknown control op')
  }
}
