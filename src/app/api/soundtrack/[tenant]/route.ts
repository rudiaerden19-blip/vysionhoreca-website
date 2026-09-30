import { NextRequest, NextResponse } from 'next/server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import {
  SoundtrackApiError,
  SoundtrackConfigError,
  fetchSoundtrackPlayerSnapshot,
  resolveSoundZoneIdForTenant,
  soundtrackControl,
  soundtrackSearchTracks,
} from '@/lib/soundtrack/soundtrack-server'

export const dynamic = 'force-dynamic'

type RouteContext = { params: { tenant: string } }

export async function GET(request: NextRequest, context: RouteContext) {
  const tenantSlug = context.params.tenant
  const access = await verifyTenantOrSuperAdmin(request, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ error: access.error || 'Forbidden' }, { status: 403 })
  }

  try {
    const zoneId = await resolveSoundZoneIdForTenant(tenantSlug)
    const q = request.nextUrl.searchParams.get('q')
    if (q != null && q !== '') {
      const tracks = await soundtrackSearchTracks(q)
      return NextResponse.json({ ok: true, search: { query: q, tracks } })
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
    return NextResponse.json({ error: 'Soundtrack request failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const tenantSlug = context.params.tenant
  const access = await verifyTenantOrSuperAdmin(request, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ error: access.error || 'Forbidden' }, { status: 403 })
  }

  let body: { op?: string; volume?: number; trackId?: string }
  try {
    body = (await request.json()) as { op?: string; volume?: number; trackId?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const op = body.op
  const allowed = ['play', 'pause', 'skipNext', 'stop', 'setVolume', 'playTrack'] as const
  if (!op || !allowed.includes(op as (typeof allowed)[number])) {
    return NextResponse.json({ error: 'Invalid op' }, { status: 400 })
  }

  try {
    const zoneId = await resolveSoundZoneIdForTenant(tenantSlug)
    await soundtrackControl(zoneId, op as (typeof allowed)[number], {
      volume: body.volume,
      trackId: body.trackId,
    })
    if (op === 'playTrack') {
      await new Promise((r) => setTimeout(r, 500))
    }
    const snapshot =
      op === 'playTrack'
        ? await fetchSoundtrackPlayerSnapshot(zoneId, { historyFirst: 0, padPlaylist: false })
        : await fetchSoundtrackPlayerSnapshot(zoneId)
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
