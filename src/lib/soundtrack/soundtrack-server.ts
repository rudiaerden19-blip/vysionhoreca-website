import {
  mapSoundtrackTrackRow,
  SOUNDTRACK_TRACK_GRAPHQL_FIELDS,
  type SoundtrackTrackGraphNode,
  type SoundtrackTrackRow,
} from '@/lib/soundtrack/soundtrack-track-map'

import {
  soundtrackApiBasicAuthorizationHeader,
  soundtrackApiBasicToken,
} from '@/lib/soundtrack/soundtrack-api-basic'
import { getServerSupabaseClient } from '@/lib/supabase-server'

export type { SoundtrackTrackRow } from '@/lib/soundtrack/soundtrack-track-map'

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
  try {
    return soundtrackApiBasicToken()
  } catch (e) {
    throw new SoundtrackConfigError(
      e instanceof Error ? e.message : 'Soundtrack niet geconfigureerd (SOUNDTRACK_API_BASIC).',
    )
  }
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

type SoundZoneRef = { id: string; name: string }

const ALL_SOUND_ZONES_TTL_MS = 120_000
let allSoundZonesCache: { fetchedAt: number; zones: SoundZoneRef[] } | null = null

function normalizeSoundZoneNameKey(name: string): string {
  return name.trim().toLowerCase()
}

/** Alle zones onder het Vercel Soundtrack API-token (partner-account). */
async function fetchAllSoundZonesFromApi(): Promise<SoundZoneRef[]> {
  const now = Date.now()
  if (allSoundZonesCache && now - allSoundZonesCache.fetchedAt < ALL_SOUND_ZONES_TTL_MS) {
    return allSoundZonesCache.zones
  }

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

  const zones: SoundZoneRef[] = []
  for (const ae of data.me?.accounts?.edges ?? []) {
    for (const le of ae.node.locations?.edges ?? []) {
      for (const se of le.node.soundZones?.edges ?? []) {
        const id = se.node.id?.trim()
        const name = se.node.name?.trim()
        if (id && name) zones.push({ id, name })
      }
    }
  }
  allSoundZonesCache = { fetchedAt: now, zones }
  return zones
}

function findSoundZoneIdByDisplayName(zones: SoundZoneRef[], zoneName: string): string | null {
  const key = normalizeSoundZoneNameKey(zoneName)
  if (!key) return null
  for (const z of zones) {
    if (normalizeSoundZoneNameKey(z.name) === key) return z.id
  }
  return null
}

async function resolveSoundZoneIdByDisplayName(zoneName: string): Promise<string> {
  const needle = zoneName.trim()
  if (!needle) throw new SoundtrackConfigError('Empty Soundtrack zone name')
  const cacheKey = normalizeSoundZoneNameKey(needle)
  const cached = zoneIdByNameCache.get(cacheKey)
  if (cached) return cached

  const zones = await fetchAllSoundZonesFromApi()
  const id = findSoundZoneIdByDisplayName(zones, needle)
  if (!id) throw new SoundtrackConfigError(`Soundtrack zone not found: ${needle}`)
  zoneIdByNameCache.set(cacheKey, id)
  return id
}

export type SoundtrackZoneLinkSource =
  | 'tenant_id'
  | 'tenant_name'
  | 'env_id'
  | 'env_name'

export type SoundtrackZoneResolution = {
  zoneId: string
  linkSource: SoundtrackZoneLinkSource
  /** True wanneer tenant_settings een zone heeft (niet alleen Vercel-default). */
  tenantConfigured: boolean
}

const zoneResolutionCache = new Map<string, SoundtrackZoneResolution>()

export function invalidateSoundtrackZoneCacheForTenant(tenantSlug: string): void {
  const slug = tenantSlug.trim()
  zoneIdByTenantCache.delete(slug)
  zoneResolutionCache.delete(slug)
}

export async function resolveSoundZoneForTenant(
  tenantSlug: string,
): Promise<SoundtrackZoneResolution> {
  const slug = tenantSlug.trim()
  if (!slug) throw new SoundtrackConfigError('tenant slug required')

  const cached = zoneResolutionCache.get(slug)
  if (cached) return cached

  const fromEnvId = (process.env.SOUNDTRACK_DEFAULT_SOUND_ZONE_ID || '').trim()
  const fromEnvName = (process.env.SOUNDTRACK_DEFAULT_ZONE_NAME || '').trim()

  let resolved = ''
  let linkSource: SoundtrackZoneLinkSource = 'env_name'

  let businessName = ''
  const supabase = getServerSupabaseClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('tenant_settings')
      .select('soundtrack_sound_zone_id, soundtrack_zone_name, business_name')
      .eq('tenant_slug', slug)
      .maybeSingle()
    if (!error && data) {
      businessName = (data.business_name as string | null | undefined)?.trim() || ''
      const fromTenantId = (data.soundtrack_sound_zone_id as string | null | undefined)?.trim()
      if (fromTenantId) {
        resolved = fromTenantId
        linkSource = 'tenant_id'
      } else {
        const fromTenantName = (data.soundtrack_zone_name as string | null | undefined)?.trim()
        if (fromTenantName) {
          resolved = await resolveSoundZoneIdByDisplayName(fromTenantName)
          linkSource = 'tenant_name'
        }
      }
    }
  }

  /** Per tenant: zone in Soundtrack heet meestal zoals slug of zaaknaam (eigen player op PC). */
  if (!resolved) {
    const zones = await fetchAllSoundZonesFromApi()
    const bySlug = findSoundZoneIdByDisplayName(zones, slug)
    if (bySlug) {
      resolved = bySlug
      linkSource = 'tenant_name'
    } else if (businessName) {
      const byBusiness = findSoundZoneIdByDisplayName(zones, businessName)
      if (byBusiness) {
        resolved = byBusiness
        linkSource = 'tenant_name'
      }
    }
  }

  if (!resolved && fromEnvId) {
    resolved = fromEnvId
    linkSource = 'env_id'
  }
  if (!resolved && fromEnvName) {
    resolved = await resolveSoundZoneIdByDisplayName(fromEnvName)
    linkSource = 'env_name'
  }

  if (!resolved) {
    throw new SoundtrackConfigError(
      `Geen Soundtrack-zone voor tenant «${slug}». Noem de zone in Soundtrack hetzelfde als de tenant-slug of zaaknaam, of zet soundtrack_sound_zone_id in tenant_settings.`,
    )
  }

  const out: SoundtrackZoneResolution = {
    zoneId: resolved,
    linkSource,
    tenantConfigured: linkSource === 'tenant_id' || linkSource === 'tenant_name',
  }
  zoneIdByTenantCache.set(slug, resolved)
  zoneResolutionCache.set(slug, out)
  return out
}

export async function resolveSoundZoneIdForTenant(tenantSlug: string): Promise<string> {
  return (await resolveSoundZoneForTenant(tenantSlug)).zoneId
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
  /** Tracks uit Soundtrack `playFrom` (manual playlist), niet playback history. */
  playlist: SoundtrackTrackRow[]
  playFromPlaylistId: string | null
  playFromTypename: string | null
  zoneLinkSource?: SoundtrackZoneLinkSource
  tenantZoneConfigured?: boolean
}

/** Lege zone — lokaal zonder Soundtrack-token (UI blijft bruikbaar). */
export function emptySoundtrackPlayerSnapshot(
  zoneName = '—',
): SoundtrackPlayerSnapshot {
  return {
    zoneId: '',
    zoneName,
    online: false,
    isPaired: false,
    deviceName: null,
    playbackState: 'paused',
    volume: 0,
    nowPlaying: { track: null, startedAt: null, progressMs: 0 },
    playlist: [],
    playFromPlaylistId: null,
    playFromTypename: null,
  }
}

export async function fetchSoundtrackPlayerSnapshot(
  zoneId: string,
  _opts?: { historyFirst?: number; padPlaylist?: boolean },
): Promise<SoundtrackPlayerSnapshot> {
  void _opts
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
        track: SoundtrackTrackGraphNode | null
      } | null
      playFrom: {
        __typename: string
        id?: string
      } | null
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
            ${SOUNDTRACK_TRACK_GRAPHQL_FIELDS}
          }
        }
        playFrom {
          __typename
          ... on Playlist { id }
          ... on Soundtrack { id }
          ... on Schedule { id }
        }
      }
    }`,
    { id: zoneId },
  )

  const sz = data.soundZone
  const nowTrack = mapSoundtrackTrackRow(sz.nowPlaying?.track ?? null)
  const startedAt = sz.nowPlaying?.startedAt ?? null
  let progressMs = 0
  if (startedAt && nowTrack?.durationMs) {
    progressMs = Math.min(
      nowTrack.durationMs,
      Math.max(0, Date.now() - new Date(startedAt).getTime()),
    )
  }

  const playFrom = sz.playFrom
  const playFromTypename = playFrom?.__typename ?? null
  let playFromPlaylistId: string | null = null
  let playlist: SoundtrackTrackRow[] = []

  if (playFrom?.__typename === 'Playlist' || playFrom?.__typename === 'Soundtrack') {
    playFromPlaylistId = playFrom.id?.trim() || null
  }

  return {
    zoneId: sz.id,
    zoneName: sz.name,
    online: sz.online,
    isPaired: sz.isPaired,
    deviceName: sz.device?.name ?? null,
    playbackState: sz.playback?.state ?? 'paused',
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
    playFromPlaylistId,
    playFromTypename,
  }
}

/** Soundtrack `skipTracks` — volgende track(s) in huidige playFrom/queue. */
export async function skipSoundZoneTracks(
  zoneId: string,
  tracksToSkip: number,
  crossfade = true,
): Promise<void> {
  const n = Math.max(0, Math.floor(tracksToSkip))
  if (n === 0) return
  await soundtrackGraphql(
    `mutation($input: SkipTracksInput!) {
      skipTracks(input: $input) { __typename }
    }`,
    {
      input: {
        soundZone: zoneId,
        tracksToSkip: n,
        crossfade,
      },
    },
  )
}

/** Soundtrack `play` mutation. */
export async function soundtrackPlayZone(zoneId: string): Promise<void> {
  await soundtrackGraphql(
    `mutation($input: PlayInput!) { play(input: $input) { status } }`,
    { input: { soundZone: zoneId } },
  )
}

/** Soundtrack `pause` mutation (stop = pause). */
export async function soundtrackPauseZone(zoneId: string): Promise<void> {
  await soundtrackGraphql(
    `mutation($input: PauseInput!) { pause(input: $input) { status } }`,
    { input: { soundZone: zoneId } },
  )
}

/** Soundtrack `skipTrack` (één track vooruit). */
export async function soundtrackSkipTrack(zoneId: string): Promise<void> {
  await soundtrackGraphql(
    `mutation($input: SkipTrackInput!) { skipTrack(input: $input) { __typename } }`,
    { input: { soundZone: zoneId } },
  )
}

/** Zone laten spelen vanaf playlist/station/schedule (Soundtrack `setPlayFrom`). */
export async function soundtrackApplyPlayFromSource(
  zoneId: string,
  sourceId: string,
): Promise<void> {
  const source = sourceId.trim()
  if (!source) throw new SoundtrackApiError('source id required', 400)
  await soundtrackGraphql(
    `mutation($input: SetPlayFromInput!) { setPlayFrom(input: $input) { __typename } }`,
    { input: { soundZone: zoneId, source } },
  )
  await soundtrackPlayZone(zoneId)
}

function dedupeTrackRows(rows: SoundtrackTrackRow[]): SoundtrackTrackRow[] {
  const seen = new Set<string>()
  const out: SoundtrackTrackRow[] = []
  for (const row of rows) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    out.push(row)
  }
  return out
}

export async function fetchPlaylistTrackRows(playlistId: string): Promise<SoundtrackTrackRow[]> {
  const id = playlistId.trim()
  const data = await soundtrackGraphql<{
    playlist: {
      tracks: { edges: { node: SoundtrackTrackGraphNode }[] }
    } | null
  }>(
    `query($id: ID!) {
      playlist(id: $id) {
        tracks(first: 500) {
          edges { node { ${SOUNDTRACK_TRACK_GRAPHQL_FIELDS} } }
        }
      }
    }`,
    { id },
  )
  const rows: SoundtrackTrackRow[] = []
  for (const edge of data.playlist?.tracks?.edges ?? []) {
    const row = mapSoundtrackTrackRow(edge.node)
    if (row) rows.push(row)
  }
  return rows
}

/** Tracks voor manual playlist of Soundtrack-station in de bibliotheek. */
export async function fetchPlaySourceTrackRows(sourceId: string): Promise<SoundtrackTrackRow[]> {
  const id = sourceId.trim()
  const fromPlaylist = await fetchPlaylistTrackRows(id).catch(() => [] as SoundtrackTrackRow[])
  if (fromPlaylist.length > 0) return fromPlaylist

  const data = await soundtrackGraphql<{
    soundtrack: {
      tracks: { edges: { node: SoundtrackTrackGraphNode }[] }
    } | null
  }>(
    `query($id: ID!) {
      soundtrack(id: $id) {
        tracks(first: 500) {
          edges { node { ${SOUNDTRACK_TRACK_GRAPHQL_FIELDS} } }
        }
      }
    }`,
    { id },
  )
  const rows: SoundtrackTrackRow[] = []
  for (const edge of data.soundtrack?.tracks?.edges ?? []) {
    const row = mapSoundtrackTrackRow(edge.node)
    if (row) rows.push(row)
  }
  return rows
}

export async function soundtrackSearchTracks(
  query: string,
  opts?: { maxResults?: number },
): Promise<SoundtrackTrackRow[]> {
  const q = query.trim()
  if (!q) return []
  const maxResults = Math.min(Math.max(opts?.maxResults ?? 80, 1), SOUNDTRACK_GENERAL_SEARCH_MAX_TRACKS)
  const pageSize = SOUNDTRACK_QUICK_SEARCH_PAGE_SIZE
  const data = await soundtrackGraphql<{
    search: {
      edges: { node: SoundtrackTrackGraphNode & { __typename?: string } }[]
    }
  }>(
    `query($q: String!, $first: Int!) {
      search(query: $q, type: track, first: $first) {
        edges {
          node {
            __typename
            ... on Track { ${SOUNDTRACK_TRACK_GRAPHQL_FIELDS} }
          }
        }
      }
    }`,
    { q, first: pageSize },
  )
  const rows: SoundtrackTrackRow[] = []
  for (const edge of data.search?.edges ?? []) {
    if (edge.node.__typename !== 'Track') continue
    const row = mapSoundtrackTrackRow(edge.node)
    if (row) rows.push(row)
  }
  return dedupeTrackRows(rows).slice(0, maxResults)
}

async function soundtrackSetPlaybackOrderLinear(zoneId: string): Promise<void> {
  try {
    await soundtrackGraphql(
      `mutation($input: SoundZoneSetPlaybackOrderInput!) {
        soundZoneSetPlaybackOrder(input: $input) { __typename }
      }`,
      { input: { soundZone: zoneId, playbackOrder: 'LINEAR' } },
    )
  } catch {
    /* optioneel */
  }
}

async function waitForNowPlayingTrackId(
  zoneId: string,
  trackId: string,
  maxMs = 8000,
): Promise<void> {
  const want = trackId.trim()
  if (!want) return
  const deadline = Date.now() + maxMs
  while (Date.now() < deadline) {
    const snap = await fetchSoundtrackPlayerSnapshot(zoneId)
    if (snap.nowPlaying.track?.id === want) return
    await sleep(350)
  }
}

export async function soundtrackJumpToPlaylistTrack(
  zoneId: string,
  playlistId: string,
  trackId: string,
): Promise<void> {
  const source = playlistId.trim()
  const wantId = trackId.trim()
  if (!source || !wantId) throw new SoundtrackApiError('source and trackId required')

  const rows = await fetchPlaySourceTrackRows(source)
  const ids = rows.map((r) => r.id)
  const targetIndex = ids.indexOf(wantId)
  if (targetIndex < 0) throw new SoundtrackApiError('Track not in this list')

  const snap = await fetchSoundtrackPlayerSnapshot(zoneId)
  const samePlayFrom = snap.playFromPlaylistId === source
  const nowId = snap.nowPlaying.track?.id ?? null
  const currentIndex = nowId ? ids.indexOf(nowId) : -1

  if (samePlayFrom && currentIndex >= 0) {
    if (targetIndex === currentIndex) {
      await soundtrackPlayZone(zoneId)
      return
    }
    if (targetIndex > currentIndex) {
      await skipSoundZoneTracks(zoneId, targetIndex - currentIndex, true)
      return
    }
  }

  await soundtrackPauseZone(zoneId)
  await soundtrackGraphql(
    `mutation($input: SetPlayFromInput!) { setPlayFrom(input: $input) { __typename } }`,
    { input: { soundZone: zoneId, source } },
  )
  await soundtrackSetPlaybackOrderLinear(zoneId)
  await soundtrackPlayZone(zoneId)

  const firstId = ids[0]
  if (firstId) await waitForNowPlayingTrackId(zoneId, firstId)

  if (targetIndex > 0) {
    await skipSoundZoneTracks(zoneId, targetIndex, true)
    await waitForNowPlayingTrackId(zoneId, wantId, 10000)
  }
}

export async function soundtrackQueueAndPlayTrack(
  zoneId: string,
  trackId: string,
): Promise<void> {
  const id = trackId.trim()
  if (!id) throw new SoundtrackApiError('trackId required')
  await soundtrackGraphql(
    `mutation($input: SoundZoneQueueTracksInput!) {
      soundZoneQueueTracks(input: $input) { __typename }
    }`,
    {
      input: {
        soundZone: zoneId,
        tracks: [id],
        immediate: true,
        clearQueuedTracks: true,
      },
    },
  )
  await soundtrackPlayZone(zoneId)
}
