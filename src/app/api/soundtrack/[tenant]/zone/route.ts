import { NextRequest, NextResponse } from 'next/server'
import { authorizeSoundtrackTenantRequest } from '@/lib/soundtrack/soundtrack-dev-auth'
import {
  fetchSoundtrackPlayerSnapshot,
  resolveSoundZoneForTenant,
  SoundtrackApiError,
  SoundtrackConfigError,
} from '@/lib/soundtrack/soundtrack-server'
import {
  listSoundtrackSoundZones,
  persistTenantSoundtrackZone,
} from '@/lib/soundtrack/soundtrack-zone-link'

export const dynamic = 'force-dynamic'

type RouteContext = { params: { tenant: string } }

function errorResponse(e: unknown) {
  if (e instanceof SoundtrackConfigError) {
    return NextResponse.json({ error: e.message, code: 'config' }, { status: 503 })
  }
  if (e instanceof SoundtrackApiError) {
    return NextResponse.json({ error: e.message, code: 'soundtrack' }, { status: e.status })
  }
  const msg = e instanceof Error ? e.message : 'Soundtrack request failed'
  return NextResponse.json({ error: msg }, { status: 500 })
}

export async function GET(request: NextRequest, context: RouteContext) {
  const tenantSlug = context.params.tenant
  const access = await authorizeSoundtrackTenantRequest(request, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ error: access.error || 'Forbidden' }, { status: 403 })
  }

  try {
    const resolution = await resolveSoundZoneForTenant(tenantSlug)
    const [zones, snapshot] = await Promise.all([
      listSoundtrackSoundZones(),
      fetchSoundtrackPlayerSnapshot(resolution.zoneId),
    ])
    return NextResponse.json({
      ok: true,
      active: {
        zoneId: resolution.zoneId,
        linkSource: resolution.linkSource,
        tenantConfigured: resolution.tenantConfigured,
        zoneName: snapshot.zoneName,
        online: snapshot.online,
        isPaired: snapshot.isPaired,
        deviceName: snapshot.deviceName,
      },
      zones,
    })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const tenantSlug = context.params.tenant
  const access = await authorizeSoundtrackTenantRequest(request, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ error: access.error || 'Forbidden' }, { status: 403 })
  }

  let body: { zoneId?: string; zoneName?: string }
  try {
    body = (await request.json()) as { zoneId?: string; zoneName?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const zoneId = body.zoneId?.trim() ?? ''
  if (!zoneId) {
    return NextResponse.json({ error: 'zoneId required' }, { status: 400 })
  }

  try {
    await persistTenantSoundtrackZone(tenantSlug, zoneId, body.zoneName ?? null)
    const resolution = await resolveSoundZoneForTenant(tenantSlug)
    const snapshot = await fetchSoundtrackPlayerSnapshot(resolution.zoneId)
    return NextResponse.json({
      ok: true,
      active: {
        zoneId: resolution.zoneId,
        linkSource: resolution.linkSource,
        tenantConfigured: resolution.tenantConfigured,
        zoneName: snapshot.zoneName,
        online: snapshot.online,
        isPaired: snapshot.isPaired,
        deviceName: snapshot.deviceName,
      },
    })
  } catch (e) {
    return errorResponse(e)
  }
}
