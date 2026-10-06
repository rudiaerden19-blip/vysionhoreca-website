import { NextRequest, NextResponse } from 'next/server'
import { authorizeSoundtrackTenantRequest } from '@/lib/soundtrack/soundtrack-dev-auth'
import {
  SoundtrackApiError,
  SoundtrackConfigError,
  emptySoundtrackPlayerSnapshot,
  fetchSoundtrackPlayerSnapshot,
  resolveSoundZoneForTenant,
  skipSoundZoneTracks,
  soundtrackGraphql,
  soundtrackPauseZone,
  soundtrackPlayZone,
  soundtrackSkipTrack,
  soundtrackUiPercentToApiVolume,
} from '@/lib/soundtrack/soundtrack-server'

export const dynamic = 'force-dynamic'

type RouteContext = { params: { tenant: string } }

const SOUNDTRACK_MUTATIONS = ['play', 'pause', 'skipTrack', 'skipTracks', 'setVolume'] as const
type SoundtrackMutationName = (typeof SOUNDTRACK_MUTATIONS)[number]

export async function GET(request: NextRequest, context: RouteContext) {
  const tenantSlug = context.params.tenant
  const access = await authorizeSoundtrackTenantRequest(request, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ error: access.error || 'Forbidden' }, { status: 403 })
  }

  try {
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

  const mutation = body.mutation as SoundtrackMutationName | undefined
  if (!mutation || !SOUNDTRACK_MUTATIONS.includes(mutation)) {
    return NextResponse.json(
      { error: `mutation must be one of: ${SOUNDTRACK_MUTATIONS.join(', ')}` },
      { status: 400 },
    )
  }

  const input = body.input ?? {}

  try {
    const zoneId = (await resolveSoundZoneForTenant(tenantSlug)).zoneId

    switch (mutation) {
      case 'play':
        await soundtrackPlayZone(zoneId)
        break
      case 'pause':
        await soundtrackPauseZone(zoneId)
        break
      case 'skipTrack':
        await soundtrackSkipTrack(zoneId)
        break
      case 'skipTracks': {
        const tracksToSkip =
          typeof input.tracksToSkip === 'number' && Number.isFinite(input.tracksToSkip)
            ? Math.max(0, Math.floor(input.tracksToSkip))
            : 1
        const crossfade = input.crossfade !== false
        if (tracksToSkip > 0) await skipSoundZoneTracks(zoneId, tracksToSkip, crossfade)
        break
      }
      case 'setVolume': {
        const ui = typeof input.volume === 'number' ? input.volume : 0
        const volume = soundtrackUiPercentToApiVolume(ui)
        await soundtrackGraphql(
          `mutation($input: SetVolumeInput!) { setVolume(input: $input) { status volume } }`,
          { input: { soundZone: zoneId, volume } },
        )
        break
      }
      default:
        break
    }

    const snapshot = await fetchSoundtrackPlayerSnapshot(zoneId)
    return NextResponse.json({ ok: true, mutation, snapshot })
  } catch (e) {
    if (e instanceof SoundtrackConfigError) {
      return NextResponse.json({ error: e.message, code: 'config' }, { status: 503 })
    }
    if (e instanceof SoundtrackApiError) {
      return NextResponse.json({ error: e.message, code: 'soundtrack' }, { status: e.status })
    }
    return NextResponse.json({ error: 'Soundtrack mutation failed' }, { status: 500 })
  }
}
