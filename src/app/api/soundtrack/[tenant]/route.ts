import { NextRequest, NextResponse } from 'next/server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import {
  SoundtrackApiError,
  SoundtrackConfigError,
  ensureSoundZoneCrossfadeSettings,
  fetchSoundtrackPlayerSnapshot,
  resolveSoundZoneIdForTenant,
  skipSoundZoneTracks,
  soundtrackControl,
  soundtrackPlayPlaylistAtTrackIndex,
  soundtrackSearchTracks,
  soundtrackSetPlayFrom,
  soundtrackPlayZone,
} from '@/lib/soundtrack/soundtrack-server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type RouteContext = { params: { tenant: string } }

/**
 * BFF → Soundtrack GraphQL (1:1):
 * GET  snapshot: soundZone + playFrom playlist tracks | search(type: track)
 * POST play | pause | stop | setVolume | playTrack (queue+play) | skipTracks | setPlayFrom (+ play [+ skipTracks])
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const tenantSlug = context.params.tenant
  const access = await verifyTenantOrSuperAdmin(request, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ error: access.error || 'Forbidden' }, { status: 403 })
  }

  try {
    const q = request.nextUrl.searchParams.get('q')
    if (q != null && q !== '') {
      const scope = request.nextUrl.searchParams.get('scope')
      const artistSearchMode = scope === 'full' ? 'full' : 'quick'
      const tracks = await soundtrackSearchTracks(q, { artistSearchMode })
      return NextResponse.json({ ok: true, search: { query: q, tracks } })
    }

    const zoneId = await resolveSoundZoneIdForTenant(tenantSlug)
    await ensureSoundZoneCrossfadeSettings(zoneId)
    const snapshot = await fetchSoundtrackPlayerSnapshot(zoneId)
    return NextResponse.json({ ok: true, snapshot })
  } catch (e) {
    if (e instanceof SoundtrackConfigError) {
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
  const access = await verifyTenantOrSuperAdmin(request, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ error: access.error || 'Forbidden' }, { status: 403 })
  }

  let body: {
    op?: string
    volume?: number
    trackId?: string
    source?: string
    playlistId?: string
    trackIndex?: number
    tracksToSkip?: number
  }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const op = body.op
  const allowed = [
    'play',
    'pause',
    'stop',
    'setVolume',
    'playTrack',
    'skipTracks',
    'skipNext',
    'setPlayFrom',
  ] as const
  if (!op || !allowed.includes(op as (typeof allowed)[number])) {
    return NextResponse.json({ error: 'Invalid op' }, { status: 400 })
  }

  try {
    const zoneId = await resolveSoundZoneIdForTenant(tenantSlug)
    await ensureSoundZoneCrossfadeSettings(zoneId)

    if (op === 'setPlayFrom') {
      const source = (body.source ?? body.playlistId)?.trim() || ''
      if (!source) {
        return NextResponse.json({ error: 'source or playlistId required' }, { status: 400 })
      }
      const trackIndex =
        typeof body.trackIndex === 'number' && Number.isFinite(body.trackIndex)
          ? Math.max(0, Math.floor(body.trackIndex))
          : 0
      if (trackIndex > 0) {
        await soundtrackPlayPlaylistAtTrackIndex(zoneId, source, trackIndex)
      } else {
        await soundtrackSetPlayFrom(zoneId, source)
        await soundtrackPlayZone(zoneId)
      }
    } else if (op === 'skipTracks') {
      const n =
        typeof body.tracksToSkip === 'number' && Number.isFinite(body.tracksToSkip)
          ? Math.max(1, Math.floor(body.tracksToSkip))
          : 1
      await skipSoundZoneTracks(zoneId, n, true)
    } else {
      await soundtrackControl(
        zoneId,
        op as 'play' | 'pause' | 'skipNext' | 'stop' | 'setVolume' | 'playTrack',
        {
          volume: op === 'setVolume' ? body.volume : undefined,
          trackId: body.trackId,
        },
      )
    }

    const snapshot = await fetchSoundtrackPlayerSnapshot(zoneId)
    return NextResponse.json({ ok: true, snapshot })
  } catch (e) {
    if (e instanceof SoundtrackConfigError) {
      return NextResponse.json({ error: e.message, code: 'config' }, { status: 503 })
    }
    if (e instanceof SoundtrackApiError) {
      return NextResponse.json({ error: e.message, code: 'soundtrack' }, { status: e.status })
    }
    return NextResponse.json({ error: 'Soundtrack control failed' }, { status: 500 })
  }
}
