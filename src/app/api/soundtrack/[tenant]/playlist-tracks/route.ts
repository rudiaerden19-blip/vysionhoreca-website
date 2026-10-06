import { NextRequest, NextResponse } from 'next/server'
import { authorizeSoundtrackTenantRequest } from '@/lib/soundtrack/soundtrack-dev-auth'
import {
  addTrackToManualPlaylist,
  getSoundZoneNowPlayingDisplayUrl,
  removeTrackFromManualPlaylist,
} from '@/lib/soundtrack/soundtrack-playlists'
import {
  SoundtrackApiError,
  SoundtrackConfigError,
  fetchPlaySourceTrackRows,
  resolveSoundZoneIdForTenant,
} from '@/lib/soundtrack/soundtrack-server'

export const dynamic = 'force-dynamic'

type RouteContext = { params: { tenant: string } }

export async function GET(request: NextRequest, context: RouteContext) {
  const tenantSlug = context.params.tenant
  const access = await authorizeSoundtrackTenantRequest(request, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ error: access.error || 'Forbidden' }, { status: 403 })
  }

  const source = new URL(request.url).searchParams.get('source')?.trim()
  if (!source) {
    return NextResponse.json({ error: 'source vereist' }, { status: 400 })
  }

  try {
    const tracks = await fetchPlaySourceTrackRows(source)
    return NextResponse.json({ ok: true, tracks })
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
  const access = await authorizeSoundtrackTenantRequest(request, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ error: access.error || 'Forbidden' }, { status: 403 })
  }

  let body: { source?: string; trackId?: string }
  try {
    body = (await request.json()) as { source?: string; trackId?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const source = body.source?.trim() ?? ''
  const trackId = body.trackId?.trim() ?? ''
  if (!source || !trackId) {
    return NextResponse.json({ error: 'source en trackId vereist' }, { status: 400 })
  }

  try {
    await addTrackToManualPlaylist(source, trackId)
    const tracks = await fetchPlaySourceTrackRows(source)
    let playerWebUrl: string | null = null
    try {
      const zoneId = await resolveSoundZoneIdForTenant(tenantSlug)
      playerWebUrl = await getSoundZoneNowPlayingDisplayUrl(zoneId)
    } catch {
      /* refresh trigger best-effort */
    }
    return NextResponse.json({ ok: true, tracks, playerWebUrl })
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

export async function DELETE(request: NextRequest, context: RouteContext) {
  const tenantSlug = context.params.tenant
  const access = await authorizeSoundtrackTenantRequest(request, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ error: access.error || 'Forbidden' }, { status: 403 })
  }

  let body: { source?: string; trackIndex?: number }
  try {
    body = (await request.json()) as { source?: string; trackIndex?: number }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const source = body.source?.trim() ?? ''
  const trackIndex = body.trackIndex
  if (!source || trackIndex == null || !Number.isInteger(trackIndex) || trackIndex < 0) {
    return NextResponse.json({ error: 'source en trackIndex vereist' }, { status: 400 })
  }

  try {
    await removeTrackFromManualPlaylist(source, trackIndex)
    const tracks = await fetchPlaySourceTrackRows(source)
    return NextResponse.json({ ok: true, tracks })
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
