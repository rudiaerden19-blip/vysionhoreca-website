import { getServerSupabaseClient } from '@/lib/supabase-server'
import {
  SoundtrackApiError,
  SoundtrackConfigError,
  soundtrackGraphql,
} from '@/lib/soundtrack/soundtrack-server'

export type SoundtrackLibraryPlaylist = {
  id: string
  name: string
  trackCount: number
}

export type SoundtrackGql = <T = Record<string, unknown>>(
  query: string,
  variables?: Record<string, unknown>,
) => Promise<T>

const zoneIdByTenantCache = new Map<string, string>()
const zoneIdByNameCache = new Map<string, string>()

type AccountLibrary = {
  accountId: string
  libraryId: string
  playlists: SoundtrackLibraryPlaylist[]
}

const LIBRARY_QUERY = `query($id: ID!) {
  soundZone(id: $id) {
    account {
      id
      musicLibrary {
        id
        playlists(first: 100) {
          edges {
            node {
              id
              name
              tracks(first: 1) {
                totalCount
              }
            }
          }
        }
      }
    }
  }
}`

/**
 * Zone van deze tenant: tenant_settings, anders de omgevings-default.
 * Eén Soundtrack-account kan meerdere zones hebben; de lijst hangt aan het account van déze zone.
 */
export async function resolveSoundZoneIdForTenant(tenantSlug: string): Promise<string> {
  const slug = tenantSlug.trim()
  if (!slug) throw new SoundtrackConfigError('tenant slug required')
  const cached = zoneIdByTenantCache.get(slug)
  if (cached) return cached

  const fromEnvId = (process.env.SOUNDTRACK_DEFAULT_SOUND_ZONE_ID || '').trim()
  const fromEnvName = (process.env.SOUNDTRACK_DEFAULT_ZONE_NAME || '').trim()

  let resolved = ''
  const supabase = getServerSupabaseClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('tenant_settings')
      .select('soundtrack_sound_zone_id, soundtrack_zone_name')
      .eq('tenant_slug', slug)
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
      'No Soundtrack sound zone configured for this tenant',
    )
  }

  zoneIdByTenantCache.set(slug, resolved)
  return resolved
}

async function resolveSoundZoneIdByDisplayName(name: string): Promise<string> {
  const needle = name.trim()
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

  for (const account of data.me?.accounts?.edges ?? []) {
    for (const location of account.node.locations?.edges ?? []) {
      for (const zone of location.node.soundZones?.edges ?? []) {
        if (zone.node.name.trim() === needle) {
          zoneIdByNameCache.set(cacheKey, zone.node.id)
          return zone.node.id
        }
      }
    }
  }
  throw new SoundtrackConfigError(`Soundtrack zone not found: ${needle}`)
}

function mapPlaylists(
  edges:
    | {
        node: {
          id?: string
          name?: string
          tracks?: { totalCount?: number } | null
        }
      }[]
    | null
    | undefined,
): SoundtrackLibraryPlaylist[] {
  const rows: SoundtrackLibraryPlaylist[] = []
  for (const edge of edges ?? []) {
    const id = edge.node?.id?.trim()
    const name = edge.node?.name?.trim()
    if (!id || !name) continue
    const total = edge.node.tracks?.totalCount
    rows.push({
      id,
      name,
      trackCount: typeof total === 'number' && total > 0 ? Math.floor(total) : 0,
    })
  }
  rows.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  return rows
}

async function fetchAccountLibrary(zoneId: string, gql: SoundtrackGql): Promise<AccountLibrary> {
  const data = await gql<{
    soundZone: {
      account: {
        id: string
        musicLibrary: {
          id: string
          playlists: {
            edges: {
              node: {
                id?: string
                name?: string
                tracks?: { totalCount?: number } | null
              }
            }[]
          }
        } | null
      } | null
    } | null
  }>(LIBRARY_QUERY, { id: zoneId })

  const account = data.soundZone?.account
  const library = account?.musicLibrary
  if (!account?.id || !library?.id) {
    throw new SoundtrackApiError('Soundtrack zone has no music library')
  }
  return {
    accountId: account.id,
    libraryId: library.id,
    playlists: mapPlaylists(library.playlists?.edges),
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
  }
}
