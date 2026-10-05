import {
  artistDiscoverySearchQueries,
  artistQuickDiscoverySearchQueries,
  prefersArtistOnlySearchResults,
  trackArtistMatchesQuery,
  trackArtistNamesMatchQuery,
} from '@/lib/soundtrack/soundtrack-search-artist-filter'
import { soundtrackAlbumArtUrl } from '@/lib/soundtrack/soundtrack-album-art'

import { getServerSupabaseClient } from '@/lib/supabase-server'

const API_URL = 'https://api.soundtrackyourbrand.com/v2'

/** Standaard crossfade in Soundtrack-player (zone settings + skip). */
export const VYSION_MUSIC_CROSSFADE_SECONDS = 6

/** Artiest-zoek: volledige catalogus via `full`-scope; `quick` = eerste scherm snel. */
export const SOUNDTRACK_ARTIST_SEARCH_MAX_TRACKS = 3000
const SOUNDTRACK_ARTIST_SEARCH_MAX_PAGES_PRIMARY = 100
const SOUNDTRACK_QUICK_SEARCH_PAGE_SIZE = 36
const SOUNDTRACK_GENERAL_SEARCH_MAX_TRACKS = 200

export type SoundtrackArtistSearchMode = 'quick' | 'full'

/** Soundtrack `Volume` scalar: 0–16 (niet 0–100). UI gebruikt 0–100%. */
const SOUNDTRACK_VOLUME_MAX = 16

export function soundtrackApiVolumeToUiPercent(apiVolume: number): number {
  const v = Math.min(SOUNDTRACK_VOLUME_MAX, Math.max(0, apiVolume))
  return Math.round((v / SOUNDTRACK_VOLUME_MAX) * 100)
}

export function soundtrackUiPercentToApiVolume(uiPercent: number): number {
  const pct = Math.min(100, Math.max(0, uiPercent))
  return Math.round((pct / 100) * SOUNDTRACK_VOLUME_MAX)
}

/** UI-slider in 17 vaste standen (Soundtrack 0–16), voorkomt springende thumb. */
export function quantizeVolumeUiPercent(uiPercent: number): number {
  const pct = Math.min(100, Math.max(0, uiPercent))
  const step = Math.round((pct / 100) * SOUNDTRACK_VOLUME_MAX)
  return Math.round((step / SOUNDTRACK_VOLUME_MAX) * 100)
}

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
const crossfadeEnsuredZoneIds = new Set<string>()

export type SoundtrackCrossfadeSettings = {
  crossfade: boolean
  crossfadeLength: number | null
  crossfadeOnSkip: boolean
}

/** Soundtrack kan crossfadeLength in seconden of milliseconden teruggeven. */
export function soundtrackCrossfadeLengthToSeconds(
  value: number | null | undefined,
): number | null {
  if (value == null || Number.isNaN(Number(value))) return null
  const n = Number(value)
  if (n > 60) return n / 1000
  return n
}

export function soundtrackCrossfadeSettingsMatch(
  current: Partial<SoundtrackCrossfadeSettings> | null | undefined,
  seconds: number = VYSION_MUSIC_CROSSFADE_SECONDS,
): boolean {
  if (!current) return false
  const len = soundtrackCrossfadeLengthToSeconds(current.crossfadeLength)
  return current.crossfade === true && current.crossfadeOnSkip === true && len === seconds
}

async function fetchSoundZoneCrossfadeSettings(
  zoneId: string,
): Promise<SoundtrackCrossfadeSettings | null> {
  const data = await soundtrackGraphql<{
    soundZone: {
      settings: {
        crossfade: boolean
        crossfadeLength: number | null
        crossfadeOnSkip: boolean
      } | null
    } | null
  }>(
    `query($id: ID!) {
      soundZone(id: $id) {
        settings { crossfade crossfadeLength crossfadeOnSkip }
      }
    }`,
    { id: zoneId },
  )
  const s = data.soundZone?.settings
  if (!s) return null
  return {
    crossfade: Boolean(s.crossfade),
    crossfadeLength:
      s.crossfadeLength == null || s.crossfadeLength === undefined
        ? null
        : Number(s.crossfadeLength),
    crossfadeOnSkip: Boolean(s.crossfadeOnSkip),
  }
}

async function writeSoundZoneCrossfadeSettings(
  zoneId: string,
  seconds: number,
): Promise<void> {
  let lastErr: unknown
  for (const crossfadeLength of [seconds, seconds * 1000]) {
    try {
      await soundtrackGraphql(
        `mutation($input: SoundZoneUpdateSettingsInput!) {
          soundZoneUpdateSettings(input: $input) { __typename }
        }`,
        {
          input: {
            soundZones: [zoneId],
            settings: {
              crossfade: true,
              crossfadeLength,
              crossfadeOnSkip: true,
            },
          },
        },
      )
      const after = await fetchSoundZoneCrossfadeSettings(zoneId)
      if (soundtrackCrossfadeSettingsMatch(after, seconds)) return
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new SoundtrackApiError('Soundtrack crossfade settings were not applied')
}

/** Zet zone-crossfade op de player in zaak; cached per zone per process. */
export async function ensureSoundZoneCrossfadeSettings(
  zoneId: string,
  seconds: number = VYSION_MUSIC_CROSSFADE_SECONDS,
): Promise<void> {
  const key = `${zoneId}:${seconds}`
  if (crossfadeEnsuredZoneIds.has(key)) return

  try {
    const current = await fetchSoundZoneCrossfadeSettings(zoneId)
    if (!soundtrackCrossfadeSettingsMatch(current, seconds)) {
      await writeSoundZoneCrossfadeSettings(zoneId, seconds)
    }
    crossfadeEnsuredZoneIds.add(key)
  } catch (e) {
    console.error('[soundtrack] ensureSoundZoneCrossfadeSettings failed', zoneId, e)
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

async function setSoundZoneVolumeUi(zoneId: string, uiPercent: number): Promise<void> {
  const volume = soundtrackUiPercentToApiVolume(quantizeVolumeUiPercent(uiPercent))
  await soundtrackGraphql(
    `mutation($input: SetVolumeInput!) { setVolume(input: $input) { status volume } }`,
    { input: { soundZone: zoneId, volume } },
  )
}

/** Volume-ramp (0–16 UI). Niet gebruiken bij trackwissel — dat breekt Soundtrack-crossfade. */
export async function rampSoundZoneVolumeUi(
  zoneId: string,
  fromUi: number,
  toUi: number,
  durationMs: number,
): Promise<void> {
  const steps = 12
  const stepMs = Math.max(50, Math.floor(durationMs / steps))
  for (let i = 1; i <= steps; i++) {
    const ui = Math.round(fromUi + ((toUi - fromUi) * i) / steps)
    await setSoundZoneVolumeUi(zoneId, ui)
    if (i < steps) await sleep(stepMs)
  }
}

export async function withSoundtrackAudioFade<T>(
  zoneId: string,
  volumeUi: number,
  action: () => Promise<T>,
): Promise<T> {
  const vol = quantizeVolumeUiPercent(volumeUi)
  const halfMs = (VYSION_MUSIC_CROSSFADE_SECONDS * 1000) / 2
  if (vol <= 0) return action()
  try {
    await rampSoundZoneVolumeUi(zoneId, vol, 0, halfMs)
    const out = await action()
    await rampSoundZoneVolumeUi(zoneId, 0, vol, halfMs)
    return out
  } catch (e) {
    await setSoundZoneVolumeUi(zoneId, vol).catch(() => {})
    throw e
  }
}

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
  /** 0–100 voor UI (gemapt van Soundtrack 0–16). */
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
  artistQuery?: string,
): SoundtrackTrackRow | null {
  const id = track?.id?.trim()
  if (!track?.name || !id) return null
  const img = track.album?.image
  const imageWidth = typeof img?.width === 'number' && img.width > 0 ? img.width : null
  const imageHeight = typeof img?.height === 'number' && img.height > 0 ? img.height : null
  const imageUrl = soundtrackAlbumArtUrl(img?.url ?? null)
  const artistNames =
    track.artists?.map((a) => a.name?.trim()).filter((n): n is string => Boolean(n)) ?? []
  let artist = artistNames[0] || '—'
  if (artistQuery) {
    const matched = artistNames.find((n) => trackArtistMatchesQuery(n, artistQuery))
    if (matched) artist = matched
  }
  return {
    id,
    name: track.name,
    artist,
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
    volume:
      typeof sz.playback?.volume === 'number'
        ? quantizeVolumeUiPercent(soundtrackApiVolumeToUiPercent(sz.playback.volume))
        : 0,
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

type SoundtrackTrackSearchNode = {
  __typename: string
  id?: string
  name?: string
  duration?: number
  artists?: { name: string }[]
  album?: { image: { url: string; width?: number; height?: number } | null } | null
}

type SoundtrackTrackSearchPage = {
  search: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null }
    edges: { node: SoundtrackTrackSearchNode }[]
  }
}

async function fetchSoundtrackTrackSearchPage(
  searchQuery: string,
  pageSize: number,
  after: string | null,
): Promise<SoundtrackTrackSearchPage> {
  return soundtrackGraphql<SoundtrackTrackSearchPage>(
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
    { q: searchQuery, first: pageSize, after },
  )
}

function ingestArtistScopedSearchPage(
  data: SoundtrackTrackSearchPage,
  artistQuery: string,
  collected: SoundtrackTrackRow[],
): SoundtrackTrackRow[] {
  const q = artistQuery.trim()
  let out = collected
  for (const edge of data.search?.edges ?? []) {
    if (edge.node.__typename !== 'Track') continue
    if (!trackArtistNamesMatchQuery(edge.node.artists?.map((a) => a.name), q)) continue
    const row = mapTrack(edge.node, q)
    if (row) out.push(row)
  }
  return dedupeSearchTrackRows(out)
}

/** Artiest-zoek: parallel eerste pages; diep alleen primaire query (niet 6×120 calls). */
async function collectArtistScopedTrackSearch(
  artistQuery: string,
  maxResults: number,
  pageSize: number,
  mode: SoundtrackArtistSearchMode,
): Promise<SoundtrackTrackRow[]> {
  const q = artistQuery.trim()
  let collected: SoundtrackTrackRow[] = []

  const discoveryQueries =
    mode === 'quick' ? artistQuickDiscoverySearchQueries(q) : artistDiscoverySearchQueries(q)
  const firstPageSize = mode === 'quick' ? SOUNDTRACK_QUICK_SEARCH_PAGE_SIZE : pageSize
  const firstPages = await Promise.all(
    discoveryQueries.map((searchQ) =>
      fetchSoundtrackTrackSearchPage(searchQ, firstPageSize, null),
    ),
  )
  for (const data of firstPages) {
    collected = ingestArtistScopedSearchPage(data, q, collected)
  }

  if (mode === 'quick') {
    return collected.slice(0, maxResults)
  }

  const primaryQ = discoveryQueries[0] ?? q
  let after = firstPages[0]?.search?.pageInfo?.endCursor ?? null
  const maxExtraPages = SOUNDTRACK_ARTIST_SEARCH_MAX_PAGES_PRIMARY

  for (let page = 0; page < maxExtraPages; page++) {
    if (collected.length >= maxResults) break
    if (!after) break
    const data = await fetchSoundtrackTrackSearchPage(primaryQ, pageSize, after)
    collected = ingestArtistScopedSearchPage(data, q, collected)
    const pi = data.search?.pageInfo
    if (!pi?.hasNextPage || !pi.endCursor) break
    after = pi.endCursor
  }

  return collected.slice(0, maxResults)
}

/**
 * Soundtrack `search(type: track)` — zelfde index als Soundtrack player (titels + artiesten).
 * Diepe artiest-catalogus alleen bij `scope=full` én wanneer artiest-treffers bestaan.
 */
export async function soundtrackSearchTracks(
  query: string,
  opts?: {
    maxResults?: number
    pageSize?: number
    artistSearchMode?: SoundtrackArtistSearchMode
  },
): Promise<SoundtrackTrackRow[]> {
  const q = query.trim()
  if (!q) return []
  const expandArtistCatalog = prefersArtistOnlySearchResults(q)
  const artistSearchMode = opts?.artistSearchMode ?? 'quick'
  const catalogFull =
    expandArtistCatalog && artistSearchMode === 'full'
  const defaultMax = catalogFull ? SOUNDTRACK_ARTIST_SEARCH_MAX_TRACKS : 80
  const hardCap = catalogFull
    ? SOUNDTRACK_ARTIST_SEARCH_MAX_TRACKS
    : SOUNDTRACK_GENERAL_SEARCH_MAX_TRACKS
  const maxResults = Math.min(Math.max(opts?.maxResults ?? defaultMax, 1), hardCap)
  const pageSize = Math.min(Math.max(opts?.pageSize ?? 50, 1), 50)

  if (catalogFull) {
    const artistTracks = await collectArtistScopedTrackSearch(
      q,
      maxResults,
      pageSize,
      'full',
    )
    if (artistTracks.length > 0) return artistTracks
  }

  let collected: SoundtrackTrackRow[] = []
  let after: string | null = null

  const maxPages = artistSearchMode === 'quick' ? 1 : 24
  const generalPageSize =
    artistSearchMode === 'quick' ? SOUNDTRACK_QUICK_SEARCH_PAGE_SIZE : pageSize
  for (let page = 0; page < maxPages; page++) {
    const data = await fetchSoundtrackTrackSearchPage(q, generalPageSize, after)

    for (const edge of data.search?.edges ?? []) {
      if (edge.node.__typename !== 'Track') continue
      const row = mapTrack(edge.node)
      if (row) collected.push(row)
    }

    collected = dedupeSearchTrackRows(collected)
    if (collected.length >= maxResults) break

    const pi = data.search?.pageInfo
    if (!pi?.hasNextPage || !pi.endCursor) break
    after = pi.endCursor
  }

  return collected.slice(0, maxResults)
}

async function skipSoundZoneTracksWithCrossfade(zoneId: string): Promise<void> {
  await soundtrackGraphql(
    `mutation($input: SkipTracksInput!) {
      skipTracks(input: $input) { __typename }
    }`,
    {
      input: {
        soundZone: zoneId,
        tracksToSkip: 1,
        crossfade: true,
      },
    },
  )
}

let soundtrackAccountIdCache: string | null = null

async function fetchSoundtrackAccountId(): Promise<string> {
  if (soundtrackAccountIdCache) return soundtrackAccountIdCache
  const data = await soundtrackGraphql<{
    me: {
      accounts: { edges: { node: { id: string } }[] }
    }
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

/** Volledige afspeellijst lineair — queue alleen is onbetrouwbaar t.o.v. schedule. */
async function playManualPlaylistOnSoundZone(
  zoneId: string,
  trackIds: string[],
  playlistName: string,
): Promise<void> {
  const filtered = trackIds.map((id) => id.trim()).filter((id) => id && !id.startsWith('placeholder-'))
  if (filtered.length === 0) throw new SoundtrackApiError('trackIds required')

  const accountId = await fetchSoundtrackAccountId()
  const name = (playlistName.trim() || 'Vysion afspeellijst').slice(0, 120)

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
  const sourceId = created.createManualPlaylist?.id?.trim()
  if (!sourceId) throw new SoundtrackApiError('Soundtrack playlist create failed')

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
    /* Niet elke context ondersteunt playback order na manual playlist. */
  }

  await soundtrackGraphql(
    `mutation($input: PlayInput!) { play(input: $input) { status } }`,
    { input: { soundZone: zoneId } },
  )
}

async function queueTracksOnSoundZone(
  zoneId: string,
  trackIds: string[],
  clearQueuedTracks: boolean,
): Promise<void> {
  const ids = trackIds.map((id) => id.trim()).filter(Boolean)
  if (ids.length === 0) throw new SoundtrackApiError('trackIds required')
  await soundtrackGraphql(
    `mutation($input: SoundZoneQueueTracksInput!) {
      soundZoneQueueTracks(input: $input) { __typename }
    }`,
    {
      input: {
        soundZone: zoneId,
        tracks: ids,
        immediate: true,
        clearQueuedTracks,
      },
    },
  )
}

async function playQueuedTracksOnSoundZone(zoneId: string, trackIds: string[]): Promise<void> {
  const filtered = trackIds
    .map((id) => id.trim())
    .filter((id) => id && !id.startsWith('placeholder-'))
  if (filtered.length === 0) throw new SoundtrackApiError('trackIds required')
  await queueTracksOnSoundZone(zoneId, filtered, true)
  await soundtrackGraphql(
    `mutation($input: PlayInput!) { play(input: $input) { status } }`,
    { input: { soundZone: zoneId } },
  )
}

export async function soundtrackControl(
  zoneId: string,
  op: 'play' | 'pause' | 'skipNext' | 'stop' | 'setVolume' | 'playTrack' | 'playPlaylist',
  opts?: { volume?: number; trackId?: string; trackIds?: string[]; playlistName?: string },
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
      await skipSoundZoneTracksWithCrossfade(zoneId)
      return
    case 'setVolume': {
      const ui = typeof opts?.volume === 'number' ? opts.volume : 0
      const volume = soundtrackUiPercentToApiVolume(ui)
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
      // Nooit skipTracks hier: skip gaat naar volgende station-/playlist-track, niet naar
      // de zojuist gequeue'de zoekresultaat-track.
      await queueTracksOnSoundZone(zoneId, [trackId], true)
      await soundtrackGraphql(
        `mutation($input: PlayInput!) { play(input: $input) { status } }`,
        { input: { soundZone: zoneId } },
      )
      return
    }
    case 'playPlaylist': {
      const trackIds = opts?.trackIds ?? []
      try {
        await playManualPlaylistOnSoundZone(zoneId, trackIds, opts?.playlistName ?? '')
      } catch (manualErr) {
        console.error('[soundtrack] playManualPlaylist failed, fallback to queue', manualErr)
        await playQueuedTracksOnSoundZone(zoneId, trackIds)
      }
      return
    }
    default:
      throw new SoundtrackApiError('Unknown control op')
  }
}
