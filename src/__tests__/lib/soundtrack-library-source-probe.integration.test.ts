/**
 * Diagnose library source IDs vs playFrom (lokaal, niet in CI verplicht).
 * npm test -- --testPathPatterns=soundtrack-library-source-probe.integration --runInBand
 */
import { listSoundtrackLibraryPlaylists } from '@/lib/soundtrack/soundtrack-playlists'
import {
  fetchSoundtrackPlayerSnapshot,
  resolveSoundZoneForTenant,
  soundtrackGraphql,
  soundtrackGraphqlRaw,
} from '@/lib/soundtrack/soundtrack-server'

const hasToken = Boolean(process.env.SOUNDTRACK_API_BASIC?.trim())
const tenant =
  (process.env.SOUNDTRACK_DEBUG_TENANT_SLUG || process.env.SOUNDTRACK_DEFAULT_ZONE_NAME || '').trim()
const probeName = (process.env.SOUNDTRACK_DEBUG_PLAYLIST_NAME || 'New Style Disco').trim()

function decodeSoundtrackId(id: string): string {
  try {
    return Buffer.from(id.replace(/=+$/, ''), 'base64').toString('utf8')
  } catch {
    return id
  }
}

;(hasToken && tenant ? describe : describe.skip)('library source id probe', () => {
  it('reports __typename, ids, and SoundZoneAssignSourceInput.source type', async () => {
    const intro = await soundtrackGraphqlRaw(
      `query {
        assign: __type(name: "SoundZoneAssignSourceInput") {
          inputFields {
            name
            type { kind name ofType { kind name ofType { kind name ofType { kind name } } } }
          }
        }
        setPlay: __type(name: "SetPlayFromInput") {
          inputFields {
            name
            type { kind name ofType { kind name ofType { kind name ofType { kind name } } } }
          }
        }
      }`,
      {},
    )
    // eslint-disable-next-line no-console
    console.log('\n=== SCHEMA INPUT TYPES ===\n', JSON.stringify(intro.body.data, null, 2))

    const { zoneId } = await resolveSoundZoneForTenant(tenant)
    const snap = await fetchSoundtrackPlayerSnapshot(zoneId)

    const libId = (
      await soundtrackGraphql<{
        soundZone: { account: { musicLibrary: { id: string } | null } | null } | null
      }>(`query($id: ID!) { soundZone(id: $id) { account { musicLibrary { id } } } }`, {
        id: zoneId,
      })
    ).soundZone?.account?.musicLibrary?.id

    expect(libId).toBeTruthy()

    const rich = await soundtrackGraphql<{
      musicLibrary: {
        ids?: string[] | null
        playlists?: {
          edges: {
            node: {
              __typename: string
              id: string
              name?: string | null
              composerType?: string | null
            }
          }[]
        } | null
      } | null
    }>(
      `query($id: ID!) {
        musicLibrary(id: $id) {
          ids
          playlists(first: 200) {
            edges {
              node {
                __typename
                id
                name
                composerType
              }
            }
          }
        }
      }`,
      { id: libId! },
    )

    const lists = await listSoundtrackLibraryPlaylists(zoneId)
    const targetList = lists.find((p) => p.name === probeName)
    const targetNode = rich.musicLibrary?.playlists?.edges?.find(
      (e) => (e.node.name ?? '').trim() === probeName,
    )?.node

    const introData = intro.body.data as {
      assign?: { inputFields?: { name: string; type?: unknown }[] }
    } | null
    const assignSourceField = introData?.assign?.inputFields?.find((f) => f.name === 'source')

    const report = {
      tenant,
      zoneId,
      currentPlayFrom: {
        playFromTypename: snap.playFromTypename,
        playFromId: snap.playFromPlaylistId,
        playFromDecoded: snap.playFromPlaylistId
          ? decodeSoundtrackId(snap.playFromPlaylistId)
          : null,
        nowPlaying: snap.nowPlaying.track?.name ?? null,
      },
      SoundZoneAssignSourceInput_source_field: assignSourceField,
      displayedSourceFromListApi: targetList
        ? {
            id: targetList.id,
            decoded: decodeSoundtrackId(targetList.id),
            name: targetList.name,
            sourceKind: targetList.sourceKind,
          }
        : null,
      graphqlPlaylistNode: targetNode
        ? {
            __typename: targetNode.__typename,
            id: targetNode.id,
            decoded: decodeSoundtrackId(targetNode.id),
            composerType: targetNode.composerType,
          }
        : null,
      idsContainsListId: targetList
        ? (rich.musicLibrary?.ids ?? []).includes(targetList.id)
        : null,
    }

    // eslint-disable-next-line no-console
    console.log('\n=== LIBRARY SOURCE PROBE ===\n', JSON.stringify(report, null, 2))

    // Extra field probes (may fail if schema differs)
    if (targetList?.id) {
      for (const extra of [
        `query($id: ID!) { node(id: $id) { __typename ... on Playlist { id name playFrom { __typename id } } } }`,
        `query($id: ID!) { playlist(id: $id) { id name } }`,
      ]) {
        try {
          const r = await soundtrackGraphqlRaw(extra, { id: targetList.id })
          // eslint-disable-next-line no-console
          console.log('\n=== EXTRA QUERY ===\n', extra.slice(0, 60), '...\n', JSON.stringify(r.body, null, 2))
        } catch (e) {
          // eslint-disable-next-line no-console
          console.log('extra query failed', String(e))
        }
      }
    }
  }, 120_000)
})
