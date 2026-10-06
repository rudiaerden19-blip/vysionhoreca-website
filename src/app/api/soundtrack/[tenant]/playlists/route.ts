import { NextRequest, NextResponse } from 'next/server'
import { authorizeSoundtrackTenantRequest } from '@/lib/soundtrack/soundtrack-dev-auth'
import {
  createManualPlaylistInMusicLibrary,
  findSoundtrackMusicLibraryPlaylistByName,
  listSoundtrackLibraryPlaylists,
  readSoundtrackPlaylistCreateSyncMeta,
  removePlaylistFromMusicLibrary,
  renameManualPlaylist,
  resolveSoundtrackZoneLibraryContext,
} from '@/lib/soundtrack/soundtrack-playlists'
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
    const playlists = await listSoundtrackLibraryPlaylists(zoneId)
    return NextResponse.json({ ok: true, playlists })
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

  let body: { name?: string }
  try {
    body = (await request.json()) as { name?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const name = body.name?.trim() ?? ''
  if (!name) {
    return NextResponse.json({ error: 'name vereist' }, { status: 400 })
  }

  try {
    const zoneId = await resolveSoundZoneIdForTenant(tenantSlug)
    const created = await createManualPlaylistInMusicLibrary(zoneId, name)
    const { musicLibraryId } = await resolveSoundtrackZoneLibraryContext(zoneId)
    const inSoundtrackLibrary = await findSoundtrackMusicLibraryPlaylistByName(
      musicLibraryId,
      name,
    )
    if (!inSoundtrackLibrary || inSoundtrackLibrary.id !== created.id) {
      throw new SoundtrackApiError(
        'Soundtrack music library does not contain created playlist',
        502,
      )
    }
    const playlists = await listSoundtrackLibraryPlaylists(zoneId)
    if (!playlists.some((p) => p.id === created.id && p.name.trim() === name)) {
      throw new SoundtrackApiError(
        'Playlist not in Soundtrack music library list after create',
        502,
      )
    }
    const sync = await readSoundtrackPlaylistCreateSyncMeta(zoneId, created.id)
    return NextResponse.json({ ok: true, playlist: created, playlists, sync })
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

export async function PATCH(request: NextRequest, context: RouteContext) {
  const tenantSlug = context.params.tenant
  const access = await authorizeSoundtrackTenantRequest(request, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ error: access.error || 'Forbidden' }, { status: 403 })
  }

  let body: { id?: string; name?: string }
  try {
    body = (await request.json()) as { id?: string; name?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const id = body.id?.trim() ?? ''
  const name = body.name?.trim() ?? ''
  if (!id || !name) {
    return NextResponse.json({ error: 'id en name vereist' }, { status: 400 })
  }

  try {
    const zoneId = await resolveSoundZoneIdForTenant(tenantSlug)
    await renameManualPlaylist(id, name)
    const playlists = await listSoundtrackLibraryPlaylists(zoneId)
    return NextResponse.json({ ok: true, playlists })
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

  let body: { id?: string }
  try {
    body = (await request.json()) as { id?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const id = body.id?.trim() ?? ''
  if (!id) {
    return NextResponse.json({ error: 'id vereist' }, { status: 400 })
  }

  try {
    const zoneId = await resolveSoundZoneIdForTenant(tenantSlug)
    await removePlaylistFromMusicLibrary(zoneId, id)
    const playlists = await listSoundtrackLibraryPlaylists(zoneId)
    return NextResponse.json({ ok: true, playlists })
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
