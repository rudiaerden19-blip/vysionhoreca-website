import { NextRequest, NextResponse } from 'next/server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import {
  VysionMusicSpotifyImportError,
  importSpotifyPlaylistForSoundtrack,
} from '@/lib/vysion-music-spotify-import-server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type RouteContext = { params: { tenant: string } }

export async function POST(request: NextRequest, context: RouteContext) {
  const tenantSlug = context.params.tenant
  const access = await verifyTenantOrSuperAdmin(request, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ error: access.error || 'Forbidden' }, { status: 403 })
  }

  let body: { url?: string }
  try {
    body = (await request.json()) as { url?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const url = body.url?.trim()
  if (!url) {
    return NextResponse.json({ error: 'url required' }, { status: 400 })
  }

  try {
    const result = await importSpotifyPlaylistForSoundtrack(url)
    return NextResponse.json({ ok: true, import: result })
  } catch (e) {
    if (e instanceof VysionMusicSpotifyImportError) {
      return NextResponse.json(
        { error: e.message, code: e.code },
        { status: e.status },
      )
    }
    return NextResponse.json({ error: 'Spotify import failed' }, { status: 500 })
  }
}
