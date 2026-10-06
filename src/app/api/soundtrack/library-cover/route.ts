import { NextRequest, NextResponse } from 'next/server'
import { vysionMusicLibraryFallbackCoverSvg } from '@/lib/vysion-music/vysion-music-library-fallback-cover'

export const dynamic = 'force-dynamic'

/** Gegenereerde playlist-cover als Soundtrack geen artwork stuurt. */
export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get('name')?.trim() || 'Playlist'
  const svg = vysionMusicLibraryFallbackCoverSvg(name)
  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
