import { NextRequest, NextResponse } from 'next/server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import {
  SoundtrackApiError,
  SoundtrackConfigError,
  fetchSoundtrackPlayerSnapshot,
  resolveSoundZoneIdForTenant,
  skipSoundZoneTracks,
  soundtrackControl,
  soundtrackSearchTracks,
  soundtrackSetPlayFrom,
  soundtrackPlayZone,
  soundtrackPauseZone,
  soundtrackSkipTrack,
} from '@/lib/soundtrack/soundtrack-server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type RouteContext = { params: { tenant: string } }

/** Elke POST `op` = precies één Soundtrack GraphQL-mutatie (behalve auth + zone-id). */
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
    tracksToSkip?: number
    crossfade?: boolean
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
    'skipTrack',
    'skipTracks',
    'setPlayFrom',
  ] as const
  if (!op || !allowed.includes(op as (typeof allowed)[number])) {
    return NextResponse.json({ error: 'Invalid op' }, { status: 400 })
  }

  try {
    const zoneId = await resolveSoundZoneIdForTenant(tenantSlug)

    switch (op) {
      case 'setPlayFrom': {
        const source = (body.source ?? body.playlistId)?.trim() || ''
        if (!source) {
          return NextResponse.json({ error: 'source or playlistId required' }, { status: 400 })
        }
        await soundtrackSetPlayFrom(zoneId, source)
        break
      }
      case 'play':
        await soundtrackPlayZone(zoneId)
        break
      case 'pause':
      case 'stop':
        await soundtrackPauseZone(zoneId)
        break
      case 'skipTrack':
        await soundtrackSkipTrack(zoneId)
        break
      case 'skipTracks': {
        const n =
          typeof body.tracksToSkip === 'number' && Number.isFinite(body.tracksToSkip)
            ? Math.max(0, Math.floor(body.tracksToSkip))
            : 1
        const crossfade = body.crossfade !== false
        if (n > 0) await skipSoundZoneTracks(zoneId, n, crossfade)
        break
      }
      case 'setVolume':
      case 'playTrack':
        await soundtrackControl(zoneId, op, {
          volume: body.volume,
          trackId: body.trackId,
        })
        break
      default:
        break
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
