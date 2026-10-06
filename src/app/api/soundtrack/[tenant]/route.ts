import { NextRequest, NextResponse } from 'next/server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import {
  SoundtrackApiError,
  SoundtrackConfigError,
  ensureSoundZoneCrossfadeSettings,
  fetchSoundtrackPlayerSnapshot,
  resolveSoundZoneIdForTenant,
  soundtrackControl,
  soundtrackSearchTracks,
} from '@/lib/soundtrack/soundtrack-server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type RouteContext = { params: { tenant: string } }

/** Dunne BFF: alleen Soundtrack GraphQL (snapshot, zoeken, zone-control). */
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
    playlistId?: string
    trackIndex?: number
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
    'skipNext',
    'stop',
    'setVolume',
    'playTrack',
    'playFromIndex',
  ] as const
  if (!op || !allowed.includes(op as (typeof allowed)[number])) {
    return NextResponse.json({ error: 'Invalid op' }, { status: 400 })
  }

  try {
    const zoneId = await resolveSoundZoneIdForTenant(tenantSlug)
    await ensureSoundZoneCrossfadeSettings(zoneId)

    if (op === 'playFromIndex') {
      const playlistId = body.playlistId?.trim() || ''
      if (!playlistId) {
        return NextResponse.json({ error: 'playlistId required' }, { status: 400 })
      }
      const trackIndex =
        typeof body.trackIndex === 'number' && Number.isFinite(body.trackIndex)
          ? Math.max(0, Math.floor(body.trackIndex))
          : 0
      const { playSoundtrackPlaylistAtIndex } =
        await import('@/lib/soundtrack/soundtrack-manual-playlist-sync')
      await playSoundtrackPlaylistAtIndex(zoneId, playlistId, trackIndex)
      await new Promise((r) => setTimeout(r, 800))
    } else {
      await soundtrackControl(
        zoneId,
        op as 'play' | 'pause' | 'skipNext' | 'stop' | 'setVolume' | 'playTrack',
        {
          volume: op === 'setVolume' ? body.volume : undefined,
          trackId: body.trackId,
        },
      )
      if (op === 'playTrack') {
        await new Promise((r) => setTimeout(r, 500))
      }
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
