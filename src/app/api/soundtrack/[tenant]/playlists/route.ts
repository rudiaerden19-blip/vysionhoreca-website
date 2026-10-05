import { NextRequest, NextResponse } from 'next/server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import {
  VysionMusicPlaylistError,
  listVysionMusicPlaylists,
  saveVysionMusicPlaylist,
} from '@/lib/vysion-music-playlists-server'

export const dynamic = 'force-dynamic'

type RouteContext = { params: { tenant: string } }

export async function GET(request: NextRequest, context: RouteContext) {
  const tenantSlug = context.params.tenant
  const access = await verifyTenantOrSuperAdmin(request, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ error: access.error || 'Forbidden' }, { status: 403 })
  }

  try {
    const playlists = await listVysionMusicPlaylists(tenantSlug)
    return NextResponse.json({ ok: true, playlists })
  } catch (e) {
    if (e instanceof VysionMusicPlaylistError) {
      return NextResponse.json(
        { error: e.message, code: e.code },
        { status: e.status },
      )
    }
    return NextResponse.json({ error: 'Failed to load playlists' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const tenantSlug = context.params.tenant
  const access = await verifyTenantOrSuperAdmin(request, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ error: access.error || 'Forbidden' }, { status: 403 })
  }

  let body: {
    id?: string | null
    name?: string
    tracks?: {
      id: string
      name: string
      artist?: string
      durationMs?: number
      imageUrl?: string | null
    }[]
  }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    const playlist = await saveVysionMusicPlaylist(tenantSlug, {
      id: body.id,
      name: body.name ?? '',
      tracks: (body.tracks ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        artist: t.artist ?? '',
        durationMs: t.durationMs ?? 0,
        imageUrl: t.imageUrl ?? null,
      })),
    })
    return NextResponse.json({ ok: true, playlist })
  } catch (e) {
    if (e instanceof VysionMusicPlaylistError) {
      return NextResponse.json(
        { error: e.message, code: e.code },
        { status: e.status },
      )
    }
    return NextResponse.json({ error: 'Failed to save playlist' }, { status: 500 })
  }
}
