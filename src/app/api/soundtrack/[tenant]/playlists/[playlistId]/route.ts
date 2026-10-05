import { NextRequest, NextResponse } from 'next/server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import {
  VysionMusicPlaylistError,
  deleteVysionMusicPlaylist,
  getVysionMusicPlaylist,
} from '@/lib/vysion-music-playlists-server'

export const dynamic = 'force-dynamic'

type RouteContext = { params: { tenant: string; playlistId: string } }

export async function GET(request: NextRequest, context: RouteContext) {
  const tenantSlug = context.params.tenant
  const access = await verifyTenantOrSuperAdmin(request, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ error: access.error || 'Forbidden' }, { status: 403 })
  }

  try {
    const playlist = await getVysionMusicPlaylist(
      tenantSlug,
      context.params.playlistId,
    )
    if (!playlist) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ ok: true, playlist })
  } catch (e) {
    if (e instanceof VysionMusicPlaylistError) {
      return NextResponse.json(
        { error: e.message, code: e.code },
        { status: e.status },
      )
    }
    return NextResponse.json({ error: 'Failed to load playlist' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const tenantSlug = context.params.tenant
  const access = await verifyTenantOrSuperAdmin(request, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ error: access.error || 'Forbidden' }, { status: 403 })
  }

  try {
    await deleteVysionMusicPlaylist(tenantSlug, context.params.playlistId)
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof VysionMusicPlaylistError) {
      return NextResponse.json(
        { error: e.message, code: e.code },
        { status: e.status },
      )
    }
    return NextResponse.json({ error: 'Failed to delete playlist' }, { status: 500 })
  }
}
