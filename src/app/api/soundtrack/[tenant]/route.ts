import { NextRequest, NextResponse } from 'next/server'
import { authorizeSoundtrackTenantRequest } from '@/lib/soundtrack/soundtrack-dev-auth'
import {
  isSoundtrackPublicMutationName,
  soundtrackExecutePublicMutation,
} from '@/lib/soundtrack/soundtrack-public-mutations'
import {
  createManualPlaylistInMusicLibrary,
  listSoundtrackLibraryPlaylists,
} from '@/lib/soundtrack/soundtrack-playlists'
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
} from '@/lib/soundtrack/soundtrack-server'

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
          'createManualPlaylist',
        ].join(', ')}`,
      },
      { status: 400 },
    )
  }

  const input = { ...(body.input ?? {}) }

  try {
    const zoneId = (await resolveSoundZoneForTenant(tenantSlug)).zoneId

    if (mutation === 'createManualPlaylist') {
      const name = String(input.name ?? '').trim()
      if (!name) {
        return NextResponse.json({ error: 'input.name vereist' }, { status: 400 })
      }
      const playlist = await createManualPlaylistInMusicLibrary(zoneId, name)
      const playlists = await listSoundtrackLibraryPlaylists(zoneId)
      return NextResponse.json({ ok: true, mutation, playlist, playlists })
    }

    if (mutation === 'setVolume') {
      const ui = typeof input.volume === 'number' ? input.volume : 0
      input.volume = soundtrackUiPercentToApiVolume(ui)
    }

    if (mutation === 'soundZoneAssignSource') {
      const librarySourceId = String(input.source ?? '').trim()
      const { runtimeSourceId } = await resolveSoundtrackRuntimeAssignSourceId(
        zoneId,
        librarySourceId,
      )

      const assignInput: Record<string, unknown> = {
        ...input,
        source: runtimeSourceId,
      }
      try {
        const runtimeSnapshot = await fetchPlaylistSourceSnapshot(runtimeSourceId)
        if (runtimeSnapshot) assignInput.sourceSnapshot = runtimeSnapshot
      } catch {
        /* schedule / soundtrack sources may not expose playlist snapshot */
      }

      await soundtrackExecutePublicMutation(zoneId, 'soundZoneAssignSource', assignInput)
    } else {
      await soundtrackExecutePublicMutation(zoneId, mutation, input)
    }

    const snapshot = await fetchSoundtrackPlayerSnapshot(zoneId)
    return NextResponse.json({ ok: true, mutation, snapshot })
  } catch (e) {
    if (e instanceof SoundtrackConfigError) {
      return NextResponse.json({ error: e.message, code: 'config' }, { status: 503 })
    }
    if (e instanceof SoundtrackApiError) {
      return NextResponse.json(
        { ok: false, error: e.message, code: 'soundtrack' },
        { status: e.status },
      )
    }
    return NextResponse.json({ error: 'Soundtrack mutation failed' }, { status: 500 })
  }
}
