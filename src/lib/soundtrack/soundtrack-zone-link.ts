import { getServerSupabaseClient } from '@/lib/supabase-server'
import {
  invalidateSoundtrackZoneCacheForTenant,
  soundtrackGraphql,
} from '@/lib/soundtrack/soundtrack-server'

export type SoundtrackZoneListItem = {
  id: string
  name: string
  locationName: string
  online: boolean
  isPaired: boolean
  deviceName: string | null
}

const ME_SOUND_ZONES_QUERY = `query {
  me {
    ... on PublicAPIClient {
      accounts(first: 25) {
        edges {
          node {
            locations(first: 50) {
              edges {
                node {
                  name
                  soundZones(first: 50) {
                    edges {
                      node {
                        id
                        name
                        online
                        isPaired
                        device { name }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}`

/** Alle sound zones onder het Soundtrack API-token (voor koppelen per tenant). */
export async function listSoundtrackSoundZones(): Promise<SoundtrackZoneListItem[]> {
  const data = await soundtrackGraphql<{
    me: {
      accounts: {
        edges: {
          node: {
            locations: {
              edges: {
                node: {
                  name: string
                  soundZones: {
                    edges: {
                      node: {
                        id: string
                        name: string
                        online: boolean
                        isPaired: boolean
                        device: { name: string } | null
                      }
                    }[]
                  }
                }
              }[]
            }
          }
        }[]
      }
    }
  }>(ME_SOUND_ZONES_QUERY)

  const rows: SoundtrackZoneListItem[] = []
  for (const account of data.me?.accounts?.edges ?? []) {
    for (const location of account.node.locations?.edges ?? []) {
      const locationName = location.node.name?.trim() || '—'
      for (const zone of location.node.soundZones?.edges ?? []) {
        const id = zone.node.id?.trim()
        const name = zone.node.name?.trim()
        if (!id || !name) continue
        rows.push({
          id,
          name,
          locationName,
          online: Boolean(zone.node.online),
          isPaired: Boolean(zone.node.isPaired),
          deviceName: zone.node.device?.name?.trim() || null,
        })
      }
    }
  }
  rows.sort((a, b) => {
    const loc = a.locationName.localeCompare(b.locationName, undefined, { sensitivity: 'base' })
    if (loc !== 0) return loc
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })
  return rows
}

/** Slaat de Soundtrack-zone voor deze tenant op (multi-tenant koppeling). */
export async function persistTenantSoundtrackZone(
  tenantSlug: string,
  zoneId: string,
  zoneName?: string | null,
): Promise<void> {
  const slug = tenantSlug.trim()
  const id = zoneId.trim()
  if (!slug || !id) throw new Error('tenant and zone id required')

  const supabase = getServerSupabaseClient()
  if (!supabase) throw new Error('Database not configured')

  const name = zoneName?.trim() || null
  const { error } = await supabase
    .from('tenant_settings')
    .update({
      soundtrack_sound_zone_id: id,
      soundtrack_zone_name: name,
    })
    .eq('tenant_slug', slug)

  if (error) throw new Error(error.message)
  invalidateSoundtrackZoneCacheForTenant(slug)
}
