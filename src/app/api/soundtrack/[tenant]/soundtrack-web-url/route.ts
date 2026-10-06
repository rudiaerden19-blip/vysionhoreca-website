import { NextRequest, NextResponse } from 'next/server'
import { authorizeSoundtrackTenantRequest } from '@/lib/soundtrack/soundtrack-dev-auth'
import { getSoundZoneNowPlayingDisplayUrl } from '@/lib/soundtrack/soundtrack-playlists'
import { soundtrackCreateWebUrl } from '@/lib/vysion-music/open-soundtrack-create'
import {
  SoundtrackApiError,
  SoundtrackConfigError,
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

  try {
    const zoneId = await resolveSoundZoneIdForTenant(tenantSlug)
    const playerWebUrl = await getSoundZoneNowPlayingDisplayUrl(zoneId)
    const createWebUrl = playerWebUrl ? soundtrackCreateWebUrl(playerWebUrl) : null
    return NextResponse.json({ ok: true, playerWebUrl, createWebUrl })
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
