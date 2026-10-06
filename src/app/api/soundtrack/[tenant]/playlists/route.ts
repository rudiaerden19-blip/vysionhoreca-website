import { NextRequest, NextResponse } from 'next/server'
import {
  createSoundtrackLibraryPlaylist,
  listSoundtrackLibraryPlaylists,
  resolveSoundZoneIdForTenant,
} from '@/lib/soundtrack/soundtrack-playlists'
import { authorizeSoundtrackTenantRequest } from '@/lib/soundtrack/soundtrack-dev-auth'
import {
  SoundtrackApiError,
  SoundtrackConfigError,
} from '@/lib/soundtrack/soundtrack-server'

export const dynamic = 'force-dynamic'

type RouteContext = { params: { tenant: string } }

function soundtrackErrorResponse(e: unknown) {
  if (e instanceof SoundtrackConfigError) {
    return NextResponse.json({ error: e.message, code: 'config' }, { status: 503 })
  }
  if (e instanceof SoundtrackApiError) {
    return NextResponse.json({ error: e.message, code: 'soundtrack' }, { status: e.status })
  }
  return NextResponse.json({ error: 'Soundtrack request failed' }, { status: 500 })
}

export async function GET(request: NextRequest, context: RouteContext) {
  const tenantSlug = context.params.tenant
  const access = await authorizeSoundtrackTenantRequest(request, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ error: access.error || 'Forbidden' }, { status: 403 })
  }

  try {
    const zoneId = await resolveSoundZoneIdForTenant(tenantSlug)
    const playlists = await listSoundtrackLibraryPlaylists(zoneId)
    return NextResponse.json({ ok: true, playlists })
  } catch (e) {
    return soundtrackErrorResponse(e)
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const tenantSlug = context.params.tenant
  const access = await authorizeSoundtrackTenantRequest(request, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ error: access.error || 'Forbidden' }, { status: 403 })
  }

  let body: { name?: string }
  try {
    body = (await request.json()) as { name?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const name = body.name?.trim() ?? ''
  if (!name) {
    return NextResponse.json({ error: 'name required' }, { status: 400 })
  }

  try {
    const zoneId = await resolveSoundZoneIdForTenant(tenantSlug)
    const playlist = await createSoundtrackLibraryPlaylist(zoneId, name)
    return NextResponse.json({ ok: true, playlist })
  } catch (e) {
    return soundtrackErrorResponse(e)
  }
}
