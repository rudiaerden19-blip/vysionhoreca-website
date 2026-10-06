import { NextRequest, NextResponse } from 'next/server'
import { authorizeSoundtrackTenantRequest } from '@/lib/soundtrack/soundtrack-dev-auth'
import {
  graphqlResponseDebugPayload,
  isSoundtrackPublicMutationName,
  playlistAssignRequestDebug,
  soundtrackDebugSoundZoneQueueTracks,
  soundtrackExecutePublicMutation,
  soundtrackExecutePublicMutationLoggedSoft,
} from '@/lib/soundtrack/soundtrack-public-mutations'
import {
  SoundtrackApiError,
  SoundtrackConfigError,
  emptySoundtrackPlayerSnapshot,
  fetchPlaylistSourceSnapshot,
  fetchSoundtrackPlayerSnapshot,
  resolveSoundZoneForTenant,
  resolveSoundtrackRuntimeAssignSourceId,
  soundtrackSearchTracks,
  soundtrackUiPercentToApiVolume,
  type SoundtrackPlayerSnapshot,
} from '@/lib/soundtrack/soundtrack-server'

function snapshotPlaylistDebug(s: SoundtrackPlayerSnapshot) {
  return {
    zoneId: s.zoneId,
    online: s.online,
    isPaired: s.isPaired,
    playbackState: s.playbackState,
    playFromTypename: s.playFromTypename ?? null,
    playFromId: s.playFromPlaylistId ?? null,
    nowPlayingTrackId: s.nowPlaying.track?.id ?? null,
    nowPlayingTitle: s.nowPlaying.track?.name ?? null,
  }
}

function playlistClickFromInput(input: Record<string, unknown>) {
  return {
    sourceId: String(input.source ?? '').trim(),
    sourceName: String(input.debugSourceName ?? '').trim(),
    clickedTrackId: String(input.debugTrackId ?? '').trim(),
    clickedTrackTitle: String(input.debugTrackTitle ?? '').trim(),
    uiPosition: typeof input.debugUiPosition === 'number' ? input.debugUiPosition : null,
    sourceTrackIndex:
      typeof input.sourceTrackIndex === 'number' ? input.sourceTrackIndex : null,
  }
}

export const dynamic = 'force-dynamic'

type RouteContext = { params: { tenant: string } }

export async function GET(request: NextRequest, context: RouteContext) {
  const tenantSlug = context.params.tenant
  const access = await authorizeSoundtrackTenantRequest(request, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ error: access.error || 'Forbidden' }, { status: 403 })
  }

  try {
    const q = request.nextUrl.searchParams.get('q')?.trim()
    if (q) {
      const tracks = await soundtrackSearchTracks(q)
      return NextResponse.json({ ok: true, search: { query: q, tracks } })
    }

    const zoneId = (await resolveSoundZoneForTenant(tenantSlug)).zoneId
    const snapshot = await fetchSoundtrackPlayerSnapshot(zoneId)
    return NextResponse.json({ ok: true, snapshot })
  } catch (e) {
    if (e instanceof SoundtrackConfigError) {
      if (process.env.NODE_ENV === 'development') {
        const name =
          (process.env.SOUNDTRACK_DEFAULT_ZONE_NAME || '').trim() || tenantSlug
        return NextResponse.json({
          ok: true,
          snapshot: emptySoundtrackPlayerSnapshot(name),
        })
      }
      return NextResponse.json({ error: e.message, code: 'config' }, { status: 503 })
    }
    if (e instanceof SoundtrackApiError) {
      return NextResponse.json({ error: e.message, code: 'soundtrack' }, { status: e.status })
    }
    return NextResponse.json({ error: 'Soundtrack request failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const tenantSlug = context.params.tenant
  const access = await authorizeSoundtrackTenantRequest(request, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ error: access.error || 'Forbidden' }, { status: 403 })
  }

  let body: { mutation?: string; input?: Record<string, unknown> }
  try {
    body = (await request.json()) as { mutation?: string; input?: Record<string, unknown> }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const mutation = body.mutation?.trim() ?? ''
  if (!isSoundtrackPublicMutationName(mutation)) {
    return NextResponse.json(
      {
        error: `mutation must be a Soundtrack Public API name: ${[
          'play',
          'pause',
          'setPlayFrom',
          'soundZoneAssignSource',
          'soundZoneQueueTracks',
          'skipTrack',
          'skipTracks',
          'setVolume',
        ].join(', ')}`,
      },
      { status: 400 },
    )
  }

  const input = { ...(body.input ?? {}) }
  const isPlaylistTrackClick =
    mutation === 'soundZoneAssignSource' && typeof input.debugUiPosition === 'number'

  let playlistTrackDebug: Record<string, unknown> | undefined

  try {
    const zoneId = (await resolveSoundZoneForTenant(tenantSlug)).zoneId

    if (isPlaylistTrackClick || input.debugPlaylistPlay === true) {
      console.info('[soundtrack-debug playlist-post]', {
        tenantSlug,
        mutation,
        input,
        source: input.source ?? null,
        sourceTrackIndex: input.sourceTrackIndex ?? null,
      })
    }

    if (mutation === 'setVolume') {
      const ui = typeof input.volume === 'number' ? input.volume : 0
      input.volume = soundtrackUiPercentToApiVolume(ui)
    }

    let snapshotBefore: Awaited<ReturnType<typeof fetchSoundtrackPlayerSnapshot>> | null = null
    if (isPlaylistTrackClick) {
      snapshotBefore = await fetchSoundtrackPlayerSnapshot(zoneId)
      console.info('[soundtrack-debug playlist-click snapshot-before]', {
        zoneId: snapshotBefore.zoneId,
        online: snapshotBefore.online,
        isPaired: snapshotBefore.isPaired,
        playbackState: snapshotBefore.playbackState,
        playFromTypename: snapshotBefore.playFromTypename,
        playFromId: snapshotBefore.playFromPlaylistId,
        nowPlayingTrackId: snapshotBefore.nowPlaying.track?.id ?? null,
        nowPlayingTitle: snapshotBefore.nowPlaying.track?.name ?? null,
      })
    }

    if (mutation === 'soundZoneQueueTracks') {
      const trackId = Array.isArray(input.tracks) ? String(input.tracks[0] ?? '') : ''
      console.info('[soundtrack-debug soundZoneQueueTracks]', {
        tenantSlug,
        zoneIdBeforeMutation: zoneId,
        trackIdFromClient: trackId,
        mutationName: mutation,
      })
      await soundtrackDebugSoundZoneQueueTracks(zoneId, input)
    } else if (mutation === 'soundZoneAssignSource') {
      const librarySourceId = String(input.source ?? '').trim()
      const { runtimeSourceId, playFromTypename } =
        await resolveSoundtrackRuntimeAssignSourceId(zoneId, librarySourceId)

      const assignInput: Record<string, unknown> = {
        ...input,
        source: runtimeSourceId,
      }
      let runtimeSnapshot: string | null = null
      try {
        runtimeSnapshot = await fetchPlaylistSourceSnapshot(runtimeSourceId)
      } catch {
        runtimeSnapshot = null
      }
      if (runtimeSnapshot) assignInput.sourceSnapshot = runtimeSnapshot

      const sourceResolution = {
        displayedSource: {
          id: librarySourceId,
          assignSourceId: runtimeSourceId,
          playFromTypenameAfterSetPlayFrom: playFromTypename,
        },
        librarySourceId,
        runtimeSourceId,
        sourceSnapshotIncluded: Boolean(runtimeSnapshot),
      }

      if (isPlaylistTrackClick) {
        const logged = await soundtrackExecutePublicMutationLoggedSoft(
          zoneId,
          'soundZoneAssignSource',
          assignInput,
          '[soundtrack-debug soundZoneAssignSource]',
        )
        playlistTrackDebug = {
          click: playlistClickFromInput(input),
          sourceResolution,
          assign: {
            request: playlistAssignRequestDebug(zoneId, logged.graphqlVariables),
            response: graphqlResponseDebugPayload(logged.raw),
            ok: logged.ok,
            errorMessage: logged.errorMessage,
          },
        }
        if (!logged.ok) {
          throw new SoundtrackApiError(logged.errorMessage || 'soundZoneAssignSource failed')
        }
      } else {
        await soundtrackExecutePublicMutation(zoneId, 'soundZoneAssignSource', assignInput)
      }
    } else if (mutation === 'play' && input.debugPlaylistPlay === true) {
      const logged = await soundtrackExecutePublicMutationLoggedSoft(
        zoneId,
        'play',
        input,
        '[soundtrack-debug playlist-play]',
      )
      playlistTrackDebug = {
        play: {
          executed: true,
          request: { mutation: 'play', soundZoneId: zoneId },
          response: graphqlResponseDebugPayload(logged.raw),
          ok: logged.ok,
          errorMessage: logged.errorMessage,
        },
      }
      if (!logged.ok) {
        throw new SoundtrackApiError(logged.errorMessage || 'play failed')
      }
    } else {
      await soundtrackExecutePublicMutation(zoneId, mutation, input)
    }

    const snapshot = await fetchSoundtrackPlayerSnapshot(zoneId)
    if (mutation === 'soundZoneQueueTracks') {
      console.info('[soundtrack-debug soundZoneQueueTracks]', {
        snapshotAfterMutation: {
          zoneId: snapshot.zoneId,
          online: snapshot.online,
          isPaired: snapshot.isPaired,
          playbackState: snapshot.playbackState,
          nowPlayingTrackId: snapshot.nowPlaying.track?.id ?? null,
          nowPlayingTitle: snapshot.nowPlaying.track?.name ?? null,
        },
      })
    }
    if (isPlaylistTrackClick) {
      const clickedId = String(input.debugTrackId ?? '').trim()
      const nowId = snapshot.nowPlaying.track?.id ?? ''
      console.info('[soundtrack-debug playlist-click snapshot-after]', {
        zoneId: snapshot.zoneId,
        online: snapshot.online,
        isPaired: snapshot.isPaired,
        playbackState: snapshot.playbackState,
        playFromTypename: snapshot.playFromTypename,
        playFromId: snapshot.playFromPlaylistId,
        nowPlayingTrackId: nowId || null,
        nowPlayingTitle: snapshot.nowPlaying.track?.name ?? null,
        clickedTrackId: clickedId,
        trackIdMatch: Boolean(clickedId && nowId && clickedId === nowId),
        snapshotBefore: snapshotBefore
          ? {
              nowPlayingTrackId: snapshotBefore.nowPlaying.track?.id ?? null,
              playbackState: snapshotBefore.playbackState,
            }
          : null,
      })
    }
    if (playlistTrackDebug) {
      playlistTrackDebug.snapshotAfter = snapshotPlaylistDebug(snapshot)
    }
    return NextResponse.json({
      ok: true,
      mutation,
      snapshot,
      ...(playlistTrackDebug ? { debug: { playlistTrack: playlistTrackDebug } } : {}),
    })
  } catch (e) {
    if (e instanceof SoundtrackConfigError) {
      return NextResponse.json({ error: e.message, code: 'config' }, { status: 503 })
    }
    if (e instanceof SoundtrackApiError) {
      return NextResponse.json(
        {
          ok: false,
          error: e.message,
          code: 'soundtrack',
          ...(playlistTrackDebug ? { debug: { playlistTrack: playlistTrackDebug } } : {}),
        },
        { status: e.status },
      )
    }
    return NextResponse.json({ error: 'Soundtrack mutation failed' }, { status: 500 })
  }
}
